import numpy as np
from scipy.signal import find_peaks, spectrogram

EPS = 1e-12

def extract_peaks(data, samplerate, nperseg=2048, noverlap=None, top_k_per_frame=5, amp_offset_db=6.0, prominence=None):

    waveform = np.asarray(data)
    if waveform.size == 0:
        raise ValueError("empty waveform")

    if waveform.ndim > 1:
        waveform = waveform.mean(axis=1)

    num_samples = waveform.shape[0]
    if num_samples < 2:
        raise ValueError("audio too short (num_samples < 2)")

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
        # Option A: use frame-specific percentile to adapt to local content
        frame_thresh = max(global_thresh, np.percentile(col, 75))  # tune 75 if needed

        # find candidate peaks in this column with optional prominence
        if prominence is not None:
            idxs, props = find_peaks(col, height=frame_thresh, prominence=prominence)
        else:
            idxs, props = find_peaks(col, height=frame_thresh)

        if idxs.size == 0:
            peaks_per_frame.append(0)
            continue

        # keep only top-K by amplitude if requested
        if top_k_per_frame is not None and len(idxs) > top_k_per_frame:
            heights = props["peak_heights"]
            # pick indices of top K heights
            top_k_idx = np.argpartition(heights, -top_k_per_frame)[-top_k_per_frame:]
            idxs = np.array(idxs)[top_k_idx]
            heights = np.array(heights)[top_k_idx]
        else:
            heights = props["peak_heights"]

        peaks_per_frame.append(len(idxs))

        for p_idx, amp in zip(idxs, heights):
            peaks.append((times[i], freqs[p_idx]))

    # quick diagnostics (remove or log as needed)
    total_peaks = len(peaks)
    avg_peaks = (sum(peaks_per_frame) / len(peaks_per_frame)) if peaks_per_frame else 0
    max_peaks = max(peaks_per_frame) if peaks_per_frame else 0
    print(f"DEBUG: frames={total_frames}, total_peaks={total_peaks}, avg_peaks/frame={avg_peaks:.2f}, max_peaks/frame={max_peaks}")

    return peaks
