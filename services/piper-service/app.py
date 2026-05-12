import base64
import io
import os
import threading
import wave

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from piper import PiperVoice


class SynthesizeInput(BaseModel):
    text: str
    locale: str = "es-ES"


app = FastAPI(title="mentorix-piper-service")

_voice: PiperVoice | None = None
_synth_lock = threading.Lock()


@app.on_event("startup")
def _load_voice_on_startup() -> None:
    global _voice
    model_path = os.getenv("PIPER_MODEL_PATH", "")
    config_path = os.getenv("PIPER_CONFIG_PATH", "") or None
    if not model_path:
        print("[piper-service] PIPER_MODEL_PATH not set; voice will not be loaded")
        return
    try:
        _voice = PiperVoice.load(model_path, config_path=config_path, use_cuda=False)
        print(f"[piper-service] voice loaded from {model_path}")
    except Exception as exc:  # noqa: BLE001
        print(f"[piper-service] failed to load voice: {exc}")


@app.get("/health")
def health():
    return {"ok": _voice is not None, "modelLoaded": _voice is not None}


@app.post("/synthesize")
def synthesize(body: SynthesizeInput):
    if _voice is None:
        raise HTTPException(status_code=503, detail="Piper voice not loaded")

    text = (body.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    buffer = io.BytesIO()
    try:
        with _synth_lock:
            with wave.open(buffer, "wb") as wav_file:
                _voice.synthesize_wav(text, wav_file)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Piper synthesis failed: {exc}") from exc

    return {"audioBase64": base64.b64encode(buffer.getvalue()).decode("utf-8")}
