const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function getAllHashesOfSong(songId) {
  return await prisma.hashes.findMany({
    where: { songId: Number(songId) },
  });
}

async function getHashMatches(hashes) {
  return await prisma.hashes.findMany({
    where: {
      hash: { in: hashes },
    },
  });
}

async function addHash(hash, songId, t1) {
  return await prisma.hashes.create({
    data: { songId, hash, t1 },
  });
}

async function addManyHashes(hashes) {
  return await prisma.hashes.createMany({
    data: hashes,
    skipDuplicates: true,
  });
}

async function deleteHashOfSong(songId) {
  return await prisma.hashes.delete({
    where: { songId: Number(songId) },
  });
}
