"""Fixtures de test : faux livres PDF/DOCX et faux moteur TTS (sans réseau)."""

from __future__ import annotations

import math
import struct
import sys
import wave
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app import config  # noqa: E402
from app.tts.base import SynthesisSettings, TTSEngine, VoiceInfo  # noqa: E402

EM = "—"


class FakeEngine(TTSEngine):
    """Moteur de test : produit un bip dont la durée dépend du texte."""

    id = "fake"
    label = "Faux moteur"
    max_chars = 400
    concurrency = 3
    output_ext = "wav"

    def __init__(self, fail_after: int | None = None) -> None:
        self.calls = 0
        self.texts: list[str] = []
        self.fail_after = fail_after

    def availability(self):
        return True, ""

    async def list_voices(self):
        return [VoiceInfo("bip", "Bip", "fr-FR")]

    async def synthesize(self, text: str, settings: SynthesisSettings, out_path: Path) -> None:
        if self.fail_after is not None and self.calls >= self.fail_after:
            raise RuntimeError("panne simulée")
        self.calls += 1
        self.texts.append(text)
        sr = 24000
        n = int(sr * min(2.0, 0.05 + len(text) / 400))
        with wave.open(str(out_path), "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(sr)
            w.writeframes(b"".join(
                struct.pack("<h", int(8000 * math.sin(2 * math.pi * 440 * i / sr))) for i in range(n)
            ))


@pytest.fixture
def data_dir(tmp_path, monkeypatch):
    """Redirige tous les dossiers de données vers un dossier temporaire."""
    monkeypatch.setattr(config, "DATA_DIR", tmp_path)
    monkeypatch.setattr(config, "BOOKS_DIR", tmp_path / "books")
    monkeypatch.setattr(config, "JOBS_DIR", tmp_path / "jobs")
    monkeypatch.setattr(config, "PIPER_VOICES_DIR", tmp_path / "piper_voices")
    config.ensure_dirs()
    return tmp_path


FILLER = (
    "Le vent soufflait sur la lande et les arbres pliaient sous sa force tandis que "
    "les voyageurs avançaient lentement vers le village dont on apercevait les toits."
)


def _wrap(text: str, width: int = 85) -> list[str]:
    words, lines, cur = text.split(), [], ""
    for w in words:
        if len(cur) + len(w) + 1 > width:
            lines.append(cur)
            cur = w
        else:
            cur = f"{cur} {w}".strip()
    if cur:
        lines.append(cur)
    return lines


@pytest.fixture
def sample_pdf(tmp_path) -> Path:
    """PDF de 8 pages avec en-têtes, numéros de page, notes, césures, dialogues."""
    import pymupdf as fitz

    # Chaque élément : ("h", titre) ou ("p", [lignes]) ; le premier vers d'un
    # paragraphe est en alinéa.
    content: list[tuple[str, object]] = [("h", "Chapitre premier")]
    content.append(("p", [
        "Il était une fois, par exemple, un voyageur qui cherchait un exem-",
        "ple de courage. Il se demandait s'il trouverait peut-",
        "être un jour la réponse à sa question.",
    ]))
    content.append(("p", [f"{EM} Où allez-vous ? demanda la femme."]))
    content.append(("p", [f"{EM} Vers le nord, répondit-il."]))
    content.append(("note", "1. Ceci est une note de bas de page à supprimer."))
    for _ in range(40):
        content.append(("p", _wrap(FILLER)))
    content.append(("h", "Chapitre II"))
    for _ in range(40):
        content.append(("p", _wrap(FILLER)))
    content.append(("p", ["* * *"]))
    for _ in range(4):
        content.append(("p", _wrap(FILLER)))

    doc = fitz.open()
    font = fitz.Font("tiro")  # police Unicode (tiret cadratin, accents)

    def write(pg, pos, text, size):
        tw = fitz.TextWriter(pg.rect)
        tw.append(pos, text, font=font, fontsize=size)
        tw.write_text(pg)

    page = None
    y = 0.0
    pno = 0
    notes: list[str] = []

    def new_page():
        nonlocal page, y, pno, notes
        if page is not None:
            for k, n in enumerate(notes):
                write(page, (72, 760 + 10 * k), n, 8)
            write(page, (290, 815), str(pno), 9)
        notes = []
        page = doc.new_page(width=595, height=842)
        pno += 1
        write(page, (72, 40), "Le Grand Voyage", 9)
        y = 110

    new_page()
    for kind, value in content:
        if kind == "note":
            notes.append(value)  # type: ignore[arg-type]
            continue
        if kind == "h":
            if y > 140:
                new_page()
            y += 40
            write(page, (72, y), value, 20)
            y += 40
            continue
        for i, line in enumerate(value):  # type: ignore[arg-type]
            if y > 720:
                new_page()
            x = 90 if i == 0 else 72
            write(page, (x, y), line, 11)
            y += 14
    new_page()  # finalise la dernière page (numéro)
    doc.delete_page(-1)
    doc.set_metadata({"title": "Le Grand Voyage", "author": "Jeanne Testeuse"})
    path = tmp_path / "livre.pdf"
    doc.save(str(path))
    doc.close()
    return path


@pytest.fixture
def sample_docx(tmp_path) -> Path:
    import docx

    d = docx.Document()
    d.core_properties.title = "Mon roman"
    d.core_properties.author = "Paul Auteur"
    d.add_paragraph("© Éditions Test, 2024. Tous droits réservés. ISBN 978-2-0000-0000-0")
    d.add_heading("Prologue", level=1)
    d.add_paragraph("Tout commença un matin d'hiver, au XIXe siècle, sous le règne de Louis XIV.")
    d.add_heading("Chapitre 1", level=1)
    p = d.add_paragraph("M. Dupont arriva le 1er janvier")
    run = p.add_run("1")
    run.font.superscript = True
    p.add_run(" à 14h30, avec Mme Martin.")
    d.add_paragraph(f"{EM} Bonjour ! dit-il.")
    d.add_paragraph(f"{EM} Bonjour, répondit-elle.")
    d.add_paragraph("* * *")
    for _ in range(5):
        d.add_paragraph(FILLER)
    d.add_heading("Chapitre 2", level=1)
    for _ in range(5):
        d.add_paragraph(FILLER)
    path = tmp_path / "roman.docx"
    d.save(str(path))
    return path
