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
DEFAULT_WEIGHTS_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "modeltorun", "best.pt")
)
FALLBACK_WEIGHTS_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "runs", "detect", "train", "weights", "best.pt")
)
ENV_WEIGHTS_PATH = os.environ.get("YOLO_WEIGHTS_PATH")
CONFIDENCE_THRESHOLD = 0.10
MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}

# ── State shared across requests ──────────────────────────────────────────────
_yolo_model: YOLO | None = None
_models_loaded = False
_loaded_weights_path = ""


def resolve_weights_path() -> str:
    if ENV_WEIGHTS_PATH:
        env_path = os.path.abspath(ENV_WEIGHTS_PATH)
        if os.path.exists(env_path):
            return env_path
        raise FileNotFoundError(f"YOLO_WEIGHTS_PATH does not exist: {env_path}")

    if os.path.exists(DEFAULT_WEIGHTS_PATH):
        return DEFAULT_WEIGHTS_PATH

    if os.path.exists(FALLBACK_WEIGHTS_PATH):
        return FALLBACK_WEIGHTS_PATH

    raise FileNotFoundError(
        "No YOLO weights file found. Checked: "
        f"{DEFAULT_WEIGHTS_PATH}, {FALLBACK_WEIGHTS_PATH}"
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _yolo_model, _models_loaded, _loaded_weights_path
    _loaded_weights_path = resolve_weights_path()
    print(f"Loading YOLO weights from: {_loaded_weights_path}")
    _yolo_model = YOLO(_loaded_weights_path)
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
    return {
        "ok": True,
        "models_loaded": _models_loaded,
        "weights_path": _loaded_weights_path,
    }


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

    detected_classes: list[str] = []
    if results and len(results[0].boxes) > 0:
        boxes = results[0].boxes
        detected_classes = [
            str(_yolo_model.names[int(cls_id)]) for cls_id in boxes.cls.tolist()
        ]
        best_idx = int(boxes.conf.argmax())
        class_id = int(boxes.cls[best_idx])
        confidence = float(boxes.conf[best_idx])
        label = _yolo_model.names[class_id]

    # ── Embedding similarity ──────────────────────────────────────────────────
    query = label.replace("_", " ").strip() if label else ""
    matches: list[str] = top_5_menu_matches(query) if query else []

    print(f"[inference] detections={len(detected_classes)} classes={detected_classes}")
    print(f"[inference] label={label or '(none)'} confidence={round(confidence, 4)}")
    print(f"[inference] top5={matches}")

    return JSONResponse(
        content={
            "ok": True,
            "label": label,
            "confidence": round(confidence, 4),
            "matches": matches,
        }
    )
