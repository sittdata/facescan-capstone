"""
API Routes for Extensions (Ported from DSI314).
Endpoints:
- POST /v1/simulation/face-shape
- POST /v1/simulation/warp
"""

from __future__ import annotations

import base64
import io
import json
from pathlib import Path
from typing import Any, Optional
import uuid

import cv2
import numpy as np
from PIL import Image, ImageOps
from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse, Response
from starlette.concurrency import run_in_threadpool

from facescan import FaceScanEngine, SubjectInfo, load_image, SCHEMA_VERSION
from facescan.core.detector import FaceDetector
from facescan_api.extensions.aligner import affine_align_face
from facescan_api.extensions.face_shape import classify_face_shape
from facescan_api.extensions.procedures import DeformationRules
from facescan_api.extensions.warper import FaceWarper
from facescan_api.tokens import seal

router = APIRouter(prefix="/v1/simulation", tags=["extensions"], include_in_schema=False)

_detector: Optional[FaceDetector] = None
_deformation_rules: Optional[DeformationRules] = None
_engine: Optional[FaceScanEngine] = None


def get_detector() -> FaceDetector:
    global _detector
    if _detector is None:
        model_path = Path("models") / "face_landmarker.task"
        if not model_path.is_file():
            # Try parent path
            model_path = Path(__file__).resolve().parent.parent.parent.parent / "models" / "face_landmarker.task"
        _detector = FaceDetector(model_path=model_path, mode="image", max_faces=1)
    return _detector


def get_engine() -> FaceScanEngine:
    global _engine
    if _engine is None:
        models_dir = Path("models")
        if not models_dir.is_dir():
            models_dir = Path(__file__).resolve().parent.parent.parent.parent / "models"
        from facescan import EngineConfig
        _engine = FaceScanEngine(EngineConfig.from_models_dir(
            models_dir,
            enable_trichion_fallback=True,
        ))
    return _engine


def get_rules() -> DeformationRules:
    global _deformation_rules
    if _deformation_rules is None:
        warper = FaceWarper(grid_step=4, regularization=1e-3)
        _deformation_rules = DeformationRules(warper=warper)
    return _deformation_rules


def read_image_to_rgb(data: bytes) -> np.ndarray:
    """Reads image bytes, normalizes orientation with PIL EXIF, returns RGB numpy array."""
    try:
        pil_img = Image.open(io.BytesIO(data))
        pil_img = ImageOps.exif_transpose(pil_img)
        pil_img = pil_img.convert("RGB")
        return np.array(pil_img, dtype=np.uint8)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image format: {e}")


@router.post("/face-shape")
async def face_shape_endpoint(
    file: UploadFile = File(...),
    sex: Optional[str] = Form("female"),
):
    """Detects facial landmarks and classifies face shape with styling advice."""
    raw_bytes = await file.read()
    rgb = read_image_to_rgb(raw_bytes)

    detector = get_detector()
    detections = detector.detect(rgb)
    if not detections:
        raise HTTPException(status_code=422, detail="No face detected in the image")

    landmarks_xy = detections[0].xy  # (478, 2)
    result = classify_face_shape(landmarks_xy, sex=sex)
    return JSONResponse(content=result)


@router.post("/warp")
async def warp_endpoint(
    file: UploadFile = File(...),
    rhinoplasty: float = Form(0.0),
    lip_augmentation: float = Form(0.0),
    chin_augmentation: float = Form(0.0),
):
    """Executes TPS deformation for requested procedures and returns warped JPEG."""
    raw_bytes = await file.read()
    rgb = read_image_to_rgb(raw_bytes)

    # If all intensities are zero, return original image
    if rhinoplasty <= 0.0 and lip_augmentation <= 0.0 and chin_augmentation <= 0.0:
        return Response(content=raw_bytes, media_type="image/jpeg")

    detector = get_detector()
    detections = detector.detect(rgb)
    if not detections:
        raise HTTPException(status_code=422, detail="No face detected in the image")

    landmarks_xy = detections[0].xy
    rules = get_rules()

    warped_rgb, _ = await run_in_threadpool(
        rules.apply_composite_procedures,
        rgb,
        landmarks_xy,
        rhino_intensity=rhinoplasty,
        lip_intensity=lip_augmentation,
        chin_intensity=chin_augmentation,
    )

    # Encode to JPEG
    bgr = cv2.cvtColor(warped_rgb, cv2.COLOR_RGB2BGR)
    ok, buf = cv2.imencode(".jpg", bgr, [cv2.IMWRITE_JPEG_QUALITY, 92])
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to encode image")

    return Response(content=buf.tobytes(), media_type="image/jpeg")


@router.post("/auto-align")
async def auto_align_endpoint(
    request: Request,
    file: Optional[UploadFile] = File(None),
    frames: Optional[list[UploadFile]] = File(None),
    meta: Optional[str] = Form(None),
    sex: str = Form("female"),
    age: int = Form(25),
    locale: str = Form("th"),
):
    """
    Performs 2D affine roll alignment and analyzes frontal facial geometry
    bypassing clinical quality gate rejection (No-Reject Auto-Align Mode).
    Accepts either (file, sex, age, locale) or (frames, meta).
    """
    req_layers = {"landmarks", "thirds", "fifths", "eyes_brows", "nose_lips", "labels"}
    if meta:
        try:
            meta_dict = json.loads(meta)
            subj = meta_dict.get("subject", {})
            sex = subj.get("sex", sex)
            age = int(subj.get("age", age))
            locale = meta_dict.get("locale", locale)
            if "overlay" in meta_dict and "layers" in meta_dict["overlay"]:
                req_layers = set(meta_dict["overlay"]["layers"])
        except Exception:
            pass

    target_file = None
    if frames and len(frames) > 0:
        target_file = frames[0]
    elif file is not None:
        target_file = file
    else:
        form = await request.form()
        val = form.get("file") or form.get("frames")
        if isinstance(val, UploadFile):
            target_file = val

    if target_file is None:
        raise HTTPException(status_code=400, detail="No image file provided")

    raw_bytes = await target_file.read()
    rgb = read_image_to_rgb(raw_bytes)

    detector = get_detector()
    detections = detector.detect(rgb)
    if not detections:
        return JSONResponse({
            "status": "no_face",
            "request_id": str(uuid.uuid4()),
            "result": None,
            "result_token": None,
            "overlay": None,
            "hints": ["ไม่พบใบหน้าในภาพ กรุณาถ่ายภาพหน้าตรงที่มีใบหน้าชัดเจน" if locale == "th" else "No face detected in the photo"],
            "failed_checks": ["no_face"],
            "warnings": [],
            "versions": {
                "api": "0.1.0",
                "core": "0.1.0",
                "schema": SCHEMA_VERSION,
            },
        })

    if len(detections) > 1:
        return JSONResponse({
            "status": "multiple_faces",
            "request_id": str(uuid.uuid4()),
            "result": None,
            "result_token": None,
            "overlay": None,
            "hints": ["พบใบหน้ามากกว่า 1 หน้าในภาพ กรุณาถ่ายภาพเดี่ยว" if locale == "th" else "Multiple faces detected in the photo"],
            "failed_checks": ["multiple_faces"],
            "warnings": [],
            "versions": {
                "api": "0.1.0",
                "core": "0.1.0",
                "schema": SCHEMA_VERSION,
            },
        })

    landmarks_xy = detections[0].xy
    aligned_rgb, roll_deg = affine_align_face(rgb, landmarks_xy)

    # Encode aligned image to high-quality JPEG
    bgr = cv2.cvtColor(aligned_rgb, cv2.COLOR_RGB2BGR)
    ok, buf = cv2.imencode(".jpg", bgr, [cv2.IMWRITE_JPEG_QUALITY, 95])
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to encode aligned image")
    aligned_bytes = buf.tobytes()

    def _run_analysis() -> dict[str, Any]:
        engine = get_engine()
        aligned_loaded = load_image(aligned_bytes)
        profile = "th_east_asian" if "th_east_asian" in engine.norms.profile_names else engine.norms.profile_names[0]
        subject = SubjectInfo(sex=sex, age=age, norms_profile=profile)
        res = engine.analyze_frontal(aligned_loaded, subject=subject)

        # Force status="ok" so full measurements are exposed in user view
        forced_res = res.model_copy(update={"status": "ok"})
        view = engine.user_view(forced_res, locale=locale)
        overlay_rgb = engine.render_overlay(
            aligned_loaded,
            forced_res,
            layers=req_layers,
            style="user",
            locale=locale,
        )
        overlay_ok, overlay_buf = cv2.imencode(".jpg", cv2.cvtColor(overlay_rgb, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 90])
        overlay_b64 = base64.b64encode(overlay_buf.tobytes()).decode("ascii") if overlay_ok else ""
        aligned_b64 = base64.b64encode(aligned_bytes).decode("ascii")

        session_id = str(uuid.uuid4())
        token = seal(kind="frontal", session_id=session_id, result=forced_res.model_dump(mode="json"))
        return {
            "status": "ok",
            "request_id": str(uuid.uuid4()),
            "result": view,
            "result_token": token,
            "overlay": f"data:image/jpeg;base64,{overlay_b64}",
            "aligned_photo": f"data:image/jpeg;base64,{aligned_b64}",
            "roll_deg": round(float(roll_deg), 2),
            "warnings": ["auto_aligned"],
            "failed_checks": [],
            "hints": [],
            "versions": {
                "api": "0.1.0",
                "core": engine.core_version,
                "schema": SCHEMA_VERSION,
            },
        }

    data = await run_in_threadpool(_run_analysis)
    return JSONResponse(content=data)

