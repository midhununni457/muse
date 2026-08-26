from .peak import extract_peaks
from .fingerprint import fingerprint
import soundfile as sf
import io
import subprocess

TARGET_SR = 22050

def load_audio(audio_bytes: bytes):
    try:
        data, samplerate = sf.read(io.BytesIO(audio_bytes))
        if data.ndim > 1:
            data = data.mean(axis=1)
        if samplerate == TARGET_SR:
            return data, TARGET_SR
    except Exception:
        pass

    # Standardize ALL incoming audio (WAV, MP3, WebM, FLAC, AAC) to TARGET_SR mono WAV via FFmpeg
    try:
        process = subprocess.Popen(
            [
                "ffmpeg",
                "-i", "pipe:0",
                "-f", "wav",
                "-ac", "1",
                "-ar", str(TARGET_SR),
                "-acodec", "pcm_s16le",
                "pipe:1"
            ],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        out, err = process.communicate(input=audio_bytes)
        if process.returncode != 0:
            raise ValueError(f"FFmpeg decoding failed: {err.decode('utf-8', errors='ignore')}")
        data, samplerate = sf.read(io.BytesIO(out))
        if data.ndim > 1:
            data = data.mean(axis=1)
        return data, samplerate
    except Exception as ffmpeg_err:
        raise ValueError(f"Could not decode audio format: {ffmpeg_err}")


def process_audio(audio_bytes):
    data, samplerate = load_audio(audio_bytes)
    print("audio file read. samplerate:", samplerate)
    peaks = extract_peaks(data, samplerate=samplerate)
    print("peaks extracted. number of peaks:", len(peaks))
    fingerprints = fingerprint(peaks)
    print("fingerprints generated. number of fingerprints:", len(fingerprints))
    return fingerprints