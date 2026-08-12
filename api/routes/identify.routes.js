const express = require('express');
const router = express.Router();
const identifyController = require('../controllers/IdentifyController');
const upload = require('../middleware/upload');

router.post('/', upload.single('audio'), (req, res) =>
  identifyController.identifyAudioClip(req, res)
);

module.exports = router;
