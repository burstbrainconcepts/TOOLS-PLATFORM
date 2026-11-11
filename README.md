# bb-tools-platform

One repo, three Railway services, one Postgres. See [CLAUDE.md](CLAUDE.md) for the rules.

## 1. Push to GitHub
```
gh repo create bb-tools-platform --private --source . --push
```

## 2. Railway project (one project, one environment)
1. New Project → Deploy from GitHub repo → pick `bb-tools-platform`.
2. Add **Postgres** (New → Database → PostgreSQL).
3. Create three services from the same repo. For each, Settings →
   - Root Directory: `/services/<name>`
   - Config as Code path: `/services/<name>/railway.json`
   - Watch Paths: `/services/<name>/**` (so only that service redeploys on a push)
4. Variables (per service):
   - `SERVICE_NAME=<name>`
   - `DATABASE_URL=${{Postgres.DATABASE_URL}}`
   - `SPEC_KIT_URL`, `ARTEMIS_URL`, `XTOOL_URL` (the public URLs below)

## 3. Domains (bbmeet.site)
In each service: Settings → Networking → Custom Domain, add:
- speckit.bbmeet.site
- artemis.bbmeet.site
- xtool.bbmeet.site

Railway shows a CNAME target for each. Add those CNAME records at your DNS host (and the TXT verification record if shown). Redirects between services are then just the URL variables above.

## 4. Verify
Open `https://<sub>.bbmeet.site/health` → `ok`, and `/` for the JSON status.
