import re
import subprocess
import tempfile
from pathlib import Path

from app.config import ASSET_DIR, OUTPUT_DIR, TEMP_DIR

def run(command: list[str]):
    completed = subprocess.run(command, capture_output=True, text=True, timeout=3600)
    if completed.returncode:
        detail = completed.stderr[-5000:]
        raise RuntimeError(f"FFmpeg failed: {detail}")

def srt_time(seconds: float) -> str:
    millis = round(seconds * 1000)
    hours, millis = divmod(millis, 3_600_000)
    minutes, millis = divmod(millis, 60_000)
    secs, millis = divmod(millis, 1000)
    return f"{hours:02}:{minutes:02}:{secs:02},{millis:03}"

def find_asset(asset_id: str) -> Path:
    if not re.fullmatch(r"[a-f0-9-]{36}", asset_id):
        raise ValueError("Invalid asset identifier")
    found = list(ASSET_DIR.glob(f"{asset_id}.*"))
    if len(found) != 1:
        raise FileNotFoundError(f"Asset not found: {asset_id}")
    return found[0]

def render(manifest: dict, job_id: str, progress=None) -> dict:
    scenes = manifest["scenes"]
    width, height, fps = manifest["width"], manifest["height"], manifest["fps"]
    total_duration = sum(float(scene["duration_sec"]) for scene in scenes)
    output = OUTPUT_DIR / f"{job_id}.mp4"
    work = Path(tempfile.mkdtemp(prefix=f"{job_id}-", dir=TEMP_DIR))
    concat_file = work / "concat.txt"
    srt_file = work / "captions.srt"
    rendered_scenes = []
    timeline = 0.0
    subtitle_entries = []

    try:
        for index, scene in enumerate(scenes):
            asset = find_asset(scene["asset_id"])
            duration = float(scene["duration_sec"])
            segment = work / f"scene-{index:03}.mp4"
            is_image = asset.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
            base = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y"]
            if is_image:
                zoom = f"zoompan=z='min(zoom+0.0008,1.08)':d=1:s={width}x{height}:fps={fps}"
                vf = f"scale={width}:{height}:force_original_aspect_ratio=increase,crop={width}:{height},{zoom},setsar=1"
                command = base + ["-loop", "1", "-i", str(asset), "-t", str(duration),
                                  "-vf", vf, "-an", "-r", str(fps),
                                  "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
                                  "-pix_fmt", "yuv420p", str(segment)]
            else:
                vf = f"scale={width}:{height}:force_original_aspect_ratio=increase,crop={width}:{height},setsar=1,fps={fps}"
                command = base + ["-stream_loop", "-1", "-i", str(asset), "-t", str(duration),
                                  "-vf", vf, "-an", "-c:v", "libx264",
                                  "-preset", "veryfast", "-crf", "23",
                                  "-pix_fmt", "yuv420p", str(segment)]
            run(command)
            rendered_scenes.append(segment)
            caption = (scene.get("caption") or "").strip()
            if caption:
                subtitle_entries.append(
                    f"{index + 1}\n{srt_time(timeline)} --> {srt_time(timeline + duration)}\n{caption}\n"
                )
            timeline += duration
            if progress:
                progress(10 + int(65 * (index + 1) / len(scenes)), f"rendering scene {index + 1}/{len(scenes)}")

        concat_file.write_text("".join(f"file '{p.as_posix()}'\n" for p in rendered_scenes), encoding="utf-8")
        if subtitle_entries:
            srt_file.write_text("\n".join(subtitle_entries), encoding="utf-8")

        assembled = work / "assembled.mp4"
        run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "concat",
             "-safe", "0", "-i", str(concat_file), "-c", "copy", str(assembled)])

        command = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(assembled)]
        narration_id = manifest.get("narration_asset_id")
        music_id = manifest.get("music_asset_id")
        audio_inputs = []
        if narration_id:
            command += ["-i", str(find_asset(narration_id))]
            audio_inputs.append("narration")
        if music_id:
            command += ["-stream_loop", "-1", "-i", str(find_asset(music_id))]
            audio_inputs.append("music")

        filters = []
        if subtitle_entries:
            escaped = str(srt_file).replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")
            filters.append(f"[0:v]subtitles='{escaped}':force_style='FontName=DejaVu Sans,FontSize=24,Outline=2,Shadow=1,Alignment=2'[v]")
        else:
            filters.append("[0:v]null[v]")

        if narration_id and music_id:
            music_volume = float(manifest.get("music_volume", 0.12))
            filters.append(f"[1:a]aresample=48000[narr];[2:a]volume={music_volume},aresample=48000[music];[narr][music]amix=inputs=2:duration=first:dropout_transition=2[a]")
        elif narration_id:
            filters.append("[1:a]aresample=48000[a]")
        elif music_id:
            music_volume = float(manifest.get("music_volume", 0.12))
            filters.append(f"[1:a]volume={music_volume},aresample=48000[a]")

        command += ["-filter_complex", ";".join(filters), "-map", "[v]"]
        if audio_inputs:
            command += ["-map", "[a]"]
        else:
            command += ["-an"]
        command += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "22",
                    "-pix_fmt", "yuv420p", "-r", str(fps), "-movflags", "+faststart",
                    "-t", str(total_duration)]
        if audio_inputs:
            command += ["-c:a", "aac", "-b:a", "192k"]
        command.append(str(output))
        if progress:
            progress(85, "mixing audio and finalizing")
        run(command)
        if progress:
            progress(100, "completed")
        return {
            "output_path": str(output),
            "duration_seconds": round(total_duration, 2),
            "scene_count": len(scenes),
            "resolution": f"{width}x{height}",
            "fps": fps,
            "size_bytes": output.stat().st_size,
        }
    finally:
        for item in work.glob("*"):
            item.unlink(missing_ok=True)
        work.rmdir()
