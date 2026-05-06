import base64
import os
import tempfile

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from faster_whisper import WhisperModel


class TranscribeInput(BaseModel):
    audioBase64: str
    locale: str = "es-ES"


app = FastAPI(title="mentorix-whisper-service")
model_size = os.getenv("WHISPER_MODEL_SIZE", "small")
compute_type = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
model = WhisperModel(model_size, device="cpu", compute_type=compute_type)


@app.get("/health")
def health():
    return {"ok": True, "model": model_size}


@app.post("/transcribe")
def transcribe(body: TranscribeInput):
    try:
        audio_bytes = base64.b64decode(body.audioBase64)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid base64 audio") from exc

    with tempfile.NamedTemporaryFile(suffix=".webm", delete=True) as tmp:
        tmp.write(audio_bytes)
        tmp.flush()
        segments, _ = model.transcribe(tmp.name, language=(body.locale.split("-")[0] if body.locale else "es"))
        text = " ".join(segment.text.strip() for segment in segments).strip()
        return {"text": text}
