"""Tests de l'extraction, du nettoyage, des chapitres et de la normalisation."""

from __future__ import annotations

from app.chapters import SCENE_BREAK_TOKEN, split_chapters
from app.cleaning import HYPHEN_MARK, clean_blocks
from app.docx_extract import extract_docx
from app.models import HEADING, PARAGRAPH, Block
from app.normalize import normalize_for_speech, normalize_title, roman_to_int
from app.pdf_extract import extract_pdf
from app.segment import PAUSE_CHAPTER_END, PAUSE_DIALOGUE, PAUSE_SCENE, build_segments, split_long_text

EM = "—"


def _pdf_chapters(path):
    doc = extract_pdf(path)
    return doc, split_chapters(clean_blocks(doc.blocks), doc.title)


def test_pdf_metadata_and_chapters(sample_pdf):
    doc, chapters = _pdf_chapters(sample_pdf)
    assert doc.title == "Le Grand Voyage"
    assert doc.author == "Jeanne Testeuse"
    assert doc.cover and doc.cover[:3] == b"\xff\xd8\xff"
    assert [c.title for c in chapters] == ["Chapitre premier", "Chapitre II"]


def test_pdf_removes_headers_page_numbers_and_footnotes(sample_pdf):
    _, chapters = _pdf_chapters(sample_pdf)
    text = "\n".join(p for c in chapters for p in c.paragraphs)
    assert "Le Grand Voyage" not in text
    assert "note de bas de page" not in text
    for p in (p for c in chapters for p in c.paragraphs):
        assert not p.strip().isdigit(), "numéro de page resté dans le texte"


def test_pdf_hyphenation_and_paragraphs(sample_pdf):
    _, chapters = _pdf_chapters(sample_pdf)
    first = chapters[0].paragraphs
    assert "un exemple de courage" in first[0]
    assert "peut-être" in first[0]
    assert first[1] == f"{EM} Où allez-vous ? demanda la femme."
    assert first[2] == f"{EM} Vers le nord, répondit-il."
    # Paragraphes de remplissage reconstruits malgré les sauts de page.
    assert all(p.endswith("toits.") for p in first[3:])
    assert SCENE_BREAK_TOKEN in chapters[1].paragraphs


def test_docx_extraction(sample_docx):
    doc = extract_docx(sample_docx)
    chapters = split_chapters(clean_blocks(doc.blocks), doc.title)
    assert doc.title == "Mon roman" and doc.author == "Paul Auteur"
    titles = [c.title for c in chapters]
    assert titles == ["Mon roman", "Prologue", "Chapitre 1", "Chapitre 2"]
    # Mentions légales exclues par défaut.
    assert chapters[0].include is False
    ch1 = chapters[2].paragraphs
    assert ch1[0] == "M. Dupont arriva le 1er janvier à 14h30, avec Mme Martin."  # appel de note retiré
    assert SCENE_BREAK_TOKEN in ch1


def test_hyphenation_uses_book_vocabulary():
    blocks = [
        Block(PARAGRAPH, f"Sa grand{HYPHEN_MARK}mère et sa grand-mère."),
        Block(PARAGRAPH, f"Un mot coupé : mai{HYPHEN_MARK}son, et une maison."),
    ]
    out = clean_blocks(blocks)
    assert "grand-mère et" in out[0].text
    assert "maison, et" in out[1].text


def test_chapter_patterns_and_subtitle_merge():
    blocks = [
        Block(PARAGRAPH, "Première partie"),
        Block(PARAGRAPH, "CHAPITRE PREMIER"),
        Block(PARAGRAPH, "Le départ"),
        Block(PARAGRAPH, "Texte du chapitre. " * 200),
        Block(PARAGRAPH, "IV"),
        Block(PARAGRAPH, "Encore du texte. " * 200),
    ]
    chapters = split_chapters(blocks)
    assert [c.title for c in chapters] == ["Première partie. CHAPITRE PREMIER. Le départ", "IV"]


def test_no_heading_falls_back_to_length_split():
    blocks = [Block(PARAGRAPH, "mot " * 1000) for _ in range(12)]
    chapters = split_chapters(blocks)
    assert len(chapters) >= 2
    assert chapters[0].title == "Partie 1"


def test_heading_level_choice_ignores_tiny_subsections():
    blocks = []
    for c in range(3):
        blocks.append(Block(HEADING, f"Chapitre {c + 1}", 1))
        for s in range(5):
            blocks.append(Block(HEADING, f"Section {s}", 2))
            blocks.append(Block(PARAGRAPH, "mot " * 100))
    chapters = split_chapters(blocks)
    assert len(chapters) == 3
    assert "Section 0" in chapters[0].paragraphs


def test_normalize_for_speech():
    assert roman_to_int("XIV") == 14 and roman_to_int("IIII") is None
    t = normalize_for_speech("M. Dupont et Mme Martin, au XIXe siècle, sous Louis XIV.")
    assert t == "Monsieur Dupont et Madame Martin, au dix-neuvième siècle, sous Louis quatorze."
    assert normalize_for_speech("Le 1er mai, la 2e fois, à 14h30.") == (
        "Le premier mai, la deuxième fois, à 14 heures 30."
    )
    assert normalize_for_speech(f"{EM} Je viens, {EM} dit-il, {EM} demain.") == "Je viens, dit-il, demain."
    assert normalize_for_speech("« Ce soir », dit-elle. Le chat dort.") == "Ce soir, dit-elle. Le chat dort."
    assert normalize_for_speech("François Ier régna ; le chapitre IV, etc.") == (
        "François premier régna; le chapitre quatre, et cetera."
    )
    assert normalize_title("XII") == "Chapitre douze."
    assert normalize_title("Chapitre 3. Le départ") == "Chapitre 3. Le départ."


def test_segments_pauses_and_splitting():
    long = "Une phrase assez longue pour le test. " * 40
    segs = build_segments("Chapitre 1", [
        f"{EM} Bonjour.", f"{EM} Salut.", "Narration.", SCENE_BREAK_TOKEN, long,
    ], max_chars=300)
    assert segs[0].text == "Chapitre 1."
    assert segs[1].text == "Bonjour." and segs[1].pause_ms == PAUSE_DIALOGUE
    assert segs[3].pause_ms == PAUSE_SCENE
    assert all(len(s.text) <= 300 for s in segs)
    assert segs[-1].pause_ms == PAUSE_CHAPTER_END
    pieces = split_long_text("a" * 50 + " " + "b" * 50, 60)
    assert pieces == ["a" * 50, "b" * 50]
