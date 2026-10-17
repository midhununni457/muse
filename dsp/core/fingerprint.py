def fingerprint(peaks, fan_value=15, min_dt=0.04, max_dt=1.2):
    peaks.sort(key=lambda x: x[0])  # Sort by time
    n = len(peaks)
    fingerprints = []

    for i, (t1, f1) in enumerate(peaks):
        neighbors = 0
        j = i+1

        while j < n:
            t2, f2 = peaks[j]
            dt = t2 - t1

            if dt < min_dt:
                j += 1
                continue

            if dt > max_dt:
                break

            dt_ms = int(round(dt * 1000))
            t1_ms = int(round(t1 * 1000))
            f1_q = int(round(f1))
            f2_q = int(round(f2))

            if dt_ms == 0:
                j += 1
                continue

            # Avoid pairing identical frequencies across adjacent frames (stationary tones)
            if f1_q == f2_q and dt_ms <= 60:
                j += 1
                continue

            fingerprints.append((f1_q, f2_q, dt_ms, t1_ms))

            neighbors += 1
            if neighbors >= fan_value:
                break

            j += 1

    return fingerprints