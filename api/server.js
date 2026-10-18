require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const songsRouter = require('./routes/songs.routes');
const hashesRouter = require('./routes/hashes.routes');
const identifyRouter = require('./routes/identify.routes');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/songs', songsRouter);
app.use('/hashes', hashesRouter);
app.use('/identify', identifyRouter);

app.get('/', (req, res) => {
  res.send('Muse API Service is running');
});

// Live Health & Wakeup endpoint for Database and DSP engine
app.get('/health', async (req, res) => {
  const dspUrl = process.env.DSP_SERVICE_URL || 'http://localhost:8000';
  let databaseStatus = 'disconnected';
  let dspStatus = 'disconnected';

  // 1. Probe Database Connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseStatus = 'connected';
  } catch (err) {
    console.error('[Health] DB probe failed:', err.message);
  }

  // 2. Probe & Wakeup DSP Audio Service
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const dspRes = await fetch(`${dspUrl}/`, { signal: controller.signal });
    clearTimeout(timeout);
    if (dspRes.ok) {
      dspStatus = 'connected';
    }
  } catch (err) {
    console.error('[Health] DSP probe failed:', err.message);
  }

  const isHealthy = databaseStatus === 'connected' && dspStatus === 'connected';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    database: databaseStatus,
    dsp: dspStatus
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

