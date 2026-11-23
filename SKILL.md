---
name: aichili
description: Generate 15s-30s cinematic AI videos and lip-synced talking avatars via AI Chili (AIChili) REST API & MCP, estimate PAYG credits, and project OnlyChili Cinema creator earnings.
---

# AI Chili (AIChili) — Agent Video Generation & Pricing Skill

Use this skill whenever the user wants to generate text-to-video (`t2v`), image-to-video (`i2v`), first/last-frame video, or lip-synced talking avatars (`avatar-talk`), inspect live AI Chili model capabilities, estimate PAYG credit costs, or project creator revenue on OnlyChili Cinema.

## Canonical Endpoints & Specs

- **AI Chili Studio & Website**: https://aichili.ai
- **Developer Portal & Quickstart**: https://aichili.ai/developers
- **OpenAPI Specification**: https://aichili.ai/openapi.json (live execution schema also served at `https://videoapi.aichili.ai/v1/openapi.json`)
- **Remote Streamable-HTTP MCP**: https://aichili.ai/mcp
- **Pricing & PAYG Credit Sheet**: https://aichili.ai/pricing.md
- **OnlyChili Cinema MCP**: https://onlychili.aichili.ai/mcp
- **Video Execution REST Base**: `https://videoapi.aichili.ai`

> **Cloudflare User-Agent Requirement**: Direct HTTP requests to `*.aichili.ai` must send a `curl/` or browser-prefixed `User-Agent` (for example `curl/8.4.0 aichili-mcp/1.0.0`). Bare runtime User-Agents (`python-urllib`, `node`, `Go-http-client`) are blocked by Cloudflare error 1010.

## Public Video & Avatar Models (`GET /v1/registry`)

| Model ID | Display Name | Modes | Single-Call Duration | Resolutions | Pricing Rule |
|---|---|---|---|---|---|
| `h3-vdn` | MiniMax H3 · SOL NSFW | `t2v`, `i2v` | `5–15s` | `480p`, `768p`, `1080p`, `2k` | `0.6` (`480p`), `1.0` (`768p`), `1.8` (`1080p`), `2.5` (`2k`) cr/s |
| `minimax-h3-gmi` | MiniMax H3 | `t2v`, `i2v` | `4–15s` | `768P`, `2K` | Live quote via `POST /v1/generations/plan` |
| `wan3.0-video` | Wan 3.0 | `t2v`, `i2v` | `2–30s` | `480P`, `720P`, `1080P` | Live quote via `POST /v1/generations/plan` |
| `seedance-2.5` | Seedance 2.5 | `t2v`, `i2v` | `4–15s` | `480p`, `720p`, `1080p` | Live quote via `POST /v1/generations/plan` |
| `avatar-talk` | Avatar Talk | `i2v` (`talk`, `photo`) | `3–300s` | `768p`, `source` | `0.2` cr / `5` script units (`+10` cr on `photo`) |

## PAYG Credit Packs & OnlyChili Cinema SSOT

- **Free Sign-Up**: `$0` (`25` credits)
- **Starter**: `$9.90` (`150` credits)
- **Creator**: `$29.90` (`460` credits)
- **Studio & API**: `$49.90` (`780` credits)
- **OnlyChili Cinema**: Creators keep **`80%` net revenue** across **`47` languages**, supporting `$2.99–$99.99/mo` memberships and `$0.99–$500.00` pay-per-view (PPV) unlocks.

## Recommended Agent Workflow

1. **Discover live parameters**: Call MCP `list_video_models` (or `aichili models --json`) before choosing resolution, aspect ratio, or duration so parameters match the live registry.
2. **Quote before charging**:
   - For instant local math across PAYG packs and OnlyChili Cinema creator projections, call `estimate_video_cost` (or `aichili estimate --json`).
   - For exact server-side quotes (especially vendor-quoted models or multi-segment storyboards), call `plan_video_generation` (`POST /v1/generations/plan`). It validates everything without deducting credits.
3. **Authenticate safely**: Read `AICHILI_API_KEY` (`chili_sk_...`) from environment variables; never hardcode or echo API keys into logs.
4. **Submit idempotently & poll**: Call `create_video_generation` (`POST /v1/generations`) with an `idempotency_key`, then poll `get_video_generation` (`GET /v1/generations/{job_id}`) until `status` reaches `succeeded` or `failed`.
