"""Détection automatique des chapitres.

Trois sources d'information, de la plus fiable à la moins fiable :

1. les titres structurés (styles Word « Titre 1 », signets PDF, grande police) ;
2. les motifs de texte : « Chapitre 3 », « CHAPITRE PREMIER », « Deuxième
   partie », « Prologue », « IV » seul sur sa ligne... ;
3. à défaut, un découpage régulier (environ 30 minutes d'écoute par partie).

Le niveau de découpage est choisi automatiquement pour éviter de créer un
fichier par sous-section dans un essai très structuré.
"""

from __future__ import annotations

import re
from collections import Counter

from .models import BREAK, HEADING, PARAGRAPH, Block, Chapter

# Jeton stocké dans les paragraphes d'un chapitre pour marquer un changement
# de scène. Il est converti en silence long au moment de la synthèse.
SCENE_BREAK_TOKEN = "⁂"

_NUM = (
    r"(\d{1,3}|[IVXLC]{1,8}|premier|première|un|une|deux|trois|quatre|cinq|six|sept|"
    r"huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|dix-sept|dix-huit|"
    r"dix-neuf|vingt[\w-]*|trente[\w-]*|quarante[\w-]*|cinquante[\w-]*|soixante[\w-]*)"
)
_ORD = (
    r"(premi[eè]re?|deuxi[eè]me|seconde?|troisi[eè]me|quatri[eè]me|cinqui[eè]me|"
    r"sixi[eè]me|septi[eè]me|huiti[eè]me|neuvi[eè]me|dixi[eè]me|derni[eè]re?)"
)

# Chapitre : « Chapitre 12 », « CHAPITRE PREMIER », « Chapitre XII - Le retour ».
CHAPTER_RE = re.compile(rf"^(chapitre|chap\.|chapter)\s+{_NUM}\b", re.I)
# Grandes divisions : « Première partie », « Livre II », « Tome 1 ».
PART_RE = re.compile(rf"^({_ORD}\s+(partie|époque|livre)|(partie|livre|tome|part|book)\s+{_NUM})\b", re.I)
# Sections spéciales, courtes, seules sur leur ligne.
SPECIAL_RE = re.compile(
    r"^(prologue|[ée]pilogue|pr[ée]face|avant-propos|introduction|conclusion|"
    r"postface|interlude|annexes?|appendice|remerciements|note de l'auteur|"
    r"notes|bibliographie|sommaire|table des mati[eè]res|du m[eê]me auteur|index)\b",
    re.I,
)
# Numéro seul sur sa ligne : « 12 », « XII », « IV. ».
NUMBER_ONLY_RE = re.compile(r"^([IVXLC]{1,8}|\d{1,3})[.)]?$")

# Sections exclues par défaut (l'utilisateur peut les réactiver).
_EXCLUDED_TITLES = re.compile(
    r"^(sommaire|table des mati[eè]res|du m[eê]me auteur|index|notes|bibliographie)\b", re.I
)
_FRONT_MATTER = re.compile(
    r"©|\bisbn\b|tous droits|copyright|d[ée]p[ôo]t l[ée]gal|achev[ée] d'imprimer|"
    r"code de la propri[ée]t[ée]", re.I
)

# Mots par minute d'une voix de synthèse française à vitesse normale.
WORDS_PER_MINUTE = 160
# Taille moyenne minimale d'un chapitre pour accepter un niveau de découpage.
_MIN_AVG_WORDS = 300
# Taille d'une partie quand le livre n'a aucun titre (environ 30 min).
_FALLBACK_PART_WORDS = WORDS_PER_MINUTE * 30


def _detected_level(text: str) -> int:
    """Niveau de titre déduit du texte seul (0 si ce n'est pas un titre)."""
    if len(text) > 100:
        return 0
    if PART_RE.match(text):
        return 1
    if CHAPTER_RE.match(text):
        return 2
    if len(text) <= 60 and SPECIAL_RE.match(text) and not text.rstrip().endswith((".", ",")):
        return 2
    if NUMBER_ONLY_RE.match(text.strip()):
        return 2
    return 0


def _is_subtitle(text: str) -> bool:
    """Ligne courte sans ponctuation finale : probable sous-titre de chapitre."""
    return len(text) <= 80 and not text.rstrip().endswith((".", "!", "?", "…", ",", ";", ":", "»"))


def promote_headings(blocks: list[Block]) -> list[Block]:
    """Transforme en titres les paragraphes qui ressemblent à des titres.

    Fusionne aussi « Chapitre 3 » + « Le départ » en « Chapitre 3. Le départ ».
    """
    out: list[Block] = []
    for b in blocks:
        if b.kind == PARAGRAPH:
            lvl = _detected_level(b.text)
            if lvl:
                b = Block(HEADING, b.text, lvl, b.page)
        elif b.kind == HEADING:
            # Un titre de style « Titre 1 » qui dit « Deuxième partie » reste une partie.
            lvl = _detected_level(b.text)
            if lvl == 1 and b.level > 1:
                b = Block(HEADING, b.text, 1, b.page)
        out.append(b)

    merged: list[Block] = []
    i = 0
    while i < len(out):
        b = out[i]
        nxt = out[i + 1] if i + 1 < len(out) else None
        after = out[i + 2] if i + 2 < len(out) else None
        bare = b.kind == HEADING and (
            NUMBER_ONLY_RE.match(b.text) or re.fullmatch(rf"(chapitre|chapter)\s+{_NUM}[.:]?", b.text, re.I)
        )
        if (
            bare and nxt is not None and nxt.kind == PARAGRAPH and _is_subtitle(nxt.text)
            and after is not None and after.kind == PARAGRAPH
        ):
            merged.append(Block(HEADING, f"{b.text.rstrip('.:')}. {nxt.text}", b.level, b.page))
            i += 2
            continue
        merged.append(b)
        i += 1
    return merged


def _choose_split_level(blocks: list[Block]) -> int:
    """Choisit le niveau de titre le plus fin qui donne des chapitres assez longs."""
    levels = Counter(b.level for b in blocks if b.kind == HEADING)
    if not levels:
        return 0
    total_words = sum(len(b.text.split()) for b in blocks if b.kind == PARAGRAPH)
    best = min(levels)
    for lvl in sorted(levels):
        n = sum(c for l, c in levels.items() if l <= lvl)
        if n <= 400 and total_words / max(n, 1) >= _MIN_AVG_WORDS:
            best = lvl
    return best


def _split_by_length(paragraphs: list[str]) -> list[Chapter]:
    """Découpage de secours : parties d'environ 30 minutes, coupées entre deux paragraphes."""
    chapters: list[Chapter] = []
    current: list[str] = []
    words = 0
    for p in paragraphs:
        current.append(p)
        words += len(p.split())
        if words >= _FALLBACK_PART_WORDS:
            chapters.append(Chapter(f"Partie {len(chapters) + 1}", current))
            current, words = [], 0
    if current:
        if chapters and words < _FALLBACK_PART_WORDS / 4:
            chapters[-1].paragraphs.extend(current)  # évite une dernière partie minuscule
        else:
            chapters.append(Chapter(f"Partie {len(chapters) + 1}", current))
    return chapters


def _mark_excluded(chapters: list[Chapter]) -> None:
    """Désactive par défaut sommaire, mentions légales, index, notes..."""
    for idx, ch in enumerate(chapters):
        if _EXCLUDED_TITLES.match(ch.title):
            ch.include = False
        elif idx < 3 and ch.word_count < 300 and any(_FRONT_MATTER.search(p) for p in ch.paragraphs):
            ch.include = False


def split_chapters(blocks: list[Block], book_title: str = "") -> list[Chapter]:
    """Regroupe les blocs en chapitres."""
    blocks = promote_headings(blocks)
    level = _choose_split_level(blocks)

    if level == 0:
        paragraphs = [b.text if b.kind == PARAGRAPH else SCENE_BREAK_TOKEN for b in blocks]
        chapters = _split_by_length(paragraphs)
        _mark_excluded(chapters)
        return chapters

    chapters: list[Chapter] = []
    pending: list[str] = []          # titres consécutifs (partie + chapitre)
    current: Chapter | None = None

    for b in blocks:
        if b.kind == HEADING and b.level <= level:
            if current is not None and current.paragraphs:
                chapters.append(current)
            current = None
            pending.append(b.text)
            continue
        if current is None:
            title = ". ".join(t.rstrip(".") for t in pending) if pending else (
                "Début" if not book_title else book_title
            )
            current = Chapter(title=title)
            pending = []
        if b.kind == BREAK:
            if current.paragraphs and current.paragraphs[-1] != SCENE_BREAK_TOKEN:
                current.paragraphs.append(SCENE_BREAK_TOKEN)
        else:
            # Titre de niveau inférieur (sous-partie) : lu comme un paragraphe.
            current.paragraphs.append(b.text)

    if current is not None and current.paragraphs:
        chapters.append(current)

    for ch in chapters:
        while ch.paragraphs and ch.paragraphs[-1] == SCENE_BREAK_TOKEN:
            ch.paragraphs.pop()
    _mark_excluded(chapters)
    return chapters


def estimate_minutes(word_count: int, speed: float = 1.0) -> float:
    """Durée d'écoute estimée en minutes."""
    return word_count / (WORDS_PER_MINUTE * max(speed, 0.1))
