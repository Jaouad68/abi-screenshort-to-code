"""Nettoyage du texte extrait, commun au PDF et au DOCX.

Les traitements spécifiques à la mise en page PDF (en-têtes, pieds de page,
notes de bas de page) sont faits dans ``pdf_extract`` car ils ont besoin des
positions sur la page. Ici on travaille uniquement sur le texte :

* caractères parasites (ligatures, tirets conditionnels, espaces spéciales) ;
* césures en fin de ligne, marquées par ``HYPHEN_MARK`` lors de l'extraction ;
* lignes de table des matières (« Chapitre 3 ........ 47 ») ;
* paragraphes vides.
"""

from __future__ import annotations

import re
import unicodedata
from collections import Counter

from .models import BREAK, HEADING, PARAGRAPH, Block

# Marqueur inséré par l'extracteur PDF à l'endroit d'une césure de fin de
# ligne (« exem-\nple »). On décide plus tard s'il faut garder le trait
# d'union (« peut-être ») ou le supprimer (« exemple »).
HYPHEN_MARK = "\x00"

_LIGATURES = {
    "ﬀ": "ff", "ﬁ": "fi", "ﬂ": "fl", "ﬃ": "ffi",
    "ﬄ": "ffl", "ﬅ": "st", "ﬆ": "st", "Œ": "Œ", "œ": "œ",
}

# Caractères invisibles ou parasites à supprimer.
_INVISIBLE = re.compile("[­​‌‍⁠﻿]")
# Espaces exotiques (insécables, fines...) ramenées à une espace simple.
_SPACES = re.compile("[  -   　\t]+")

# Second élément d'un mot composé qu'on ne doit PAS recoller même si la
# césure tombe sur le trait d'union : « peut-|être », « celui-|ci »...
_KEEP_HYPHEN_SUFFIXES = {
    "être", "là", "ci", "même", "mêmes", "t", "il", "ils", "elle", "elles",
    "on", "je", "tu", "nous", "vous", "le", "la", "les", "moi", "toi", "lui",
    "leur", "leurs", "y", "en", "dessus", "dessous", "dedans", "dehors",
    "delà", "deçà", "midi", "soir", "uns", "unes", "huit", "neuf", "sept",
    "six", "cinq", "quatre", "trois", "deux", "dix", "vingt", "cent",
}

# Lignes de sommaire : texte suivi de points de conduite et d'un numéro.
_TOC_LINE = re.compile(r"(\.\s?){4,}\s*\d+\s*$|\s(\.\s?){3,}\d+|…{2,}\s*\d+\s*$")

# Séparateurs de scène.
SCENE_BREAK_RE = re.compile(r"^[\s*•·#~⁂◆◇❖§_\-–—]{1,15}$")

_WORD_RE = re.compile(r"[\w'’\-]+", re.UNICODE)


def clean_text(text: str) -> str:
    """Normalise les caractères d'un fragment de texte, sans toucher au sens."""
    text = unicodedata.normalize("NFC", text)
    for lig, repl in _LIGATURES.items():
        text = text.replace(lig, repl)
    text = _INVISIBLE.sub("", text)
    text = _SPACES.sub(" ", text)
    text = text.replace("\r", " ").replace("\n", " ")
    return re.sub(r" {2,}", " ", text).strip()


def is_scene_break(text: str) -> bool:
    """Vrai si la ligne est un séparateur de scène (« * * * », « ⁂ »...)."""
    t = text.strip()
    return bool(t) and bool(SCENE_BREAK_RE.match(t)) and not t.isalnum()


def _build_vocabulary(blocks: list[Block]) -> Counter[str]:
    """Compte les mots du livre (hors fragments coupés) pour arbitrer les césures."""
    vocab: Counter[str] = Counter()
    for b in blocks:
        # On retire les mots contenant une césure pour ne pas fausser le décompte.
        clean = re.sub(r"\S*" + HYPHEN_MARK + r"\S*", " ", b.text)
        for w in _WORD_RE.findall(clean.lower()):
            vocab[w.strip("-'’")] += 1
    return vocab


def resolve_hyphenation(blocks: list[Block]) -> list[Block]:
    """Recolle les mots coupés en fin de ligne.

    Règle : on garde le trait d'union si la forme avec tiret existe ailleurs
    dans le livre (« grand-mère ») ou si le second élément est un suffixe de
    composé courant (« peut-être »). Sinon on recolle (« exem-ple » -> « exemple »).
    """
    if not any(HYPHEN_MARK in b.text for b in blocks):
        return blocks

    vocab = _build_vocabulary(blocks)
    pattern = re.compile(r"([\w'’]+)" + HYPHEN_MARK + r"([\w'’]+)")

    def repl(m: re.Match[str]) -> str:
        left, right = m.group(1), m.group(2)
        hyphenated = f"{left}-{right}".lower()
        joined = f"{left}{right}".lower()
        if vocab.get(hyphenated, 0) > vocab.get(joined, 0):
            return f"{left}-{right}"
        if vocab.get(joined, 0) == 0 and right.lower() in _KEEP_HYPHEN_SUFFIXES:
            return f"{left}-{right}"
        return f"{left}{right}"

    out = []
    for b in blocks:
        text = pattern.sub(repl, b.text)
        # Marqueur isolé (césure suivie d'un chiffre, etc.) : on garde le tiret.
        text = text.replace(HYPHEN_MARK, "-")
        out.append(Block(b.kind, text, b.level, b.page))
    return out


def is_toc_line(text: str) -> bool:
    """Détecte une entrée de sommaire (« Chapitre 3 ....... 47 »)."""
    return bool(_TOC_LINE.search(text))


def clean_blocks(blocks: list[Block]) -> list[Block]:
    """Applique tout le nettoyage textuel et supprime les blocs inutiles."""
    blocks = resolve_hyphenation(blocks)
    out: list[Block] = []
    for b in blocks:
        if b.kind == BREAK:
            out.append(b)
            continue
        text = clean_text(b.text)
        if not text:
            continue
        if b.kind == PARAGRAPH and is_scene_break(text):
            out.append(Block(BREAK, "", 0, b.page))
            continue
        if is_toc_line(text):
            continue
        # Points de suspension typographiques.
        text = re.sub(r"\.{3,}", "…", text)
        out.append(Block(b.kind, text, b.level, b.page))

    # Supprime les séparateurs en double ou en tête/fin de chapitre.
    final: list[Block] = []
    for b in out:
        if b.kind == BREAK and (not final or final[-1].kind in (BREAK, HEADING)):
            continue
        final.append(b)
    while final and final[-1].kind == BREAK:
        final.pop()
    return final
