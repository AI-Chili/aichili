#!/usr/bin/env node
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MCP_PKG_DIR = path.join(ROOT_DIR, "packages", "mcp");
const checkOnly = process.argv.includes("--check");

const rootPkg = JSON.parse(readFileSync(path.join(ROOT_DIR, "package.json"), "utf8"));
const mcpPkg = JSON.parse(readFileSync(path.join(MCP_PKG_DIR, "package.json"), "utf8"));

function buildMcpReadme(version) {
  return `# \`@aichili/mcp\` — Official AI Chili Stdio MCP Server

[![AI-Chili/aichili MCP server](https://glama.ai/mcp/servers/AI-Chili/aichili/badges/score.svg)](https://glama.ai/mcp/servers/AI-Chili/aichili)
[![AI Chili MCP connector](https://glama.ai/mcp/connectors/io.github.AI-Chili/aichili/badges/score.svg)](https://glama.ai/mcp/connectors/io.github.AI-Chili/aichili)

\`mcp-name: io.github.AI-Chili/aichili\`

Zero-dependency Node.js (\`>=20.0.0\`) stdio Model Context Protocol (MCP) server (\`v${version}\`) for **[AI Chili (AIChili)](https://aichili.ai)** cinematic AI video generation and **[OnlyChili Cinema](https://onlychili.aichili.ai)** creator monetization.

- **Single-binary \`npx\` ready** — \`npx -y @aichili/mcp\` launches \`aichili-mcp\` over stdio with zero extra flags and zero external npm dependencies.
- **Companion CLI** — install or run the full CLI via [\`aichili\` on npm](https://www.npmjs.com/package/aichili) (\`npx -y aichili models\`) or Homebrew (\`brew install AI-Chili/tap/aichili\`).
- **Remote HTTP MCP option** — connect directly to \`https://aichili.ai/mcp\` (Streamable HTTP) with zero local install.

## Quickstart (\`npx -y @aichili/mcp\`)

\`\`\`bash
AICHILI_API_KEY="chili_sk_..." npx -y @aichili/mcp
\`\`\`

Add to \`.mcp.json\` or \`claude_desktop_config.json\`:

\`\`\`json
{
  "mcpServers": {
    "aichili": {
      "command": "npx",
      "args": ["-y", "@aichili/mcp"],
      "env": {
        "AICHILI_API_KEY": "chili_sk_your_key_here"
      }
    }
  }
}
\`\`\`

> \`platform_overview\`, \`list_video_models\`, and \`estimate_video_cost\` work without an API key. Set \`AICHILI_API_KEY\` (\`chili_sk_...\`) from [https://aichili.ai/developers](https://aichili.ai/developers) for \`get_credit_balance\`, \`plan_video_generation\`, \`create_video_generation\`, and \`get_video_generation\`.

## Included MCP Tools

| Tool | Auth | Description |
|---|---|---|
| \`platform_overview\` | Public | Canonical metadata, endpoints, 5-model table, PAYG credit packs, and OnlyChili Cinema revenue share |
| \`list_video_models\` | Public | Live capabilities, workflows, durations, ratios, and pricing rules from \`GET /v1/registry\` |
| \`estimate_video_cost\` | Public | Deterministic PAYG credit calculator + recommended pack + OnlyChili \`80%\` creator net earnings |
| \`get_credit_balance\` | \`chili_sk_*\` | Current credit balance, plan, and PAYG unlock status via \`GET /v1/credits\` |
| \`plan_video_generation\` | \`chili_sk_*\` | Server-side dry-run quote (\`POST /v1/generations/plan\`) — validates & prices with zero charge |
| \`create_video_generation\` | \`chili_sk_*\` | Enqueue video or talking-avatar generation (\`POST /v1/generations\`) with optional \`idempotency_key\` |
| \`get_video_generation\` | \`chili_sk_*\` | Poll job status, segment progress, and output asset via \`GET /v1/generations/{job_id}\` |

## Official Links

- **AI Chili Studio**: [https://aichili.ai](https://aichili.ai)
- **Developer Docs & API Reference**: [https://aichili.ai/developers](https://aichili.ai/developers)
- **CLI Package (\`aichili\`)**: [https://www.npmjs.com/package/aichili](https://www.npmjs.com/package/aichili)
- **GitHub Repository**: [https://github.com/AI-Chili/aichili](https://github.com/AI-Chili/aichili)
- **OnlyChili Cinema**: [https://onlychili.aichili.ai](https://onlychili.aichili.ai)

## License

MIT — Copyright (c) 2026 AI Chili Inc.
`;
}

const SYNC_TARGETS = [
  {
    relDest: "bin/aichili-mcp.mjs",
    content: readFileSync(path.join(ROOT_DIR, "bin", "aichili-mcp.mjs"), "utf8"),
    executable: true
  },
  {
    relDest: "src/client.mjs",
    content: readFileSync(path.join(ROOT_DIR, "src", "client.mjs"), "utf8"),
    executable: false
  },
  {
    relDest: "src/mcp.mjs",
    content: readFileSync(path.join(ROOT_DIR, "src", "mcp.mjs"), "utf8"),
    executable: false
  },
  {
    relDest: "SKILL.md",
    content: readFileSync(path.join(ROOT_DIR, "SKILL.md"), "utf8"),
    executable: false
  },
  {
    relDest: "LICENSE",
    content: readFileSync(path.join(ROOT_DIR, "LICENSE"), "utf8"),
    executable: false
  },
  {
    relDest: "README.md",
    content: buildMcpReadme(rootPkg.version),
    executable: false
  }
];

const drifted = [];

if (mcpPkg.version !== rootPkg.version) {
  drifted.push(`packages/mcp/package.json version (${mcpPkg.version} !== ${rootPkg.version})`);
}

for (const target of SYNC_TARGETS) {
  const destPath = path.join(MCP_PKG_DIR, target.relDest);
  const current = existsSync(destPath) ? readFileSync(destPath, "utf8") : null;
  if (current !== target.content) {
    if (checkOnly) {
      drifted.push(`packages/mcp/${target.relDest}`);
    } else {
      mkdirSync(path.dirname(destPath), { recursive: true });
      writeFileSync(destPath, target.content, "utf8");
      if (target.executable) {
        chmodSync(destPath, 0o755);
      }
    }
  } else if (!checkOnly && target.executable) {
    chmodSync(destPath, 0o755);
  }
}

if (checkOnly) {
  if (drifted.length > 0) {
    process.stderr.write(`Sync drift detected in @aichili/mcp:\n  - ${drifted.join("\n  - ")}\nRun 'npm run sync:mcp' to synchronize.\n`);
    process.exit(1);
  }
  process.stdout.write("packages/mcp is in sync with root sources.\n");
} else {
  if (drifted.length > 0) {
    process.stderr.write(`Warning:\n  - ${drifted.join("\n  - ")}\n`);
    process.exit(1);
  }
  process.stdout.write(`Synchronized ${SYNC_TARGETS.length} files into packages/mcp (v${rootPkg.version}).\n`);
}
