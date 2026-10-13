"""Découpage d'un chapitre en segments à synthétiser.

Chaque segment correspond à un appel au moteur TTS et porte la durée du
silence à insérer après lui. C'est ce qui donne le rythme de lecture :

* pause courte entre deux morceaux d'un même long paragraphe ;
* pause moyenne entre deux paragraphes, un peu plus courte entre deux
  répliques de dialogue pour garder la vivacité de l'échange ;
* pause longue après le titre, à un changement de scène (« * * * ») et en fin
  de chapitre.

Découper par paragraphe permet aussi de reprendre une conversion
interrompue sans tout recommencer : chaque segment est mis en cache.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from .chapters import SCENE_BREAK_TOKEN
from .normalize import is_dialogue, normalize_for_speech, normalize_title

# Durées des silences en millisecondes (multipliées par le réglage « pauses »).
PAUSE_SENTENCE = 150
PAUSE_DIALOGUE = 450
PAUSE_PARAGRAPH = 650
PAUSE_TITLE = 1400
PAUSE_SCENE = 1800
PAUSE_CHAPTER_END = 2500

_SENTENCE_SPLIT = re.compile(r"(?<=[.!?…;:])\s+")
_CLAUSE_SPLIT = re.compile(r"(?<=[,;:])\s+")
_SPEAKABLE = re.compile(r"[^\W_]", re.UNICODE)


@dataclass
class Segment:
    text: str
    pause_ms: int


def _pack(pieces: list[str], max_chars: int, sep: str = " ") -> list[str]:
    """Regroupe des morceaux successifs sans dépasser ``max_chars``."""
    out: list[str] = []
    cur = ""
    for piece in pieces:
        if not cur:
            cur = piece
        elif len(cur) + len(sep) + len(piece) <= max_chars:
            cur += sep + piece
        else:
            out.append(cur)
            cur = piece
    if cur:
        out.append(cur)
    return out


def split_long_text(text: str, max_chars: int) -> list[str]:
    """Coupe un texte trop long aux fins de phrase, puis aux virgules, puis aux espaces."""
    if len(text) <= max_chars:
        return [text]
    pieces: list[str] = []
    for sentence in _SENTENCE_SPLIT.split(text):
        if len(sentence) <= max_chars:
            pieces.append(sentence)
            continue
        for clause in _CLAUSE_SPLIT.split(sentence):
            if len(clause) <= max_chars:
                pieces.append(clause)
            else:  # phrase interminable sans ponctuation : coupe aux espaces
                pieces.extend(_pack(clause.split(" "), max_chars))
    return _pack(pieces, max_chars)


def build_segments(
    title: str,
    paragraphs: list[str],
    max_chars: int,
    pause_factor: float = 1.0,
    read_title: bool = True,
) -> list[Segment]:
    """Transforme un chapitre en liste de segments prêts pour le moteur TTS."""
    segments: list[Segment] = []

    if read_title and title.strip():
        spoken = normalize_title(title)
        if _SPEAKABLE.search(spoken):
            segments.append(Segment(spoken, PAUSE_TITLE))

    # On garde le texte original pour savoir si un paragraphe est un dialogue.
    items = [p for p in paragraphs if p.strip()]
    for i, raw in enumerate(items):
        if raw == SCENE_BREAK_TOKEN:
            if segments:
                segments[-1].pause_ms = max(segments[-1].pause_ms, PAUSE_SCENE)
            continue
        text = normalize_for_speech(raw)
        if not _SPEAKABLE.search(text):
            continue
        for piece in split_long_text(text, max_chars):
            segments.append(Segment(piece, PAUSE_SENTENCE))
        nxt = items[i + 1] if i + 1 < len(items) else ""
        both_dialogue = is_dialogue(raw) and is_dialogue(nxt)
        segments[-1].pause_ms = PAUSE_DIALOGUE if both_dialogue else PAUSE_PARAGRAPH

    if segments:
        segments[-1].pause_ms = PAUSE_CHAPTER_END
    for s in segments:
        s.pause_ms = int(s.pause_ms * pause_factor)
    return segments
