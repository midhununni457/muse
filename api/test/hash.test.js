const test = require('node:test');
const assert = require('node:assert');
const { packHash, unpackHash } = require('../utils/hash');

test('packHash and unpackHash roundtrip', () => {
  const f1 = 440;
  const f2 = 880;
  const dt = 120;

  const packed = packHash(f1, f2, dt);
  assert.equal(typeof packed, 'bigint');

  const unpacked = unpackHash(packed);
  assert.deepEqual(unpacked, { f1, f2, dt });
});
