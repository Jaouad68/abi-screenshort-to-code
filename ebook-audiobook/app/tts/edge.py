"""Moteur Edge TTS : voix neuronales Microsoft, gratuites, en ligne.

Utilise la bibliothèque ``edge-tts``, qui passe par le service de lecture à
voix haute du navigateur Microsoft Edge. Aucune clé ni compte n'est requis.

Limites à connaître :
* il faut une connexion Internet pendant la conversion ;
* c'est un service non officiel : Microsoft peut le modifier ou le limiter.
  Mettez à jour ``edge-tts`` (``pip install -U edge-tts``) si les erreurs se
  multiplient, ou basculez sur Piper (hors ligne) ;
* le SSML personnalisé n'est plus accepté : les pauses sont donc gérées par
  l'application (silences insérés entre les segments).
"""

from __future__ import annotations

import time
from pathlib import Path

from .. import config
from .base import SynthesisSettings, TTSEngine, VoiceInfo

# Liste de secours si la récupération en ligne échoue.
_FALLBACK_VOICES = [
    VoiceInfo("fr-FR-DeniseNeural", "Denise (France)", "fr-FR", "Female"),
    VoiceInfo("fr-FR-HenriNeural", "Henri (France)", "fr-FR", "Male"),
    VoiceInfo("fr-FR-VivienneMultilingualNeural", "Vivienne (France, multilingue)", "fr-FR", "Female"),
    VoiceInfo("fr-FR-RemyMultilingualNeural", "Rémy (France, multilingue)", "fr-FR", "Male"),
    VoiceInfo("fr-FR-EloiseNeural", "Éloïse (France, voix jeune)", "fr-FR", "Female"),
    VoiceInfo("fr-BE-CharlineNeural", "Charline (Belgique)", "fr-BE", "Female"),
    VoiceInfo("fr-BE-GerardNeural", "Gérard (Belgique)", "fr-BE", "Male"),
    VoiceInfo("fr-CH-ArianeNeural", "Ariane (Suisse)", "fr-CH", "Female"),
    VoiceInfo("fr-CH-FabriceNeural", "Fabrice (Suisse)", "fr-CH", "Male"),
    VoiceInfo("fr-CA-SylvieNeural", "Sylvie (Canada)", "fr-CA", "Female"),
    VoiceInfo("fr-CA-JeanNeural", "Jean (Canada)", "fr-CA", "Male"),
    VoiceInfo("fr-CA-AntoineNeural", "Antoine (Canada)", "fr-CA", "Male"),
    VoiceInfo("fr-CA-ThierryNeural", "Thierry (Canada)", "fr-CA", "Male"),
]

_GENDER_FR = {"Female": "voix féminine", "Male": "voix masculine"}
for _v in _FALLBACK_VOICES:
    _v.description = _GENDER_FR.get(_v.gender, "")


class EdgeEngine(TTSEngine):
    id = "edge"
    label = "Edge TTS (Microsoft, en ligne, meilleure qualité)"
    max_chars = 1500
    concurrency = config.EDGE_CONCURRENCY
    output_ext = "mp3"
    online = True

    def __init__(self) -> None:
        self._voices: list[VoiceInfo] | None = None
        self._voices_time = 0.0

    def availability(self) -> tuple[bool, str]:
        try:
            import edge_tts  # noqa: F401
        except ImportError:
            return False, "Le paquet edge-tts n'est pas installé."
        return True, "Nécessite une connexion Internet."

    async def list_voices(self) -> list[VoiceInfo]:
        # Liste mise en cache une heure.
        if self._voices and time.time() - self._voices_time < 3600:
            return self._voices
        try:
            import edge_tts

            raw = await edge_tts.list_voices(proxy=config.EDGE_PROXY)
            voices = [
                VoiceInfo(
                    id=v["ShortName"],
                    name=f'{v["ShortName"].split("-")[-1].replace("Neural", "")} ({v["Locale"]})',
                    locale=v["Locale"],
                    gender=v.get("Gender", ""),
                    description=_GENDER_FR.get(v.get("Gender", ""), ""),
                )
                for v in raw
                if v["Locale"].startswith("fr-")
            ]
            # Voix de France en premier, puis par nom.
            voices.sort(key=lambda v: (v.locale != "fr-FR", v.locale, v.name))
            if voices:
                self._voices, self._voices_time = voices, time.time()
                return voices
        except Exception:
            pass
        return _FALLBACK_VOICES

    def default_voice(self, voices: list[VoiceInfo]) -> str | None:
        ids = [v.id for v in voices]
        for preferred in ("fr-FR-HenriNeural", "fr-FR-DeniseNeural"):
            if preferred in ids:
                return preferred
        return super().default_voice(voices)

    @staticmethod
    def prosody(settings: SynthesisSettings) -> tuple[str, str]:
        """Convertit vitesse + ton en paramètres Edge (« +10% », « -4Hz »)."""
        tone = settings.tone_preset
        rate = round((settings.speed - 1.0) * 100) + tone.rate_pct
        rate = max(-50, min(100, rate))
        return f"{rate:+d}%", f"{tone.pitch_hz:+d}Hz"

    async def synthesize(self, text: str, settings: SynthesisSettings, out_path: Path) -> None:
        import edge_tts

        rate, pitch = self.prosody(settings)
        tmp = out_path.with_suffix(".part")
        communicate = edge_tts.Communicate(
            text,
            settings.voice,
            rate=rate,
            pitch=pitch,
            proxy=config.EDGE_PROXY,
            receive_timeout=90,
        )
        await communicate.save(str(tmp))
        if not tmp.exists() or tmp.stat().st_size < 200:
            tmp.unlink(missing_ok=True)
            raise RuntimeError("Edge TTS n'a renvoyé aucun son pour ce segment.")
        tmp.replace(out_path)
