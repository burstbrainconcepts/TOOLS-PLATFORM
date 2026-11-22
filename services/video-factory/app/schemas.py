from typing import Literal
from pydantic import BaseModel, Field, field_validator

class Scene(BaseModel):
    asset_id: str = Field(pattern=r"^[a-f0-9-]{36}$")
    duration_sec: float = Field(ge=0.5, le=120)
    caption: str | None = Field(default=None, max_length=240)

class RenderRequest(BaseModel):
    title: str = Field(default="Untitled video", max_length=160)
    width: int = Field(default=1920, ge=640, le=1920)
    height: int = Field(default=1080, ge=360, le=1080)
    fps: int = Field(default=30, ge=24, le=60)
    scenes: list[Scene] = Field(min_length=1, max_length=80)
    narration_asset_id: str | None = Field(default=None, pattern=r"^[a-f0-9-]{36}$")
    music_asset_id: str | None = Field(default=None, pattern=r"^[a-f0-9-]{36}$")
    music_volume: float = Field(default=0.12, ge=0, le=1)
    output: Literal["mp4"] = "mp4"

    @field_validator("scenes")
    @classmethod
    def validate_total_duration(cls, scenes):
        if sum(s.duration_sec for s in scenes) > 600:
            raise ValueError("Maximum render duration is 600 seconds per job")
        return scenes
