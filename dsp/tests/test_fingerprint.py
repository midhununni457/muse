import unittest
import numpy as np
from core.fingerprint import fingerprint
from core.peak import extract_peaks

class TestDSPCore(unittest.TestCase):

    def test_fingerprint_deterministic(self):
        # Sample peak points: [(time_sec, freq_hz), ...]
        peaks = [(0.1, 440), (0.3, 880), (0.6, 523), (1.0, 659)]
        fp1 = fingerprint(peaks, fan_value=2, min_dt=0.04, max_dt=1.2)
        fp2 = fingerprint(peaks, fan_value=2, min_dt=0.04, max_dt=1.2)
        
        self.assertEqual(fp1, fp2)
        self.assertIsInstance(fp1, list)
        if len(fp1) > 0:
            f1, f2, dt_ms, t1_ms = fp1[0]
            self.assertIsInstance(f1, int)
            self.assertIsInstance(f2, int)
            self.assertIsInstance(dt_ms, int)
            self.assertIsInstance(t1_ms, int)

    def test_extract_peaks_synthetic(self):
        # Create a synthetic 1-second sine wave at 440 Hz (A4 note)
        samplerate = 22050
        t = np.linspace(0, 1.0, samplerate, endpoint=False)
        audio_data = (np.sin(2 * np.pi * 440 * t) * 32767).astype(np.int16)
        
        peaks = extract_peaks(audio_data, samplerate)
        self.assertIsInstance(peaks, list)

if __name__ == "__main__":
    unittest.main()
