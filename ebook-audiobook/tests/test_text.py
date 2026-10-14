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
    # Pauses légèrement variées (± 10 %) mais reproductibles.
    assert segs[1].text == "Bonjour."
    assert 0.9 * PAUSE_DIALOGUE <= segs[1].pause_ms <= 1.1 * PAUSE_DIALOGUE
    assert segs[3].pause_ms >= 0.9 * PAUSE_SCENE
    assert all(len(s.text) <= 300 for s in segs)
    assert segs[-1].pause_ms >= 0.9 * PAUSE_CHAPTER_END
    again = build_segments("Chapitre 1", [f"{EM} Bonjour.", f"{EM} Salut.", "Narration."], max_chars=300)
    assert [s.pause_ms for s in again[:3]] == [s.pause_ms for s in segs[:3]]
    pieces = split_long_text("a" * 50 + " " + "b" * 50, 60)
    assert pieces == ["a" * 50, "b" * 50]


def test_questions_get_a_longer_pause():
    from app.segment import _humanize

    assert _humanize(600, "Tu viens ?") > _humanize(600, "Tu viens ?") - 1  # déterministe
    base = [_humanize(600, f"Phrase numéro {i}.") for i in range(50)]
    asked = [_humanize(600, f"Phrase numéro {i} ?") for i in range(50)]
    assert sum(asked) / 50 > sum(base) / 50 + 80


def test_trim_silence_keeps_tail_and_fades_edges():
    from array import array

    from app.audio import trim_silence

    sr = 24000
    voice = array("h", [8000] * sr)               # 1 s de « voix »
    pcm = array("h", [0] * sr) + voice + array("h", [0] * sr)
    out = array("h")
    out.frombytes(trim_silence(pcm.tobytes(), sr))
    # 60 ms gardées avant, 140 ms après la voix
    assert len(out) == sr + int(sr * 0.06) + int(sr * 0.14)
    assert out[0] == 0 and out[-1] == 0          # extrémités en fondu
    assert max(out) == 8000


def test_volume_gain_targets_level_without_clipping(tmp_path):
    import math
    from array import array

    from app.audio import ChapterWavWriter

    sr = 24000
    quiet = array("h", (int(1000 * math.sin(i / 5)) for i in range(sr)))
    with ChapterWavWriter(tmp_path / "a.wav", sr) as w:
        w.add_audio(quiet.tobytes())
        w.add_silence(2000)            # les silences ne faussent pas la mesure
        gain = w.gain_db(-20.0)
    # sinus d'amplitude 1000 : RMS ≈ -33 dBFS -> environ +13 dB
    assert 12 < gain < 14

    loud = array("h", (int(30000 * math.sin(i / 5)) for i in range(sr)))
    with ChapterWavWriter(tmp_path / "b.wav", sr) as w:
        w.add_audio(loud.tobytes())
        # le gain est plafonné pour que les crêtes restent sous -1 dBFS
        assert w.gain_db(-3.0) <= -1.0 - 20 * math.log10(30000 / 32768) + 0.01


def test_capitals_are_not_spelled_out():
    """Les mots en MAJUSCULES seraient épelés par la voix : on les remet en minuscules."""
    assert normalize_title("II. POURQUOI LE MOYEN-ÂGE DÉSESPÉRA") == "Deux. Pourquoi le moyen-âge désespéra."
    assert normalize_title("LA SORCIÈRE") == "La sorcière."
    assert normalize_title("CHAPITRE PREMIER") == "Chapitre premier."
    assert normalize_for_speech("IL ÉTAIT une fois un roi.") == "Il était une fois un roi."
    assert normalize_for_speech("À LA FIN DU JOUR, il partit.") == "À la fin du jour, il partit."
    assert normalize_for_speech("Un cri retentit : ATTENTION !") == "Un cri retentit: attention!"
    assert normalize_for_speech("C H A P I T R E premier") == "Chapitre premier"
    # Les vrais sigles courts et isolés restent en capitales.
    assert "SNCF" in normalize_for_speech("Elle travaillait à la SNCF depuis dix ans.")
    # Les nombres romains sont convertis avant la mise en minuscules.
    assert normalize_for_speech("Sous Louis XIV, au XVIIe siècle.") == "Sous Louis quatorze, au dix-septième siècle."
