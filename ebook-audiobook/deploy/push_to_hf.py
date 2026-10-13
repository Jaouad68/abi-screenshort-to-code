"""Publie l'application sur un Space Hugging Face privé (appelé par GitHub Actions).

Variables d'environnement :
    HF_TOKEN   jeton Hugging Face avec droit d'écriture (secret GitHub)
    HF_SPACE   nom du Space, facultatif (par défaut <utilisateur>/ebook-livre-audio)
"""

from __future__ import annotations

import os
import shutil
import sys
import tempfile
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent.parent
EXCLUDE = shutil.ignore_patterns(
    "data", ".venv", "tests", "__pycache__", "*.pyc", "*.bat", "*.ps1", ".pytest_cache", "README.md",
)


def main() -> int:
    token = os.environ.get("HF_TOKEN", "").strip()
    if not token:
        print("::warning::Secret HF_TOKEN absent : publication ignorée. "
              "Ajoutez-le dans Settings > Secrets and variables > Actions, puis relancez.")
        return 0

    from huggingface_hub import HfApi

    api = HfApi(token=token)
    user = api.whoami()["name"]
    repo_id = os.environ.get("HF_SPACE") or f"{user}/ebook-livre-audio"
    api.create_repo(repo_id, repo_type="space", space_sdk="docker", private=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        staging = Path(tmp) / "space"
        shutil.copytree(APP_DIR, staging, ignore=EXCLUDE)
        shutil.copy(APP_DIR / "deploy" / "space_readme.md", staging / "README.md")
        api.upload_folder(
            folder_path=str(staging),
            repo_id=repo_id,
            repo_type="space",
            commit_message="Mise à jour depuis GitHub",
        )

    print(f"Publié : https://huggingface.co/spaces/{repo_id}")
    print("La construction prend 5 à 10 minutes la première fois.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
