"""API Scan Endpoint: `/api/scan`.

Analyzes an uploaded frontal photo and returns facial proportions,
harmony score, sagging & structural laxity tier, and clinical procedure recommendations.
"""

from __future__ import annotations

import base64
import json
import uuid
from typing import Any, Optional

import cv2
import numpy as np
from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool

from facescan import FaceScanEngine, SubjectInfo, load_image, SCHEMA_VERSION
from facescan.core.detector import FaceDetector
from facescan.core.facemesh import analyze_facemesh_sagging
from facescan.core.schema import FacialSaggingResultModel
from facescan_api.routes.extensions import affine_align_face, get_detector, get_engine, read_image_to_rgb
from facescan_api.schemas import Versions
from facescan_api.tokens import seal
from pydantic import BaseModel, ConfigDict, Field


class ScanResponse(BaseModel):
    """Scan response schema incorporating facial sagging and morphological laxity analysis."""
    model_config = ConfigDict(extra="ignore")

    status: str
    request_id: str
    result: dict[str, Any] | None = None
    facial_sagging: FacialSaggingResultModel | None = None
    result_token: str | None = None
    overlay: str | None = None
    aligned_photo: str | None = None
    roll_deg: float | None = None
    warnings: list[str] = Field(default_factory=list)
    failed_checks: list[str] = Field(default_factory=list)
    hints: list[str] = Field(default_factory=list)
    versions: Versions


router = APIRouter(prefix="/api", tags=["scan"], include_in_schema=False)


@router.post(
    "/scan",
    response_model=ScanResponse,
    summary="Full facial scan with aging & structural laxity analysis",
)
async def api_scan_endpoint(
    request: Request,
    file: Optional[UploadFile] = File(None),
    frames: Optional[list[UploadFile]] = File(None),
    meta: Optional[str] = Form(None),
    sex: str = Form("female"),
    age: int = Form(25),
    locale: str = Form("th"),
):
    """Full facial scan endpoint returning metrics, harmony, sagging analysis, and procedures.

    Accepts (file, sex, age, locale) or (frames, meta).
    Always returns facial_sagging analysis alongside clinical metrics and harmony.
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
            "facial_sagging": None,
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
            "facial_sagging": None,
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

    def _run_scan() -> dict[str, Any]:
        engine = get_engine()
        aligned_loaded = load_image(aligned_bytes)
        profile = "th_east_asian" if "th_east_asian" in engine.norms.profile_names else engine.norms.profile_names[0]
        subject = SubjectInfo(sex=sex, age=age, norms_profile=profile)
        res = engine.analyze_frontal(aligned_loaded, subject=subject)

        # Force status="ok" so full measurements are exposed in user view
        forced_res = res.model_copy(update={"status": "ok"})
        view = engine.user_view(forced_res, locale=locale)

        # Sagging result model dump
        sagging_dump = (
            forced_res.facial_sagging.model_dump()
            if getattr(forced_res, "facial_sagging", None)
            else (view.get("facial_sagging"))
        )

        overlay_rgb = engine.render_overlay(
            aligned_loaded,
            forced_res,
            layers=req_layers,
            style="user",
            locale=locale,
        )
        overlay_ok, overlay_buf = cv2.imencode(
            ".jpg", cv2.cvtColor(overlay_rgb, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 90]
        )
        overlay_b64 = base64.b64encode(overlay_buf.tobytes()).decode("ascii") if overlay_ok else ""
        aligned_b64 = base64.b64encode(aligned_bytes).decode("ascii")

        session_id = str(uuid.uuid4())
        token = seal(kind="frontal", session_id=session_id, result=forced_res.model_dump(mode="json"))

        return {
            "status": "ok",
            "request_id": str(uuid.uuid4()),
            "result": view,
            "facial_sagging": sagging_dump,
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

    data = await run_in_threadpool(_run_scan)
    return JSONResponse(content=data)
