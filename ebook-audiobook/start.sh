#!/usr/bin/env bash
# Installation + lancement sous macOS / Linux.
#   ./start.sh          ordinateur seul
#   ./start.sh --lan    accessible depuis le téléphone
set -e
cd "$(dirname "$0")"
if [ ! -x .venv/bin/python ]; then
  python3 -m venv .venv
  .venv/bin/pip install --upgrade pip
  .venv/bin/pip install -r requirements.txt
  .venv/bin/python scripts/download_voices.py
fi
exec .venv/bin/python run.py --app "$@"
