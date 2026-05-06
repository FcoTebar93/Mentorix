import base64
import os
import subprocess
import tempfile

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel


class SynthesizeInput(BaseModel):
    text: str
    locale: str = "es-ES"


app = FastAPI(title="mentorix-piper-service")


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/synthesize")
def synthesize(body: SynthesizeInput):
    model_path = os.getenv("PIPER_MODEL_PATH", "")
    config_path = os.getenv("PIPER_CONFIG_PATH", "")
    piper_bin = os.getenv("PIPER_BIN", "piper")

    if not model_path:
        raise HTTPException(status_code=500, detail="PIPER_MODEL_PATH is required")

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=True) as output_file:
        cmd = [
            piper_bin,
            "--model",
            model_path,
            "--output_file",
            output_file.name,
        ]
        if config_path:
            cmd += ["--config", config_path]

        try:
            completed = subprocess.run(
                cmd,
                input=body.text.encode("utf-8"),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                check=False,
            )
        except FileNotFoundError as exc:
            raise HTTPException(status_code=500, detail="Piper binary not found") from exc

        if completed.returncode != 0:
            raise HTTPException(status_code=500, detail=f"Piper synthesis failed: {completed.stderr.decode('utf-8', errors='ignore')}")

        output_file.flush()
        with open(output_file.name, "rb") as file_handle:
            wav_bytes = file_handle.read()

    return {"audioBase64": base64.b64encode(wav_bytes).decode("utf-8")}
