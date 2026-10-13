"""Tests de bout en bout : import -> conversion -> MP3 + M4B, reprise, API web."""

from __future__ import annotations

import asyncio
import re
import shutil
import subprocess
import time

import pytest

from app import config, library
from app.audio import ffmpeg_exe
from app.jobs import JobManager
from app.segment import build_segments
from tests.conftest import FakeEngine


def _probe(path) -> str:
    """Sortie de ``ffmpeg -i`` (flux, débit, chapitres)."""
    proc = subprocess.run([ffmpeg_exe(), "-hide_banner", "-i", str(path)],
                          stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    return proc.stderr.decode("utf-8", "replace")


async def _run_until_finished(manager: JobManager, job_id: str, timeout: float = 120) -> None:
    start = time.time()
    while manager.get(job_id).status in ("queued", "running"):
        if time.time() - start > timeout:
            raise TimeoutError
        await asyncio.sleep(0.05)


SETTINGS = {"engine": "fake", "voice": "bip", "bitrate": 128, "formats": ["mp3", "m4b"]}


def test_full_conversion(data_dir, sample_docx):
    book = library.import_book(shutil.copy(sample_docx, data_dir / "in.docx"), "roman.docx")
    engine = FakeEngine()

    async def scenario():
        manager = JobManager({"fake": engine}, config.JOBS_DIR)
        await manager.start()
        job = manager.create(book.id, SETTINGS)
        await _run_until_finished(manager, job.id)
        await manager.stop()
        return manager.get(job.id)

    job = asyncio.run(scenario())
    assert job.status == "done", job.error
    assert job.progress == 1.0
    # Les mentions légales (exclues par défaut) ne sont pas converties.
    assert [c.title for c in job.chapters] == ["Prologue", "Chapitre 1", "Chapitre 2"]
    assert any("Monsieur Dupont" in t and "14 heures 30" in t for t in engine.texts)

    out = data_dir / "jobs" / job.id / "output"
    mp3s = sorted(out.glob("*.mp3"))
    assert [p.name for p in mp3s] == ["01 - Prologue.mp3", "02 - Chapitre 1.mp3", "03 - Chapitre 2.mp3"]
    info = _probe(mp3s[1])
    assert "mp3" in info and "128 kb/s" in info
    assert "title           : Chapitre 1" in info

    m4b = out / job.m4b
    info = _probe(m4b)
    assert "aac" in info
    chapters = re.findall(r"Chapter #0:\d+: start ([\d.]+), end ([\d.]+)", info)
    assert len(chapters) == 3
    assert float(chapters[0][0]) == 0.0
    assert float(chapters[1][0]) == pytest.approx(float(chapters[0][1]), abs=0.01)
    # Fichiers de travail supprimés à la fin.
    assert not (data_dir / "jobs" / job.id / "work").exists()


def test_resume_after_failure_reuses_cached_segments(data_dir, sample_docx, monkeypatch):
    monkeypatch.setattr(config, "TTS_MAX_RETRIES", 1)
    book = library.import_book(shutil.copy(sample_docx, data_dir / "in.docx"), "roman.docx")
    failing = FakeEngine(fail_after=4)
    engines = {"fake": failing}

    async def scenario():
        manager = JobManager(engines, config.JOBS_DIR)
        await manager.start()
        job = manager.create(book.id, {**SETTINGS, "formats": ["mp3"]})
        await _run_until_finished(manager, job.id)
        assert manager.get(job.id).status == "error"
        assert "panne simulée" in manager.get(job.id).error
        done_before = failing.calls

        working = FakeEngine()
        engines["fake"] = working
        manager.resume(job.id)
        await _run_until_finished(manager, job.id)
        await manager.stop()
        return manager.get(job.id), done_before, working

    job, done_before, working = asyncio.run(scenario())
    assert job.status == "done"
    expected = sum(
        len(build_segments(c.title, c.paragraphs, FakeEngine.max_chars))
        for c in book.chapters if c.include
    )
    # Les segments déjà produits avant la panne n'ont pas été refaits.
    assert done_before == 4
    assert working.calls == expected - 4
    assert not job.m4b


def test_interrupted_jobs_are_resumable_after_restart(data_dir, sample_docx):
    book = library.import_book(shutil.copy(sample_docx, data_dir / "in.docx"), "roman.docx")

    async def scenario():
        manager = JobManager({"fake": FakeEngine()}, config.JOBS_DIR)
        job = manager.create(book.id, SETTINGS)  # file non démarrée : reste « queued »
        restarted = JobManager({"fake": FakeEngine()}, config.JOBS_DIR)
        restarted.load_existing()
        return restarted.get(job.id)

    job = asyncio.run(scenario())
    assert job.status == "interrupted"


def test_web_api(data_dir, sample_docx, monkeypatch):
    from fastapi.testclient import TestClient

    from app import server

    monkeypatch.setattr(server, "engines", {"fake": FakeEngine()})
    monkeypatch.setattr(server.manager, "engines", server.engines)
    monkeypatch.setattr(server.manager, "jobs_dir", config.JOBS_DIR)
    monkeypatch.setattr(server.manager, "jobs", {})

    with TestClient(server.app) as client:
        assert client.get("/").status_code == 200
        engines = client.get("/api/engines").json()
        assert engines["engines"][0]["default_voice"] == "bip"

        with sample_docx.open("rb") as f:
            r = client.post("/api/books", files={"file": ("roman.docx", f)})
        assert r.status_code == 200, r.text
        book = r.json()
        assert book["title"] == "Mon roman" and book["chapter_count"] == 4

        bad = client.post("/api/books", files={"file": ("x.txt", b"hello")})
        assert bad.status_code == 400

        # Renommer un chapitre et en exclure un autre.
        patch = [{"title": c["title"], "include": c["include"]} for c in book["chapters"]]
        patch[1]["title"] = "Le prologue"
        patch[3]["include"] = False
        r = client.put(f"/api/books/{book['id']}", json={"chapters": patch})
        assert r.json()["included_count"] == 2

        r = client.get(f"/api/books/{book['id']}/chapters/2")
        assert "Dupont" in r.json()["text"]

        r = client.post("/api/preview", json={"engine": "fake", "voice": "bip", "text": "Bonjour"})
        assert r.status_code == 200 and r.content[:4] == b"RIFF"

        r = client.post("/api/jobs", json={"book_id": book["id"], **SETTINGS})
        assert r.status_code == 200, r.text
        job_id = r.json()["id"]
        for _ in range(600):
            job = client.get(f"/api/jobs/{job_id}").json()
            if job["status"] not in ("queued", "running"):
                break
            time.sleep(0.05)
        assert job["status"] == "done", job
        assert [f["title"] for f in job["files"]] == ["Le prologue", "Chapitre 1"]
        assert client.get(job["files"][0]["url"]).content[:3] in (b"ID3", b"\xff\xfb")
        assert client.get(job["m4b_url"]).status_code == 200
        assert client.get(job["zip_url"]).content[:2] == b"PK"
        # Un nom de fichier qui ne fait pas partie de la conversion est refusé.
        assert client.get(f"/api/jobs/{job_id}/files/..%2Fjob.json").status_code == 404
        assert client.get("/api/books/..%2F..%2Fetc").status_code == 404


def test_cancel_is_immediate_even_during_slow_synthesis(data_dir, sample_docx):
    """L'annulation n'attend pas la fin des segments en cours."""
    book = library.import_book(shutil.copy(sample_docx, data_dir / "in.docx"), "roman.docx")

    class SlowEngine(FakeEngine):
        async def synthesize(self, text, settings, out_path):
            await asyncio.sleep(30)  # segment interminable

    async def scenario():
        manager = JobManager({"fake": SlowEngine()}, config.JOBS_DIR)
        await manager.start()
        job = manager.create(book.id, SETTINGS)
        while manager.get(job.id).status != "running":
            await asyncio.sleep(0.02)
        await asyncio.sleep(0.2)
        start = time.time()
        manager.cancel(job.id)
        while manager.get(job.id).status == "running":
            await asyncio.sleep(0.02)
        elapsed = time.time() - start
        # la file continue de fonctionner après une annulation
        second = manager.create(book.id, {**SETTINGS, "formats": ["mp3"]})
        manager.engines["fake"] = FakeEngine()
        await _run_until_finished(manager, second.id)
        await manager.stop()
        return manager.get(job.id), elapsed, manager.get(second.id)

    job, elapsed, second = asyncio.run(scenario())
    assert job.status == "cancelled"
    assert elapsed < 1.0
    assert second.status == "done"


def test_encoding_reports_progress(tmp_path):
    """L'encodage signale son avancement (la barre ne reste plus figée)."""
    import math
    from array import array

    from app.audio import ChapterWavWriter, encode_chapter

    sr = 24000
    wav = tmp_path / "c.wav"
    with ChapterWavWriter(wav, sr) as w:
        w.add_audio(array("h", (int(8000 * math.sin(i / 7)) for i in range(sr * 60))).tobytes())
        duration = w.duration
    seen: list[float] = []
    encode_chapter(wav, tmp_path / "c.mp3", tmp_path / "c.m4a", 128, {"title": "t"},
                   duration=duration, on_progress=seen.append)
    assert seen and seen[-1] > 0.95
    assert seen == sorted(seen)
    assert (tmp_path / "c.mp3").stat().st_size > 500_000
