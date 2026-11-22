import os
from pathlib import Path

DATA_DIR = Path(os.getenv("VIDEO_FACTORY_DATA_DIR", "/data"))
ASSET_DIR = DATA_DIR / "assets"
OUTPUT_DIR = DATA_DIR / "outputs"
TEMP_DIR = DATA_DIR / "tmp"
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
API_KEY = os.getenv("VIDEO_FACTORY_API_KEY", "")
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(150 * 1024 * 1024)))
MAX_SCENES = int(os.getenv("MAX_SCENES", "80"))
MAX_DURATION_SECONDS = int(os.getenv("MAX_DURATION_SECONDS", "600"))

for directory in (ASSET_DIR, OUTPUT_DIR, TEMP_DIR):
    directory.mkdir(parents=True, exist_ok=True)
