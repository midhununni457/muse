const {
  getAllHashesOfSong,
  deleteHashOfSong,
} = require('../db/hashes.db');

class HashController {
  async getHashesForSong(req, res) {
    try {
      const { songId } = req.params;
      const hashes = await getAllHashesOfSong(songId);
      const serializedHashes = hashes.map((h) => ({
        ...h,
        hash: h.hash.toString(),
      }));
      return res.status(200).json(serializedHashes);
    } catch (error) {
      console.error('Error getting hashes for song:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  async deleteHashesForSong(req, res) {
    try {
      const { songId } = req.params;
      const result = await deleteHashOfSong(songId);
      return res
        .status(200)
        .json({ message: 'Hashes deleted successfully', count: result.count });
    } catch (error) {
      console.error('Error deleting hashes for song:', error);
      return res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new HashController();
