# Muse — Audio Fingerprinting & Recognition Engine

Muse is a Shazam-style audio fingerprinting and song recognition system composed of three modular services:

- **`dsp/`** (Python / FastAPI): Audio processing engine. Takes raw audio clips, extracts spectrogram peaks, and generates combinatorial fingerprint hash tuples `[f1, f2, dt, t1]`.
- **`api/`** (Node.js / Express / Prisma): Core backend service connected to Supabase Postgres. Manages song metadata (`Songs`), stores landmark hashes (`Hashes`), and implements the Shazam-style time-offset histogram identification algorithm (`POST /identify`).
- **`frontend/`** (React / Vite / Tailwind CSS v4): Responsive web client for recording ambient audio via browser microphone or clip upload, viewing real-time identification results, and managing the song library.

---

## System Architecture

```text
[ Browser / Client ] ──> (POST /identify audio clip) ──> [ api/ Service ]
                                                               │
                                         ┌─────────────────────┴─────────────────────┐
                                         ▼                                           ▼
                               [ dsp/ Service ]                             [ Supabase Postgres ]
                             (POST /extract audio)                      (Lookup candidate hashes)
                                         │                                           │
                                         └─────────────────────┬─────────────────────┘
                                                               ▼
                                                  [ Time-Delta Histogram ]
                                                  delta = t1_song - t1_clip
                                                               │
                                                               ▼
                                                  [ Recognized Song Match ]
```

---

## Quick Start (Local Development)

### 1. DSP Service (`dsp/`)
```bash
cd dsp
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python main.py
```
*Runs on `http://localhost:8000`*

### 2. API Service (`api/`)
Create `api/.env` (copy from `api/.env.example`):
```env
DATABASE_URL="postgresql://user:password@host:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://user:password@host:5432/postgres"
DSP_SERVICE_URL="http://localhost:8000"
```
Install dependencies and run:
```bash
cd api
npm install
npx prisma generate
npm run dev
```
*Runs on `http://localhost:3001`*

### 3. Frontend Web App (`frontend/`)
```bash
cd frontend
npm install
npm run dev
```
*Runs on `http://localhost:5173`*

---

## Running with Docker

Ensure Docker Desktop is running, then execute from the root directory:

```bash
docker compose up --build
```

---

## API Endpoints Reference

### Songs (`/songs`)
- `POST /songs` — Upload new audio track (multipart `title`, `artist`, `audio`).
- `GET /songs` — List all songs in database library.
- `GET /songs/:id` — Get single song details by ID.
- `POST /songs/:id/process` — Extract peak fingerprints via DSP service and store hashes in DB.
- `DELETE /songs/:id` — Delete song, linked hashes, and local audio file.

### Hashes (`/hashes`)
- `GET /hashes/song/:songId` — Retrieve all hashes associated with a song.
- `DELETE /hashes/song/:songId` — Clear hashes for a song.

### Identification (`/identify`)
- `POST /identify` — Upload audio clip (multipart `audio`). Returns identified song, confidence %, and offset position (`alignOffsetMs`).

---

## Running Tests

### DSP Python Unit Tests
```bash
cd dsp
python -m unittest tests/test_fingerprint.py
```

### API Node Unit Tests
```bash
cd api
npm test
```
