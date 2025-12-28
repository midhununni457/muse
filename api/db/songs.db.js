const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getAllSongs() {
    return await prisma.songs.findMany();
}

async function getSongById(id) {
    return await prisma.songs.findUnique({
        where: { id: Number(id) }
    });
}

async function addSong(title, artist, filePath) {
    return await prisma.songs.create({
        data: { title, artist, filePath }
    });
}

async function updateSongUrl(id, filePath) {
    return await prisma.songs.update({
        where: { id: Number(id) },
        data: { filePath }
    });
}

async function deleteSong(id) {
    return await prisma.songs.delete({
        where: {id: Number(id)}
    })
}
