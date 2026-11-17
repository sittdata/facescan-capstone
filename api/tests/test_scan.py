"""Unit and integration tests for /api/scan endpoint and sagging response schema."""

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from facescan_api.app import create_app
from facescan_api.main import app as main_app, scan_router, ScanResponse
from facescan.core.schema import FacialSaggingResultModel


ASTRONAUT_PATH = Path(__file__).resolve().parent.parent.parent / "tests" / "data" / "astronaut.png"


@pytest.fixture(scope="module")
def client():
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client


def test_main_app_exports():
    """Verify facescan_api.main exports app, scan_router, and ScanResponse."""
    assert main_app is not None
    assert scan_router is not None
    assert ScanResponse is not None


def test_api_scan_missing_file(client: TestClient):
    """POST /api/scan without image file returns 400."""
    resp = client.post("/api/scan")
    assert resp.status_code == 400


def test_api_scan_empty_payload(client: TestClient):
    """POST /api/scan with empty data returns 400."""
    resp = client.post("/api/scan", data={"sex": "female", "age": "25"})
    assert resp.status_code == 400


def test_api_scan_with_astronaut_image(client: TestClient):
    """POST /api/scan with frontal photo produces full analysis with facial sagging."""
    assert ASTRONAUT_PATH.is_file(), f"Missing test photo at {ASTRONAUT_PATH}"

    with open(ASTRONAUT_PATH, "rb") as f:
        img_bytes = f.read()

    resp = client.post(
        "/api/scan",
        files={"file": ("astronaut.png", img_bytes, "image/png")},
        data={"sex": "female", "age": "32", "locale": "th"},
    )
    assert resp.status_code == 200
    data = resp.json()

    # 1. Validate response adheres to ScanResponse schema
    validated = ScanResponse.model_validate(data)
    assert validated.status == "ok"
    assert validated.request_id

    # 2. Check root facial_sagging
    assert data.get("facial_sagging") is not None
    sagging = data["facial_sagging"]
    assert sagging["tier"] in (1, 2, 3)
    assert sagging["tier_name"] in ("Firm", "Moderate", "Advanced")
    assert 0.0 <= sagging["laxity_score"] <= 100.0
    assert 0.0 <= sagging["confidence"] <= 1.0
    assert "rating_th" in sagging
    assert "rating_en" in sagging
    assert "description_th" in sagging
    assert "description_en" in sagging

    # 3. Check result.facial_sagging
    assert data.get("result") is not None
    res = data["result"]
    assert res.get("facial_sagging") is not None
    assert res["facial_sagging"]["tier"] == sagging["tier"]

    # 4. Check procedure recommendations include sagging treatments
    assert "procedure_recommendations" in res
    recs = res["procedure_recommendations"]
    rec_procedures = {r["procedure"] for r in recs}
    assert "skin_tightening" in rec_procedures
    assert "thread_lift" in rec_procedures
    assert "surgical_facelift" in rec_procedures


def test_api_scan_with_frames_and_meta(client: TestClient):
    """POST /api/scan with frames and JSON meta payload."""
    assert ASTRONAUT_PATH.is_file()

    with open(ASTRONAUT_PATH, "rb") as f:
        img_bytes = f.read()

    meta = {
        "subject": {"sex": "male", "age": 45},
        "locale": "en",
        "overlay": {"layers": ["landmarks", "thirds"]},
    }

    resp = client.post(
        "/api/scan",
        files=[("frames", ("frame1.png", img_bytes, "image/png"))],
        data={"meta": json.dumps(meta)},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["facial_sagging"] is not None
    assert data["result"]["facial_sagging"] is not None
    assert data["result"]["locale"] == "en"
