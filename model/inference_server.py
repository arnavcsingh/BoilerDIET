"""
FastAPI inference server — YOLO food detection + embedding similarity matching.

Startup: loads YOLO checkpoint and Sentence Transformer once.
POST /classify : accepts a multipart image, runs YOLO, returns top-5 menu matches.
GET  /health   : returns model-load status.

Run with:
    python -m uvicorn inference_server:app --host 0.0.0.0 --port 8000 --reload
"""

import io
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image
from ultralytics import YOLO

from .embedding_classification import get_model, get_todays_embedding_map, top_5_menu_matches

# ── Config ────────────────────────────────────────────────────────────────────
WEIGHTS_PATH = os.path.join(os.path.dirname(__file__), "runs", "detect", "train", "weights", "best.pt")
CONFIDENCE_THRESHOLD = 0.25
MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}

# ── State shared across requests ──────────────────────────────────────────────
_yolo_model: YOLO | None = None
_models_loaded = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _yolo_model, _models_loaded
    print("Loading YOLO weights …")
    _yolo_model = YOLO(WEIGHTS_PATH)
    print("YOLO ready.")

    print("Loading Sentence Transformer …")
    get_model()
    print("Sentence Transformer ready.")

    print("Pre-warming today's menu embeddings …")
    get_todays_embedding_map()
    print("Embeddings ready.")

    _models_loaded = True
    yield
    # shutdown — nothing to clean up


app = FastAPI(title="DIET Inference Server", lifespan=lifespan)


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"ok": True, "models_loaded": _models_loaded}


@app.post("/classify")
async def classify(image: UploadFile = File(...)):
    # ── Input validation ──────────────────────────────────────────────────────
    if image.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{image.content_type}'. Use JPEG, PNG, or WebP.",
        )

    raw = await image.read()
    if len(raw) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image exceeds 10 MB limit.")

    if not _models_loaded or _yolo_model is None:
        raise HTTPException(status_code=503, detail="Models not loaded yet. Try again shortly.")

    # ── YOLO inference ────────────────────────────────────────────────────────
    try:
        pil_image = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Could not decode image.")

    results = _yolo_model.predict(pil_image, conf=CONFIDENCE_THRESHOLD, verbose=False)

    label: str = ""
    confidence: float = 0.0

    if results and len(results[0].boxes) > 0:
        boxes = results[0].boxes
        best_idx = int(boxes.conf.argmax())
        class_id = int(boxes.cls[best_idx])
        confidence = float(boxes.conf[best_idx])
        label = _yolo_model.names[class_id]

    # ── Embedding similarity ──────────────────────────────────────────────────
    query = label if label else ""
    matches: list[str] = top_5_menu_matches(query) if query else []

    return JSONResponse(
        content={
            "ok": True,
            "label": label,
            "confidence": round(confidence, 4),
            "matches": matches,
        }
    )
