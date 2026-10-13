"""Télécharge les voix françaises Piper recommandées dans data/piper_voices.

    python scripts/download_voices.py                  voix recommandées
    python scripts/download_voices.py fr_FR-gilles-low choisir les voix

Les voix viennent du dépôt officiel rhasspy/piper-voices (HuggingFace).
Chaque voix « medium » pèse environ 60 Mo.
"""

from __future__ import annotations

import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app import config  # noqa: E402

BASE_URL = "https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR"
DEFAULT_VOICES = ["fr_FR-siwis-medium", "fr_FR-tom-medium", "fr_FR-upmc-medium"]


def _download(url: str, dest: Path) -> None:
    tmp = dest.with_suffix(dest.suffix + ".part")
    with urllib.request.urlopen(url, timeout=60) as resp, tmp.open("wb") as f:
        total = int(resp.headers.get("Content-Length") or 0)
        done = 0
        while chunk := resp.read(1024 * 256):
            f.write(chunk)
            done += len(chunk)
            if total:
                print(f"\r    {done * 100 // total:3d} %  {dest.name}", end="", flush=True)
    print()
    tmp.replace(dest)


def download(voice: str) -> None:
    # fr_FR-siwis-medium -> fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx
    try:
        _, speaker, quality = voice.split("-", 2)
    except ValueError:
        print(f"Nom de voix invalide : {voice} (attendu : fr_FR-nom-qualite)")
        return
    config.PIPER_VOICES_DIR.mkdir(parents=True, exist_ok=True)
    for ext in (".onnx", ".onnx.json"):
        dest = config.PIPER_VOICES_DIR / f"{voice}{ext}"
        if dest.exists() and dest.stat().st_size > 0:
            print(f"  déjà présent : {dest.name}")
            continue
        print(f"  téléchargement : {dest.name}")
        _download(f"{BASE_URL}/{speaker}/{quality}/{voice}{ext}?download=true", dest)


def main() -> None:
    voices = sys.argv[1:] or DEFAULT_VOICES
    print(f"Dossier des voix : {config.PIPER_VOICES_DIR}")
    for v in voices:
        try:
            download(v)
        except Exception as exc:
            print(f"  échec pour {v} : {exc}")
    print("Terminé.")


if __name__ == "__main__":
    main()
