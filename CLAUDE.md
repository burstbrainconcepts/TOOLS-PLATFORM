# CLAUDE.md — bb-tools-platform

Monorepo for Burst Brain Concepts engineering tools. It contains three isolated Railway service shells plus a separate `automation/` toolkit source collection. The automation projects are independent upstream repositories, not services and not yet integrated.

## Layout (strict separation)

```
bb-tools-platform/
├── CLAUDE.md
├── README.md                 # deploy + DNS runbook
├── automation/                # independent upstream tools (Git submodules)
│   ├── README.md              # integration plan and AI-agent setup
│   ├── n8n/
│   ├── github-mcp-server/
│   ├── remotion/
│   └── openpost/
└── services/
    ├── spec-kit/             # Spec-driven development (github/spec-kit)
    ├── artemis/              # Android automation/testing (google/artemis)
    └── xtool/                # iOS build toolchain (xtool-org/xtool)
```

Each service folder is self-contained: own `Dockerfile`, `railway.json`, `server.py`, and README notes. Keep the upstream projects in `automation/` separate; do not copy them into or treat them as part of a Railway service.

## Rules

1. **Keep services isolated.** A change for one service must only touch `services/<that-service>/`. Do not import code or share files between services.
2. Services talk to each other only through URLs in environment variables (`SPEC_KIT_URL`, `ARTEMIS_URL`, `XTOOL_URL`), never by file path.
3. All services share ONE Postgres via `DATABASE_URL`. Each service must use its own schema (`spec_kit`, `artemis`, `xtool`) or table prefix. Never touch another service's tables.
4. No secrets in git. Store credentials in Railway variables or the relevant tool's encrypted credential store; never put them in source files or committed workflow exports.
5. Audit first: read the service's folder and README before modifying; summarize the plan before editing.
6. Never run ARTEMIS against real money flows or personal devices; test devices and test accounts only.
7. Pushing to `main` auto-deploys. Work on a branch and open a PR for anything non-trivial.
8. **Automation tools are separate upstreams.** Keep each submodule isolated under `automation/`; coordinate them through documented APIs, MCP, or CLI calls. Do not merge their source trees together.
9. Treat AI-generated repository changes and social posts as drafts. Require human approval before merging, deploying, or publishing.

## Railway mapping

| Service | Root directory | Config path | Domain |
|---|---|---|---|
| spec-kit | `/services/spec-kit` | `/services/spec-kit/railway.json` | speckit.bbmeet.site |
| artemis | `/services/artemis` | `/services/artemis/railway.json` | artemis.bbmeet.site |
| xtool | `/services/xtool` | `/services/xtool/railway.json` | xtool.bbmeet.site |
| Postgres | (Railway plugin) | — | internal only |

Variables:
- Every service: `SERVICE_NAME`, `DATABASE_URL=${{Postgres.DATABASE_URL}}`
- Cross links on every service:
  `SPEC_KIT_URL=https://speckit.bbmeet.site`, `ARTEMIS_URL=https://artemis.bbmeet.site`, `XTOOL_URL=https://xtool.bbmeet.site`

## Known hosting limits (be honest about these)

- **spec-kit** is a CLI that runs inside a coding agent; the hosted service is a docs/status shell, not the workflow itself.
- **artemis** needs an Android device or emulator reachable over ADB. A Railway container has no USB; it needs a network-ADB device or a cloud emulator.
- **xtool** needs Apple's `Xcode.xip` (cannot be committed) and a USB-connected iPhone for install. Treat the service as a shell/docs for now; real builds run on WSL2/Linux.
- `server.py` in each folder is a placeholder that serves `/health` and a JSON status page. Replace it as each tool gets properly wired up.
