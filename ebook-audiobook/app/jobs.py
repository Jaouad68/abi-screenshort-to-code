"""Gestion des conversions (« tâches ») : file d'attente, progression, reprise.

Principes de robustesse pour les livres de plusieurs centaines de pages :

* **traitement par segments** : un chapitre est découpé en paragraphes,
  synthétisés un par un et mis en cache sur disque. La mémoire utilisée reste
  constante quelle que soit la taille du livre ;
* **reprise** : si l'ordinateur s'éteint ou si le réseau coupe, la tâche est
  marquée « interrompue ». Un clic sur « Reprendre » repart du dernier segment
  synthétisé, et les chapitres déjà encodés ne sont pas refaits ;
* **nouvelles tentatives** : chaque segment est réessayé plusieurs fois, avec
  une attente croissante, avant de déclarer une erreur ;
* **une tâche à la fois** : les conversions s'enchaînent dans une file pour
  ne pas saturer le processeur ni le service en ligne.

Tout l'état d'une tâche est écrit dans ``data/jobs/<id>/job.json``.
"""

from __future__ import annotations

import asyncio
import json
import re
import shutil
import time
import uuid
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

from . import config
from .audio import ChapterWavWriter, build_m4b, decode_to_pcm, encode_aac, encode_chapter, trim_silence
from .mp3join import Mp3Joiner, NotJoinable, finalize_mp3
from .library import cover_path, load_book
from .segment import Segment, build_segments
from .tts import TONES, NothingToSay, SynthesisSettings, TTSEngine


def skip_marker(path: Path) -> Path:
    """Fichier témoin d'un segment ignoré (aucun son possible pour ce texte)."""
    return path.with_suffix(".skip")

# Part de la progression attribuée à la synthèse (le reste = encodage).
_SYNTH_WEIGHT = 0.85
# Intervalle minimal entre deux écritures de job.json pendant la synthèse.
_SAVE_INTERVAL = 2.0


class JobCancelled(Exception):
    pass


class JobNotFound(KeyError):
    pass


@dataclass
class ChapterJob:
    number: int               # numéro de piste (1, 2, 3...)
    title: str
    chars: int                # nombre de caractères à synthétiser
    status: str = "pending"   # pending | done
    mp3: str | None = None
    m4a: str | None = None
    duration: float = 0.0


@dataclass
class Job:
    id: str
    book_id: str
    title: str
    author: str
    settings: dict[str, Any]
    chapters: list[ChapterJob]
    status: str = "queued"    # queued | running | done | error | cancelled | interrupted
    message: str = "En attente"
    error: str | None = None
    total_chars: int = 0
    synth_chars: int = 0
    encoded_chars: int = 0
    progress: float = 0.0
    eta_seconds: float | None = None
    current_chapter: int | None = None
    m4b: str | None = None
    skipped: int = 0          # passages illisibles ignorés
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    finished_at: float | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Job":
        chapters = [ChapterJob(**c) for c in data.pop("chapters", [])]
        return cls(chapters=chapters, **data)


def safe_filename(name: str, max_len: int = 80) -> str:
    """Nom de fichier valide sous Windows, macOS et Linux."""
    name = re.sub(r'[<>:"/\\|?*\x00-\x1f]', " ", name)
    name = re.sub(r"\s+", " ", name).strip(" .")
    return (name[:max_len].rstrip(" .") or "sans titre")


def validate_settings(settings: dict[str, Any], engines: dict[str, TTSEngine]) -> dict[str, Any]:
    """Vérifie et complète les réglages envoyés par l'interface."""
    engine = settings.get("engine", "edge")
    if engine not in engines:
        raise ValueError(f"Moteur inconnu : {engine}")
    ok, reason = engines[engine].availability()
    if not ok:
        raise ValueError(reason)
    if not settings.get("voice"):
        raise ValueError("Choisissez une voix.")
    bitrate = int(settings.get("bitrate", config.ORIGIN_BITRATE))
    if bitrate not in config.ALLOWED_BITRATES:
        raise ValueError(f"Débit non autorisé : {bitrate} kbps")
    formats = [f for f in settings.get("formats", ["mp3", "m4b"]) if f in ("mp3", "m4b")]
    if not formats:
        raise ValueError("Choisissez au moins un format de sortie (MP3 ou M4B).")
    tone = settings.get("tone", "narration")
    if tone not in TONES:
        raise ValueError(f"Ton inconnu : {tone}")
    return {
        "engine": engine,
        "voice": str(settings["voice"]),
        "speed": min(2.0, max(0.5, float(settings.get("speed", 1.0)))),
        "tone": tone,
        "pause_factor": min(2.0, max(0.3, float(settings.get("pause_factor", 1.0)))),
        "bitrate": bitrate,
        "formats": formats,
        "read_titles": bool(settings.get("read_titles", True)),
    }


class JobManager:
    """Exécute les conversions une par une, en arrière-plan."""

    def __init__(self, engines: dict[str, TTSEngine], jobs_dir: Path | None = None) -> None:
        self.engines = engines
        self.jobs_dir = jobs_dir or config.JOBS_DIR
        self.jobs: dict[str, Job] = {}
        self._queue: asyncio.Queue[str] | None = None
        self._worker: asyncio.Task | None = None
        self._running: tuple[str, asyncio.Task] | None = None  # conversion en cours
        self._cancel_requested: set[str] = set()
        self._last_save: dict[str, float] = {}
        self._run_start: dict[str, tuple[float, float]] = {}  # id -> (heure, caractères synthétisés)
        # Mesures pour estimer le temps restant : encodage fini (caractères,
        # secondes) et encodage en cours (caractères faits, début).
        self._enc_done: dict[str, list[float]] = {}
        self._enc_live: dict[str, tuple[float, float]] = {}

    # -- cycle de vie -----------------------------------------------------

    def load_existing(self) -> None:
        """Recharge les tâches au démarrage ; celles en cours deviennent « interrompues »."""
        if not self.jobs_dir.exists():
            return
        for folder in self.jobs_dir.iterdir():
            f = folder / "job.json"
            if not f.exists():
                continue
            try:
                job = Job.from_dict(json.loads(f.read_text(encoding="utf-8")))
            except Exception:
                continue
            if job.status in ("running", "queued"):
                job.status = "interrupted"
                job.message = "Interrompue (application fermée). Cliquez sur Reprendre."
                job.eta_seconds = None
                self._save(job)
            self.jobs[job.id] = job

    async def start(self) -> None:
        self._queue = asyncio.Queue()
        self._worker = asyncio.create_task(self._worker_loop())

    async def stop(self) -> None:
        if self._worker:
            self._worker.cancel()
            try:
                await self._worker
            except (asyncio.CancelledError, Exception):
                pass
        for job in self.jobs.values():
            if job.status in ("running", "queued"):
                job.status = "interrupted"
                job.message = "Interrompue (application fermée). Cliquez sur Reprendre."
                self._save(job)

    # -- API publique -----------------------------------------------------

    def job_dir(self, job_id: str) -> Path:
        if not job_id.isalnum():
            raise JobNotFound(job_id)
        return self.jobs_dir / job_id

    def get(self, job_id: str) -> Job:
        job = self.jobs.get(job_id)
        if job is None:
            raise JobNotFound(job_id)
        return job

    def list(self) -> list[Job]:
        return sorted(self.jobs.values(), key=lambda j: j.created_at, reverse=True)

    def create(self, book_id: str, raw_settings: dict[str, Any]) -> Job:
        """Crée une conversion à partir de l'état actuel du livre et la met en file."""
        settings = validate_settings(raw_settings, self.engines)
        engine = self.engines[settings["engine"]]
        book = load_book(book_id)
        chapters = [c for c in book.chapters if c.include and c.paragraphs]
        if not chapters:
            raise ValueError("Aucun chapitre sélectionné.")

        job_id = uuid.uuid4().hex[:12]
        folder = self.job_dir(job_id)
        (folder / "output").mkdir(parents=True, exist_ok=True)

        # Copie figée du texte : modifier le livre ensuite ne perturbe pas une
        # conversion en cours ou à reprendre.
        snapshot = {
            "title": raw_settings.get("title") or book.title,
            "author": raw_settings.get("author") if raw_settings.get("author") is not None else book.author,
            "chapters": [{"title": c.title, "paragraphs": c.paragraphs} for c in chapters],
        }
        (folder / "text.json").write_text(json.dumps(snapshot, ensure_ascii=False), encoding="utf-8")
        cover = cover_path(book_id)
        if cover:
            shutil.copy(cover, folder / cover.name)

        chapter_jobs = []
        for n, ch in enumerate(chapters, start=1):
            segs = build_segments(ch.title, ch.paragraphs, engine.max_chars,
                                  settings["pause_factor"], settings["read_titles"])
            chapter_jobs.append(ChapterJob(number=n, title=ch.title, chars=sum(len(s.text) for s in segs)))

        job = Job(
            id=job_id,
            book_id=book_id,
            title=snapshot["title"],
            author=snapshot["author"] or "",
            settings=settings,
            chapters=chapter_jobs,
            total_chars=sum(c.chars for c in chapter_jobs),
        )
        self.jobs[job_id] = job
        self._save(job)
        self._enqueue(job)
        return job

    def cancel(self, job_id: str) -> Job:
        job = self.get(job_id)
        if job.status == "queued":
            job.status = "cancelled"
            job.message = "Annulée"
            self._save(job)
        elif job.status == "running":
            self._cancel_requested.add(job_id)
            job.message = "Annulation en cours…"
            # Arrêt immédiat, sans attendre la fin des morceaux en cours de
            # synthèse ou d'encodage. Les segments déjà produits restent en cache.
            if self._running and self._running[0] == job_id:
                self._running[1].cancel()
        return job

    def resume(self, job_id: str) -> Job:
        job = self.get(job_id)
        if job.status in ("error", "cancelled", "interrupted"):
            job.error = None
            self._enqueue(job)
        return job

    def delete(self, job_id: str) -> None:
        job = self.get(job_id)
        if job.status == "running":
            raise ValueError("Annulez la conversion avant de la supprimer.")
        if job.status == "queued":
            job.status = "cancelled"
        self.jobs.pop(job_id, None)
        shutil.rmtree(self.job_dir(job_id), ignore_errors=True)

    def output_path(self, job_id: str, filename: str) -> Path:
        """Chemin d'un fichier produit, en refusant tout nom qui n'en fait pas partie."""
        job = self.get(job_id)
        allowed = {c.mp3 for c in job.chapters if c.mp3} | ({job.m4b} if job.m4b else set())
        if filename not in allowed:
            raise JobNotFound(filename)
        return self.job_dir(job_id) / "output" / filename

    # -- exécution --------------------------------------------------------

    def _enqueue(self, job: Job) -> None:
        job.status = "queued"
        job.message = "En attente"
        self._save(job)
        if self._queue is not None:
            self._queue.put_nowait(job.id)

    async def _worker_loop(self) -> None:
        assert self._queue is not None
        while True:
            job_id = await self._queue.get()
            job = self.jobs.get(job_id)
            if job is None or job.status != "queued":
                continue
            task = asyncio.create_task(self._run(job))
            self._running = (job.id, task)
            try:
                await task
            except JobCancelled:
                job.status = "cancelled"
                job.message = "Annulée. Les segments déjà produits sont conservés : vous pouvez reprendre."
            except asyncio.CancelledError:
                me = asyncio.current_task()
                if job.id in self._cancel_requested and not (me and me.cancelling()):
                    # Annulation demandée par l'utilisateur : la file continue.
                    job.status = "cancelled"
                    job.message = "Annulée. Les segments déjà produits sont conservés : vous pouvez reprendre."
                    continue
                job.status = "interrupted"
                job.message = "Interrompue. Cliquez sur Reprendre."
                self._save(job)
                raise
            except Exception as exc:  # erreur affichée telle quelle à l'utilisateur
                job.status = "error"
                job.error = str(exc)
                job.message = "Erreur : la conversion peut être reprise là où elle s'est arrêtée."
            finally:
                self._running = None
                self._cancel_requested.discard(job.id)
                job.eta_seconds = None
                job.current_chapter = None if job.status == "done" else job.current_chapter
                self._save(job)

    def _check_cancel(self, job: Job) -> None:
        if job.id in self._cancel_requested:
            raise JobCancelled()

    async def _run(self, job: Job) -> None:
        folder = self.job_dir(job.id)
        out_dir = folder / "output"
        work_dir = folder / "work"
        out_dir.mkdir(parents=True, exist_ok=True)
        work_dir.mkdir(parents=True, exist_ok=True)

        text = json.loads((folder / "text.json").read_text(encoding="utf-8"))
        s = job.settings
        engine = self.engines[s["engine"]]
        ok, reason = engine.availability()
        if not ok:
            raise RuntimeError(reason)
        synth = SynthesisSettings(voice=s["voice"], speed=s["speed"], tone=s["tone"])
        sample_rate = engine.sample_rate(s["voice"])
        cover = next((p for p in (folder / "cover.jpg", folder / "cover.png") if p.exists()), None)
        want_mp3 = "mp3" in s["formats"]
        want_m4b = "m4b" in s["formats"]
        total = len(job.chapters)
        width = 3 if total >= 100 else 2

        # Recalcule la progression à partir de ce qui est réellement terminé.
        done_chars = sum(c.chars for c in job.chapters if c.status == "done")
        job.synth_chars = job.encoded_chars = done_chars
        job.status = "running"
        job.message = "Démarrage…"
        self._run_start[job.id] = (time.time(), float(job.synth_chars))
        self._enc_done[job.id] = [0.0, 0.0]
        self._enc_live.pop(job.id, None)
        self._update_progress(job)
        self._save(job)

        async def finish_chapter(ch_job: ChapterJob, segments, paths, cache: Path) -> None:
            """Assemble et encode un chapitre déjà synthétisé (dans un thread)."""
            n = ch_job.number
            base = f"{n:0{width}d} - {safe_filename(ch_job.title)}"
            # Fichiers temporaires propres à cette tentative : un encodage
            # abandonné (annulation) qui se termine en arrière-plan ne peut
            # pas écraser le travail d'une reprise.
            attempt = uuid.uuid4().hex[:8]
            wav = work_dir / f"{n:03d}-{attempt}.wav"
            mp3_tmp = work_dir / f"{n:03d}-{attempt}.mp3" if want_mp3 else None
            m4a_tmp = work_dir / f"{n:03d}-{attempt}.m4a" if want_m4b else None
            mp3 = out_dir / f"{base}.mp3" if want_mp3 else None
            m4a = work_dir / f"{n:03d}.m4a" if want_m4b else None
            meta = {
                "title": ch_job.title,
                "artist": job.author,
                "album_artist": job.author,
                "album": job.title,
                "track": f"{n}/{total}",
                "genre": "Livre audio",
            }
            loop = asyncio.get_running_loop()
            started = time.time()
            self._enc_live[job.id] = (0.0, started)

            def on_progress(fraction: float) -> None:  # appelé depuis le thread d'encodage
                loop.call_soon_threadsafe(self._encode_progress, job, ch_job.chars * fraction, started)

            try:
                duration = await asyncio.to_thread(
                    self._assemble_and_encode, segments, paths, wav, sample_rate,
                    mp3_tmp, m4a_tmp, s["bitrate"], meta, cover, on_progress,
                )
            finally:
                self._enc_live.pop(job.id, None)
            stats = self._enc_done.setdefault(job.id, [0.0, 0.0])
            stats[0] += ch_job.chars
            stats[1] += time.time() - started
            if mp3_tmp:
                mp3_tmp.replace(mp3)
            if m4a_tmp:
                m4a_tmp.replace(m4a)
            shutil.rmtree(cache, ignore_errors=True)  # segments devenus inutiles
            ch_job.status = "done"
            ch_job.duration = duration
            ch_job.mp3 = mp3.name if mp3 else None
            ch_job.m4a = m4a.name if m4a else None
            job.encoded_chars += ch_job.chars
            self._update_progress(job)
            self._save(job, force=True)

        # Travail à la chaîne : pendant que le processeur encode le chapitre N,
        # la synthèse (qui attend surtout le réseau) avance déjà sur N+1.
        pending: asyncio.Task | None = None
        try:
            for ch_job, ch in zip(job.chapters, text["chapters"]):
                self._check_cancel(job)
                if ch_job.status == "done":
                    continue
                n = ch_job.number
                job.current_chapter = n
                job.message = f"Chapitre {n}/{total} : synthèse vocale"
                segments = build_segments(ch["title"], ch["paragraphs"], engine.max_chars,
                                          s["pause_factor"], s["read_titles"])
                cache = work_dir / f"{n:03d}"
                cache.mkdir(exist_ok=True)
                paths = [cache / f"{k:05d}.{engine.output_ext}" for k in range(len(segments))]
                await self._synthesize_chapter(job, engine, synth, segments, paths)

                if pending is not None:  # un seul encodage à la fois
                    job.message = f"Chapitre {n}/{total} : synthèse terminée, fin de l'encodage précédent"
                    await pending
                job.message = f"Chapitre {n}/{total} : assemblage et encodage"
                self._save(job, force=True)
                pending = asyncio.create_task(finish_chapter(ch_job, segments, paths, cache))
            if pending is not None:
                await pending
                pending = None
        finally:
            if pending is not None and not pending.done():
                me = asyncio.current_task()
                if me is not None and me.cancelling():
                    pending.cancel()  # annulation : on n'attend pas
                # Sur une erreur de synthèse, l'encodage déjà lancé est mené à
                # terme : ce chapitre n'aura pas à être refait à la reprise.
                await asyncio.gather(pending, return_exceptions=True)

        if want_m4b:
            job.message = "Création du livre audio M4B…"
            job.current_chapter = None
            self._save(job, force=True)
            m4b = out_dir / f"{safe_filename(job.title)}.m4b"
            parts = [(work_dir / c.m4a, c.title) for c in job.chapters if c.m4a]
            meta = {
                "title": job.title,
                "artist": job.author,
                "album_artist": job.author,
                "album": job.title,
                "genre": "Livre audio",
                "comment": "Créé avec Ebook vers livre audio",
            }
            await asyncio.to_thread(build_m4b, parts, m4b, meta, cover)
            job.m4b = m4b.name

        shutil.rmtree(work_dir, ignore_errors=True)
        job.status = "done"
        job.progress = 1.0
        job.finished_at = time.time()
        seconds = int(sum(c.duration for c in job.chapters))
        h, m = divmod(seconds // 60, 60)
        length = f"{h} h {m:02d} min" if h else f"{max(m, 1)} min"
        job.message = f"Terminé : {total} chapitres, {length} d'écoute."
        if job.skipped:
            job.message += f" {job.skipped} passage(s) sans texte lisible ignoré(s)."

    async def _synthesize_chapter(
        self,
        job: Job,
        engine: TTSEngine,
        synth: SynthesisSettings,
        segments: list[Segment],
        paths: list[Path],
    ) -> None:
        """Synthétise tous les segments d'un chapitre, en parallèle limité."""
        sem = asyncio.Semaphore(max(1, engine.concurrency))
        retries = max(1, config.TTS_MAX_RETRIES)

        async def one(seg: Segment, path: Path) -> None:
            skip = skip_marker(path)
            if (path.exists() and path.stat().st_size > 0) or skip.exists():  # déjà traité (reprise)
                job.synth_chars += len(seg.text)
                return
            async with sem:
                self._check_cancel(job)
                for attempt in range(retries):
                    try:
                        await engine.synthesize(seg.text, synth, path)
                        break
                    except NothingToSay:
                        # Texte illisible (symboles mathématiques...) : un seul
                        # nouvel essai, puis on l'ignore sans bloquer le livre.
                        if attempt >= 1:
                            skip.touch()
                            job.skipped += 1
                            break
                        await asyncio.sleep(1)
                    except Exception as exc:
                        if attempt == retries - 1:
                            raise RuntimeError(
                                f"Échec de la synthèse après {retries} essais ({exc}). "
                                f"Passage concerné : « {seg.text[:80]}… »"
                            ) from exc
                        delay = 2 ** (attempt + 1)
                        job.message = f"Problème de connexion, nouvel essai dans {delay} s…"
                        await asyncio.sleep(delay)
                        self._check_cancel(job)
            job.synth_chars += len(seg.text)
            self._update_progress(job)
            self._save(job, force=False)

        tasks = [asyncio.create_task(one(seg, p)) for seg, p in zip(segments, paths)]
        try:
            await asyncio.gather(*tasks)
        except BaseException:
            for t in tasks:
                t.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)
            raise

    @staticmethod
    def _assemble_and_encode(
        segments: list[Segment], paths: list[Path], wav: Path, sample_rate: int,
        mp3: Path | None, m4a: Path | None, bitrate: int, meta: dict, cover: Path | None,
        on_progress=None,
    ) -> float:
        """Concatène les segments avec les silences prévus, puis encode le chapitre.

        En qualité d'origine, les MP3 de la voix sont recopiés sans réencodage
        (voir ``mp3join``) : seul le M4B demande un encodage AAC, léger. Si un
        segment n'est pas un MP3 exploitable (voix Piper par exemple), on passe
        par l'encodage classique.
        """
        if bitrate == config.ORIGIN_BITRATE:
            try:
                return JobManager._join_without_reencoding(
                    segments, paths, wav.parent, wav.stem, mp3, m4a, meta, cover, on_progress)
            except NotJoinable:
                bitrate = 128
        with ChapterWavWriter(wav, sample_rate) as writer:
            writer.add_silence(500)  # courte respiration avant le début du chapitre
            for seg, path in zip(segments, paths):
                if path.exists():  # absent = passage ignoré
                    writer.add_audio(trim_silence(decode_to_pcm(path, sample_rate), sample_rate))
                writer.add_silence(seg.pause_ms)
            duration = writer.duration
            gain = writer.gain_db(config.LOUDNESS_TARGET)
        try:
            encode_chapter(wav, mp3, m4a, bitrate, meta, cover, gain_db=gain,
                           duration=duration, on_progress=on_progress, source_rate=sample_rate)
        finally:
            wav.unlink(missing_ok=True)
        return duration

    @staticmethod
    def _join_without_reencoding(
        segments: list[Segment], paths: list[Path], workdir: Path, stem: str,
        mp3: Path | None, m4a: Path | None, meta: dict, cover: Path | None, on_progress=None,
    ) -> float:
        """Chapitre assemblé directement à partir des trames MP3 de la voix."""
        if any(p.suffix.lower() != ".mp3" for p in paths):
            raise NotJoinable("segments non MP3")
        raw = workdir / f"{stem}-raw.mp3"
        try:
            joiner = Mp3Joiner(raw, workdir)
            try:
                joiner.add_silence(500)  # courte respiration avant le début du chapitre
                for seg, path in zip(segments, paths):
                    if path.exists():  # absent = passage ignoré
                        joiner.add_segment(path.read_bytes())
                    joiner.add_silence(seg.pause_ms)
            finally:
                joiner.close()
            if joiner.fmt is None:
                raise NotJoinable("aucun segment audio dans ce chapitre")
            duration = joiner.duration
            if mp3:
                finalize_mp3(raw, mp3, meta, cover)
            if m4a:
                encode_aac(raw, m4a, config.ORIGIN_AAC_BITRATE, meta, duration, on_progress)
            return duration
        finally:
            raw.unlink(missing_ok=True)

    # -- progression et sauvegarde ----------------------------------------

    def _encode_progress(self, job: Job, chars_done: float, started: float) -> None:
        """Avancement de l'encodage en cours (reçu du thread d'encodage)."""
        if job.id in self._enc_live:
            self._enc_live[job.id] = (chars_done, started)
            self._update_progress(job)

    def _update_progress(self, job: Job) -> None:
        total = max(job.total_chars, 1)
        live_chars, live_start = self._enc_live.get(job.id, (0.0, 0.0))
        encoded = job.encoded_chars + live_chars
        job.progress = min(0.999, (_SYNTH_WEIGHT * job.synth_chars + (1 - _SYNTH_WEIGHT) * encoded) / total)
        job.eta_seconds = self._estimate_eta(job, encoded, live_chars, live_start)
        job.updated_at = time.time()

    def _estimate_eta(self, job: Job, encoded: float, live_chars: float, live_start: float) -> float | None:
        """Temps restant à partir des vitesses réellement mesurées.

        Synthèse (réseau) et encodage (processeur) avancent en parallèle : le
        temps restant est celui de la plus lente des deux chaînes. Sur un petit
        serveur, c'est souvent l'encodage, d'où l'importance de le mesurer.
        """
        start = self._run_start.get(job.id)
        if not start:
            return None
        now = time.time()
        t0, synth0 = start
        synth_rate = (job.synth_chars - synth0) / max(now - t0, 1e-6)
        chars, secs = self._enc_done.get(job.id, [0.0, 0.0])
        if live_start:
            chars, secs = chars + live_chars, secs + (now - live_start)
        enc_rate = chars / secs if secs > 3 and chars > 0 else None
        if enc_rate is None:
            return None  # pas encore de mesure fiable : on n'affiche rien plutôt qu'un chiffre faux
        rest_synth = job.total_chars - job.synth_chars
        t_synth = rest_synth / synth_rate if rest_synth > 0 and synth_rate > 0 else 0.0
        t_enc = (job.total_chars - encoded) / enc_rate
        return max(t_synth, t_enc) + (8.0 if "m4b" in job.settings.get("formats", []) else 0.0)

    def _save(self, job: Job, force: bool = True) -> None:
        """Écrit job.json (au plus toutes les 2 s pendant la synthèse)."""
        now = time.time()
        if not force and now - self._last_save.get(job.id, 0) < _SAVE_INTERVAL:
            return
        self._last_save[job.id] = now
        folder = self.job_dir(job.id)
        if not folder.exists():
            return
        path = folder / "job.json"
        tmp = path.with_suffix(".tmp")
        tmp.write_text(json.dumps(job.to_dict(), ensure_ascii=False), encoding="utf-8")
        tmp.replace(path)
