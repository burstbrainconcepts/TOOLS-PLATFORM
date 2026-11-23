import hmac
import mimetypes
import uuid
from pathlib import Path

from celery.result import AsyncResult
from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.responses import FileResponse
from app.config import API_KEY, ASSET_DIR, MAX_UPLOAD_BYTES
from app.schemas import RenderRequest
from app.tasks import celery_app, render_video

app = FastAPI(title="Burst Brain Video Factory", version="0.2.0")

def require_key(value: str | None):
    if not API_KEY:
        raise HTTPException(status_code=503, detail="VIDEO_FACTORY_API_KEY is not configured")
    if not value or not hmac.compare_digest(value, API_KEY):
        raise HTTPException(status_code=401, detail="Invalid API key")

def locate_asset(asset_id: str) -> Path:
    matches = list(ASSET_DIR.glob(f"{asset_id}.*"))
    if len(matches) != 1:
        raise HTTPException(status_code=404, detail=f"Asset not found: {asset_id}")
    return matches[0]

@app.get("/health")
def health():
    return {"status": "ok", "service": "video-factory", "renderer": "ffmpeg-cpu"}

@app.post("/v1/assets", status_code=201)
async def upload_asset(file: UploadFile = File(...), x_api_key: str | None = Header(default=None)):
    require_key(x_api_key)
    content_type = (file.content_type or "").lower()
    allowed = {
        "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp",
        "video/mp4": ".mp4", "video/quicktime": ".mov",
        "audio/mpeg": ".mp3", "audio/wav": ".wav", "audio/x-wav": ".wav",
        "audio/mp4": ".m4a", "audio/aac": ".aac", "audio/ogg": ".ogg",
    }
    if content_type not in allowed:
        raise HTTPException(status_code=415, detail="Supported assets: JPG, PNG, WebP, MP4, MOV, MP3, WAV, M4A, AAC and OGG")
    asset_id = str(uuid.uuid4())
    destination = ASSET_DIR / f"{asset_id}{allowed[content_type]}"
    size = 0
    try:
        with destination.open("wb") as output:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_UPLOAD_BYTES:
                    raise HTTPException(status_code=413, detail="Asset exceeds upload size limit")
                output.write(chunk)
    except Exception:
        destination.unlink(missing_ok=True)
        raise
    finally:
        await file.close()
    return {"asset_id": asset_id, "filename": file.filename, "content_type": content_type, "size_bytes": size}

@app.post("/v1/jobs", status_code=202)
def create_job(request: RenderRequest, x_api_key: str | None = Header(default=None)):
    require_key(x_api_key)
    for scene in request.scenes:
        if scene.asset_id:
            locate_asset(scene.asset_id)
    if request.narration_asset_id:
        locate_asset(request.narration_asset_id)
    if request.music_asset_id:
        locate_asset(request.music_asset_id)
    task = render_video.delay(request.model_dump())
    return {"job_id": task.id, "status": "queued"}

@app.get("/v1/jobs/{job_id}")
def get_job(job_id: str, x_api_key: str | None = Header(default=None)):
    require_key(x_api_key)
    result = AsyncResult(job_id, app=celery_app)
    response = {"job_id": job_id, "status": result.state.lower()}
    if result.state == "SUCCESS":
        response["result"] = result.result
    elif result.state == "FAILURE":
        response["error"] = str(result.result)
    elif result.state == "PROGRESS" and isinstance(result.info, dict):
        response["progress"] = result.info
    return response

@app.get("/v1/jobs/{job_id}/download")
def download_job(job_id: str, x_api_key: str | None = Header(default=None)):
    require_key(x_api_key)
    result = AsyncResult(job_id, app=celery_app)
    if result.state != "SUCCESS" or not isinstance(result.result, dict):
        raise HTTPException(status_code=409, detail="Video is not ready")
    path = Path(result.result.get("output_path", "")).resolve()
    if path.parent != Path("/data/outputs").resolve() or not path.is_file():
        raise HTTPException(status_code=404, detail="Rendered file is unavailable")
    return FileResponse(path, media_type="video/mp4", filename=path.name)
