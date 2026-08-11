require('dotenv').config();
const express = require('express');
const cors = require('cors');

const songsRouter = require('./routes/songs.routes');
const hashesRouter = require('./routes/hashes.routes');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/songs', songsRouter);
app.use('/hashes', hashesRouter);

app.get('/', (req, res) => {
  res.send('Muse API Service is running');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
