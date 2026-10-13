"""Structures de données partagées par tout le pipeline.

Le flux est le suivant :

    fichier PDF/DOCX
        -> extracteur (pdf_extract / docx_extract) : liste de ``Block``
        -> nettoyage (cleaning)                    : liste de ``Block`` propres
        -> détection des chapitres (chapters)      : liste de ``Chapter``
        -> ``Book`` sauvegardé en JSON sur disque
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any

# Types de blocs produits par les extracteurs.
HEADING = "heading"      # titre (chapitre, partie...)
PARAGRAPH = "paragraph"  # paragraphe de texte courant
BREAK = "break"          # séparateur de scène (*** , ⁂ ...)


@dataclass
class Block:
    """Unité de texte extraite du document source."""

    kind: str
    text: str
    level: int = 0            # niveau du titre : 1 = partie/chapitre principal
    page: int | None = None   # numéro de page (PDF uniquement, base 1)


@dataclass
class Chapter:
    """Un chapitre prêt à être lu."""

    title: str
    paragraphs: list[str] = field(default_factory=list)
    include: bool = True      # l'utilisateur peut exclure un chapitre

    @property
    def word_count(self) -> int:
        return sum(len(p.split()) for p in self.paragraphs)

    @property
    def char_count(self) -> int:
        return sum(len(p) for p in self.paragraphs)


@dataclass
class Book:
    """Livre importé, tel qu'il est stocké dans ``data/books/<id>/book.json``."""

    id: str
    title: str
    author: str
    source_name: str
    source_type: str          # "pdf" ou "docx"
    chapters: list[Chapter]
    has_cover: bool = False
    created_at: float = 0.0
    pages: int | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Book":
        chapters = [Chapter(**c) for c in data.pop("chapters", [])]
        return cls(chapters=chapters, **data)


@dataclass
class ExtractedDocument:
    """Résultat brut d'un extracteur, avant détection des chapitres."""

    title: str
    author: str
    blocks: list[Block]
    cover: bytes | None = None   # image JPEG/PNG de couverture
    cover_ext: str = "jpg"
    pages: int | None = None
