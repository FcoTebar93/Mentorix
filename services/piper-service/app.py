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
_voice_lock = threading.Lock()


def _load_voice() -> PiperVoice:
    global _voice
    if _voice is not None:
        return _voice
    with _voice_lock:
        if _voice is not None:
            return _voice
        model_path = os.getenv("PIPER_MODEL_PATH", "")
        config_path = os.getenv("PIPER_CONFIG_PATH", "") or None
        if not model_path:
            raise RuntimeError("PIPER_MODEL_PATH is required")
        _voice = PiperVoice.load(model_path, config_path=config_path, use_cuda=False)
        return _voice


@app.on_event("startup")
def _warm_up_voice() -> None:
    try:
        _load_voice()
    except Exception as exc:  # noqa: BLE001
        print(f"[piper-service] failed to preload voice: {exc}")


@app.get("/health")
def health():
    return {"ok": _voice is not None, "modelLoaded": _voice is not None}


@app.post("/synthesize")
def synthesize(body: SynthesizeInput):
    try:
        voice = _load_voice()
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Piper voice load failed: {exc}") from exc

    text = (body.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    buffer = io.BytesIO()
    try:
        with wave.open(buffer, "wb") as wav_file:
            with _voice_lock:
                voice.synthesize_wav(text, wav_file)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Piper synthesis failed: {exc}") from exc

    wav_bytes = buffer.getvalue()
    return {"audioBase64": base64.b64encode(wav_bytes).decode("utf-8")}
