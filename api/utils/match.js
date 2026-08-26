const { packHash } = require('./hash');
const { getHashMatches } = require('../db/hashes.db');
const { getSongById } = require('../db/songs.db');

// Shazam-style offset histogram clip matching algorithm
async function matchClip(fingerprints, options = {}) {
  const minPeakThreshold = options.minPeakThreshold ?? 5;

  if (!fingerprints || fingerprints.length === 0) {
    return {
      match: null,
      confidence: 0,
      peakCount: 0,
      alignOffsetMs: null,
      candidates: [],
      reason: 'No fingerprints provided or extracted from clip',
    };
  }

  // Map clip hashes to offsets
  const clipHashMap = new Map();
  for (const [f1, f2, dt, t1_clip] of fingerprints) {
    const hash = packHash(f1, f2, dt);
    if (!clipHashMap.has(hash)) {
      clipHashMap.set(hash, []);
    }
    clipHashMap.get(hash).push(Math.round(t1_clip));
  }

  const uniqueHashes = Array.from(clipHashMap.keys());
  if (uniqueHashes.length === 0) {
    return {
      match: null,
      confidence: 0,
      peakCount: 0,
      alignOffsetMs: null,
      candidates: [],
      reason: 'No valid hashes created from clip fingerprints',
    };
  }

  // Fetch hash matches from database
  const matches = await getHashMatches(uniqueHashes);
  if (!matches || matches.length === 0) {
    return {
      match: null,
      confidence: 0,
      peakCount: 0,
      alignOffsetMs: null,
      candidates: [],
      reason: 'No hash matches found in database',
    };
  }

  // Build time-delta histograms per candidate song
  const songHistograms = new Map();

  for (const matchRow of matches) {
    const songId = matchRow.songId;
    const t1_song = matchRow.t1;
    const clipOffsets = clipHashMap.get(matchRow.hash) || [];

    if (!songHistograms.has(songId)) {
      songHistograms.set(songId, new Map());
    }
    const histogram = songHistograms.get(songId);

    const TIME_BIN_MS = 30;
    for (const t1_clip of clipOffsets) {
      const rawDelta = t1_song - t1_clip;
      const delta = Math.round(rawDelta / TIME_BIN_MS) * TIME_BIN_MS;
      const currentCount = histogram.get(delta) || 0;
      histogram.set(delta, currentCount + 1);
    }
  }

  // Score candidates by peak delta frequency and noise floor prominence
  const candidateScores = [];

  for (const [songId, histogram] of songHistograms.entries()) {
    let bestDelta = null;
    let peakCount = 0;
    let secondPeakCount = 0;
    let totalMatches = 0;

    for (const [delta, count] of histogram.entries()) {
      totalMatches += count;
      if (count > peakCount) {
        secondPeakCount = peakCount;
        peakCount = count;
        bestDelta = delta;
      } else if (count > secondPeakCount) {
        secondPeakCount = count;
      }
    }

    candidateScores.push({
      songId,
      peakCount,
      secondPeakCount,
      totalMatches,
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
      reason: 'No song candidates formed',
    };
  }

  const topCandidate = candidateScores[0];
  
  // Calculate confidence based on top bin peak count and ratio over noise floor
  const countScore = Math.min(1.0, topCandidate.peakCount / 35);
  const noiseFloor = Math.max(1, topCandidate.secondPeakCount);
  const ratioScore = Math.min(1.0, Math.max(0, (topCandidate.peakCount / noiseFloor - 1) / 10));
  const confidence = Number(Math.min(0.99, Math.max(0.05, (countScore * 0.6) + (ratioScore * 0.4))).toFixed(4));

  if (topCandidate.peakCount < minPeakThreshold) {
    return {
      match: null,
      confidence,
      peakCount: topCandidate.peakCount,
      alignOffsetMs: topCandidate.bestDelta,
      candidates: candidateScores,
      reason: `Highest match score (${topCandidate.peakCount}) below threshold (${minPeakThreshold})`,
    };
  }

  const song = await getSongById(topCandidate.songId);

  return {
    match: song,
    confidence,
    peakCount: topCandidate.peakCount,
    alignOffsetMs: topCandidate.bestDelta,
    candidates: candidateScores,
  };
}

module.exports = {
  matchClip,
};
