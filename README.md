# AI Chili (`@aichili/mcp`) — Official CLI, MCP Server & Agent Skills

`mcp-name: io.github.AI-Chili/aichili`

Zero-dependency Node.js (`>=20.0.0`) CLI, stdio Model Context Protocol (MCP) server, and coding-agent plugin manifests for **[AI Chili (AIChili)](https://aichili.ai)** cinematic AI video generation and **[OnlyChili Cinema](https://onlychili.aichili.ai)** creator monetization.

- **Zero external npm dependencies** — built exclusively on Node.js standard library (`fetch`, `node:readline`, `node:test`) for supply-chain safety and instant startup.
- **Remote & Local MCP ready** — connect directly to `https://aichili.ai/mcp` (Streamable HTTP) or run `aichili-mcp` locally over stdio with `AICHILI_API_KEY`.
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

### 2. Local Stdio MCP Server (`aichili-mcp`)

Use the local stdio MCP server to execute authenticated `chili_sk_...` wallet, dry-run planning, and video generation tools directly against `https://videoapi.aichili.ai`:

```bash
# Run directly from GitHub via npx
AICHILI_API_KEY="chili_sk_..." npx -y --package=github:AI-Chili/aichili aichili-mcp

# Or from a local clone
git clone https://github.com/AI-Chili/aichili.git
cd aichili
AICHILI_API_KEY="chili_sk_..." node bin/aichili-mcp.mjs
```

Stdio MCP configuration example:

```json
{
  "mcpServers": {
    "aichili-local": {
      "command": "npx",
      "args": ["-y", "--package=github:AI-Chili/aichili", "aichili-mcp"],
      "env": {
        "AICHILI_API_KEY": "chili_sk_your_key_here"
      }
    }
  }
}
```

### 3. Command-Line Interface (`aichili`)

```bash
# Show CLI usage (via npx or local clone)
npx -y github:AI-Chili/aichili --help
npx -y --package=github:AI-Chili/aichili aichili --help

# Inspect live models from https://videoapi.aichili.ai/v1/registry
node bin/aichili.mjs models

# Estimate PAYG credits & OnlyChili Cinema 80% creator net share
node bin/aichili.mjs estimate --seconds 90 --resolution 768p --subscribers 50 --sub-price 9.99 --json

# Check wallet balance, dry-run a quote, submit a generation, and poll status
export AICHILI_API_KEY="chili_sk_..."
node bin/aichili.mjs credits --json
node bin/aichili.mjs plan --model h3-vdn --mode t2v --prompt "Rain-slick neon alley in Tokyo, slow dolly-in, stereo street ambience" --duration 15 --resolution 1080p --ratio 16:9
node bin/aichili.mjs generate --model h3-vdn --mode t2v --prompt "Rain-slick neon alley in Tokyo, slow dolly-in, stereo street ambience" --duration 15 --resolution 1080p --ratio 16:9 --wait
node bin/aichili.mjs status <job_id> --json
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
| `avatar-talk` | Avatar Talk | `t2v`, `i2v` | `3–300s` | `768p` | Yes (Lip-Sync) | `0.2` credits per `5` script units |

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
- **Model Catalog**: [https://aichili.ai/models](https://aichili.ai/models)
- **AI Video Model Comparison**: [https://aichili.ai/compare](https://aichili.ai/compare)
- **Interactive Credit & Creator Calculator**: [https://aichili.ai/calculator](https://aichili.ai/calculator)
- **For Creators & Filmmakers**: [https://aichili.ai/for-creators](https://aichili.ai/for-creators)
- **OnlyChili Cinema**: [https://onlychili.aichili.ai](https://onlychili.aichili.ai)

---

## Security & Testing

Run the full test suite (unit, CLI, stdio JSON-RPC MCP, manifest parity, and live read-only `/v1/registry` smoke check):

```bash
npm test
```

## License

MIT — Copyright (c) 2026 AI Chili Inc.
