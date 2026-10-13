"""Registre des moteurs de synthèse vocale disponibles."""

from __future__ import annotations

from .base import TONES, SynthesisSettings, TTSEngine, VoiceInfo
from .edge import EdgeEngine
from .piper_engine import PiperEngine

__all__ = ["TONES", "SynthesisSettings", "TTSEngine", "VoiceInfo", "get_engines"]


def get_engines() -> dict[str, TTSEngine]:
    """Moteurs proposés dans l'interface, dans l'ordre de préférence."""
    engines: list[TTSEngine] = [EdgeEngine(), PiperEngine()]
    return {e.id: e for e in engines}
