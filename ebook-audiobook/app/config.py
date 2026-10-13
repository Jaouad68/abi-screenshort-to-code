"""Configuration centrale de l'application.

Tous les chemins et réglages modifiables sont regroupés ici. Les valeurs
peuvent être surchargées par des variables d'environnement (préfixe
``AUDIOBOOK_``) sans toucher au code.
"""

from __future__ import annotations

import os
from pathlib import Path

# Racine du projet (dossier ebook-audiobook/)
ROOT_DIR = Path(__file__).resolve().parent.parent

# Dossier de travail : livres importés, tâches, cache audio, voix Piper.
DATA_DIR = Path(os.environ.get("AUDIOBOOK_DATA_DIR", ROOT_DIR / "data")).resolve()
BOOKS_DIR = DATA_DIR / "books"
JOBS_DIR = DATA_DIR / "jobs"
PIPER_VOICES_DIR = Path(
    os.environ.get("AUDIOBOOK_PIPER_VOICES", DATA_DIR / "piper_voices")
).resolve()

# Interface web (PWA) servie par FastAPI.
STATIC_DIR = ROOT_DIR / "static"

# Taille maximale d'un fichier importé (en octets).
MAX_UPLOAD_BYTES = int(os.environ.get("AUDIOBOOK_MAX_UPLOAD_MB", "300")) * 1024 * 1024

# Nombre de requêtes Edge TTS en parallèle. Au-delà de 4, Microsoft
# commence parfois à limiter le débit : 3 est un bon compromis.
EDGE_CONCURRENCY = int(os.environ.get("AUDIOBOOK_EDGE_CONCURRENCY", "3"))

# Proxy HTTP(S) optionnel pour Edge TTS (réseau d'entreprise, etc.).
EDGE_PROXY = os.environ.get("AUDIOBOOK_EDGE_PROXY") or None

# Nombre de tentatives par segment avant d'abandonner (avec attente
# exponentielle : 2 s, 4 s, 8 s, 16 s...).
TTS_MAX_RETRIES = int(os.environ.get("AUDIOBOOK_TTS_RETRIES", "5"))

# Cible de normalisation du volume (LUFS). -18 LUFS est la valeur
# habituelle des livres audio (ACX recommande entre -23 et -18).
LOUDNESS_TARGET = os.environ.get("AUDIOBOOK_LUFS", "-18")

# Fréquence d'échantillonnage des fichiers finaux.
OUTPUT_SAMPLE_RATE = 44100

# Débits proposés à l'utilisateur (kbps). Le cahier des charges impose
# au minimum 128 kbps.
ALLOWED_BITRATES = (128, 160, 192, 256)


def ensure_dirs() -> None:
    """Crée les dossiers de travail s'ils n'existent pas encore."""
    for d in (DATA_DIR, BOOKS_DIR, JOBS_DIR, PIPER_VOICES_DIR):
        d.mkdir(parents=True, exist_ok=True)
