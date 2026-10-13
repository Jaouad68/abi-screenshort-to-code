"""Conversion en ligne de commande, sans interface (utilisée par GitHub Actions).

    python convert_cli.py --settings reglages.txt --out sortie livre1.pdf livre2.docx
    python convert_cli.py --list fichiers.txt --out sortie

Pour chaque livre, crée ``<sortie>/<titre>/`` contenant le M4B, un ZIP des MP3
et ``titre.txt``. En cas de coupure réseau, la conversion est reprise
automatiquement (jusqu'à 3 fois) sans refaire les segments déjà produits.
"""

from __future__ import annotations

import argparse
import asyncio
import shutil
import subprocess
import sys
import tempfile
import time
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from app import config, library  # noqa: E402
from app.chapters import estimate_minutes  # noqa: E402
from app.jobs import JobManager, safe_filename  # noqa: E402
from app.tts import get_engines  # noqa: E402

# Réglages par défaut, modifiables dans le fichier de réglages.
DEFAULTS = {
    "moteur": "edge",
    "voix": "fr-FR-RemyMultilingualNeural",
    "vitesse": "1.0",
    "ton": "narration",
    "pauses": "1.0",
    "debit": "128",
    "formats": "m4b, mp3",
    "lire_titres": "oui",
}
MAX_RESUMES = 3


def read_settings(path: Path | None) -> dict[str, str]:
    """Lit un fichier « clé = valeur » (lignes commençant par # ignorées)."""
    values = dict(DEFAULTS)
    if path and path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.split("#", 1)[0].strip()
            if "=" in line:
                key, value = (p.strip() for p in line.split("=", 1))
                if key.lower() in values and value:
                    values[key.lower()] = value
    return values


def to_job_settings(s: dict[str, str]) -> dict:
    """Traduit les réglages en français vers ceux attendus par JobManager."""
    def number(key: str) -> float:
        return float(s[key].replace(",", "."))

    return {
        "engine": s["moteur"].lower(),
        "voice": s["voix"],
        "speed": number("vitesse"),
        "tone": s["ton"].lower(),
        "pause_factor": number("pauses"),
        "bitrate": int(number("debit")),
        "formats": [f.strip().lower() for f in s["formats"].split(",") if f.strip()],
        "read_titles": s["lire_titres"].lower() in ("oui", "yes", "true", "1"),
    }


def _ensure_piper_voice(voice: str) -> None:
    """Télécharge la voix Piper demandée si elle n'est pas encore présente."""
    if not (config.PIPER_VOICES_DIR / f"{voice}.onnx").exists():
        subprocess.run([sys.executable, str(ROOT / "scripts" / "download_voices.py"), voice], check=True)


async def convert(source: Path, settings: dict, out_root: Path, engines=None) -> Path:
    """Convertit un livre et renvoie le dossier contenant les fichiers produits."""
    print(f"\n=== {source.name} ===", flush=True)
    with tempfile.TemporaryDirectory() as tmp:
        copy = Path(tmp) / source.name
        shutil.copy(source, copy)  # import_book déplace le fichier reçu
        book = library.import_book(copy, source.name)

    print(f"Titre : {book.title} | Auteur : {book.author or 'inconnu'}")
    for i, ch in enumerate(book.chapters, start=1):
        mark = "x" if ch.include else " "
        print(f"  [{mark}] {i:3d}. {ch.title[:70]}  ({ch.word_count} mots)")
    words = sum(c.word_count for c in book.chapters if c.include)
    print(f"Durée d'écoute estimée : {estimate_minutes(words, settings['speed']) / 60:.1f} h", flush=True)

    manager = JobManager(engines or get_engines())
    await manager.start()
    try:
        job = manager.create(book.id, settings)
        resumes = 0
        last_print = 0.0
        while True:
            await asyncio.sleep(3)
            if time.time() - last_print > 60:
                eta = f", reste ≈ {job.eta_seconds / 60:.0f} min" if job.eta_seconds else ""
                print(f"  {job.progress * 100:5.1f} %  {job.message}{eta}", flush=True)
                last_print = time.time()
            if job.status in ("queued", "running"):
                continue
            if job.status == "done":
                break
            if resumes < MAX_RESUMES:
                resumes += 1
                print(f"  Échec ({job.error}). Reprise automatique {resumes}/{MAX_RESUMES} dans 60 s…", flush=True)
                await asyncio.sleep(60)
                manager.resume(job.id)
                continue
            raise RuntimeError(job.error or job.message)
    finally:
        await manager.stop()

    produced = manager.job_dir(job.id) / "output"
    dest = out_root / safe_filename(job.title)
    dest.mkdir(parents=True, exist_ok=True)
    if job.m4b:
        shutil.copy(produced / job.m4b, dest / job.m4b)
    mp3s = [c.mp3 for c in job.chapters if c.mp3]
    if mp3s:
        with zipfile.ZipFile(dest / f"{safe_filename(job.title)} (MP3).zip", "w", zipfile.ZIP_STORED) as zf:
            for name in mp3s:
                zf.write(produced / name, name)
    (dest / "titre.txt").write_text(job.title, encoding="utf-8")
    hours = sum(c.duration for c in job.chapters) / 3600
    print(f"Terminé : {len(job.chapters)} chapitres, {hours:.1f} h d'audio.", flush=True)
    return dest


async def main_async(args) -> int:
    files = [Path(f) for f in args.files]
    if args.list:
        files += [Path(l.strip()) for l in Path(args.list).read_text(encoding="utf-8").splitlines() if l.strip()]
    files = [f for f in files if f.suffix.lower() in library.SUPPORTED and f.exists()]
    if not files:
        print("Aucun fichier PDF ou DOCX à convertir.")
        return 0

    config.ensure_dirs()
    settings = to_job_settings(read_settings(Path(args.settings) if args.settings else None))
    print(f"Réglages : {settings}")
    if settings["engine"] == "piper":
        _ensure_piper_voice(settings["voice"])

    out_root = Path(args.out)
    failures = 0
    for f in files:
        try:
            await convert(f, settings, out_root)
        except Exception as exc:
            failures += 1
            print(f"::error::{f.name} : {exc}", flush=True)
    return 1 if failures == len(files) else 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Convertit des ebooks en livres audio")
    parser.add_argument("files", nargs="*", help="fichiers PDF ou DOCX")
    parser.add_argument("--list", help="fichier texte listant un livre par ligne")
    parser.add_argument("--settings", help="fichier de réglages (clé = valeur)")
    parser.add_argument("--out", default="sortie", help="dossier de sortie")
    sys.exit(asyncio.run(main_async(parser.parse_args())))


if __name__ == "__main__":
    main()
