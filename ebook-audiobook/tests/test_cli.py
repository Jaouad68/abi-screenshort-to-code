"""Tests de la conversion en ligne de commande (GitHub Actions)."""

from __future__ import annotations

import asyncio
import zipfile
from pathlib import Path

import convert_cli
from tests.conftest import FakeEngine

ROOT = Path(__file__).resolve().parent.parent


def test_settings_file_of_the_repository_is_valid():
    s = convert_cli.to_job_settings(convert_cli.read_settings(ROOT.parent / "a-convertir" / "reglages.txt"))
    assert s == {
        "engine": "edge", "voice": "fr-FR-HenriNeural", "speed": 1.0, "tone": "neutre",
        "pause_factor": 1.0, "bitrate": 128, "formats": ["m4b", "mp3"], "read_titles": True,
    }


def test_read_settings_accepts_comments_and_commas(tmp_path):
    f = tmp_path / "r.txt"
    f.write_text("# commentaire\nvitesse = 1,2  # plus vite\nvoix=fr-FR-DeniseNeural\ninconnu = 3\n", encoding="utf-8")
    s = convert_cli.to_job_settings(convert_cli.read_settings(f))
    assert s["speed"] == 1.2 and s["voice"] == "fr-FR-DeniseNeural"


def test_convert_produces_m4b_and_zip(data_dir, sample_docx):
    settings = {**convert_cli.to_job_settings(convert_cli.DEFAULTS), "engine": "fake", "voice": "bip"}
    out = asyncio.run(convert_cli.convert(sample_docx, settings, data_dir / "sortie", {"fake": FakeEngine()}))
    assert (out / "titre.txt").read_text(encoding="utf-8") == "Mon roman"
    assert (out / "Mon roman.m4b").stat().st_size > 1000
    with zipfile.ZipFile(out / "Mon roman (MP3).zip") as zf:
        assert zf.namelist() == ["01 - Prologue.mp3", "02 - Chapitre 1.mp3", "03 - Chapitre 2.mp3"]
    assert sample_docx.exists()  # le fichier du dépôt n'est pas déplacé
