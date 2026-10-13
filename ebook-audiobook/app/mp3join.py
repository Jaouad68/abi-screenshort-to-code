"""Assemblage direct de MP3, sans réencodage (mode « qualité d'origine »).

Edge TTS fournit chaque segment en MP3 (24 kHz, mono, 48 kbps). Plutôt que de
tout décoder puis réencoder, ce qui est très coûteux sur un petit processeur
et n'améliore pas le son, on recopie les trames MP3 telles quelles :

* les blancs en début et fin de segment sont retirés trame par trame ;
* les pauses sont des trames de silence au même format ;
* on ne coupe qu'aux trames « indépendantes » (main_data_begin = 0) : une
  trame MP3 peut emprunter des octets à la précédente (réservoir de bits), et
  la couper de sa source produirait un craquement.

Le résultat est le son exact produit par la voix, en une fraction du temps.
"""

from __future__ import annotations

import subprocess
from array import array
from dataclasses import dataclass
from pathlib import Path

from .audio import _run, ffmpeg_exe

_BITRATES = {
    1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],   # MPEG-1
    2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],       # MPEG-2 et 2.5
}
_RATES = {3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000]}


@dataclass(frozen=True)
class Format:
    sample_rate: int
    bitrate: int        # kbps
    channels: int
    samples: int        # échantillons par trame

    @property
    def frame_seconds(self) -> float:
        return self.samples / self.sample_rate


@dataclass
class Frame:
    start: int
    end: int
    independent: bool  # n'emprunte rien à la trame précédente


class NotJoinable(Exception):
    """Fichier inattendu : on repassera par l'encodage classique."""


def _skip_id3(data: bytes) -> int:
    if data[:3] == b"ID3" and len(data) > 10:
        size = (data[6] << 21) | (data[7] << 14) | (data[8] << 7) | data[9]
        return 10 + size
    return 0


def parse_frames(data: bytes) -> tuple[Format, list[Frame]]:
    """Découpe un flux MP3 (couche III) en trames."""
    pos = _skip_id3(data)
    frames: list[Frame] = []
    fmt: Format | None = None
    n = len(data)
    while pos + 4 <= n:
        b1, b2, b3 = data[pos + 1], data[pos + 2], data[pos + 3]
        if data[pos] != 0xFF or (b1 & 0xE0) != 0xE0:
            if frames:
                break  # fin du flux audio (étiquette ID3v1, octets parasites)
            pos += 1
            continue
        version = (b1 >> 3) & 0x03          # 3 = MPEG-1, 2 = MPEG-2, 0 = MPEG-2.5
        layer = (b1 >> 1) & 0x03            # 1 = couche III
        protected = not (b1 & 0x01)
        br_index = (b2 >> 4) & 0x0F
        sr_index = (b2 >> 2) & 0x03
        padding = (b2 >> 1) & 0x01
        mono = ((b3 >> 6) & 0x03) == 3
        if version == 1 or layer != 1 or br_index in (0, 15) or sr_index == 3:
            raise NotJoinable("format MP3 non pris en charge")
        mpeg1 = version == 3
        bitrate = _BITRATES[1 if mpeg1 else 2][br_index]
        rate = _RATES[version][sr_index]
        length = (144 if mpeg1 else 72) * bitrate * 1000 // rate + padding
        current = Format(rate, bitrate, 1 if mono else 2, 1152 if mpeg1 else 576)
        # Les trames d'information (Xing/Info) ne contiennent pas de son et
        # peuvent avoir leur propre débit : on les ignore avant tout contrôle.
        if not frames and (b"Xing" in data[pos:pos + length] or b"Info" in data[pos:pos + length]):
            pos += length
            continue
        if fmt is None:
            fmt = current
        elif current != fmt:
            raise NotJoinable("débit ou fréquence variable")
        side = pos + 4 + (2 if protected else 0)
        if side + 2 > n:
            break
        main_data_begin = ((data[side] << 1) | (data[side + 1] >> 7)) if mpeg1 else data[side]
        frames.append(Frame(pos, min(pos + length, n), main_data_begin == 0))
        pos += length
    if fmt is None or not frames:
        raise NotJoinable("aucune trame MP3")
    return fmt, frames


_SILENCE_CACHE: dict[Format, bytes] = {}


def silent_frame(fmt: Format, workdir: Path) -> bytes:
    """Une trame de silence au format voulu, sans réservoir de bits."""
    if fmt in _SILENCE_CACHE:
        return _SILENCE_CACHE[fmt]
    out = workdir / f"_silence_{fmt.sample_rate}_{fmt.bitrate}.mp3"
    layout = "mono" if fmt.channels == 1 else "stereo"
    _run(["-f", "lavfi", "-i", f"anullsrc=r={fmt.sample_rate}:cl={layout}", "-t", "2",
          "-c:a", "libmp3lame", "-b:a", f"{fmt.bitrate}k", "-reservoir", "0",
          "-write_xing", "0", "-id3v2_version", "0", "-f", "mp3", str(out)])
    data = out.read_bytes()
    out.unlink(missing_ok=True)
    got, frames = parse_frames(data)
    if got != fmt:
        raise NotJoinable("silence au mauvais format")
    middle = frames[len(frames) // 2]          # loin du délai d'encodage
    frame = data[middle.start:middle.end]
    if not middle.independent:
        raise NotJoinable("trame de silence dépendante")
    _SILENCE_CACHE[fmt] = frame
    return frame


def _voiced_range(data: bytes, fmt: Format, threshold: int = 120) -> tuple[int, int] | None:
    """Premier et dernier échantillon audibles du segment (None si muet)."""
    import miniaudio

    decoded = miniaudio.decode(data, nchannels=1, sample_rate=fmt.sample_rate)
    samples: array = decoded.samples
    n = len(samples)
    start = 0
    while start < n and abs(samples[start]) < threshold:
        start += 1
    if start == n:
        return None
    end = n - 1
    while end > start and abs(samples[end]) < threshold:
        end -= 1
    return start, end


class Mp3Joiner:
    """Écrit un chapitre MP3 en recopiant les trames des segments."""

    def __init__(self, path: Path, workdir: Path) -> None:
        self.path = path
        self.workdir = workdir
        self.fmt: Format | None = None
        self.frames = 0
        self._out = path.open("wb")
        self._pending_silence_ms = 0

    def _silence(self, ms: int) -> None:
        assert self.fmt is not None
        count = round(ms / 1000 / self.fmt.frame_seconds)
        if count > 0:
            self._out.write(silent_frame(self.fmt, self.workdir) * count)
            self.frames += count

    def add_segment(self, data: bytes) -> None:
        fmt, frames = parse_frames(data)
        if self.fmt is None:
            self.fmt = fmt
            self._silence(self._pending_silence_ms)
        elif fmt != self.fmt:
            raise NotJoinable("segments de formats différents")
        voiced = _voiced_range(data, fmt)
        if voiced is None:
            return
        first, last = voiced
        spf = fmt.samples
        start = min(len(frames) - 1, max(0, first // spf - 2))
        # Recule jusqu'à une trame indépendante : pas d'emprunt à une trame retirée.
        while start > 0 and not frames[start].independent:
            start -= 1
        end = min(len(frames), last // spf + 4)
        kept = frames[start:end]
        self._out.write(data[kept[0].start:kept[-1].end])
        self.frames += len(kept)

    def add_silence(self, ms: int) -> None:
        if self.fmt is None:
            self._pending_silence_ms += ms  # format encore inconnu
        else:
            self._silence(ms)

    @property
    def duration(self) -> float:
        return self.frames * self.fmt.frame_seconds if self.fmt else 0.0

    def close(self) -> None:
        self._out.close()


def finalize_mp3(raw: Path, out: Path, meta: dict[str, str], cover: Path | None) -> None:
    """Ajoute titres et pochette au MP3 assemblé (copie, sans réencodage)."""
    from .audio import _meta_args

    args = ["-i", str(raw)]
    if cover:
        args += ["-i", str(cover)]
    args += ["-map", "0:a", "-c:a", "copy"]
    if cover:
        args += ["-map", "1:v", "-c:v", "copy", "-disposition:v:0", "attached_pic",
                 "-metadata:s:v", "title=Album cover", "-metadata:s:v", "comment=Cover (front)"]
    args += ["-id3v2_version", "3", *_meta_args(meta), str(out)]
    _run(args)


def check_decodes_cleanly(path: Path) -> str:
    """Erreurs de décodage éventuelles (chaîne vide si tout va bien). Utilisé par les tests."""
    proc = subprocess.run([ffmpeg_exe(), "-v", "error", "-i", str(path), "-f", "null", "-"],
                          stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    return proc.stderr.decode("utf-8", "replace").strip()
