const fs = require('fs');
const {
  getAllSongs,
  getSongById,
  addSong,
  deleteSong,
} = require('../db/songs.db');
const { deleteHashOfSong } = require('../db/hashes.db');

class SongController {
  async uploadSong(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Audio file is required' });
      }

      const { title, artist } = req.body;
      if (!title || !artist) {
        return res
          .status(400)
          .json({ error: 'Both title and artist are required' });
      }

      const song = await addSong(title, artist, req.file.path);
      return res.status(201).json(song);
    } catch (error) {
      console.error('Error uploading song:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  async getAllSongs(req, res) {
    try {
      const songs = await getAllSongs();
      return res.status(200).json(songs);
    } catch (error) {
      console.error('Error fetching songs:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  async getSongById(req, res) {
    try {
      const song = await getSongById(req.params.id);
      if (!song) {
        return res.status(404).json({ error: 'Song not found' });
      }
      return res.status(200).json(song);
    } catch (error) {
      console.error('Error fetching song:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  async deleteSong(req, res) {
    try {
      const id = Number(req.params.id);
      const song = await getSongById(id);
      if (!song) {
        return res.status(404).json({ error: 'Song not found' });
      }

      // Delete hashes linked to song
      await deleteHashOfSong(id);

      // Delete audio file from disk if present
      if (song.filePath && fs.existsSync(song.filePath)) {
        try {
          fs.unlinkSync(song.filePath);
        } catch (fileErr) {
          console.warn('Could not delete audio file from disk:', fileErr.message);
        }
      }

      const deletedSong = await deleteSong(id);
      return res
        .status(200)
        .json({ message: 'Song deleted successfully', song: deletedSong });
    } catch (error) {
      console.error('Error deleting song:', error);
      return res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new SongController();
