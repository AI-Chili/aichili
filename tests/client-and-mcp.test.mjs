import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  AiChiliError,
  CREDIT_PACKS,
  FREE_SIGNUP_CREDITS,
  H3_VDN_RATES_PER_SECOND,
  ONLYCHILI_CINEMA,
  USER_AGENT,
  VERSION,
  createGeneration,
  estimateCost,
  getCredits,
  getGeneration,
  listModels,
  planGeneration
} from "../src/client.mjs";
import { handleJsonRpcMessage } from "../src/mcp.mjs";

const execFileAsync = promisify(execFile);
const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI_PATH = path.join(ROOT_DIR, "bin", "aichili.mjs");
const MCP_BIN_PATH = path.join(ROOT_DIR, "bin", "aichili-mcp.mjs");

function readJson(relPath) {
  return JSON.parse(readFileSync(path.join(ROOT_DIR, relPath), "utf8"));
}

test("SSOT constants and estimateCost cover PAYG packs, h3-vdn, avatar-talk, and OnlyChili 80% share", () => {
  assert.equal(FREE_SIGNUP_CREDITS, 25);
  assert.deepEqual(
    CREDIT_PACKS.map((p) => [p.id, p.priceUsd, p.credits]),
    [
      ["free-signup", 0, 25],
      ["starter", 9.9, 150],
      ["creator", 29.9, 460],
      ["studio-api", 49.9, 780]
    ]
  );
  assert.deepEqual(H3_VDN_RATES_PER_SECOND, {
    "480p": 0.6,
    "768p": 1.0,
    "1080p": 1.8,
    "2k": 2.5
  });
  assert.equal(ONLYCHILI_CINEMA.creatorNetRevenueSharePct, 80);
  assert.equal(ONLYCHILI_CINEMA.languagesSupported, 47);

  const vdnEstimate = estimateCost({
    seconds: 90,
    resolution: "768p",
    freeSignupCreditsUsed: false,
    subscribers: 10,
    subPrice: 9.99,
    ppvCount: 5,
    ppvPrice: 4.99
  });
  assert.equal(vdnEstimate.totalCredits, 90);
  assert.equal(vdnEstimate.freeCreditsApplied, 25);
  assert.equal(vdnEstimate.billableCredits, 65);
  assert.equal(vdnEstimate.recommendedPack.id, "starter");
  assert.equal(vdnEstimate.onlyChiliProjection.grossRevenueUsd, 124.85);
  assert.equal(vdnEstimate.onlyChiliProjection.creatorNetRevenueUsd, 99.88);

  const avatarEstimate = estimateCost({
    modelId: "avatar-talk",
    scriptUnits: 23,
    freeSignupCreditsUsed: true
  });
  assert.equal(avatarEstimate.totalCredits, 1);
  assert.equal(avatarEstimate.billableCredits, 1);

  assert.throws(
    () => estimateCost({ seconds: 15, resolution: "8k" }),
    (err) => err instanceof AiChiliError && err.code === "INVALID_RESOLUTION"
  );
  assert.throws(
    () => estimateCost({ seconds: 15, subscribers: 5, subPrice: 1.5 }),
    (err) => err instanceof AiChiliError && err.code === "INVALID_SUB_PRICE"
  );
});

test("API client rejects malformed chili_sk_ keys and path traversal jobIds before touching network", async () => {
  let networkCalls = 0;
  const mockFetch = async (url, init) => {
    networkCalls += 1;
    return new Response(
      JSON.stringify({
        id: "550e8400-e29b-41d4-a716-446655440000",
        mode: "t2v",
        model_id: "h3-vdn",
        status: "queued",
        params: { prompt: "test" },
        credits_cost: 15,
        created_at: "2026-11-23T00:00:00Z",
        seenUrl: url,
        seenUa: init.headers["User-Agent"],
        seenAuth: init.headers.Authorization
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  const badKeys = ["", "sk-not-chili-123456789", "chili_sk_short", "chili_sk_has space1234"];
  for (const badKey of badKeys) {
    await assert.rejects(
      () => getCredits({ apiKey: badKey, fetchImpl: mockFetch }),
      (err) => err instanceof AiChiliError && err.code === "INVALID_API_KEY"
    );
    await assert.rejects(
      () =>
        planGeneration({
          apiKey: badKey,
          mode: "t2v",
          modelId: "h3-vdn",
          params: { prompt: "hello", duration_s: 5 },
          fetchImpl: mockFetch
        }),
      (err) => err instanceof AiChiliError && err.code === "INVALID_API_KEY"
    );
  }

  const badJobIds = [
    "",
    "../credits",
    "../../etc/passwd",
    "550e8400/cancel",
    "job..traversal",
    "job?admin=true",
    "job#fragment"
  ];
  for (const badJobId of badJobIds) {
    await assert.rejects(
      () =>
        getGeneration({
          apiKey: "chili_sk_validkey123456",
          jobId: badJobId,
          fetchImpl: mockFetch
        }),
      (err) => err instanceof AiChiliError && err.code === "INVALID_JOB_ID"
    );
  }
  assert.equal(networkCalls, 0);

  const ok = await getGeneration({
    apiKey: "chili_sk_validkey123456",
    jobId: "550e8400-e29b-41d4-a716-446655440000",
    baseUrl: "https://videoapi.aichili.ai/",
    fetchImpl: mockFetch
  });
  assert.equal(networkCalls, 1);
  assert.equal(ok.seenUrl, "https://videoapi.aichili.ai/v1/generations/550e8400-e29b-41d4-a716-446655440000");
  assert.equal(ok.seenUa, USER_AGENT);
  assert.match(ok.seenUa, /^curl\/8\.4\.0 /);
  assert.equal(ok.seenAuth, "Bearer chili_sk_validkey123456");

  const created = await createGeneration({
    apiKey: "chili_sk_validkey123456",
    mode: "t2v",
    modelId: "h3-vdn",
    params: { prompt: "sunset ocean", duration_s: 5, resolution: "768p", ratio: "16:9" },
    fetchImpl: mockFetch
  });
  assert.equal(created.status, "queued");
  assert.equal(networkCalls, 2);
});

test("MCP JSON-RPC handler and stdio binary support initialize, tools/list, estimate_video_cost, and error guards", async () => {
  const initRes = await handleJsonRpcMessage({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1.0" } }
  });
  assert.equal(initRes.result.protocolVersion, "2025-06-18");
  assert.equal(initRes.result.serverInfo.name, "io.github.AI-Chili/aichili");
  assert.equal(initRes.result.serverInfo.version, VERSION);

  const notifRes = await handleJsonRpcMessage({
    jsonrpc: "2.0",
    method: "notifications/initialized"
  });
  assert.equal(notifRes, null);

  const listRes = await handleJsonRpcMessage({ jsonrpc: "2.0", id: 2, method: "tools/list" });
  const toolNames = listRes.result.tools.map((t) => t.name);
  assert.deepEqual(toolNames, [
    "platform_overview",
    "list_video_models",
    "estimate_video_cost",
    "get_credit_balance",
    "plan_video_generation",
    "create_video_generation",
    "get_video_generation"
  ]);

  const estimateRes = await handleJsonRpcMessage({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "estimate_video_cost",
      arguments: { seconds: 15, resolution: "2k", free_signup_credits_used: true }
    }
  });
  assert.equal(estimateRes.result.isError, false);
  assert.equal(estimateRes.result.structuredContent.totalCredits, 37.5);

  const unknownToolRes = await handleJsonRpcMessage({
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: { name: "drop_all_tables", arguments: {} }
  });
  assert.equal(unknownToolRes.result.isError, true);
  assert.match(unknownToolRes.result.content[0].text, /UNKNOWN_TOOL/);

  const traversalToolRes = await handleJsonRpcMessage({
    jsonrpc: "2.0",
    id: 5,
    method: "tools/call",
    params: {
      name: "get_video_generation",
      arguments: { api_key: "chili_sk_validkey123456", job_id: "../credits" }
    }
  });
  assert.equal(traversalToolRes.result.isError, true);
  assert.match(traversalToolRes.result.content[0].text, /INVALID_JOB_ID/);

  const stdioOutput = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [MCP_BIN_PATH], {
      env: { ...process.env, AICHILI_API_KEY: "" },
      stdio: ["pipe", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`MCP stdio exited ${code}: ${stderr}`));
      } else {
        resolve(stdout);
      }
    });

    child.stdin.write(
      `${JSON.stringify({ jsonrpc: "2.0", id: 10, method: "ping" })}\n` +
        `${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n` +
        `${JSON.stringify({
          jsonrpc: "2.0",
          id: 11,
          method: "tools/call",
          params: { name: "get_credit_balance", arguments: {} }
        })}\n`
    );
    child.stdin.end();
  });

  const frames = stdioOutput
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  assert.equal(frames.length, 2);
  assert.deepEqual(frames[0], { jsonrpc: "2.0", id: 10, result: {} });
  assert.equal(frames[1].id, 11);
  assert.equal(frames[1].result.isError, true);
  assert.match(frames[1].result.content[0].text, /INVALID_API_KEY/);
});

test("CLI executable supports --help, --version, estimate --json, and exits non-zero on invalid args or missing key", async () => {
  const helpRun = await execFileAsync(process.execPath, [CLI_PATH, "--help"]);
  assert.match(helpRun.stdout, /AI Chili Official CLI/);

  const verRun = await execFileAsync(process.execPath, [CLI_PATH, "--version"]);
  assert.equal(verRun.stdout.trim(), VERSION);

  const estRun = await execFileAsync(process.execPath, [
    CLI_PATH,
    "estimate",
    "--seconds",
    "90",
    "--resolution",
    "768p",
    "--json"
  ]);
  const estJson = JSON.parse(estRun.stdout);
  assert.equal(estJson.totalCredits, 90);
  assert.equal(estJson.billableCredits, 65);

  await assert.rejects(
    () =>
      execFileAsync(process.execPath, [CLI_PATH, "credits", "--json"], {
        env: { ...process.env, AICHILI_API_KEY: "" }
      }),
    (err) => {
      assert.equal(err.code, 1);
      const parsed = JSON.parse(err.stderr);
      assert.equal(parsed.error.code, "INVALID_API_KEY");
      return true;
    }
  );

  await assert.rejects(
    () => execFileAsync(process.execPath, [CLI_PATH, "--bogus-flag", "--json"]),
    (err) => {
      assert.equal(err.code, 1);
      const parsed = JSON.parse(err.stderr);
      assert.equal(parsed.error.code, "INVALID_ARGS");
      return true;
    }
  );
});

test("All agent registry manifests share version 1.0.0, zero npm deps, valid schemas, and required links", () => {
  const pkg = readJson("package.json");
  const server = readJson("server.json");
  const glama = readJson("glama.json");
  const gemini = readJson("gemini-extension.json");
  const claudePlugin = readJson(".claude-plugin/plugin.json");
  const claudeMarketplace = readJson(".claude-plugin/marketplace.json");
  const cursorPlugin = readJson(".cursor-plugin/plugin.json");

  assert.equal(pkg.name, "@aichili/mcp");
  assert.equal(pkg.version, "1.0.0");
  assert.equal(pkg.mcpName, "io.github.AI-Chili/aichili");
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.devDependencies, undefined);

  assert.equal(server.name, "io.github.AI-Chili/aichili");
  assert.equal(server.version, "1.0.0");
  assert.ok(
    server.description.length <= 100,
    `server.json description must be <= 100 chars (got ${server.description.length})`
  );
  assert.match(server.repository.id, /^[0-9]+$/);
  assert.equal(server.remotes[0].url, "https://aichili.ai/mcp");

  assert.deepEqual(glama.maintainers, ["HongmingWang-Rabbit"]);
  assert.equal(gemini.version, "1.0.0");
  assert.equal(gemini.contextFileName, "SKILL.md");
  assert.equal(claudePlugin.version, "1.0.0");
  assert.equal(claudeMarketplace.plugins[0].version, "1.0.0");
  assert.equal(cursorPlugin.version, "1.0.0");

  const rootSkill = readFileSync(path.join(ROOT_DIR, "SKILL.md"), "utf8");
  const nestedSkill = readFileSync(path.join(ROOT_DIR, "skills", "aichili", "SKILL.md"), "utf8");
  assert.equal(rootSkill, nestedSkill);

  for (const requiredSkillUrl of [
    "https://aichili.ai",
    "https://aichili.ai/developers",
    "https://aichili.ai/openapi.json",
    "https://aichili.ai/mcp",
    "https://aichili.ai/pricing.md",
    "https://onlychili.aichili.ai/mcp"
  ]) {
    assert.ok(rootSkill.includes(requiredSkillUrl), `SKILL.md missing ${requiredSkillUrl}`);
  }

  const readme = readFileSync(path.join(ROOT_DIR, "README.md"), "utf8");
  assert.ok(readme.includes("mcp-name: io.github.AI-Chili/aichili"));
  for (const requiredReadmeUrl of [
    "https://aichili.ai",
    "https://aichili.ai/developers",
    "https://aichili.ai/compare",
    "https://aichili.ai/calculator",
    "https://aichili.ai/for-creators",
    "https://aichili.ai/models",
    "https://onlychili.aichili.ai"
  ]) {
    assert.ok(readme.includes(requiredReadmeUrl), `README.md missing ${requiredReadmeUrl}`);
  }
});

test("Live read-only smoke test against https://videoapi.aichili.ai/v1/registry verifies the 5 public models", async () => {
  const registry = await listModels();
  assert.ok(Array.isArray(registry?.models), "Expected models array from /v1/registry");
  const ids = new Set(registry.models.map((m) => m.model_id));
  for (const expectedId of [
    "h3-vdn",
    "minimax-h3-gmi",
    "wan3.0-video",
    "seedance-2.5",
    "avatar-talk"
  ]) {
    assert.ok(ids.has(expectedId), `Expected live /v1/registry to contain '${expectedId}'`);
  }
});
