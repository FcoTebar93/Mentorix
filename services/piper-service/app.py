import base64
import os
import subprocess
import sys
import tempfile
import threading
import time

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel


class SynthesizeInput(BaseModel):
    text: str
    locale: str = "es-ES"


app = FastAPI(title="mentorix-piper-service")

_model_path: str = ""
_model_ready: bool = False
_synth_lock = threading.Lock()


def _resolve_model_path() -> str:
    candidate = os.getenv("PIPER_MODEL_PATH", "").strip()
    if candidate and os.path.exists(candidate):
        return candidate
    return ""


def _run_piper_cli(text: str, output_path: str) -> None:
    if not _model_path:
        raise RuntimeError("Piper model path is not configured")

    cmd = [
        sys.executable,
        "-m",
        "piper",
        "-m",
        _model_path,
        "-f",
        output_path,
    ]
    proc = subprocess.run(
        cmd,
        input=text.encode("utf-8"),
        capture_output=True,
        check=False,
    )
    if proc.returncode != 0:
        detail = proc.stderr.decode("utf-8", errors="ignore").strip() or "unknown error"
        raise RuntimeError(f"piper exited with code {proc.returncode}: {detail}")


@app.on_event("startup")
def _warm_up_on_startup() -> None:
    global _model_path, _model_ready
    _model_path = _resolve_model_path()
    if not _model_path:
        print("[piper-service] PIPER_MODEL_PATH not set or missing; voice will not be loaded")
        return
    print(f"[piper-service] using model {_model_path}; warming up...")
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp_path = tmp.name
    try:
        started = time.time()
        _run_piper_cli("Hola", tmp_path)
        elapsed = time.time() - started
        _model_ready = True
        print(f"[piper-service] warm-up complete in {elapsed:.2f}s")
    except Exception as exc:  # noqa: BLE001
        print(f"[piper-service] warm-up failed: {exc}")
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


@app.get("/health")
def health():
    return {"ok": _model_ready, "modelLoaded": _model_ready}


@app.post("/synthesize")
def synthesize(body: SynthesizeInput):
    if not _model_path:
        raise HTTPException(status_code=503, detail="Piper model not configured")

    text = (body.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        with _synth_lock:
            _run_piper_cli(text, tmp_path)
        with open(tmp_path, "rb") as wav_file:
            audio_bytes = wav_file.read()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Piper synthesis failed: {exc}") from exc
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

    return {"audioBase64": base64.b64encode(audio_bytes).decode("utf-8")}
