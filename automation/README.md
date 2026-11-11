# Automation Toolkit

This folder keeps the upstream tools separate as Git submodules. They are not merged into one application, are not currently wired together, and are not deployed by the Railway services.

## Components

| Submodule | Role |
|---|---|
| [`n8n/`](n8n/) | Schedule and orchestrate daily workflows. |
| [`github-mcp-server/`](github-mcp-server/) | Give compatible AI agents controlled access to GitHub. Optional for scheduled workflows because n8n has GitHub integrations. |
| [`remotion/`](remotion/) | Render reusable, code-driven video templates. It is not a general-purpose AI video generator or social scheduler. |
| [`openpost/`](openpost/) | Draft, edit, schedule, and publish supported social content. Platform capabilities and approvals vary. |

These are shallow submodule checkouts pinned to commits by the parent repository. To initialize them after cloning this repository:

```powershell
git submodule update --init --recursive
```

On Windows, Git may need long-path support before initializing the submodules:

```powershell
git config --global core.longpaths true
```

## Recommended connection plan

1. Start with n8n and build a read-only daily GitHub digest for selected repositories: recent commits, open issues and pull requests, failed Actions runs, and blocked work.
2. Connect one AI provider to n8n to summarize the collected facts and propose a daily plan. Keep the API key in n8n's encrypted credential store; do not commit keys or place them in workflow files.
3. Send the proposed plan to a channel you choose and require your approval before repository writes, merges, deployments, or other consequential actions.
4. Add OpenPost for content drafts and scheduling. Connect only the social accounts you intend to use, test one platform at a time, and retain approval before public publishing.
5. Add Remotion as a separate rendering worker only when a repeatable video format is clear. Have n8n pass structured content and asset references to a render job, then send the resulting video to OpenPost for review and scheduling.
6. Add the GitHub MCP server only if you want an interactive AI coding agent (such as Claude Code) to inspect repositories or call GitHub tools. Start with read-only permissions; grant write permissions only for a specific approved workflow.

Use the tools' APIs, MCP interfaces, or CLIs as their supported contracts. Do not combine their source code into one checkout or let one component read another component's private files. Keep rendering separate from Railway's lightweight status services.

## Connecting AI agents

- **n8n workflows:** configure the chosen provider's API credentials in n8n, select its supported model/node, and give it only the information and tools needed for that workflow. Claude, OpenAI, and DeepSeek API usage is billed separately from their chat subscriptions.
- **Interactive GitHub work:** configure the GitHub MCP server in the AI agent's MCP settings, authenticate using a narrowly scoped GitHub credential, and initially expose read-only tools. Exact configuration differs by agent; use the upstream [`github-mcp-server` instructions](https://github.com/github/github-mcp-server).
- **Social publishing:** connect the agent/workflow to OpenPost through its supported API, MCP, or CLI. Configure platform developer apps and OAuth in OpenPost as required; approval and publishing capabilities differ by platform.
- **Video rendering:** call a Remotion render script or worker from a controlled n8n job. The agent should prepare validated inputs, not run arbitrary code or publish the render directly.

## Operational and licensing notes

- n8n is distributed under its Sustainable Use License (with separate Enterprise-licensed portions), not a standard OSI-approved open-source license.
- GitHub MCP Server is MIT licensed.
- Remotion has a custom license; a company license may be required depending on organization size and use. Review its current license before commercial deployment.
- OpenPost is AGPL-3.0-only. Review the license before modifying or offering it as a service.
- Self-hosting avoids hosted-tool subscriptions but still requires compute, storage, backups, platform credentials, and potentially paid AI/media APIs. Social networks can require developer-app review.
- This directory contains upstream source only. No services, credentials, schedules, or publishing accounts have been configured.
