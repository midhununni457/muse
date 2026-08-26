const fs = require('fs');
const path = require('path');
const {
  getAllSongs,
  getSongById,
  addSong,
  deleteSong,
} = require('../db/songs.db');
const { deleteHashOfSong, addManyHashes } = require('../db/hashes.db');
const { packHash } = require('../utils/hash');
const {
  uploadAudioToSupabase,
  deleteAudioFromSupabase,
  getAudioBufferFromSupabase,
} = require('../utils/storage');

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

      // Upload buffer to Supabase Storage
      const { publicUrl } = await uploadAudioToSupabase(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      const song = await addSong(title, artist, publicUrl);
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

  async processSong(req, res) {
    try {
      const id = Number(req.params.id);
      const song = await getSongById(id);
      if (!song) {
        return res.status(404).json({ error: 'Song not found' });
      }

      if (!song.filePath) {
        return res
          .status(400)
          .json({ error: 'Audio file reference not found for this song' });
      }

      let fileBuffer;
      // Support legacy local files if present
      if (fs.existsSync(song.filePath)) {
        fileBuffer = fs.readFileSync(song.filePath);
      } else {
        // Fetch audio buffer from Supabase Storage / Public URL
        fileBuffer = await getAudioBufferFromSupabase(song.filePath);
      }

      const dspUrl = process.env.DSP_SERVICE_URL || 'http://localhost:8000';
      const blob = new Blob([fileBuffer]);
      const formData = new FormData();
      formData.append('audio', blob, path.basename(song.filePath));

      let dspResponse;
      try {
        dspResponse = await fetch(`${dspUrl}/extract`, {
          method: 'POST',
          body: formData,
        });
      } catch (fetchErr) {
        return res.status(503).json({
          error: 'DSP service is unreachable',
          details: fetchErr.message,
        });
      }

      if (!dspResponse.ok) {
        const errorText = await dspResponse.text();
        return res.status(502).json({
          error: 'DSP service returned an error',
          details: errorText,
        });
      }

      const dspData = await dspResponse.json();
      const rawFingerprints = dspData.fingerprints || [];

      const hashesToInsert = rawFingerprints.map(([f1, f2, dt_ms, t1_ms]) => ({
        hash: packHash(f1, f2, dt_ms),
        songId: id,
        t1: Math.round(t1_ms),
      }));

      if (hashesToInsert.length > 0) {
        await addManyHashes(hashesToInsert);
      }

      return res.status(200).json({
        message: 'Song processed successfully',
        songId: id,
        fingerprintsExtracted: rawFingerprints.length,
        hashesStored: hashesToInsert.length,
      });
    } catch (error) {
      console.error('Error processing song:', error);
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

      // Delete audio file from storage (Supabase or legacy local disk)
      if (song.filePath) {
        if (fs.existsSync(song.filePath)) {
          try {
            fs.unlinkSync(song.filePath);
          } catch (fileErr) {
            console.warn('Could not delete local audio file:', fileErr.message);
          }
        } else {
          await deleteAudioFromSupabase(song.filePath);
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
