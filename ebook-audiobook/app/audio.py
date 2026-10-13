"""Traitement audio avec FFmpeg.

* ``ffmpeg_exe`` trouve FFmpeg : celui du système s'il existe, sinon la
  version fournie par le paquet Python ``imageio-ffmpeg`` (rien à installer
  à la main sous Windows) ;
* ``ChapterWavWriter`` assemble les segments d'un chapitre en un seul WAV en
  insérant les silences voulus, sans jamais charger tout le chapitre en
  mémoire ;
* ``encode_chapter`` normalise le volume et encode en MP3 et/ou AAC ;
* ``build_m4b`` réunit les chapitres AAC en un livre audio M4B avec chapitres
  et pochette.
"""

from __future__ import annotations

import os
import re
import shutil
import subprocess
import wave
from array import array
from pathlib import Path

from . import config


class FFmpegError(RuntimeError):
    pass


_FFMPEG: str | None = None


def ffmpeg_exe() -> str:
    """Chemin de l'exécutable FFmpeg à utiliser."""
    global _FFMPEG
    if _FFMPEG:
        return _FFMPEG
    candidates = [os.environ.get("AUDIOBOOK_FFMPEG"), shutil.which("ffmpeg")]
    for c in candidates:
        if c and Path(c).exists():
            _FFMPEG = c
            return c
    try:
        import imageio_ffmpeg

        _FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
        return _FFMPEG
    except Exception as exc:  # pragma: no cover - dépend de l'installation
        raise FFmpegError(
            "FFmpeg est introuvable. Installez le paquet imageio-ffmpeg "
            "(pip install imageio-ffmpeg) ou FFmpeg lui-même."
        ) from exc


def _run(args: list[str], capture_stdout: bool = False) -> bytes:
    """Lance FFmpeg et lève ``FFmpegError`` avec son message en cas d'échec."""
    cmd = [ffmpeg_exe(), "-hide_banner", "-nostdin", "-loglevel", "error", "-y", *args]
    kwargs = {}
    if os.name == "nt":  # pas de fenêtre console qui clignote sous Windows
        kwargs["creationflags"] = getattr(subprocess, "CREATE_NO_WINDOW", 0)
    proc = subprocess.run(
        cmd,
        stdout=subprocess.PIPE if capture_stdout else subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        **kwargs,
    )
    if proc.returncode != 0:
        msg = proc.stderr.decode("utf-8", "replace").strip().splitlines()[-5:]
        raise FFmpegError("FFmpeg a échoué : " + " | ".join(msg))
    return proc.stdout if capture_stdout else b""


# ---------------------------------------------------------------------------
# Décodage et assemblage
# ---------------------------------------------------------------------------

def decode_to_pcm(path: Path, sample_rate: int) -> bytes:
    """Décode un fichier audio en PCM 16 bits mono à ``sample_rate`` Hz."""
    if path.suffix.lower() == ".wav":
        with wave.open(str(path), "rb") as w:
            if w.getnchannels() == 1 and w.getsampwidth() == 2 and w.getframerate() == sample_rate:
                return w.readframes(w.getnframes())
    return _run(
        ["-i", str(path), "-f", "s16le", "-acodec", "pcm_s16le", "-ac", "1",
         "-ar", str(sample_rate), "pipe:1"],
        capture_stdout=True,
    )


def trim_silence(
    pcm: bytes, sample_rate: int, threshold: int = 120, keep_start_ms: int = 60,
    keep_end_ms: int = 140, fade_ms: int = 12,
) -> bytes:
    """Retire le silence en début et fin de segment, sans abîmer la voix.

    Les moteurs ajoutent des blancs variables autour de chaque segment ; les
    retirer rend les pauses régulières et maîtrisées par l'application.
    On garde une marge plus longue en fin de segment (les fins de phrase
    s'éteignent doucement : « s », « f », souffle) et on applique un fondu très
    court aux deux extrémités pour éviter tout « clic » au raccord.
    Seules les extrémités sont parcourues : le coût reste négligeable.
    """
    samples = array("h")
    samples.frombytes(pcm[: len(pcm) - len(pcm) % 2])
    n = len(samples)
    if n == 0:
        return pcm
    start = 0
    while start < n and abs(samples[start]) < threshold:
        start += 1
    if start == n:
        return b""
    end = n - 1
    while end > start and abs(samples[end]) < threshold:
        end -= 1
    start = max(0, start - int(sample_rate * keep_start_ms / 1000))
    end = min(n, end + 1 + int(sample_rate * keep_end_ms / 1000))
    out = samples[start:end]
    fade = min(int(sample_rate * fade_ms / 1000), len(out) // 2)
    for i in range(fade):
        gain = i / fade
        out[i] = int(out[i] * gain)
        out[-1 - i] = int(out[-1 - i] * gain)
    return out.tobytes()


class ChapterWavWriter:
    """Écrit un chapitre en WAV mono 16 bits, segment par segment."""

    def __init__(self, path: Path, sample_rate: int) -> None:
        self.path = path
        self.sample_rate = sample_rate
        self.frames = 0
        self._wav = wave.open(str(path), "wb")
        self._wav.setnchannels(1)
        self._wav.setsampwidth(2)
        self._wav.setframerate(sample_rate)

    def add_audio(self, pcm: bytes) -> None:
        self._wav.writeframes(pcm)
        self.frames += len(pcm) // 2

    def add_silence(self, ms: int) -> None:
        n = int(self.sample_rate * ms / 1000)
        if n > 0:
            self._wav.writeframes(b"\x00\x00" * n)
            self.frames += n

    @property
    def duration(self) -> float:
        return self.frames / self.sample_rate

    def close(self) -> None:
        self._wav.close()

    def __enter__(self) -> "ChapterWavWriter":
        return self

    def __exit__(self, *exc) -> None:
        self.close()


# ---------------------------------------------------------------------------
# Encodage
# ---------------------------------------------------------------------------

def _meta_args(meta: dict[str, str]) -> list[str]:
    args: list[str] = []
    for key, value in meta.items():
        if value:
            args += ["-metadata", f"{key}={value}"]
    return args


def encode_chapter(
    wav: Path,
    mp3_out: Path | None,
    m4a_out: Path | None,
    bitrate: int,
    meta: dict[str, str],
    cover: Path | None = None,
) -> None:
    """Normalise le volume puis encode le chapitre en MP3 et/ou AAC (M4A).

    Un seul passage FFmpeg produit les deux sorties : le WAV n'est lu qu'une fois.
    """
    if not mp3_out and not m4a_out:
        return
    outputs = [o for o in (mp3_out, m4a_out) if o]
    chain = (
        f"loudnorm=I={config.LOUDNESS_TARGET}:TP=-1.5:LRA=11,"
        f"aresample={config.OUTPUT_SAMPLE_RATE}"
    )
    if len(outputs) == 2:
        filt = f"[0:a]{chain},asplit=2[mp3][aac]"
        labels = {"mp3": "[mp3]", "aac": "[aac]"}
    else:
        only = "mp3" if mp3_out else "aac"
        filt = f"[0:a]{chain}[{only}]"
        labels = {only: f"[{only}]"}

    args = ["-i", str(wav)]
    if cover and mp3_out:
        args += ["-i", str(cover)]
    args += ["-filter_complex", filt]

    if mp3_out:
        args += ["-map", labels["mp3"]]
        if cover:
            args += ["-map", "1:v", "-c:v", "copy", "-disposition:v:0", "attached_pic",
                     "-metadata:s:v", "title=Album cover", "-metadata:s:v", "comment=Cover (front)"]
        args += ["-c:a", "libmp3lame", "-b:a", f"{bitrate}k", "-ac", "1",
                 "-id3v2_version", "3", *_meta_args(meta), str(mp3_out)]
    if m4a_out:
        args += ["-map", labels["aac"], "-c:a", "aac", "-b:a", f"{bitrate}k", "-ac", "1",
                 *_meta_args(meta), str(m4a_out)]
    _run(args)


_DURATION_RE = re.compile(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)")


def media_duration(path: Path) -> float:
    """Durée d'un fichier audio en secondes (lue dans la sortie de ``ffmpeg -i``)."""
    proc = subprocess.run(
        [ffmpeg_exe(), "-hide_banner", "-nostdin", "-i", str(path)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        **({"creationflags": getattr(subprocess, "CREATE_NO_WINDOW", 0)} if os.name == "nt" else {}),
    )
    m = _DURATION_RE.search(proc.stderr.decode("utf-8", "replace"))
    if not m:
        raise FFmpegError(f"Durée illisible pour {path.name}")
    h, mnt, s = m.groups()
    return int(h) * 3600 + int(mnt) * 60 + float(s)


def _escape_ffmeta(value: str) -> str:
    """Échappe les caractères spéciaux du format FFMETADATA."""
    return re.sub(r"([=;#\\\n])", r"\\\1", value)


def build_m4b(
    parts: list[tuple[Path, str]],
    out: Path,
    meta: dict[str, str],
    cover: Path | None = None,
) -> None:
    """Assemble des chapitres AAC (.m4a) en un livre audio .m4b avec chapitres.

    Les fichiers AAC sont copiés sans réencodage : l'opération est rapide et
    ne dégrade pas la qualité.
    """
    work = out.parent
    list_file = work / "_concat.txt"
    meta_file = work / "_chapters.txt"

    lines = []
    for path, _ in parts:
        p = path.resolve().as_posix().replace("'", "'\\''")
        lines.append(f"file '{p}'")
    list_file.write_text("\n".join(lines) + "\n", encoding="utf-8")

    ff = [";FFMETADATA1"]
    for key, value in meta.items():
        if value:
            ff.append(f"{key}={_escape_ffmeta(value)}")
    start = 0
    for path, title in parts:
        end = start + int(round(media_duration(path) * 1000))
        ff += ["[CHAPTER]", "TIMEBASE=1/1000", f"START={start}", f"END={end}",
               f"title={_escape_ffmeta(title)}"]
        start = end
    meta_file.write_text("\n".join(ff) + "\n", encoding="utf-8")

    tmp = out.with_name(out.stem + ".tmp.m4b")
    args = ["-f", "concat", "-safe", "0", "-i", str(list_file), "-i", str(meta_file)]
    if cover:
        args += ["-i", str(cover)]
    args += ["-map", "0:a", "-map_metadata", "1", "-map_chapters", "1"]
    if cover:
        args += ["-map", "2:v", "-c:v", "copy", "-disposition:v:0", "attached_pic"]
    args += ["-c:a", "copy", "-movflags", "+faststart", "-f", "ipod", str(tmp)]
    try:
        _run(args)
        tmp.replace(out)
    finally:
        list_file.unlink(missing_ok=True)
        meta_file.unlink(missing_ok=True)
        tmp.unlink(missing_ok=True)
