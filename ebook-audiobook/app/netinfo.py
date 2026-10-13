"""Adresses réseau locales et QR code pour ouvrir l'application sur le téléphone."""

from __future__ import annotations

import io
import socket


def lan_ips() -> list[str]:
    """Adresses IPv4 de la machine sur le réseau local (Wi-Fi / Ethernet)."""
    ips: list[str] = []
    try:
        # Aucun paquet n'est envoyé : on demande juste au système quelle
        # interface il utiliserait pour sortir.
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("10.255.255.255", 1))
            ips.append(s.getsockname()[0])
    except OSError:
        pass
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if ip not in ips:
                ips.append(ip)
    except OSError:
        pass
    return [ip for ip in ips if not ip.startswith("127.")]


def qr_svg(text: str) -> str:
    """QR code au format SVG (texte), affichable directement dans la page."""
    import qrcode
    import qrcode.image.svg

    img = qrcode.make(text, image_factory=qrcode.image.svg.SvgPathImage, box_size=8, border=2)
    buf = io.BytesIO()
    img.save(buf)
    return buf.getvalue().decode("utf-8")
