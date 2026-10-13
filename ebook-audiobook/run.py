"""Lanceur de l'application.

    python run.py            serveur local + ouverture dans le navigateur
    python run.py --app      ouverture dans une fenêtre type « application »
    python run.py --lan      accessible depuis le téléphone (même Wi-Fi)

Options utiles : --port 8765, --no-browser.
"""

from __future__ import annotations

import argparse
import os
import secrets
import shutil
import subprocess
import sys
import threading
import time
import urllib.request
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))


def _persistent_token(data_dir: Path) -> str:
    """Jeton d'accès réseau, conservé d'un lancement à l'autre.

    Le téléphone le garde en cookie : pas besoin de rescanner le QR code à
    chaque démarrage. Supprimez data/lan_token.txt pour en générer un nouveau.
    """
    data_dir.mkdir(parents=True, exist_ok=True)
    path = data_dir / "lan_token.txt"
    if path.exists():
        token = path.read_text(encoding="utf-8").strip()
        if token:
            return token
    token = secrets.token_urlsafe(12)
    path.write_text(token, encoding="utf-8")
    return token


def _browser_app_command(url: str) -> list[str] | None:
    """Commande ouvrant Edge ou Chrome en mode application (fenêtre sans onglets)."""
    candidates: list[str] = []
    if os.name == "nt":
        for base in (os.environ.get("ProgramFiles(x86)"), os.environ.get("ProgramFiles"),
                     os.environ.get("LOCALAPPDATA")):
            if base:
                candidates += [
                    os.path.join(base, "Microsoft", "Edge", "Application", "msedge.exe"),
                    os.path.join(base, "Google", "Chrome", "Application", "chrome.exe"),
                ]
    elif sys.platform == "darwin":
        candidates += [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
            "/Applications/Chromium.app/Contents/MacOS/Chromium",
        ]
    else:
        for name in ("google-chrome", "chromium", "chromium-browser", "microsoft-edge"):
            found = shutil.which(name)
            if found:
                candidates.append(found)
    for exe in candidates:
        if exe and os.path.exists(exe):
            return [exe, f"--app={url}", "--window-size=1200,900"]
    return None


def _open_when_ready(url: str, app_mode: bool) -> None:
    """Attend que le serveur réponde, puis ouvre l'interface."""
    for _ in range(100):
        try:
            urllib.request.urlopen(url + "api/health", timeout=1)
            break
        except Exception:
            time.sleep(0.2)
    cmd = _browser_app_command(url) if app_mode else None
    if cmd:
        subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        webbrowser.open(url)


def main() -> None:
    parser = argparse.ArgumentParser(description="Ebook vers livre audio")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--lan", action="store_true",
                        help="rendre l'application accessible aux appareils du réseau local")
    parser.add_argument("--app", action="store_true",
                        help="ouvrir dans une fenêtre d'application (Edge/Chrome)")
    parser.add_argument("--no-browser", action="store_true", help="ne rien ouvrir automatiquement")
    args = parser.parse_args()

    from app import config

    config.ensure_dirs()
    os.environ["AUDIOBOOK_PORT"] = str(args.port)
    host = "127.0.0.1"
    if args.lan:
        host = "0.0.0.0"
        os.environ["AUDIOBOOK_LAN"] = "1"
        os.environ.setdefault("AUDIOBOOK_TOKEN", _persistent_token(config.DATA_DIR))

    local_url = f"http://127.0.0.1:{args.port}/"
    print("=" * 60)
    print(" Ebook vers livre audio")
    print(f" Sur cet ordinateur : {local_url}")
    if args.lan:
        from app.netinfo import lan_ips

        for ip in lan_ips():
            print(f" Sur le téléphone   : http://{ip}:{args.port}/?token={os.environ['AUDIOBOOK_TOKEN']}")
        print(" (ou scannez le QR code dans l'application : « Ouvrir sur le téléphone »)")
    print(" Fermez cette fenêtre ou faites Ctrl+C pour arrêter.")
    print("=" * 60)

    if not args.no_browser:
        threading.Thread(target=_open_when_ready, args=(local_url, args.app), daemon=True).start()

    import uvicorn

    uvicorn.run("app.server:app", host=host, port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
