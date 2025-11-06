from fastapi import APIRouter
from core.audio_utils import process_audio

router = APIRouter(prefix="/match", tags=["Match"])

@router.post("/audio")
async def match_audio_fingerprint():
    process_audio()
    return {"status": "Audio fingerprint processed"}