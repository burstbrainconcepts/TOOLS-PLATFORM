# Burst Brain Video Factory — CPU-first rendering service

This is the first executable rendering slice for the no-paid-GPU animation/video system. It converts prepared visual assets, narration and music into MP4 videos using FFmpeg on CPU. It does **not** claim to generate original AI images, video clips or voices by itself. Those are provider/asset-generation stages to be connected separately.

## Why this design

- CPU-first: no CUDA, NVIDIA GPU or paid GPU rental required for assembly.
- Asynchronous jobs: FastAPI accepts work; Celery workers render in the background through Redis.
- Persistent storage: assets, results and Redis state use Docker volumes.
- Provider-neutral: upstream story/image/voice providers can upload assets and submit a manifest.
- Safe baseline: API-key protection on upload, job submission, status and download; input IDs are UUIDs, uploads are size-limited, and FFmpeg is called with argument arrays rather than shell interpolation.

## Run locally

Requires Docker Engine and Docker Compose.

```bash
cp .env.example .env
# Set VIDEO_FACTORY_API_KEY to a unique random secret in .env
docker compose up --build -d
docker compose logs -f api worker
```

Health: `http://localhost:8080/health`

Keep the `.env` file private. Do not commit real API keys.

## API workflow

1. Upload a still image, video clip, narration or music file:

```bash
curl -X POST http://localhost:8080/v1/assets \
  -H "X-API-Key: $VIDEO_FACTORY_API_KEY" \
  -F "file=@scene-01.png"
``

The response includes an `asset_id`. Upload each asset once and retain its ID.

2. Submit a render job (replace UUIDs with upload responses):

```bash
curl -X POST http://localhost:8080/v1/jobs \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $VIDEO_FACTORY_API_KEY" \
  -d '{
    "title": "Sample explainer",
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "scenes": [
      {"asset_id": "00000000-0000-0000-0000-000000000000", "duration_sec": 8, "caption": "Opening scene"}
    ],
    "narration_asset_id": null,
    "music_asset_id": null,
    "music_volume": 0.12
  }'
```

3. Poll `GET /v1/jobs/{job_id}` until status is `success`. Download with `GET /v1/jobs/{job_id}/download`.

Every protected endpoint requires `X-API-Key`. The example UUID is a placeholder, not a real uploaded asset.

## Manifest contract

- `scenes[]`: ordered image/video asset IDs, durations (0.5–120 seconds each), optional captions.
- `narration_asset_id`: optional audio track; narration duration controls the mix duration only up to the video duration.
- `music_asset_id`: optional looping music bed, attenuated by `music_volume` (0–1).
- Per-job maximum duration: 10 minutes. The API limits scene count to 80.
- Output: H.264/AAC MP4, 24–60 fps, 640–1920 width, 360–1080 height.

## Current scope and limitations

- Implemented: asset upload, asynchronous job queue, CPU FFmpeg scene assembly, slow zoom on stills, clip trimming/looping, captions, narration/music mixing, progress/status and MP4 download.
- Not implemented yet: AI script generation, image generation, text-to-speech, character consistency, lip-sync, full-motion AI video, Remotion compositions, editing UI, automatic social publishing, user accounts/quotas and automated retention.
- CPU rendering is not the same as AI video generation. High-quality generative motion, realistic character animation and lip-sync need separate models or paid/limited inference providers. A CPU can assemble and polish footage but cannot guarantee premium generative output at practical speeds.
- This is a single-node deployment design. Keep API and worker on the same shared persistent volume. Do not deploy API and worker as separate machines unless they share durable object storage.
- The service does not expose a public unauthenticated media URL. Keep the API behind HTTPS and use a strong key or add user-level authentication before multi-user exposure.

## Integration roadmap

1. Connect a story/shot planner that emits a validated scene manifest and asset list.
2. Add pluggable image and voice adapters with explicit provider selection, caching, cost tracking and retry limits.
3. Add a character/style reference registry and per-shot continuity checks before rendering.
4. Add optional Remotion templates for typography, motion graphics and branded layouts; keep FFmpeg as the universal compositor.
5. Connect n8n for orchestration and OpenPost only after a human approval step.
6. Add a web studio, job database, user authentication, quotas, retention policies and automated test fixtures.

## Deploying

For the first reliable deployment, use a self-hosted Docker host with persistent Docker volumes and one worker. A small Railway service can host the API, but sustained video rendering is CPU/RAM intensive and ephemeral storage is unsuitable for source assets and final renders. If deploying on Railway, configure a persistent volume mounted at `/data`, a reachable Redis instance, and ensure the API and worker share the same storage backend. Verify platform limits before moving real workloads.
