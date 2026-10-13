"""Serveur web : API REST + interface (PWA).

Le même serveur sert :
* l'ordinateur (fenêtre « application » via ``desktop.py`` ou navigateur) ;
* le téléphone ou la tablette sur le même Wi-Fi (mode ``--lan``), protégé
  par un jeton secret transmis via le QR code.

Lancement : ``python run.py`` (voir README).
"""

from __future__ import annotations

import asyncio
import os
import secrets
import uuid
import zipfile
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from starlette.background import BackgroundTask

from . import config, library
from .chapters import SCENE_BREAK_TOKEN, estimate_minutes
from .jobs import JobManager, JobNotFound
from .library import BookNotFound
from .models import Book, Chapter
from .netinfo import lan_ips, qr_svg
from .tts import TONES, SynthesisSettings, get_engines

TOKEN = os.environ.get("AUDIOBOOK_TOKEN") or None
PORT = int(os.environ.get("AUDIOBOOK_PORT", "8765"))
LAN = os.environ.get("AUDIOBOOK_LAN") == "1"
# Version en ligne (Docker / Hugging Face) : pas de mode téléphone, disque éphémère.
HOSTED = os.environ.get("AUDIOBOOK_HOSTED") == "1"

engines = get_engines()
manager = JobManager(engines)


@asynccontextmanager
async def lifespan(_: FastAPI):
    config.ensure_dirs()
    manager.load_existing()
    await manager.start()
    keepalive = asyncio.create_task(_keep_awake()) if _PUBLIC_URL else None
    yield
    if keepalive:
        keepalive.cancel()
    await manager.stop()


# Adresse publique fournie par Render. Les services gratuits s'endorment après
# 15 min sans visite, ce qui couperait une conversion : tant qu'une conversion
# tourne, le serveur se rend visite à lui-même toutes les 4 minutes.
_PUBLIC_URL = (os.environ.get("RENDER_EXTERNAL_URL") or "").rstrip("/")


async def _keep_awake() -> None:
    import urllib.request

    while True:
        await asyncio.sleep(240)
        if any(j.status in ("queued", "running") for j in manager.jobs.values()):
            try:
                await asyncio.to_thread(urllib.request.urlopen, f"{_PUBLIC_URL}/api/health", timeout=20)
            except Exception:
                pass


app = FastAPI(title="Ebook vers livre audio", lifespan=lifespan)


# ---------------------------------------------------------------------------
# Accès depuis le réseau local : jeton obligatoire (sauf depuis l'ordinateur)
# ---------------------------------------------------------------------------

_PUBLIC_PATHS = ("/manifest.webmanifest", "/icons/", "/favicon", "/api/health")
_COOKIE = "audiobook_token"


@app.middleware("http")
async def require_token(request: Request, call_next):
    if not TOKEN:
        return await call_next(request)
    client = request.client.host if request.client else ""
    # Sur l'ordinateur lui-même, pas de mot de passe ; en ligne, jamais d'exception.
    local = not HOSTED and client in ("127.0.0.1", "::1", "localhost")
    if local or request.url.path.startswith(_PUBLIC_PATHS):
        return await call_next(request)
    given = request.query_params.get("token")
    candidates = [given, request.cookies.get(_COOKIE), request.headers.get("x-token")]
    if any(c and secrets.compare_digest(c, TOKEN) for c in candidates):
        response = await call_next(request)
        if given and secrets.compare_digest(given, TOKEN):
            # Le jeton du QR code est mémorisé un an dans un cookie.
            response.set_cookie(_COOKIE, TOKEN, max_age=365 * 86400, httponly=True, samesite="lax")
        return response
    if request.url.path.startswith("/api/"):
        return JSONResponse({"detail": "Accès protégé : mot de passe requis."}, status_code=401)
    return HTMLResponse(_login_page(error=given is not None), status_code=401)


def _login_page(error: bool) -> str:
    """Page de connexion : le mot de passe est mémorisé un an par le navigateur."""
    if LAN:
        hint = ("Ouvrez l'application depuis l'ordinateur, puis scannez le QR code "
                "affiché dans « Sur le téléphone ». Ou saisissez la clé d'accès :")
    else:
        hint = "Saisissez le mot de passe choisi lors de l'installation :"
    message = '<p class="err">Mot de passe incorrect.</p>' if error else ""
    return f"""<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ebook vers livre audio</title><link rel="icon" href="/icons/icon.svg">
<style>
body{{margin:0;min-height:100vh;display:grid;place-items:center;background:#f6f5fb;color:#1d1b2c;
font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;padding:16px}}
@media (prefers-color-scheme:dark){{body{{background:#121119;color:#ecebf4}}form{{background:#1b1a25!important;border-color:#2f2d3d!important}}input{{background:#121119;color:#ecebf4}}}}
form{{background:#fff;border:1px solid #e2dfee;border-radius:14px;padding:24px;width:min(360px,100%)}}
img{{width:48px}}h1{{font-size:1.3rem;margin:.6rem 0}}
input{{width:100%;box-sizing:border-box;font:inherit;padding:11px;border:1px solid #ccc;border-radius:10px;margin:8px 0 12px}}
button{{width:100%;font:inherit;font-weight:700;padding:12px;border:0;border-radius:10px;background:#4b3cc4;color:#fff}}
.err{{color:#c0362c;font-weight:600}}
</style></head><body>
<form method="get" action="/">
<img src="/icons/icon.svg" alt=""><h1>Ebook vers livre audio</h1>
<p>{hint}</p>{message}
<input type="password" name="token" autocomplete="current-password" required autofocus>
<button type="submit">Entrer</button>
</form></body></html>"""


@app.exception_handler(BookNotFound)
async def _book_not_found(_: Request, __: BookNotFound):
    return JSONResponse({"detail": "Livre introuvable."}, status_code=404)


@app.exception_handler(JobNotFound)
async def _job_not_found(_: Request, __: JobNotFound):
    return JSONResponse({"detail": "Conversion ou fichier introuvable."}, status_code=404)


@app.exception_handler(ValueError)
async def _value_error(_: Request, exc: ValueError):
    return JSONResponse({"detail": str(exc)}, status_code=400)


# ---------------------------------------------------------------------------
# Représentations JSON
# ---------------------------------------------------------------------------

def _chapter_summary(i: int, ch: Chapter) -> dict[str, Any]:
    text = " ".join(p for p in ch.paragraphs[:4] if p != SCENE_BREAK_TOKEN)
    return {
        "index": i,
        "title": ch.title,
        "include": ch.include,
        "words": ch.word_count,
        "minutes": round(estimate_minutes(ch.word_count), 1),
        "preview": text[:400],
    }


def _book_summary(book: Book, with_chapters: bool = True) -> dict[str, Any]:
    included = [c for c in book.chapters if c.include]
    words = sum(c.word_count for c in included)
    data = {
        "id": book.id,
        "title": book.title,
        "author": book.author,
        "source_name": book.source_name,
        "source_type": book.source_type,
        "pages": book.pages,
        "has_cover": book.has_cover,
        "created_at": book.created_at,
        "chapter_count": len(book.chapters),
        "included_count": len(included),
        "words": words,
        "chars": sum(c.char_count for c in included),
        "minutes": round(estimate_minutes(words)),
    }
    if with_chapters:
        data["chapters"] = [_chapter_summary(i, c) for i, c in enumerate(book.chapters)]
    return data


def _job_summary(job) -> dict[str, Any]:
    data = job.to_dict()
    base = f"/api/jobs/{job.id}/files/"
    data["files"] = [
        {"name": c.mp3, "url": base + c.mp3, "title": c.title, "duration": c.duration}
        for c in job.chapters if c.mp3
    ]
    data["m4b_url"] = base + job.m4b if job.m4b else None
    data["zip_url"] = f"/api/jobs/{job.id}/zip" if data["files"] and job.status == "done" else None
    data["chapters_done"] = sum(1 for c in job.chapters if c.status == "done")
    return data


# ---------------------------------------------------------------------------
# Moteurs et voix
# ---------------------------------------------------------------------------

@app.get("/api/engines")
async def list_engines() -> dict[str, Any]:
    result = []
    for engine in engines.values():
        ok, reason = engine.availability()
        voices = await engine.list_voices() if ok else []
        result.append({
            "id": engine.id,
            "label": engine.label,
            "available": ok,
            "reason": reason,
            "online": engine.online,
            "voices": [v.to_dict() for v in voices],
            "default_voice": engine.default_voice(voices),
        })
    return {
        "engines": result,
        "tones": [{"id": k, "label": t.label} for k, t in TONES.items()],
        "bitrates": list(config.ALLOWED_BITRATES),
    }


class PreviewRequest(BaseModel):
    engine: str = "edge"
    voice: str
    speed: float = Field(1.0, ge=0.5, le=2.0)
    tone: str = "narration"
    text: str = Field(
        "Le soir tombait sur la ville. — Vous partez déjà ? demanda-t-elle. "
        "Il sourit, sans répondre, et referma doucement la porte.",
        max_length=1000,
    )


@app.post("/api/preview")
async def preview(req: PreviewRequest):
    """Fait écouter quelques phrases avec les réglages choisis."""
    from .normalize import normalize_for_speech

    engine = engines.get(req.engine)
    if engine is None:
        raise HTTPException(400, "Moteur inconnu.")
    ok, reason = engine.availability()
    if not ok:
        raise HTTPException(400, reason)
    folder = config.DATA_DIR / "preview"
    folder.mkdir(parents=True, exist_ok=True)
    out = folder / f"{uuid.uuid4().hex}.{engine.output_ext}"
    text = normalize_for_speech(req.text) or "Bonjour."
    try:
        await engine.synthesize(text, SynthesisSettings(req.voice, req.speed, req.tone), out)
    except Exception as exc:
        raise HTTPException(502, f"La synthèse a échoué : {exc}") from exc
    media = "audio/mpeg" if engine.output_ext == "mp3" else "audio/wav"
    return FileResponse(out, media_type=media, background=BackgroundTask(out.unlink, missing_ok=True))


# ---------------------------------------------------------------------------
# Livres
# ---------------------------------------------------------------------------

@app.post("/api/books")
async def upload_book(file: UploadFile = File(...)) -> dict[str, Any]:
    """Importe un PDF ou un DOCX, puis l'analyse (texte, nettoyage, chapitres)."""
    name = Path(file.filename or "livre").name
    if Path(name).suffix.lower() not in library.SUPPORTED:
        raise HTTPException(400, "Seuls les fichiers PDF et Word (.docx) sont acceptés.")
    tmp_dir = config.DATA_DIR / "tmp"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    tmp = tmp_dir / f"{uuid.uuid4().hex}{Path(name).suffix.lower()}"
    size = 0
    try:
        # Copie par blocs de 1 Mo : un gros fichier ne passe jamais entièrement en mémoire.
        with tmp.open("wb") as f:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > config.MAX_UPLOAD_BYTES:
                    raise HTTPException(413, "Fichier trop volumineux.")
                f.write(chunk)
        book = await asyncio.to_thread(library.import_book, tmp, name)
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except Exception as exc:
        raise HTTPException(422, f"Impossible de lire ce fichier : {exc}") from exc
    finally:
        tmp.unlink(missing_ok=True)
    return _book_summary(book)


@app.get("/api/books")
async def get_books() -> list[dict[str, Any]]:
    return [_book_summary(b, with_chapters=False) for b in library.list_books()]


@app.get("/api/books/{book_id}")
async def get_book(book_id: str) -> dict[str, Any]:
    return _book_summary(library.load_book(book_id))


class ChapterPatch(BaseModel):
    title: str | None = None
    include: bool | None = None


class BookPatch(BaseModel):
    title: str | None = None
    author: str | None = None
    chapters: list[ChapterPatch] | None = None


@app.put("/api/books/{book_id}")
async def update_book(book_id: str, patch: BookPatch) -> dict[str, Any]:
    """Modifie titre, auteur, titres de chapitres et chapitres inclus."""
    book = library.load_book(book_id)
    if patch.title is not None:
        book.title = patch.title.strip() or book.title
    if patch.author is not None:
        book.author = patch.author.strip()
    if patch.chapters is not None:
        if len(patch.chapters) != len(book.chapters):
            raise HTTPException(409, "La liste des chapitres a changé, rechargez la page.")
        for ch, p in zip(book.chapters, patch.chapters):
            if p.title is not None and p.title.strip():
                ch.title = p.title.strip()
            if p.include is not None:
                ch.include = p.include
    library.save_book(book)
    return _book_summary(book)


@app.get("/api/books/{book_id}/chapters/{index}")
async def get_chapter(book_id: str, index: int) -> dict[str, Any]:
    book = library.load_book(book_id)
    if not 0 <= index < len(book.chapters):
        raise HTTPException(404, "Chapitre introuvable.")
    ch = book.chapters[index]
    return {"index": index, "title": ch.title, "text": "\n\n".join(ch.paragraphs)}


class ChapterText(BaseModel):
    title: str | None = None
    text: str


@app.put("/api/books/{book_id}/chapters/{index}")
async def update_chapter(book_id: str, index: int, body: ChapterText) -> dict[str, Any]:
    """Remplace le texte d'un chapitre (un paragraphe par bloc séparé d'une ligne vide)."""
    book = library.load_book(book_id)
    if not 0 <= index < len(book.chapters):
        raise HTTPException(404, "Chapitre introuvable.")
    ch = book.chapters[index]
    paragraphs = [" ".join(p.split()) for p in body.text.replace("\r", "").split("\n\n")]
    ch.paragraphs = [p for p in paragraphs if p]
    if body.title and body.title.strip():
        ch.title = body.title.strip()
    library.save_book(book)
    return _book_summary(book)


@app.post("/api/books/{book_id}/chapters/{index}/merge")
async def merge_chapter(book_id: str, index: int) -> dict[str, Any]:
    """Fusionne le chapitre ``index`` dans le précédent (détection trop fine)."""
    book = library.load_book(book_id)
    if not 1 <= index < len(book.chapters):
        raise HTTPException(400, "Impossible de fusionner ce chapitre.")
    prev, cur = book.chapters[index - 1], book.chapters.pop(index)
    prev.paragraphs.extend([cur.title] + cur.paragraphs)
    library.save_book(book)
    return _book_summary(book)


@app.delete("/api/books/{book_id}")
async def remove_book(book_id: str) -> dict[str, str]:
    library.load_book(book_id)
    library.delete_book(book_id)
    return {"status": "deleted"}


@app.get("/api/books/{book_id}/cover")
async def get_cover(book_id: str):
    path = library.cover_path(book_id)
    if not path:
        raise HTTPException(404, "Pas de couverture.")
    return FileResponse(path)


# ---------------------------------------------------------------------------
# Conversions
# ---------------------------------------------------------------------------

class JobRequest(BaseModel):
    book_id: str
    engine: str = "edge"
    voice: str
    speed: float = 1.0
    tone: str = "narration"
    pause_factor: float = 1.0
    bitrate: int = 0  # 0 = qualité d'origine (sans réencodage)
    formats: list[str] = ["mp3", "m4b"]
    read_titles: bool = True
    title: str | None = None
    author: str | None = None


@app.post("/api/jobs")
async def create_job(req: JobRequest) -> dict[str, Any]:
    job = manager.create(req.book_id, req.model_dump())
    return _job_summary(job)


@app.get("/api/jobs")
async def list_jobs() -> list[dict[str, Any]]:
    return [_job_summary(j) for j in manager.list()]


@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str) -> dict[str, Any]:
    return _job_summary(manager.get(job_id))


@app.post("/api/jobs/{job_id}/cancel")
async def cancel_job(job_id: str) -> dict[str, Any]:
    return _job_summary(manager.cancel(job_id))


@app.post("/api/jobs/{job_id}/resume")
async def resume_job(job_id: str) -> dict[str, Any]:
    return _job_summary(manager.resume(job_id))


@app.delete("/api/jobs/{job_id}")
async def delete_job(job_id: str) -> dict[str, str]:
    manager.delete(job_id)
    return {"status": "deleted"}


@app.get("/api/jobs/{job_id}/files/{filename}")
async def download_file(job_id: str, filename: str):
    path = manager.output_path(job_id, filename)
    media = "audio/mp4" if filename.endswith(".m4b") else "audio/mpeg"
    return FileResponse(path, media_type=media, filename=filename)


@app.get("/api/jobs/{job_id}/zip")
async def download_zip(job_id: str):
    """Archive de tous les MP3 (sans compression : le MP3 est déjà compressé)."""
    job = manager.get(job_id)
    if job.status != "done":
        raise HTTPException(409, "La conversion n'est pas terminée.")
    from .jobs import safe_filename

    folder = manager.job_dir(job_id)
    archive = folder / "mp3.zip"
    if not archive.exists():
        def build() -> None:
            tmp = archive.with_suffix(".tmp")
            with zipfile.ZipFile(tmp, "w", zipfile.ZIP_STORED, allowZip64=True) as zf:
                for c in job.chapters:
                    if c.mp3:
                        zf.write(folder / "output" / c.mp3, c.mp3)
            tmp.replace(archive)

        await asyncio.to_thread(build)
    return FileResponse(archive, media_type="application/zip",
                        filename=f"{safe_filename(job.title)} (MP3).zip")


# ---------------------------------------------------------------------------
# Informations serveur (ouverture sur le téléphone)
# ---------------------------------------------------------------------------

@app.get("/api/server-info")
async def server_info() -> dict[str, Any]:
    urls = []
    if LAN:
        suffix = f"/?token={TOKEN}" if TOKEN else "/"
        urls = [f"http://{ip}:{PORT}{suffix}" for ip in lan_ips()]
    return {
        "lan": LAN,
        "hosted": HOSTED,
        "urls": urls,
        "qr_svg": qr_svg(urls[0]) if urls else None,
    }


@app.get("/api/health")
async def health() -> Response:
    return Response("ok", media_type="text/plain")


# L'interface web est servie en dernier pour ne pas masquer les routes /api.
app.mount("/", StaticFiles(directory=config.STATIC_DIR, html=True), name="static")
