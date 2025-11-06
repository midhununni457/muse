from fastapi import APIRouter
from core.audio_utils import process_audio

router = APIRouter(prefix="/extract", tags=["Extract"])

@router.post("/peaks")
async def extract_audio_peaks():
    process_audio()
    return {"status": "Peaks extracted and audio processed"}