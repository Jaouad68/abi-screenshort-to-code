"""Interface commune des moteurs de synthèse vocale.

Ajouter un moteur (par exemple XTTS sur une machine avec GPU) revient à
écrire une classe qui hérite de ``TTSEngine`` et à l'enregistrer dans
``tts/__init__.py``. Le reste de l'application n'a rien à changer.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import asdict, dataclass
from pathlib import Path


@dataclass
class VoiceInfo:
    id: str
    name: str
    locale: str
    gender: str = ""
    description: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass(frozen=True)
class Tone:
    """Préréglage de « ton », traduit en paramètres propres à chaque moteur."""

    label: str
    pitch_hz: int = 0          # Edge : décalage de hauteur
    rate_pct: int = 0          # Edge : ajustement de débit, ajouté à la vitesse
    piper_noise: float = 0.667  # Piper : variabilité de la voix (expressivité)
    piper_noise_w: float = 0.8  # Piper : variabilité du rythme
    piper_length: float = 1.0   # Piper : multiplicateur de durée


TONES: dict[str, Tone] = {
    "neutre": Tone("Neutre"),
    "pose": Tone("Posé, grave", pitch_hz=-6, rate_pct=-6, piper_noise=0.5, piper_noise_w=0.6, piper_length=1.06),
    "chaleureux": Tone("Chaleureux", pitch_hz=-3, rate_pct=-3, piper_noise=0.75, piper_noise_w=0.85, piper_length=1.03),
    "vif": Tone("Vif, dynamique", pitch_hz=3, rate_pct=7, piper_noise=0.75, piper_noise_w=0.9, piper_length=0.95),
    "expressif": Tone("Expressif", pitch_hz=2, rate_pct=0, piper_noise=0.9, piper_noise_w=1.0, piper_length=1.0),
}


@dataclass
class SynthesisSettings:
    voice: str
    speed: float = 1.0         # 1.0 = vitesse normale, 0.7 à 1.5
    tone: str = "neutre"

    @property
    def tone_preset(self) -> Tone:
        return TONES.get(self.tone, TONES["neutre"])


class TTSEngine(ABC):
    """Moteur de synthèse vocale."""

    #: identifiant technique (« edge », « piper »)
    id: str = ""
    #: nom affiché dans l'interface
    label: str = ""
    #: longueur maximale d'un segment envoyé en une fois
    max_chars: int = 1000
    #: nombre de segments synthétisés en parallèle
    concurrency: int = 1
    #: extension des fichiers produits (« mp3 », « wav »)
    output_ext: str = "wav"
    #: vrai si le moteur a besoin d'Internet
    online: bool = False

    @abstractmethod
    def availability(self) -> tuple[bool, str]:
        """(disponible, explication à afficher si indisponible)."""

    @abstractmethod
    async def list_voices(self) -> list[VoiceInfo]:
        """Voix françaises disponibles."""

    @abstractmethod
    async def synthesize(self, text: str, settings: SynthesisSettings, out_path: Path) -> None:
        """Synthétise ``text`` dans ``out_path``. Lève une exception en cas d'échec."""

    def default_voice(self, voices: list[VoiceInfo]) -> str | None:
        return voices[0].id if voices else None

    def sample_rate(self, voice_id: str) -> int:
        """Fréquence native de la voix, utilisée pour assembler les chapitres."""
        return 24000
