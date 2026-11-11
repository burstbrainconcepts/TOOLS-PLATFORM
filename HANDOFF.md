# HANDOFF: read this first, then continue the work

You are picking up an in-progress session. Read `CLAUDE.md` (rules, layout) and this file, then continue from "Next steps". Do not redo finished work.

## Goal (from the owner)
A self-hosted, low-cost automation stack for Burst Brain Concepts that: plans the owner's daily tech tasks, drafts posts/reels/shorts with AI (Claude + DeepSeek), and posts to the owner's social accounts, **always with the owner approving before anything is published**. Reason: avoid paying SaaS scheduling tools. Owner is in Nigeria (card/API-approval friction is real, see below).

## State of the repo
- GitHub: `burstbrainconcepts/TOOLS-PLATFORM`. `main` has the monorepo + submodules.
- **Branch `automation-workflows` / PR #1 may still be open and unmerged.** It adds `workflows/`, doc updates and this file. Merging needs the owner's approval (CLAUDE.md rules 7 and 9). If working on this branch, that is fine.
- Submodules (`automation/*`, `services/*/upstream`) must be initialised: `git submodule update --init --recursive` (on Windows: `git config --global core.longpaths true`). They are upstream source for reference only.
- Two workflows exist, **valid JSON but never run in n8n**: `workflows/n8n/daily-brief.json`, `workflows/n8n/daily-content-drafts.json`. See `workflows/README.md` for credential names.

## What is deployed (Railway project `bb-tools-platform`)
- Project id `eb6f0f7c-42e1-4f76-a32d-b914f3b97cf3`, environment `production` id `ec095736-6338-490b-83e9-f74c03bd5c12`.
- **Postgres** (shared). 
- **n8n** (service id `ea11d31c-039c-4553-af5d-fd6e84b9610b`): image `docker.n8n.io/n8nio/n8n`, https://n8n-production-15b0cb5d.up.railway.app . Uses shared Postgres with table prefix `n8n_`. Owner account created. License key set via `N8N_LICENSE_ACTIVATION_KEY`. A stale wrong variable `N8N_ACTIVATION_KEY` is still there; it is harmless and can be deleted.
- **openpost** (service id `24864133-df06-4a49-8cb2-70ee2bd56d3e`): image `ghcr.io/getopenpost/openpost`, volume at `/data`, SQLite, https://openpost-production-4b29bae7.up.railway.app . Owner account and workspace "Burst Brain Concepts" created.
- **Placeholder services** `spec-kit`, `artemis`, `xtool`: created, connected to the repo, **never deployed**. They are offline tools (need ADB / Xcode / a coding-agent CLI) and are not useful on Railway. The owner has not confirmed deleting them; ask before removing.
- Custom domains (`*.bbmeet.site`) are NOT attached; the Railway "add domain" call returned Unauthorized. DNS must be added by the owner. Not required for the current work.

## Fixes already applied (do not undo)
- OpenPost crash loop (`mkdir /data/db: permission denied`) fixed with `RAILWAY_RUN_UID=0`.
- OpenPost "cross-site session request rejected" fixed with `OPENPOST_TRUSTED_PROXY_CIDRS=100.64.0.0/10,10.0.0.0/8,fd12::/16` (without it OpenPost drops `X-Forwarded-Proto` and sees http). If this error returns, the CIDR guess is the first thing to re-check.
- Railway rejects the "config as code" path setting (`railway.json`); service settings were set directly instead.
- Railway MCP calls sometimes return "Unauthorized" intermittently; retrying or re-running `railway login` helps.
- `railway environment_status` can say SUCCESS for a crash-looping container. Always read logs (`get_logs`).

## Secrets: where they live (never commit them)
- All secrets are Railway variables or n8n/OpenPost credential stores: `N8N_ENCRYPTION_KEY`, `OPENPOST_JWT_SECRET`, `OPENPOST_ENCRYPTION_KEY`, DB creds, the n8n license key, future API keys.
- **Losing `N8N_ENCRYPTION_KEY` makes saved n8n credentials unreadable.** The owner should keep a copy in a password manager.
- Do not ask the owner to paste keys into chat; have them enter keys in n8n Credentials / OpenPost UI (OpenPost: Settings > Instance > Configuration for provider apps).

## Decisions made
- AI split: **Claude** for writing quality (plan, post copy), **DeepSeek** for cheap bulk steps (summaries). Both via plain HTTP Request nodes with Header Auth credentials.
- Posting goes through **official APIs via OpenPost**, never browser automation / logging into accounts (ToS ban risk, security, bypasses approval). Rejected explicitly.
- Content workflows create **drafts only**; the owner approves in OpenPost. Never add auto-publish without explicit owner instruction.
- github-mcp-server: run locally only, not hosted. Remotion: needs a custom render worker, not yet built; likely better rendered on the owner's PC.
- Cost estimate given to the owner: about $10-40/month (Railway Hobby $5 + usage, AI pay-as-you-go, X API pay-per-use). Prepaid credits, auto-reload off, spending limits set.

## Social platforms status (nothing connected yet)
- Works with no approval: Bluesky (app password), Telegram (bot via @BotFather), Mastodon, Discord.
- Needs the owner's developer app + keys: LinkedIn, X (paid pay-per-use API), YouTube (Google Cloud), Meta (Instagram/Facebook/Threads, needs app review), TikTok (needs approval). Redirect URL pattern: `https://openpost-production-4b29bae7.up.railway.app/api/v1/accounts/<network>/callback`. Register once; changing the domain later means redoing each app.
- OpenPost shows "Setup required" until the keys are added in its Instance settings.

## Next steps (in order)
1. Confirm with the owner: merge PR #1 (owner approval required).
2. Help the owner create credentials in n8n (names in `workflows/README.md`): GitHub read-only token, DeepSeek, Anthropic, OpenPost API token, Telegram bot. Then import both workflows, fill the `REPLACE_WITH_...` values in each Config node, and **run each once manually**. Fix the likely problems: model names (`claude-sonnet-5-5`, `deepseek-chat`), the OpenPost `POST /api/v1/publications` payload (docs: `automation/openpost/apps/docs/content/docs/automate/api/publications.mdx`), Telegram chat id.
3. Connect Bluesky and a Telegram bot in OpenPost first to test the full pipeline end to end.
4. Walk the owner through developer apps: LinkedIn, X, YouTube first; start Meta and TikTok approvals early because they take the longest.
5. Write a privacy policy + terms page for `bbmeet.site` (Meta, TikTok, Google ask for it).
6. Build the Remotion render worker (separate service or local), then connect it: n8n -> render -> OpenPost draft with the video.
7. Backups for OpenPost's `/data` volume and Postgres; decide on custom domains (`n8n.bbmeet.site`, `social.bbmeet.site`); decide whether to delete the placeholder services.

## Working rules to keep
- Follow `CLAUDE.md`. Audit first, summarise the plan before editing, use a branch + PR (pushing to `main` auto-deploys anything linked to the repo), human approval before merging, deploying or publishing.
- Keep services isolated; each tool talks to others only via URLs/APIs.
- Git commits end with the attribution line the harness specifies.
