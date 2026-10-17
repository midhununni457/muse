const { packHash } = require('./hash');
const { getHashMatches } = require('../db/hashes.db');
const { getSongById } = require('../db/songs.db');

/**
 * Shazam-style offset histogram clip matching algorithm.
 *
 * A genuine match produces a sharp spike in the time-offset histogram —
 * many fingerprints align at the same offset.  Random noise produces a
 * roughly flat histogram with only a few collisions per bin.
 *
 * Three independent rejection gates ensure noise is never reported as a
 * match:
 *   1. Absolute peak count must exceed `minPeakThreshold` (default 10).
 *   2. The peak bin must be at least `minPeakToNoiseRatio` × the noise
 *      floor (median of non-peak bins).  Real matches score 5–50×;
 *      noise rarely exceeds 2×.
 *   3. At least `minMatchedHashPct`% of the clip's unique hashes must
 *      have found a DB hit.  Real song snippets match 10–60%;
 *      noise typically matches < 2%.
 */
async function matchClip(fingerprints, options = {}) {
  const minPeakThreshold       = options.minPeakThreshold       ?? 10;
  const minPeakToRunnerUpRatio = options.minPeakToRunnerUpRatio ?? 1.5;
  const minPeakToNoiseRatio    = options.minPeakToNoiseRatio    ?? 2.0;
  const minMatchedHashPct      = options.minMatchedHashPct      ?? 2.0;

  if (!fingerprints || fingerprints.length === 0) {
    return {
      match: null,
      confidence: 0,
      peakCount: 0,
      alignOffsetMs: null,
      candidates: [],
      diagnostics: {},
      reason: 'No fingerprints provided or extracted from clip',
    };
  }

  // ── Map clip hashes to their clip-side offsets ──────────────────────
  const clipHashMap = new Map();
  for (const [f1, f2, dt, t1_clip] of fingerprints) {
    const hash = packHash(f1, f2, dt);
    if (!clipHashMap.has(hash)) {
      clipHashMap.set(hash, []);
    }
    clipHashMap.get(hash).push(Math.round(t1_clip));
  }

  // Filter out ultra-repetitive drone hashes in the clip (e.g. constant fan noise)
  const MAX_CLIP_HASH_REPETITIONS = 5;
  for (const [hash, offsets] of clipHashMap.entries()) {
    if (offsets.length > MAX_CLIP_HASH_REPETITIONS) {
      clipHashMap.delete(hash);
    }
  }

  const uniqueHashes = Array.from(clipHashMap.keys());
  const totalClipHashes = uniqueHashes.length;

  if (totalClipHashes === 0) {
    return {
      match: null,
      confidence: 0,
      peakCount: 0,
      alignOffsetMs: null,
      candidates: [],
      diagnostics: { totalClipHashes: 0 },
      reason: 'No discriminating hashes created from clip fingerprints',
    };
  }

  // ── Fetch hash matches from database ───────────────────────────────
  const matches = await getHashMatches(uniqueHashes);
  if (!matches || matches.length === 0) {
    return {
      match: null,
      confidence: 0,
      peakCount: 0,
      alignOffsetMs: null,
      candidates: [],
      diagnostics: { totalClipHashes, matchedDbRows: 0 },
      reason: 'No hash matches found in database',
    };
  }

  // Count how many distinct clip hashes got at least one DB hit
  const matchedClipHashes = new Set(matches.map((m) => m.hash));
  const matchedHashPct = (matchedClipHashes.size / totalClipHashes) * 100;

  // ── Build time-delta histograms per candidate song ─────────────────
  // Count occurrences per hash per song to detect stopword hashes (e.g. low-frequency rumble)
  const hashSongCount = new Map();
  for (const matchRow of matches) {
    const key = `${matchRow.songId}:${matchRow.hash}`;
    hashSongCount.set(key, (hashSongCount.get(key) || 0) + 1);
  }

  const MAX_SONG_HASH_OCCURRENCES = 80;
  const songHistograms = new Map();
  const TIME_BIN_MS = 30;

  for (const matchRow of matches) {
    const songId = matchRow.songId;
    const key = `${songId}:${matchRow.hash}`;
    // Discard ultra-frequent stopword hashes that contain near-zero discriminating information
    if ((hashSongCount.get(key) || 0) > MAX_SONG_HASH_OCCURRENCES) {
      continue;
    }

    const t1_song = matchRow.t1;
    const clipOffsets = clipHashMap.get(matchRow.hash) || [];

    if (!songHistograms.has(songId)) {
      songHistograms.set(songId, new Map());
    }
    const histogram = songHistograms.get(songId);

    // Limit votes per hash pair to prevent quadratic multiplication
    const effectiveOffsets = clipOffsets.length > 2 ? clipOffsets.slice(0, 2) : clipOffsets;
    for (const t1_clip of effectiveOffsets) {
      const rawDelta = t1_song - t1_clip;
      const delta = Math.round(rawDelta / TIME_BIN_MS) * TIME_BIN_MS;
      histogram.set(delta, (histogram.get(delta) || 0) + 1);
    }
  }

  // ── Score candidates ───────────────────────────────────────────────
  const candidateScores = [];

  for (const [songId, histogram] of songHistograms.entries()) {
    let bestDelta = null;
    let peakCount = 0;
    let totalMatches = 0;

    const binCounts = [];

    for (const [delta, count] of histogram.entries()) {
      totalMatches += count;
      binCounts.push(count);
      if (count > peakCount) {
        peakCount = count;
        bestDelta = delta;
      }
    }

    // Sort bin counts descending to find the top peak and runner-up peak
    binCounts.sort((a, b) => b - a);
    const secondPeakCount = binCounts.length > 1 ? binCounts[1] : 0;
    const peakToRunnerUpRatio = secondPeakCount > 0
      ? Number((peakCount / secondPeakCount).toFixed(2))
      : (peakCount > 0 ? 999 : 0);

    // Noise floor = median of all bins excluding the top peak
    const binsForNoise = binCounts.slice(1);
    let noiseFloor = 0;
    if (binsForNoise.length > 0) {
      const mid = Math.floor(binsForNoise.length / 2);
      noiseFloor =
        binsForNoise.length % 2 === 0
          ? (binsForNoise[mid - 1] + binsForNoise[mid]) / 2
          : binsForNoise[mid];
    }

    const peakToNoiseRatio =
      noiseFloor > 0 ? Number((peakCount / noiseFloor).toFixed(2)) : (peakCount > 0 ? 999 : 0);

    candidateScores.push({
      songId,
      peakCount,
      secondPeakCount,
      peakToRunnerUpRatio,
      noiseFloor,
      peakToNoiseRatio,
      totalMatches,
      numBins: binCounts.length,
      bestDelta,
    });
  }

  candidateScores.sort((a, b) => b.peakCount - a.peakCount);

  if (candidateScores.length === 0) {
    return {
      match: null,
      confidence: 0,
      peakCount: 0,
      alignOffsetMs: null,
      candidates: [],
      diagnostics: { totalClipHashes, matchedHashPct },
      reason: 'No song candidates formed',
    };
  }

  const top = candidateScores[0];

  // ── Diagnostics (always returned for debugging) ────────────────────
  const diagnostics = {
    totalClipHashes,
    matchedClipHashes: matchedClipHashes.size,
    matchedHashPct: Number(matchedHashPct.toFixed(2)),
    topPeakCount: top.peakCount,
    topSecondPeakCount: top.secondPeakCount,
    topPeakToRunnerUpRatio: top.peakToRunnerUpRatio,
    topNoiseFloor: top.noiseFloor,
    topPeakToNoiseRatio: top.peakToNoiseRatio,
    topNumBins: top.numBins,
  };

  // ── Gate 1: absolute peak count ────────────────────────────────────
  if (top.peakCount < minPeakThreshold) {
    return {
      match: null,
      confidence: 0,
      peakCount: top.peakCount,
      alignOffsetMs: top.bestDelta,
      candidates: candidateScores,
      diagnostics,
      reason: `Peak count (${top.peakCount}) below threshold (${minPeakThreshold})`,
    };
  }

  // ── Gate 2: peak-to-runner-up ratio (genuine spike dominance) ───────
  if (top.peakToRunnerUpRatio < minPeakToRunnerUpRatio) {
    return {
      match: null,
      confidence: 0,
      peakCount: top.peakCount,
      alignOffsetMs: top.bestDelta,
      candidates: candidateScores,
      diagnostics,
      reason: `Peak-to-runner-up ratio (${top.peakToRunnerUpRatio}) below threshold (${minPeakToRunnerUpRatio})`,
    };
  }

  // ── Gate 3: peak-to-noise-floor ratio ──────────────────────────────
  if (top.peakToNoiseRatio < minPeakToNoiseRatio) {
    return {
      match: null,
      confidence: 0,
      peakCount: top.peakCount,
      alignOffsetMs: top.bestDelta,
      candidates: candidateScores,
      diagnostics,
      reason: `Peak-to-noise ratio (${top.peakToNoiseRatio}) below threshold (${minPeakToNoiseRatio})`,
    };
  }

  // ── Gate 4: minimum hash match percentage ──────────────────────────
  if (matchedHashPct < minMatchedHashPct) {
    return {
      match: null,
      confidence: 0,
      peakCount: top.peakCount,
      alignOffsetMs: top.bestDelta,
      candidates: candidateScores,
      diagnostics,
      reason: `Matched hash percentage (${matchedHashPct.toFixed(1)}%) below threshold (${minMatchedHashPct}%)`,
    };
  }

  // ── Confidence score ───────────────────────────────────────────────
  // Blend of three signals: absolute count, runner-up separation, and coverage
  const countScore = Math.min(1.0, top.peakCount / 40);
  const runnerUpScore = Math.min(1.0, Math.max(0, (top.peakToRunnerUpRatio - 1) / 5));
  const coverageScore = Math.min(1.0, matchedHashPct / 25);
  const confidence = Number(
    Math.min(0.99, Math.max(0.1, countScore * 0.45 + runnerUpScore * 0.40 + coverageScore * 0.15)).toFixed(4)
  );

  const song = await getSongById(top.songId);

  return {
    match: song,
    confidence,
    peakCount: top.peakCount,
    alignOffsetMs: top.bestDelta,
    candidates: candidateScores,
    diagnostics,
  };
}

module.exports = {
  matchClip,
};
