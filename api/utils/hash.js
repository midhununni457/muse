function packHash(f1, f2, dt) {
    return (BigInt(f1) << 32n) | (BigInt(f2) << 16n) | BigInt(dt);
}

function unpackHash(hash) {
    const dt = Number(hash & 0xFFFFn);
    const f2 = Number((hash >> 16n) & 0xFFFFn);
    const f1 = Number(hash >> 32n);
    return { f1, f2, dt };
}

module.exports = {
    packHash,
    unpackHash,
};