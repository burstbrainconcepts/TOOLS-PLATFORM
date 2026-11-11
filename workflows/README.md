# Workflows

Importable n8n workflows. They contain **no secrets**: API keys live in n8n Credentials, and the files reference credentials by name only.

| File | What it does |
|---|---|
| `n8n/daily-brief.json` | 07:00 daily. Reads GitHub (read-only), DeepSeek summarizes, Claude writes today's plan, sent to Telegram. |
| `n8n/daily-content-drafts.json` | 09:00 daily. Claude writes post drafts, created in OpenPost as **drafts only**, then a Telegram notice asks for approval. It never schedules or publishes. |

## One-time setup in n8n

Create these under **Credentials** (type: *Header Auth* unless noted). Names must match, or re-select them on each node after import.

| Credential name | Header name | Value |
|---|---|---|
| `GitHub read-only token` | `Authorization` | `Bearer <fine-grained token, read-only>` |
| `DeepSeek API key` | `Authorization` | `Bearer <key>` |
| `Anthropic API key (header x-api-key)` | `x-api-key` | `<key>` |
| `OpenPost API token (Authorization: Bearer ...)` | `Authorization` | `Bearer <token>` (OpenPost: Settings > Personal > Developer, workspace-bound `api:write`) |
| `Telegram bot` (type: Telegram API) | - | bot token from @BotFather |

Then: **Workflows > Import from file**, open the **Config** node of each workflow, and replace the `REPLACE_WITH_...` values (GitHub user, Telegram chat id, OpenPost workspace id and account ids). Run each workflow once manually before enabling its schedule.

## Safety rules (see CLAUDE.md rule 9)

- Content workflows only create drafts. A human approves in OpenPost before anything is published.
- Use a read-only GitHub token. Grant write access only for a specific approved workflow.
- Set monthly spending limits on the Anthropic and DeepSeek accounts.
- Model names (`claude-sonnet-5-5`, `deepseek-chat`) are set in each Config node; confirm them against each provider's current model list.
