"""Extraction du texte d'un PDF avec PyMuPDF.

Un PDF ne contient pas de « paragraphes » : seulement des lignes positionnées
sur des pages. Ce module reconstruit la structure du livre :

1. lecture de toutes les lignes avec leur position, taille et style ;
2. suppression des en-têtes et pieds de page répétés, et des numéros de page ;
3. suppression des notes de bas de page et des appels de note en exposant ;
4. détection des titres (police plus grande que le corps du texte) ;
5. regroupement des lignes en paragraphes (alinéa, espacement, ligne courte) ;
6. utilisation des signets du PDF (table des matières interne) s'ils existent.

Le traitement se fait page par page et ne garde en mémoire que du texte :
un livre de 1 000 pages occupe quelques dizaines de Mo au maximum.
"""

from __future__ import annotations

import re
import statistics
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

try:  # PyMuPDF >= 1.24 s'importe sous le nom « pymupdf »
    import pymupdf as fitz
except ImportError:  # pragma: no cover - anciennes versions
    import fitz  # type: ignore

from .cleaning import HYPHEN_MARK, clean_text, is_scene_break
from .models import BREAK, HEADING, PARAGRAPH, Block, ExtractedDocument

# Part de la hauteur de page considérée comme marge haute / basse.
MARGIN_ZONE = 0.085
# Un titre doit être au moins 20 % plus grand que le corps du texte.
HEADING_RATIO = 1.2
# Ponctuation qui termine une phrase (et donc potentiellement un paragraphe).
TERMINAL = (".", "!", "?", "…", "»", '"', "”", ":")
# Tiret de dialogue en début de ligne (cadratin, demi-cadratin ou trait d'union).
DIALOGUE_START = re.compile(r"^[—–\-]\s")
# Numéro de page seul : « 12 », « - 12 - », « Page 12 », « xiv », « 12 / 300 ».
PAGE_NUMBER = re.compile(
    r"^[\s\-–—|]*(page|p\.)?\s*(\d{1,4}|[ivxlcdm]{1,7})"
    r"(\s*(/|sur|of)\s*\d{1,4})?[\s\-–—|]*$",
    re.IGNORECASE,
)
# Début typique d'une note de bas de page : « 1. », « 12 », « * », « a) ».
FOOTNOTE_START = re.compile(r"^(\d{1,3}[\s.)]|\*+|[a-z]\)\s|†|‡)")
# Appel de note en exposant : chiffres ou symboles uniquement.
NOTE_CALL = re.compile(r"^\s*[\d*†‡,]+\s*$")


@dataclass
class _Line:
    page: int        # numéro de page, base 1
    text: str
    x0: float
    y0: float
    x1: float
    y1: float
    size: float      # taille de police dominante de la ligne
    bold: bool
    page_h: float


@dataclass
class _PageMetrics:
    left: float      # marge gauche du corps de texte
    right: float     # bord droit du corps de texte
    gap: float       # interligne « normal » entre deux lignes d'un paragraphe


# ---------------------------------------------------------------------------
# 1. Lecture des lignes
# ---------------------------------------------------------------------------

def _read_page_lines(page, pno: int) -> list[_Line]:
    """Retourne les lignes horizontales d'une page, appels de note retirés."""
    lines: list[_Line] = []
    data = page.get_text("dict", sort=True)
    page_h = page.rect.height
    for block in data.get("blocks", []):
        if block.get("type") != 0:  # 1 = image
            continue
        for line in block.get("lines", []):
            dx, dy = line.get("dir", (1, 0))
            if abs(dy) > 0.1 or dx < 0:  # texte vertical ou retourné
                continue
            spans = line.get("spans", [])
            if not spans:
                continue
            max_size = max(s["size"] for s in spans)
            parts: list[str] = []
            weights: Counter[float] = Counter()
            bold_chars = 0
            total_chars = 0
            for i, span in enumerate(spans):
                t = span["text"]
                if not t.strip():
                    parts.append(t)
                    continue
                superscript = bool(span["flags"] & 1)
                smaller = span["size"] < 0.8 * max_size
                # Appel de note (« mot¹ ») : exposant composé de chiffres.
                if (superscript or smaller) and i > 0 and NOTE_CALL.match(t):
                    continue
                parts.append(t)
                n = len(t.strip())
                weights[round(span["size"], 1)] += n
                total_chars += n
                if span["flags"] & 16 or "bold" in span.get("font", "").lower():
                    bold_chars += n
            text = "".join(parts).strip()
            if not text or not weights:
                continue
            x0, y0, x1, y1 = line["bbox"]
            lines.append(
                _Line(
                    page=pno,
                    text=text,
                    x0=x0, y0=y0, x1=x1, y1=y1,
                    size=weights.most_common(1)[0][0],
                    bold=bold_chars > total_chars / 2,
                    page_h=page_h,
                )
            )
    return lines


def _body_size(lines: list[_Line]) -> float:
    """Taille de police du corps du texte = taille la plus fréquente (en caractères)."""
    sizes: Counter[float] = Counter()
    for ln in lines:
        sizes[round(ln.size)] += len(ln.text)
    return float(sizes.most_common(1)[0][0]) if sizes else 11.0


# ---------------------------------------------------------------------------
# 2. En-têtes, pieds de page, numéros de page
# ---------------------------------------------------------------------------

def _margin_key(text: str) -> str:
    """Clé de comparaison d'un en-tête : chiffres et numéros romains neutralisés."""
    t = text.lower()
    t = re.sub(r"\d+", "#", t)
    t = re.sub(r"\b[ivxlcdm]{1,7}\b", "#", t)
    return re.sub(r"\s+", " ", t).strip()


def _in_margin(ln: _Line) -> bool:
    return ln.y1 < ln.page_h * MARGIN_ZONE or ln.y0 > ln.page_h * (1 - MARGIN_ZONE)


def _strip_headers_footers(pages: list[list[_Line]], body: float) -> list[list[_Line]]:
    """Supprime numéros de page et en-têtes/pieds répétés sur plusieurs pages."""
    counts: Counter[str] = Counter()
    for lines in pages:
        keys = {_margin_key(ln.text) for ln in lines if _in_margin(ln)}
        counts.update(keys)

    many_pages = len(pages) >= 5
    result = []
    for lines in pages:
        kept = []
        for ln in lines:
            if _in_margin(ln) and ln.size < body * HEADING_RATIO:
                if PAGE_NUMBER.match(ln.text):
                    continue
                if many_pages and counts[_margin_key(ln.text)] >= 3 and len(ln.text) < 150:
                    continue
            kept.append(ln)
        result.append(kept)
    return result


# ---------------------------------------------------------------------------
# 3. Notes de bas de page
# ---------------------------------------------------------------------------

def _strip_footnotes(lines: list[_Line], body: float) -> list[_Line]:
    """Retire le bloc de notes en petits caractères en bas de page.

    On remonte depuis le bas de la page tant que les lignes sont plus petites
    que le corps du texte. Si la première ligne de ce bloc commence comme une
    note (« 1. », « * »...), le bloc entier est supprimé.
    """
    if not lines:
        return lines
    small_limit = body * 0.88
    page_h = lines[0].page_h
    i = len(lines)
    while i > 0 and lines[i - 1].size <= small_limit and lines[i - 1].y0 > page_h * 0.45:
        i -= 1
    if i == len(lines):
        return lines
    if FOOTNOTE_START.match(lines[i].text):
        return lines[:i]
    return lines


# ---------------------------------------------------------------------------
# 4-5. Titres et paragraphes
# ---------------------------------------------------------------------------

def _page_metrics(lines: list[_Line], body: float, fallback: _PageMetrics | None) -> _PageMetrics:
    """Mesure marge gauche, bord droit et interligne du corps de texte d'une page."""
    body_lines = [ln for ln in lines if abs(ln.size - body) < 1.0]
    if len(body_lines) < 5 and fallback:
        return fallback
    if not body_lines:
        return _PageMetrics(left=0, right=10_000, gap=body * 0.3)
    xs0 = sorted(ln.x0 for ln in body_lines)
    xs1 = sorted(ln.x1 for ln in body_lines)
    left = xs0[len(xs0) // 10]
    right = xs1[int(len(xs1) * 0.9)]
    gaps = [
        b.y0 - a.y1
        for a, b in zip(body_lines, body_lines[1:])
        if 0 <= b.y0 - a.y1 < body * 3
    ]
    gap = statistics.median(gaps) if gaps else body * 0.3
    return _PageMetrics(left=left, right=right, gap=max(gap, 0.0))


def _ends_sentence(text: str) -> bool:
    return text.rstrip().endswith(TERMINAL)


def _starts_new_paragraph(prev: _Line, line: _Line, m: _PageMetrics, prev_m: _PageMetrics, body: float) -> bool:
    """Décide si ``line`` commence un nouveau paragraphe après ``prev``."""
    prev_terminal = _ends_sentence(prev.text)
    prev_short = prev.x1 < prev_m.right - body * 2.5
    indented = line.x0 > m.left + body * 0.8

    if DIALOGUE_START.match(line.text) and prev_terminal:
        return True
    if line.page != prev.page:
        # Changement de page : on continue le paragraphe si la phrase n'est pas finie.
        return prev_terminal and (indented or prev_short)
    gap = line.y0 - prev.y1
    if gap > max(m.gap * 2.0 + 1.0, body * 0.6):
        return True
    if line.x0 > prev.x0 + body * 0.8 and (prev_terminal or prev_short):
        return True
    return prev_terminal and prev_short


def _append_line(current: str, text: str) -> str:
    """Ajoute une ligne au paragraphe en gérant la césure de fin de ligne."""
    if not current:
        return text
    if re.search(r"[^\W\d_]-$", current) and re.match(r"[a-zàâäéèêëîïôöùûüç]", text):
        return current[:-1] + HYPHEN_MARK + text
    return current + " " + text


def _build_blocks(pages: list[list[_Line]], body: float) -> list[Block]:
    blocks: list[Block] = []
    para = ""
    para_page: int | None = None
    prev: _Line | None = None
    prev_m: _PageMetrics | None = None
    global_m: _PageMetrics | None = None
    heading_parts: list[_Line] = []
    dropcap = ""  # lettrine en attente (grande initiale isolée)

    def flush_para() -> None:
        nonlocal para, para_page
        if para.strip():
            blocks.append(Block(PARAGRAPH, para, 0, para_page))
        para, para_page = "", None

    def flush_heading() -> None:
        nonlocal heading_parts
        if not heading_parts:
            return
        text = heading_parts[0].text
        for ln in heading_parts[1:]:
            # « Le long voyage / de Pierre » : suite du même titre -> espace.
            # « CHAPITRE PREMIER / Le départ » : deux éléments -> point.
            if ln.text[:1].islower() or text.endswith((",", "-")) or _ends_sentence(text):
                text += " " + ln.text
            else:
                text += ". " + ln.text
        size = max(ln.size for ln in heading_parts)
        blocks.append(Block(HEADING, text, -int(size * 10), heading_parts[0].page))
        heading_parts = []

    for lines in pages:
        if not lines:
            continue
        m = _page_metrics(lines, body, global_m)
        if global_m is None and len(lines) > 10:
            global_m = m
        for line in lines:
            big = line.size >= body * HEADING_RATIO
            # Lettrine : une seule lettre en très gros caractères au début
            # d'un paragraphe. On la recolle au mot suivant.
            if big and len(line.text) == 1 and line.text.isalpha():
                dropcap = line.text
                continue
            if dropcap:
                line.text = dropcap + line.text
                dropcap = ""
            is_heading = big and len(line.text) < 150
            if is_heading:
                flush_para()
                if heading_parts and (
                    line.page != heading_parts[-1].page
                    or line.y0 - heading_parts[-1].y1 > line.size * 2.5
                ):
                    flush_heading()
                heading_parts.append(line)
                prev = None
                continue
            flush_heading()
            if is_scene_break(line.text):
                flush_para()
                blocks.append(Block(BREAK, "", 0, line.page))
                prev = None
                continue
            if prev is not None and prev_m is not None and _starts_new_paragraph(prev, line, m, prev_m, body):
                flush_para()
            if not para:
                para_page = line.page
            para = _append_line(para, line.text)
            prev, prev_m = line, m
    flush_heading()
    flush_para()
    return _rank_heading_levels(blocks)


def _rank_heading_levels(blocks: list[Block]) -> list[Block]:
    """Convertit les tailles de titres en niveaux : plus grand = niveau 1."""
    sizes = sorted({-b.level for b in blocks if b.kind == HEADING}, reverse=True)
    rank = {s: min(i + 1, 3) for i, s in enumerate(sizes)}
    for b in blocks:
        if b.kind == HEADING:
            b.level = rank[-b.level]
    return blocks


# ---------------------------------------------------------------------------
# 6. Signets (table des matières interne du PDF)
# ---------------------------------------------------------------------------

def _norm(text: str) -> str:
    return re.sub(r"[\W_]+", " ", text.lower()).strip()


def _apply_outline(blocks: list[Block], toc: list[list]) -> list[Block]:
    """Utilise les signets du PDF comme titres de chapitres fiables.

    Pour chaque signet, on cherche sur sa page un bloc dont le texte
    correspond au titre. S'il existe, il devient un titre ; sinon on insère
    un titre au début de la page.
    """
    entries = [(lvl, clean_text(title), page) for lvl, title, page, *_ in toc if page and page > 0]
    if len([e for e in entries if e[0] <= 2]) > 300:
        entries = [e for e in entries if e[0] == 1]
    entries = [e for e in entries if e[0] <= 2 and e[1]]
    if len(entries) < 2:
        return blocks

    # Les signets deviennent la seule source de titres de niveau 1-2 :
    # les autres « titres » détectés par la taille passent au niveau 3.
    for b in blocks:
        if b.kind == HEADING:
            b.level = 3

    result = list(blocks)
    for lvl, title, page in entries:
        nt = _norm(title)
        candidates = [
            i for i, b in enumerate(result)
            if b.page is not None and page <= b.page <= page + 1 and b.kind != BREAK
        ]
        match = None
        for i in candidates[:12]:
            nb = _norm(result[i].text)
            if nb and len(result[i].text) < 200 and (nb == nt or nt.startswith(nb) or nb.startswith(nt)):
                match = i
                break
        if match is not None:
            result[match] = Block(HEADING, title, lvl, page)
        elif candidates:
            result.insert(candidates[0], Block(HEADING, title, lvl, page))
        else:
            # Page sans texte (illustration) : on insère avant la page suivante.
            idx = next((i for i, b in enumerate(result) if (b.page or 0) > page), len(result))
            result.insert(idx, Block(HEADING, title, lvl, page))
    return result


# ---------------------------------------------------------------------------
# Point d'entrée
# ---------------------------------------------------------------------------

def _cover(doc) -> bytes | None:
    """Rendu de la première page en JPEG (environ 800 px de large) pour la pochette."""
    try:
        page = doc[0]
        zoom = 800 / max(page.rect.width, 1)
        pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
        return pix.tobytes("jpeg")
    except Exception:  # la pochette est facultative
        return None


def extract_pdf(path: str | Path, progress=None) -> ExtractedDocument:
    """Extrait un PDF en blocs de texte structurés.

    ``progress`` est une fonction optionnelle ``(page, total)`` appelée après
    chaque page, utile pour afficher l'avancement sur les très gros fichiers.
    """
    doc = fitz.open(str(path))
    try:
        if doc.needs_pass:
            raise ValueError("Ce PDF est protégé par un mot de passe.")
        total = doc.page_count
        pages: list[list[_Line]] = []
        for pno in range(total):
            pages.append(_read_page_lines(doc[pno], pno + 1))
            if progress:
                progress(pno + 1, total)

        all_lines = [ln for p in pages for ln in p]
        if sum(len(ln.text) for ln in all_lines) < 200:
            raise ValueError(
                "Ce PDF ne contient presque pas de texte : il s'agit probablement "
                "d'un scan (images). Passez-le d'abord dans un logiciel d'OCR."
            )
        body = _body_size(all_lines)
        pages = _strip_headers_footers(pages, body)
        pages = [_strip_footnotes(p, body) for p in pages]
        blocks = _build_blocks(pages, body)
        blocks = _apply_outline(blocks, doc.get_toc(simple=True))

        meta = doc.metadata or {}
        return ExtractedDocument(
            title=clean_text(meta.get("title") or "") or Path(path).stem,
            author=clean_text(meta.get("author") or ""),
            blocks=blocks,
            cover=_cover(doc),
            cover_ext="jpg",
            pages=total,
        )
    finally:
        doc.close()
