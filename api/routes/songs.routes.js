const express = require('express');
const router = express.Router();
const songController = require('../controllers/SongController');
const upload = require('../middleware/upload');

router.post('/', upload.single('audio'), (req, res) =>
  songController.uploadSong(req, res)
);
router.get('/', (req, res) => songController.getAllSongs(req, res));
router.get('/:id', (req, res) => songController.getSongById(req, res));
router.delete('/:id', (req, res) => songController.deleteSong(req, res));

module.exports = router;
