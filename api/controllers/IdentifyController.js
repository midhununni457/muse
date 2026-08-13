const fs = require('fs');
const path = require('path');
const { matchClip } = require('../utils/match');

class IdentifyController {
  async identifyAudioClip(req, res) {
    let clipPath = null;
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Audio clip file is required' });
      }

      clipPath = req.file.path;
      const dspUrl = process.env.DSP_SERVICE_URL || 'http://localhost:8000';
      const fileBuffer = fs.readFileSync(clipPath);
      const blob = new Blob([fileBuffer]);
      const formData = new FormData();
      formData.append('audio', blob, path.basename(clipPath));

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
      const fingerprints = dspData.fingerprints || [];

      const threshold = req.query.threshold || req.body?.threshold
        ? Number(req.query.threshold || req.body?.threshold)
        : 5;

      const result = await matchClip(fingerprints, { minPeakThreshold: threshold });

      return res.status(200).json({
        success: !!result.match,
        ...result,
      });
    } catch (error) {
      console.error('Error identifying audio clip:', error);
      return res.status(500).json({ error: error.message });
    } finally {
      // Clean up temporary clip file
      if (clipPath && fs.existsSync(clipPath)) {
        try {
          fs.unlinkSync(clipPath);
        } catch (cleanupErr) {
          console.warn('Failed to delete temp clip file:', cleanupErr.message);
        }
      }
    }
  }
}

module.exports = new IdentifyController();
