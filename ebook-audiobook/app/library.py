"""Stockage des livres importés.

Chaque livre occupe un dossier ``data/books/<id>/`` :

    source.pdf | source.docx   fichier d'origine
    book.json                   texte nettoyé découpé en chapitres (modifiable)
    cover.jpg | cover.png       pochette (si trouvée)
"""

from __future__ import annotations

import json
import shutil
import time
import uuid
from pathlib import Path

from . import config
from .chapters import split_chapters
from .cleaning import clean_blocks
from .models import Book, ExtractedDocument


class BookNotFound(KeyError):
    pass


SUPPORTED = {".pdf": "pdf", ".docx": "docx"}


def book_dir(book_id: str) -> Path:
    # L'identifiant est généré par nous (hexadécimal) : on refuse tout le reste
    # pour éviter qu'un identifiant forgé ne sorte du dossier data/.
    if not book_id.isalnum():
        raise BookNotFound(book_id)
    return config.BOOKS_DIR / book_id


def extract(path: Path, kind: str) -> ExtractedDocument:
    """Lance l'extracteur adapté au type de fichier."""
    if kind == "pdf":
        from .pdf_extract import extract_pdf

        return extract_pdf(path)
    if kind == "docx":
        from .docx_extract import extract_docx

        return extract_docx(path)
    raise ValueError(f"Format non pris en charge : {kind}")


def import_book(source: Path, original_name: str) -> Book:
    """Analyse un fichier déjà copié sur le disque et crée le livre correspondant.

    Fonction bloquante (plusieurs secondes pour un gros PDF) : l'appeler
    depuis un thread de travail.
    """
    ext = Path(original_name).suffix.lower()
    kind = SUPPORTED.get(ext)
    if not kind:
        raise ValueError("Seuls les fichiers PDF et Word (.docx) sont acceptés.")

    book_id = uuid.uuid4().hex[:12]
    folder = book_dir(book_id)
    folder.mkdir(parents=True, exist_ok=True)
    stored = folder / f"source{ext}"
    shutil.move(str(source), stored)

    try:
        doc = extract(stored, kind)
        blocks = clean_blocks(doc.blocks)
        chapters = split_chapters(blocks, doc.title)
        if not chapters:
            raise ValueError("Aucun texte exploitable n'a été trouvé dans ce fichier.")

        has_cover = False
        if doc.cover:
            (folder / f"cover.{doc.cover_ext}").write_bytes(doc.cover)
            has_cover = True

        book = Book(
            id=book_id,
            title=doc.title,
            author=doc.author,
            source_name=original_name,
            source_type=kind,
            chapters=chapters,
            has_cover=has_cover,
            created_at=time.time(),
            pages=doc.pages,
        )
        save_book(book)
        return book
    except Exception:
        shutil.rmtree(folder, ignore_errors=True)
        raise


def save_book(book: Book) -> None:
    path = book_dir(book.id) / "book.json"
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(book.to_dict(), ensure_ascii=False), encoding="utf-8")
    tmp.replace(path)  # écriture atomique : pas de fichier corrompu en cas de coupure


def load_book(book_id: str) -> Book:
    path = book_dir(book_id) / "book.json"
    if not path.exists():
        raise BookNotFound(book_id)
    return Book.from_dict(json.loads(path.read_text(encoding="utf-8")))


def cover_path(book_id: str) -> Path | None:
    folder = book_dir(book_id)
    for ext in ("jpg", "png"):
        p = folder / f"cover.{ext}"
        if p.exists():
            return p
    return None


def list_books() -> list[Book]:
    books = []
    if not config.BOOKS_DIR.exists():
        return books
    for folder in config.BOOKS_DIR.iterdir():
        try:
            books.append(load_book(folder.name))
        except Exception:
            continue
    return sorted(books, key=lambda b: b.created_at, reverse=True)


def delete_book(book_id: str) -> None:
    shutil.rmtree(book_dir(book_id), ignore_errors=True)
