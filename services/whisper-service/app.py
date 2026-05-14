import base64
import json
import os
import tempfile
import time

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


def _log(event: str, **details):
    payload = {"service": "whisper", "event": event, **details}
    print(f"[voice-debug] {json.dumps(payload, ensure_ascii=True)}", flush=True)


@app.get("/health")
def health():
    return {"ok": True, "model": model_size}


@app.post("/transcribe")
def transcribe(body: TranscribeInput):
    started = time.perf_counter()
    try:
        audio_bytes = base64.b64decode(body.audioBase64)
    except Exception as exc:
        _log("stt_invalid_base64", locale=body.locale, audioBase64Length=len(body.audioBase64 or ""))
        raise HTTPException(status_code=400, detail="Invalid base64 audio") from exc

    language = body.locale.split("-")[0] if body.locale else "es"
    try:
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=True) as tmp:
            tmp.write(audio_bytes)
            tmp.flush()
            segments, _ = model.transcribe(tmp.name, language=language)
            segment_list = list(segments)
            text = " ".join(segment.text.strip() for segment in segment_list).strip()
    except Exception as exc:
        _log(
            "stt_failed",
            locale=body.locale,
            language=language,
            audioBytes=len(audio_bytes),
            durationMs=round((time.perf_counter() - started) * 1000, 2),
            error=str(exc),
        )
        raise

    _log(
        "stt_completed",
        locale=body.locale,
        language=language,
        audioBytes=len(audio_bytes),
        transcriptLength=len(text),
        segmentCount=len(segment_list),
        durationMs=round((time.perf_counter() - started) * 1000, 2),
        model=model_size,
        computeType=compute_type,
    )
    return {"text": text}
