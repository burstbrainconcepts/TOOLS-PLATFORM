# bb-tools-platform

Engineering tools monorepo for Burst Brain Concepts. It contains isolated service directories and a separate automation toolkit of upstream projects. See CLAUDE.md for architecture and repository rules.

## Services

| Service | Purpose |
|---|---|
| spec-kit | Spec-driven development support |
| artemis | Android automation/testing support |
| xtool | iOS build-toolchain support |
| video-factory | CPU-first FFmpeg rendering API and asynchronous worker |

The automation folder includes n8n, GitHub MCP Server, Remotion and OpenPost as upstream submodules. They remain separate tools; checking out a submodule does not integrate or deploy it.

## Video factory quick start

The video factory is independently runnable with Docker Compose. It requires Docker Engine and Compose.

```bash
cd services/video-factory
cp .env.example .env
# Replace VIDEO_FACTORY_API_KEY in .env with a long random secret
docker compose up --build -d
docker compose logs -f api worker
```

Health endpoint: http://localhost:8080/health

The service accepts still images/video clips, optional narration and music, then assembles an MP4 with FFmpeg on CPU. Read services/video-factory/README.md for the API workflow and limitations.

Important: this is a rendering/assembly engine, not a text-to-video model. AI script, image, voice, full-motion video, character-consistency and lip-sync providers are planned adapters and are not included in this first executable slice. CPU rendering is supported; premium generative motion still depends on suitable inference models/providers.

## Existing Railway services

The existing service shells can be deployed independently from this repository. For each, configure the service root directory and its railway.json path as shown in CLAUDE.md. Do not assume the video factory is deployed merely because its source exists. It needs a Redis service and persistent shared storage mounted at /data; for sustained rendering, a self-hosted Docker host is the recommended starting point.

## Automation toolkit

See automation/README.md for upstream licensing, setup and the staged n8n/Remotion/OpenPost integration plan. Human approval should remain in the loop before public publishing, merges or deployments.