"""Préparation du texte pour la synthèse vocale (français).

Les moteurs TTS lisent bien le texte courant, mais trébuchent sur les
conventions typographiques des livres. Ce module les réécrit en langage parlé :

* abréviations : « M. Dupont » -> « Monsieur Dupont », « Mme » -> « Madame » ;
* ordinaux : « XIXe siècle » -> « dix-neuvième siècle », « 1er » -> « premier » ;
* souverains et chapitres : « Louis XIV » -> « Louis quatorze » ;
* dialogues : suppression des tirets de dialogue, incises « — dit-il — » ;
* guillemets, astérisques et symboles non prononcés.
"""

from __future__ import annotations

import re

from num2words import num2words

EM_DASH = "—"
EN_DASH = "–"

# ---------------------------------------------------------------------------
# Nombres romains
# ---------------------------------------------------------------------------

_ROMAN_VALUES = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100, "D": 500, "M": 1000}
_ROMAN_RE = re.compile(r"^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$")


def roman_to_int(s: str) -> int | None:
    """Convertit un nombre romain valide en entier, sinon ``None``."""
    s = s.upper()
    if not s or not _ROMAN_RE.match(s):
        return None
    total = 0
    for i, ch in enumerate(s):
        v = _ROMAN_VALUES[ch]
        if i + 1 < len(s) and _ROMAN_VALUES[s[i + 1]] > v:
            total -= v
        else:
            total += v
    return total


def _ordinal(n: int, feminine: bool = False) -> str:
    if n == 1:
        return "première" if feminine else "premier"
    return num2words(n, lang="fr", to="ordinal")


def _cardinal(n: int) -> str:
    return num2words(n, lang="fr")


# ---------------------------------------------------------------------------
# Abréviations
# ---------------------------------------------------------------------------

_UPPER = "A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ"

_ABBREVIATIONS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(rf"\bMM\.\s+(?=[{_UPPER}])"), "Messieurs "),
    (re.compile(rf"\bM\.\s+(?=[{_UPPER}])"), "Monsieur "),
    (re.compile(r"\bMmes\b\.?"), "Mesdames"),
    (re.compile(r"\bMme\b\.?"), "Madame"),
    (re.compile(r"\bMlles\b\.?"), "Mesdemoiselles"),
    (re.compile(r"\bMlle\b\.?"), "Mademoiselle"),
    (re.compile(rf"\bDr\b\.?\s+(?=[{_UPPER}])"), "Docteur "),
    (re.compile(rf"\bPr\b\.?\s+(?=[{_UPPER}])"), "Professeur "),
    (re.compile(rf"\bMgr\b\.?\s+(?=[{_UPPER}])"), "Monseigneur "),
    (re.compile(r"\bSte-(?=[A-Z])"), "Sainte-"),
    (re.compile(r"\bSt-(?=[A-Z])"), "Saint-"),
    (re.compile(r"\bav\.\s?J\.-C\."), "avant Jésus-Christ"),
    (re.compile(r"\bapr\.\s?J\.-C\."), "après Jésus-Christ"),
    (re.compile(r"\bJ\.-C\."), "Jésus-Christ"),
    (re.compile(r"\bc\.-à-d\.", re.I), "c'est-à-dire"),
    (re.compile(r"\bp\.\s?ex\.", re.I), "par exemple"),
    (re.compile(r"\bcf\.", re.I), "voir"),
    (re.compile(r"\betc\.(?=\s*[,;:)])"), "et cetera"),
    (re.compile(r"\betc\.(\.{0,2})"), "et cetera."),
    (re.compile(r"\b[Nn]°\s?(?=\d)"), "numéro "),
    (re.compile(r"\bp\.\s?(?=\d)"), "page "),
    (re.compile(r"\bchap\.\s?(?=[\dIVXLC])"), "chapitre "),
    (re.compile(r"\bvol\.\s?(?=[\dIVXLC])"), "volume "),
    (re.compile(r"\s&\s"), " et "),
    (re.compile(r"§\s?"), "paragraphe "),
]

# Souverains, papes... suivis d'un numéro romain : « Henri IV », « Louis XIV ».
_REGNAL_RE = re.compile(
    r"\b(Louis|Henri|Charles|François|Napoléon|Philippe|Jean|Pie|Benoît|Léon|"
    r"Grégoire|Innocent|Clément|Paul|Jacques|Guillaume|Édouard|Richard|Frédéric|"
    r"Pierre|Alexandre|Nicolas|Catherine|Élisabeth|Elizabeth|Ferdinand|Victor-Emmanuel|"
    r"Othon|Rodolphe|Sixte|Urbain|Boniface|Alphonse|Sanche|Ramsès|Amenhotep|Thoutmôsis|"
    r"Ptolémée|Mehmed|Soliman|Gustave|Christian|Frédéric-Guillaume|Constantin|Basile)"
    r"\s+([IVXLC]+)(er)?\b"
)
# « Chapitre IV », « Livre II », « Acte III » -> cardinal.
_SECTION_ROMAN_RE = re.compile(
    r"\b((?i:chapitre|partie|livre|tome|acte|scène|volume|chant|section|article))\s+([IVXLC]+)\b"
)
# « XIXe siècle », « IIIe République », « Ier » -> ordinal.
_ROMAN_ORDINAL_RE = re.compile(r"\b([IVXLC]+)(er|re|ère|e|ème|è)\b")
# « 1er », « 2e », « 21ème », « 1re ».
_ARABIC_ORDINAL_RE = re.compile(r"\b(\d{1,4})(er|re|ère|e|ème|è|eme)\b")
# « 14h30 », « 8 h 05 ».
_TIME_RE = re.compile(r"\b(\d{1,2})\s?h\s?(\d{2})\b")


def _roman_ordinal(m: re.Match[str]) -> str:
    # « Ce », « Le », « De », « Me » sont des mots, pas des ordinaux romains.
    if len(m.group(1)) == 1 and m.group(1) in "CLDM":
        return m.group(0)
    n = roman_to_int(m.group(1))
    if n is None:
        return m.group(0)
    return _ordinal(n, feminine=m.group(2) in ("re", "ère"))


def _arabic_ordinal(m: re.Match[str]) -> str:
    return _ordinal(int(m.group(1)), feminine=m.group(2) in ("re", "ère"))


def _regnal(m: re.Match[str]) -> str:
    n = roman_to_int(m.group(2))
    if n is None:
        return m.group(0)
    return f"{m.group(1)} {'premier' if n == 1 else _cardinal(n)}"


def _section_roman(m: re.Match[str]) -> str:
    n = roman_to_int(m.group(2))
    if n is None:
        return m.group(0)
    return f"{m.group(1)} {_cardinal(n)}"


# ---------------------------------------------------------------------------
# Dialogues et ponctuation
# ---------------------------------------------------------------------------

_DIALOGUE_START = re.compile(rf"^\s*[{EM_DASH}{EN_DASH}\-]\s*")
# Incise entre tirets au milieu d'une phrase : « Je viens, — dit-il, — demain. »
_INNER_DASH = re.compile(rf"\s+[{EM_DASH}{EN_DASH}]\s+")
_QUOTES = re.compile(r"[«»\"“”„‹›]")


def is_dialogue(text: str) -> bool:
    """Vrai si le paragraphe est une réplique de dialogue."""
    t = text.lstrip()
    return t.startswith((EM_DASH, EN_DASH, "« ", "«")) or bool(re.match(r"^-\s", t))


def normalize_for_speech(text: str) -> str:
    """Réécrit un paragraphe pour qu'il soit lu naturellement."""
    t = text.replace("’", "'").replace("‘", "'")

    # Notes et renvois résiduels : « [1] », « (2) » collé à un mot, astérisques.
    t = re.sub(r"\[\d{1,3}\]", "", t)
    t = re.sub(r"(?<=[^\W\d_])\*+", "", t)
    t = re.sub(r"\[(…|\.\.\.)\]|\((…|\.\.\.)\)", "…", t)

    # Dialogues : le tiret initial n'est pas prononcé ; les incises deviennent
    # des virgules, ce qui produit la petite pause attendue.
    t = _DIALOGUE_START.sub("", t)
    t = _INNER_DASH.sub(", ", t)
    t = re.sub(rf"[{EM_DASH}{EN_DASH}]", ", ", t)

    # Guillemets : non prononcés, la ponctuation suffit à rythmer la phrase.
    t = _QUOTES.sub("", t)

    for pattern, repl in _ABBREVIATIONS:
        t = pattern.sub(repl, t)

    t = _REGNAL_RE.sub(_regnal, t)
    t = _SECTION_ROMAN_RE.sub(_section_roman, t)
    t = _ROMAN_ORDINAL_RE.sub(_roman_ordinal, t)
    t = _ARABIC_ORDINAL_RE.sub(_arabic_ordinal, t)
    t = _TIME_RE.sub(lambda m: f"{m.group(1)} heures {m.group(2)}", t)

    # Ponctuation répétée et symboles décoratifs.
    t = re.sub(r"([!?])\1+", r"\1", t)
    t = re.sub(r"\.{4,}", "…", t)
    t = re.sub(r"[_~#|•◆◇❖]+", " ", t)
    t = re.sub(r"\s+([,.;:!?…])", r"\1", t)   # pas d'espace avant la ponctuation
    t = re.sub(r",\s*,", ",", t)
    t = re.sub(r"^[\s,;:]+", "", t)
    t = re.sub(r"\s{2,}", " ", t).strip()
    return t


def normalize_title(title: str) -> str:
    """Prépare un titre de chapitre (« IV » seul -> « Chapitre quatre »)."""
    t = title.strip()
    n = roman_to_int(t.rstrip(".")) if re.fullmatch(r"[IVXLC]+\.?", t) else None
    if n is not None:
        t = f"Chapitre {_cardinal(n)}"
    elif re.fullmatch(r"\d{1,3}\.?", t):
        t = f"Chapitre {t.rstrip('.')}"
    t = normalize_for_speech(t)
    if t and not t.endswith((".", "!", "?", "…")):
        t += "."
    return t
