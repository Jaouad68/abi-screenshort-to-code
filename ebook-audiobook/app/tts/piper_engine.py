"""Moteur Piper : synthèse neuronale 100 % hors ligne, rapide sur processeur.

Les voix sont des fichiers ``.onnx`` (+ ``.onnx.json``) placés dans
``data/piper_voices``. Le script ``scripts/download_voices.py`` télécharge
les voix françaises recommandées.

Piper est moins naturel qu'Edge TTS mais fonctionne sans Internet, sans
limite et sans dépendre d'un service tiers. Sur un processeur récent, il
produit environ 10 à 30 secondes d'audio par seconde de calcul.
"""

from __future__ import annotations

import asyncio
import json
import threading
import wave
from pathlib import Path

from .. import config
from .base import SynthesisSettings, TTSEngine, VoiceInfo

_PRETTY = {
    "siwis": "Siwis (féminine)",
    "tom": "Tom (masculine)",
    "upmc": "UPMC (féminine/masculine)",
    "gilles": "Gilles (masculine)",
    "mls": "MLS (multi-locuteurs)",
    "mls_1840": "MLS 1840",
}


class PiperEngine(TTSEngine):
    id = "piper"
    label = "Piper (hors ligne, rapide)"
    max_chars = 600
    concurrency = 1           # onnxruntime utilise déjà plusieurs cœurs
    output_ext = "wav"
    online = False

    def __init__(self, voices_dir: Path | None = None) -> None:
        self.voices_dir = voices_dir or config.PIPER_VOICES_DIR
        self._loaded: dict[str, object] = {}
        self._lock = threading.Lock()

    def _models(self) -> list[Path]:
        if not self.voices_dir.exists():
            return []
        return sorted(
            p for p in self.voices_dir.glob("*.onnx")
            if p.with_suffix(".onnx.json").exists()
        )

    def availability(self) -> tuple[bool, str]:
        try:
            import piper  # noqa: F401
        except ImportError:
            return False, "Le paquet piper-tts n'est pas installé."
        if not self._models():
            return False, (
                "Aucune voix Piper trouvée. Lancez : python scripts/download_voices.py"
            )
        return True, "Fonctionne sans Internet."

    async def list_voices(self) -> list[VoiceInfo]:
        voices = []
        for model in self._models():
            stem = model.stem                        # ex. fr_FR-siwis-medium
            parts = stem.split("-")
            locale = parts[0].replace("_", "-") if parts else ""
            if not locale.startswith("fr"):
                continue
            speaker = parts[1] if len(parts) > 1 else stem
            quality = parts[2] if len(parts) > 2 else ""
            name = _PRETTY.get(speaker, speaker.capitalize())
            if quality:
                name += f", qualité {quality}"
            voices.append(VoiceInfo(id=stem, name=name, locale=locale))
        return voices

    def sample_rate(self, voice_id: str) -> int:
        cfg = self.voices_dir / f"{voice_id}.onnx.json"
        try:
            return int(json.loads(cfg.read_text(encoding="utf-8"))["audio"]["sample_rate"])
        except Exception:
            return 22050

    def _voice(self, voice_id: str):
        """Charge un modèle une seule fois (quelques secondes, ~60 Mo en mémoire)."""
        from piper import PiperVoice

        if voice_id not in self._loaded:
            model = self.voices_dir / f"{voice_id}.onnx"
            if not model.exists():
                raise FileNotFoundError(f"Voix Piper introuvable : {model}")
            self._loaded[voice_id] = PiperVoice.load(str(model))
        return self._loaded[voice_id]

    def _synthesize_sync(self, text: str, settings: SynthesisSettings, out_path: Path) -> None:
        from piper import SynthesisConfig

        tone = settings.tone_preset
        syn = SynthesisConfig(
            length_scale=tone.piper_length / max(settings.speed, 0.3),
            noise_scale=tone.piper_noise,
            noise_w_scale=tone.piper_noise_w,
            normalize_audio=True,
        )
        tmp = out_path.with_suffix(".part")
        with self._lock:
            voice = self._voice(settings.voice)
            with wave.open(str(tmp), "wb") as wav:
                voice.synthesize_wav(text, wav, syn_config=syn)
        tmp.replace(out_path)

    async def synthesize(self, text: str, settings: SynthesisSettings, out_path: Path) -> None:
        await asyncio.to_thread(self._synthesize_sync, text, settings, out_path)
