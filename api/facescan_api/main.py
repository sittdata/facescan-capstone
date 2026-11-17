"""Main server application entry point and direct ASGI interface.

Usage:
    uvicorn facescan_api.main:app --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

from facescan_api.app import create_app
from facescan_api.routes import scan
from facescan_api.routes.scan import ScanResponse
from facescan_api.settings import Settings

app = create_app()
scan_router = scan.router

__all__ = ["app", "scan_router", "ScanResponse"]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("facescan_api.main:app", host="0.0.0.0", port=8000, reload=True)
