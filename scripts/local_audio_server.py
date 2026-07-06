#!/usr/bin/env python3
"""
Servidor de audio local compatible con Open Generative AI.
MusicGen (Meta AudioCraft) + XTTS v2 (Coqui TTS) + stub ACE-Step.

Uso:
  pip install audiocraft fastapi uvicorn torch
  pip install TTS   # para XTTS v2 (Lip Sync TTS)
  python scripts/local_audio_server.py

API:
  GET  /health
  POST /v1/audio/generate   { engine, model, prompt, duration, style? }
  POST /v1/tts/synthesize   { engine, text, language, speaker_wav_base64? }
"""
from __future__ import annotations

import base64
import io
import os
import tempfile

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="Open Generative AI — Local Audio")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_models: dict[str, object] = {}


class GenerateRequest(BaseModel):
    engine: str = Field(default="musicgen")
    model: str = Field(default="medium")
    prompt: str
    duration: float = Field(default=30.0, ge=1.0, le=120.0)
    style: str | None = None
    instrumental: bool = True


class TtsRequest(BaseModel):
    engine: str = Field(default="xtts")
    model: str = Field(default="xtts_v2")
    text: str
    language: str = Field(default="es")
    speaker_wav_base64: str | None = None
    speaker_wav_url: str | None = None


def _load_musicgen(size: str):
    key = f"musicgen-{size}"
    if key in _models:
        return _models[key]
    try:
        from audiocraft.models import MusicGen
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail="Instala audiocraft: pip install audiocraft torch",
        ) from exc
    model = MusicGen.get_pretrained(f"facebook/musicgen-{size}")
    _models[key] = model
    return model


def _load_xtts():
    key = "xtts_v2"
    if key in _models:
        return _models[key]
    try:
        from TTS.api import TTS
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail="Instala Coqui TTS: pip install TTS",
        ) from exc
    use_gpu = os.environ.get("XTTS_USE_GPU", "1") not in ("0", "false", "False")
    model = TTS("tts_models/multilingual/multi-dataset/xtts_v2", gpu=use_gpu)
    _models[key] = model
    return model


def _wav_bytes_from_path(path: str) -> bytes:
    with open(path, "rb") as f:
        return f.read()


def _write_speaker_ref(req: TtsRequest) -> str | None:
    if not req.speaker_wav_base64:
        return None
    b64 = req.speaker_wav_base64
    if "," in b64 and b64.startswith("data:"):
        b64 = b64.split(",", 1)[1]
    raw = base64.b64decode(b64)
    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    tmp.write(raw)
    tmp.flush()
    tmp.close()
    return tmp.name


@app.get("/health")
@app.get("/v1/audio/health")
def health():
    return {"ok": True, "engines": ["musicgen", "xtts", "ace-step"]}


@app.post("/v1/tts/synthesize")
@app.post("/v1/audio/tts")
@app.post("/tts/synthesize")
def synthesize_tts(req: TtsRequest):
    text = (req.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text requerido")
    if req.engine != "xtts":
        raise HTTPException(status_code=400, detail="Solo engine=xtts soportado en /v1/tts/synthesize")

    tts = _load_xtts()
    out_path = tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name
    speaker_path = _write_speaker_ref(req)

    try:
        kwargs = {
            "text": text,
            "file_path": out_path,
            "language": req.language or "es",
        }
        if speaker_path:
            kwargs["speaker_wav"] = speaker_path
        tts.tts_to_file(**kwargs)
        raw = _wav_bytes_from_path(out_path)
    finally:
        for p in (out_path, speaker_path or ""):
            if p and os.path.exists(p):
                try:
                    os.unlink(p)
                except OSError:
                    pass

    b64 = base64.b64encode(raw).decode("ascii")
    return {
        "audio_base64": b64,
        "mime_type": "audio/wav",
        "engine": "xtts",
        "model": req.model,
        "language": req.language,
    }


@app.post("/v1/audio/generate")
@app.post("/v1/generate")
@app.post("/generate")
def generate(req: GenerateRequest):
    prompt = (req.prompt or req.style or "").strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="prompt requerido")

    if req.engine == "ace-step":
        raise HTTPException(
            status_code=501,
            detail=(
                "ACE-Step requiere su servidor propio. "
                "Usa engine=musicgen o integra ACE-Step en este host."
            ),
        )

    size = req.model if req.model in ("small", "medium", "large") else "medium"
    model = _load_musicgen(size)
    model.set_generation_params(duration=min(req.duration, 30.0))

    descriptions = [prompt]
    if req.style and req.style not in prompt:
        descriptions = [f"{req.style}. {prompt}"]

    wav = model.generate(descriptions, progress=False)
    tensor = wav[0].cpu()
    sr = model.sample_rate

    try:
        import torchaudio
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            path = tmp.name
        torchaudio.save(path, tensor, sr)
        with open(path, "rb") as f:
            raw = f.read()
        os.unlink(path)
    except Exception:
        import scipy.io.wavfile as wavfile
        import numpy as np
        buf = io.BytesIO()
        data = tensor.numpy().T
        if data.ndim > 1:
            data = data.mean(axis=1)
        wavfile.write(buf, sr, (data * 32767).astype(np.int16))
        raw = buf.getvalue()

    b64 = base64.b64encode(raw).decode("ascii")
    return {"audio_base64": b64, "mime_type": "audio/wav", "engine": "musicgen", "model": size}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("LOCAL_AUDIO_PORT", "8765"))
    uvicorn.run(app, host="0.0.0.0", port=port)
