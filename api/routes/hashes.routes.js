const express = require('express');
const router = express.Router();
const hashController = require('../controllers/HashController');

router.get('/song/:songId', (req, res) =>
  hashController.getHashesForSong(req, res)
);
router.delete('/song/:songId', (req, res) =>
  hashController.deleteHashesForSong(req, res)
);

module.exports = router;
