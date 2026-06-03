# Pexo Case Diagnosis Workbench

Interactive visual analysis tool for Pexo video creation agent traces.

## Features

- **Case Flow Canvas** — horizontal flowchart of the agent's tool call chain with pan/zoom
- **Skills Reading Graph** — tree view showing which skills and references were read, with line-level coverage
- **Timeline Assembly Visualization** — NLE-style timeline for video/audio assembly steps
- **Case List View** — compact vertical list format for quick scanning
- **Multi-round Interaction** — cross-round asset reference tracking with highlighting

## Deploy to Vercel

1. Push this repo to GitHub (private recommended)
2. Import the repo in [vercel.com/new](https://vercel.com/new)
3. Add environment variables in Vercel Dashboard → Settings → Environment Variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `LANGFUSE_PUBLIC_KEY` | For fetching new cases | Langfuse public key |
| `LANGFUSE_SECRET_KEY` | For fetching new cases | Langfuse secret key |
| `LANGFUSE_HOST` | For fetching new cases | e.g. `https://cloud.langfuse.com` |
| `PEXO_ADMIN_TOKEN` | For skills tree | Pexo Admin JWT token |
| `ANTHROPIC_API_KEY` | For Claude chat | Anthropic API key |

4. Deploy — Vercel auto-detects the project structure

## Local Development

```bash
node local-server.js
# Opens http://localhost:3792
```

Or with Vercel CLI:

```bash
npx vercel dev
```

## Bundled Cases

The `data/cases/` directory contains pre-fetched case trace data. New cases can be fetched on-demand if Langfuse credentials are configured.

## Pages

| Path | Description |
|------|-------------|
| `/` | Main workbench with case analysis |
| `/case-flow` | Horizontal canvas flow visualization |
| `/case-list` | Compact list view |
| `/skill-map` | Skill pipeline architecture map |
