from fastapi import FastAPI, File, UploadFile
from core.audio_utils import process_audio

app = FastAPI(title="DSP Service")

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.post("/extract", tags=["Extract"])
async def extract_audio_peaks(audio: UploadFile = File(...)):
    audio_bytes = await audio.read()
    fingerprints = process_audio(audio_bytes)
    return {"status": "Peaks extracted and audio processed", "fingerprints": fingerprints}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

