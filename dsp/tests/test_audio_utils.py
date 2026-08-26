import unittest
import numpy as np
import soundfile as sf
import io
import subprocess
from core.audio_utils import load_audio

class TestAudioUtils(unittest.TestCase):

    def test_load_audio_wav(self):
        # Create a synthetic 1-second 440 Hz WAV byte buffer
        samplerate = 22050
        t = np.linspace(0, 1.0, samplerate, endpoint=False)
        audio_data = (np.sin(2 * np.pi * 440 * t) * 32767).astype(np.int16)
        
        wav_io = io.BytesIO()
        sf.write(wav_io, audio_data, samplerate, format='WAV')
        wav_bytes = wav_io.getvalue()
        
        data, sr = load_audio(wav_bytes)
        self.assertEqual(sr, samplerate)
        self.assertGreater(len(data), 0)

    def test_load_audio_webm_fallback(self):
        # Generate WebM audio bytes using ffmpeg
        samplerate = 22050
        t = np.linspace(0, 1.0, samplerate, endpoint=False)
        audio_data = (np.sin(2 * np.pi * 440 * t) * 32767).astype(np.int16)
        
        wav_io = io.BytesIO()
        sf.write(wav_io, audio_data, samplerate, format='WAV')
        wav_bytes = wav_io.getvalue()

        # Convert WAV to WebM format via ffmpeg
        process = subprocess.Popen(
            ["ffmpeg", "-i", "pipe:0", "-f", "webm", "-acodec", "libopus", "pipe:1"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        webm_bytes, err = process.communicate(input=wav_bytes)
        self.assertEqual(process.returncode, 0, f"FFmpeg failed to create test webm: {err.decode()}")

        # Now test load_audio decoding the WebM bytes
        data, sr = load_audio(webm_bytes)
        self.assertEqual(sr, 22050)
        self.assertGreater(len(data), 0)

if __name__ == "__main__":
    unittest.main()
