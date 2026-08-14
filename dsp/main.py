from fastapi import FastAPI, File, UploadFile, HTTPException
from core.audio_utils import process_audio

app = FastAPI(title="DSP Service")

@app.get("/")
def read_root():
    return {"status": "DSP Service is operational"}

@app.post("/extract", tags=["Extract"])
async def extract_audio_peaks(audio: UploadFile = File(...)):
    try:
        audio_bytes = await audio.read()
        if not audio_bytes or len(audio_bytes) == 0:
            raise HTTPException(status_code=400, detail="Uploaded audio file is empty.")
        
        fingerprints = process_audio(audio_bytes)
        return {"status": "Peaks extracted successfully", "fingerprints": fingerprints}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Audio decoding or processing failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

