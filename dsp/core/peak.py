import numpy as np
from scipy.signal import find_peaks, spectrogram

EPS = 1e-12

def extract_peaks(data, samplerate, nperseg=2048, noverlap=None, top_k_per_frame=5, amp_offset_db=6.0, prominence=None, min_rms=0.002, min_freq=150.0, max_freq=5000.0):

    waveform = np.asarray(data)
    if waveform.size == 0:
        raise ValueError("empty waveform")

    if waveform.ndim > 1:
        waveform = waveform.mean(axis=1)

    num_samples = waveform.shape[0]
    if num_samples < 2:
        raise ValueError("audio too short (num_samples < 2)")

    # Audio energy check: reject dead silence and inaudible microphone hiss
    if np.issubdtype(waveform.dtype, np.integer):
        norm_wave = waveform.astype(np.float64) / 32768.0
    else:
        norm_wave = waveform.astype(np.float64)

    rms = float(np.sqrt(np.mean(norm_wave ** 2)))
    if rms < min_rms:
        print(f"DEBUG: Audio RMS energy ({rms:.6f}) below silence threshold ({min_rms}), skipping peak extraction")
        return []

    if num_samples < nperseg:
        nperseg = max(2, num_samples)

    if noverlap is None:
        noverlap = nperseg // 2
    elif noverlap >= nperseg:
        noverlap = max(0, nperseg // 2)

    freqs, times, Sxx = spectrogram(
        waveform,
        fs=samplerate,
        nperseg=nperseg,
        noverlap=noverlap,
        window="hann",
        scaling="spectrum",
        mode="magnitude"
    )

    Sxx_log = 10 * np.log10(Sxx + EPS)

    peaks = []
    # A sensible global threshold (backup)
    global_median = np.median(Sxx_log)
    global_thresh = global_median + amp_offset_db

    # Diagnostics counters
    total_frames = Sxx_log.shape[1]
    peaks_per_frame = []

    for i, col in enumerate(Sxx_log.T):
        # Frame-specific percentile to adapt to local content
        frame_thresh = max(global_thresh, np.percentile(col, 75))

        # Find candidate peaks in this frequency column
        if prominence is not None:
            idxs, props = find_peaks(col, height=frame_thresh, prominence=prominence)
        else:
            idxs, props = find_peaks(col, height=frame_thresh)

        if idxs.size == 0:
            peaks_per_frame.append(0)
            continue

        # Keep only top-K by amplitude
        if top_k_per_frame is not None and len(idxs) > top_k_per_frame:
            heights = props["peak_heights"]
            top_k_idx = np.argpartition(heights, -top_k_per_frame)[-top_k_per_frame:]
            idxs = np.array(idxs)[top_k_idx]
            heights = np.array(heights)[top_k_idx]
        else:
            heights = props["peak_heights"]

        frame_peaks = 0
        for p_idx, amp in zip(idxs, heights):
            freq = float(freqs[p_idx])
            # 1. Frequency filter: ignore room fan rumble (<150Hz) and ultrasonic noise (>5000Hz)
            if freq < min_freq or freq > max_freq:
                continue

            # 2. 2D Local Maximum in time: reject continuous stationary tones (e.g. constant fan noise)
            # A genuine musical landmark must be a transient peak that rises and falls in time
            if i > 0 and Sxx_log[p_idx, i] < Sxx_log[p_idx, i - 1]:
                continue
            if i < total_frames - 1 and Sxx_log[p_idx, i] < Sxx_log[p_idx, i + 1]:
                continue

            peaks.append((times[i], freq))
            frame_peaks += 1

        peaks_per_frame.append(frame_peaks)

    # Diagnostics
    total_peaks = len(peaks)
    avg_peaks = (sum(peaks_per_frame) / len(peaks_per_frame)) if peaks_per_frame else 0
    max_peaks = max(peaks_per_frame) if peaks_per_frame else 0
    print(f"DEBUG: frames={total_frames}, total_peaks={total_peaks}, avg_peaks/frame={avg_peaks:.2f}, max_peaks/frame={max_peaks}")

    return peaks

