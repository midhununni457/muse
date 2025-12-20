from .peak import extract_peaks
from .fingerprint import fingerprint
import soundfile as sf
import io

def process_audio(audio_bytes):
    data, samplerate = sf.read(io.BytesIO(audio_bytes))
    print("audio file read. samplerate:", samplerate)
    peaks = extract_peaks(data, samplerate=samplerate)
    print("peaks extracted. number of peaks:", len(peaks))
    fingerprints = fingerprint(peaks)
    print("fingerprints generated. number of fingerprints:", len(fingerprints))
    return fingerprints