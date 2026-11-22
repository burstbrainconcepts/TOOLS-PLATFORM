# CLAUDE.md — bb-tools-platform

Monorepo for Burst Brain Concepts engineering tools. It contains isolated Railway service directories plus a separate automation toolkit of upstream projects. The automation projects are not automatically deployed or wired together.

## Layout

```
bb-tools-platform/
├── CLAUDE.md
├── README.md
├── automation/                # upstream n8n, GitHub MCP, Remotion and OpenPost
└── services/
    ├── spec-kit/
    ├── artemis/
    ├── xtool/
    └── video-factory/         # CPU-first FFmpeg API and asynchronous worker
```

## Rules

1. Keep services isolated. A change for one service should stay in its directory, except for shared root documentation.
2. Services communicate through documented URLs and APIs, never by reading another service's private files.
3. No secrets in git. Store credentials in deployment variables or encrypted credential stores.
4. Audit the service folder and README before modifying a service.
5. Never run ARTEMIS against real money flows or personal devices; use test devices and accounts.
6. Work on a branch and open a PR for non-trivial changes.
7. Keep automation tools as separate upstreams; coordinate through APIs, MCP or CLI interfaces.
8. Treat AI-generated repository changes and social posts as drafts. Require human approval before merging, deploying or publishing.
9. The video factory API and worker must share durable storage. Do not use node-local ephemeral files for multi-instance rendering.
10. FFmpeg assembly is not generative AI. Keep image, voice, video-generation and lip-sync providers as explicit adapters with cost, rights and quality controls.

## Railway mapping

| Service | Root directory | Config path | Domain |
|---|---|---|---|
| spec-kit | /services/spec-kit | /services/spec-kit/railway.json | speckit.bbmeet.site |
| artemis | /services/artemis | /services/artemis/railway.json | artemis.bbmeet.site |
| xtool | /services/xtool | /services/xtool/railway.json | xtool.bbmeet.site |
| video-factory | /services/video-factory | /services/video-factory/railway.json | optional: video.bbmeet.site |
| Postgres | Railway plugin | — | internal only |

The video factory also requires Redis and a persistent volume mounted at /data. Its API and worker must mount the same volume. Configure VIDEO_FACTORY_API_KEY as a secret. A single worker is the safe starting point on CPU-only hardware.

## Known hosting limits

- spec-kit is a CLI used inside a coding agent; a hosted status shell is not the workflow itself.
- artemis needs an Android device or emulator reachable over ADB.
- xtool needs Apple's Xcode assets and appropriate Apple hardware/tooling for real iOS builds.
- video-factory currently assembles supplied assets with FFmpeg on CPU. It does not generate original AI images, video clips, voices or lip-sync. Sustained rendering is CPU/RAM intensive; use a persistent self-hosted Docker host for the worker.