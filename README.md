# AI Chili (`aichili` & `@aichili/mcp`) — Official CLI, MCP Server & Agent Skills

[![AI-Chili/aichili MCP server](https://glama.ai/mcp/servers/AI-Chili/aichili/badges/score.svg)](https://glama.ai/mcp/servers/AI-Chili/aichili)
[![AI Chili MCP connector](https://glama.ai/mcp/connectors/io.github.AI-Chili/aichili/badges/score.svg)](https://glama.ai/mcp/connectors/io.github.AI-Chili/aichili)
[![CI](https://github.com/AI-Chili/aichili/actions/workflows/ci.yml/badge.svg)](https://github.com/AI-Chili/aichili/actions/workflows/ci.yml)

`mcp-name: io.github.AI-Chili/aichili`

Zero-dependency Node.js (`>=20.0.0`) CLI ([`aichili` on npm](https://www.npmjs.com/package/aichili)), stdio Model Context Protocol (MCP) server ([`@aichili/mcp` on npm](https://www.npmjs.com/package/@aichili/mcp)), and coding-agent plugin manifests for **[AI Chili (AIChili)](https://aichili.ai)** cinematic AI video generation and **[OnlyChili Cinema](https://onlychili.aichili.ai)** creator monetization.

<a href="https://glama.ai/mcp/servers/AI-Chili/aichili">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/AI-Chili/aichili/badges/card.svg" alt="AI Chili MCP server" />
</a>

- **Zero external npm dependencies** — built exclusively on Node.js standard library (`fetch`, `node:readline`, `node:test`) for supply-chain safety and instant startup.
- **Remote & Local MCP ready** — connect directly to `https://aichili.ai/mcp` (Streamable HTTP) or run `npx -y @aichili/mcp` locally over stdio with `AICHILI_API_KEY`.
- **Multi-agent native** — ships ready-to-install manifests for Official MCP Registry (`server.json`), Claude Code (`.claude-plugin/`), Cursor (`.cursor-plugin/`), Gemini CLI (`gemini-extension.json`), Glama (`glama.json`), and portable `SKILL.md`.

---

## Quickstart

### 1. Remote HTTP MCP (Zero Install)

Connect any Streamable-HTTP MCP client (Claude Code, Cursor, Gemini CLI, Windsurf, Inspector) directly to AI Chili:

```bash
# Claude Code
claude mcp add --transport http aichili https://aichili.ai/mcp

# Optional: OnlyChili Cinema creator & catalog MCP
claude mcp add --transport http onlychili https://onlychili.aichili.ai/mcp
```

Or add to `.mcp.json` / `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "aichili": {
      "type": "http",
      "url": "https://aichili.ai/mcp"
    }
  }
}
```

### 2. Local Stdio MCP Server (`@aichili/mcp`)

Use the local stdio MCP server to execute authenticated `chili_sk_...` wallet, dry-run planning, and video generation tools directly against `https://videoapi.aichili.ai`:

```bash
# Run directly via npm (npx)
AICHILI_API_KEY="chili_sk_..." npx -y @aichili/mcp

# Or from GitHub / local clone
AICHILI_API_KEY="chili_sk_..." npx -y --package=github:AI-Chili/aichili aichili-mcp

git clone https://github.com/AI-Chili/aichili.git
cd aichili
AICHILI_API_KEY="chili_sk_..." node bin/aichili-mcp.mjs

# Or via official public multi-arch Docker image on GHCR (zero clone needed)
docker run -i --rm -e AICHILI_API_KEY="chili_sk_..." ghcr.io/ai-chili/aichili

# Or build & run directly from GitHub via Docker BuildKit
docker build -t aichili-mcp https://github.com/AI-Chili/aichili.git && docker run -i --rm -e AICHILI_API_KEY="chili_sk_..." aichili-mcp

# Or build locally via Docker (non-root node:22-alpine stdio container)
docker build -t aichili-mcp . && docker run -i --rm -e AICHILI_API_KEY aichili-mcp
```

Stdio MCP configuration example:

```json
{
  "mcpServers": {
    "aichili-local": {
      "command": "npx",
      "args": ["-y", "@aichili/mcp"],
      "env": {
        "AICHILI_API_KEY": "chili_sk_your_key_here"
      }
    }
  }
}
```

### 3. Command-Line Interface (`aichili`)

```bash
# Run directly via npx or install globally from npm
npx -y aichili models
npm install -g aichili
aichili --version

# Or install on macOS / Linux via Official Homebrew Tap
brew install AI-Chili/tap/aichili
aichili --version

# Estimate PAYG credits & OnlyChili Cinema 80% creator net share
aichili estimate --seconds 90 --resolution 768p --subscribers 50 --sub-price 9.99 --json

# Check wallet balance, dry-run a quote, submit a generation, and poll status
export AICHILI_API_KEY="chili_sk_..."
aichili credits --json
aichili plan --model h3-vdn --mode t2v --prompt "Rain-slick neon alley in Tokyo, slow dolly-in, stereo street ambience" --duration 15 --resolution 1080p --ratio 16:9
aichili generate --model h3-vdn --mode t2v --prompt "Rain-slick neon alley in Tokyo, slow dolly-in, stereo street ambience" --duration 15 --resolution 1080p --ratio 16:9 --wait
aichili status <job_id> --json
```

---

## MCP Tools Included

| Tool | Auth | Description |
|---|---|---|
| `platform_overview` | Public | Canonical metadata, endpoints, 5-model table, PAYG credit packs, and OnlyChili Cinema revenue share |
| `list_video_models` | Public | Live capabilities, workflows, durations, ratios, and pricing rules from `GET /v1/registry` |
| `estimate_video_cost` | Public | Deterministic PAYG credit calculator + recommended pack + OnlyChili `80%` creator net earnings |
| `get_credit_balance` | `chili_sk_*` | Current credit balance, plan, and PAYG unlock status via `GET /v1/credits` |
| `plan_video_generation` | `chili_sk_*` | Server-side dry-run quote (`POST /v1/generations/plan`) — validates & prices with zero charge |
| `create_video_generation` | `chili_sk_*` | Enqueue video or talking-avatar generation (`POST /v1/generations`) with optional `idempotency_key` |
| `get_video_generation` | `chili_sk_*` | Poll job status, segment progress, and output asset via `GET /v1/generations/{job_id}` |

---

## Live Public Video & Avatar Models

| Model ID | Display Name | Modes | Single-Call Duration | Resolutions | Native Audio | Pricing |
|---|---|---|---|---|---|---|
| `h3-vdn` | MiniMax H3 · SOL NSFW | `t2v`, `i2v` | `5–15s` | `480p`, `768p`, `1080p`, `2k` | Yes (Stereo) | `0.6` / `1.0` / `1.8` / `2.5` cr/s |
| `minimax-h3-gmi` | MiniMax H3 | `t2v`, `i2v` | `4–15s` | `768P`, `2K` | Yes | Live quote (`/v1/generations/plan`) |
| `wan3.0-video` | Wan 3.0 | `t2v`, `i2v` | `2–30s` | `480P`, `720P`, `1080P` | Yes | Live quote (`/v1/generations/plan`) |
| `seedance-2.5` | Seedance 2.5 | `t2v`, `i2v` | `4–15s` | `480p`, `720p`, `1080p` | Yes | Live quote (`/v1/generations/plan`) |
| `avatar-talk` | Avatar Talk | `i2v` (`talk`, `photo`) | `3–300s` | `768p`, `source` | Yes (Lip-Sync) | `0.2` cr / `5` script units (`+10` cr on `photo`) |

---

## PAYG Credit Packs & OnlyChili Cinema Monetization

| Pack | Price (USD) | Credits | Effective Rate |
|---|---|---|---|
| **Free Sign-Up** | `$0.00` | `25` credits | Free trial grant |
| **Starter** | `$9.90` | `150` credits | `$0.0660` / credit |
| **Creator** | `$29.90` | `460` credits | `~$0.0650` / credit |
| **Studio & API** | `$49.90` | `780` credits | `~$0.0640` / credit |

- **OnlyChili Cinema**: Creators keep **`80%` net revenue** across **`47` languages** with `$2.99–$99.99/mo` channel memberships and `$0.99–$500.00` pay-per-view (PPV) unlocks.

---

## Official Links & Resources

- **AI Chili Studio**: [https://aichili.ai](https://aichili.ai)
- **Developer Docs & API Reference**: [https://aichili.ai/developers](https://aichili.ai/developers)
- **npm CLI Package (`aichili`)**: [https://www.npmjs.com/package/aichili](https://www.npmjs.com/package/aichili)
- **npm MCP Server (`@aichili/mcp`)**: [https://www.npmjs.com/package/@aichili/mcp](https://www.npmjs.com/package/@aichili/mcp)
- **Model Catalog**: [https://aichili.ai/models](https://aichili.ai/models)
- **AI Video Model Comparison**: [https://aichili.ai/compare](https://aichili.ai/compare)
- **Interactive Credit & Creator Calculator**: [https://aichili.ai/calculator](https://aichili.ai/calculator)
- **AI Chili for Creators & Filmmakers**: [https://aichili.ai/for-creators](https://aichili.ai/for-creators)
- **AI Chili vs AITube (`aitube.io` Alternative)**: [https://aichili.ai/vs/aitube](https://aichili.ai/vs/aitube)
- **AI Chili vs Hollywood.AI (`hollywood.ai` Alternative)**: [https://aichili.ai/vs/hollywood-ai](https://aichili.ai/vs/hollywood-ai)
- **All Platform Comparisons**: [https://aichili.ai/vs](https://aichili.ai/vs)
- **OnlyChili Cinema**: [https://onlychili.aichili.ai](https://onlychili.aichili.ai)
- **OnlyChili Series Directory (55+ AI Series in 47 Languages)**: [https://onlychili.aichili.ai/series](https://onlychili.aichili.ai/series)
- **AI Chili 2K Sci-Fi & Cyberpunk Anthology (SFW Showcase)**: [https://onlychili.aichili.ai/playlists/b328568a-acd9-4c25-8aa0-1405087925a5](https://onlychili.aichili.ai/playlists/b328568a-acd9-4c25-8aa0-1405087925a5)
- **AI Chili 2K Wuxia & Fantasy Animation (SFW Showcase)**: [https://onlychili.aichili.ai/playlists/a798c49f-a68b-4171-b54b-d0bc75c0c52b](https://onlychili.aichili.ai/playlists/a798c49f-a68b-4171-b54b-d0bc75c0c52b)
- **OnlyChili Creator Monetization (80% Net Revenue Share)**: [https://onlychili.aichili.ai/creators](https://onlychili.aichili.ai/creators)

---

## Security & Testing

Sync `@aichili/mcp` and run the full test suite (unit, CLI, stdio JSON-RPC MCP, `npm pack` + `npx` tarball smoke checks, `server.json` schema validation, and live read-only `/v1/registry` check):

```bash
npm run sync:mcp
npm test
```

## License

MIT — Copyright (c) 2026 AI Chili Inc.
