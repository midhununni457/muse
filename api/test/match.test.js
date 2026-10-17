const test = require('node:test');
const assert = require('node:assert');
const { matchClip } = require('../utils/match');

test('matchClip returns null for empty fingerprints', async () => {
  const result = await matchClip([]);
  assert.equal(result.match, null);
  assert.equal(result.confidence, 0);
  assert.match(result.reason, /No fingerprints/);
});

test('matchClip rejects flat random collision noise with runner-up gate', async () => {
  // Mock fingerprints that produce uniform/flat noise
  // In a flat histogram, runner-up ratio is ~1.0, which should be rejected
  const fakeFingerprints = [];
  for (let i = 0; i < 50; i++) {
    fakeFingerprints.push([100 + i * 10, 200 + i * 10, 50, i * 100]);
  }

  const result = await matchClip(fakeFingerprints);
  // Without matching DB hashes, or with flat collisions, match should be null
  assert.equal(result.match, null);
});
