#!/usr/bin/env node
import {
  AiChiliError,
  VERSION,
  createGeneration,
  estimateCost,
  getCredits,
  getGeneration,
  listModels,
  planGeneration,
  waitForGeneration
} from "../src/client.mjs";
import { startMcpStdioServer } from "../src/mcp.mjs";

const HELP_TEXT = `AI Chili Official CLI (@aichili/mcp v${VERSION})
https://aichili.ai | https://aichili.ai/developers

Usage:
  aichili <command> [options]

Commands:
  models [--scope available|console] [--json]
  estimate [--seconds 90] [--resolution 768p] [--model h3-vdn] [--script-units N] [--free-used]
           [--subscribers N] [--sub-price 9.99] [--ppv-count N] [--ppv-price 4.99] [--json]
  credits [--api-key chili_sk_...] [--json]
  plan --model <id> --mode <t2v|i2v|t2i|i2i> --prompt "..." [--duration 15] [--resolution 768p]
       [--ratio 16:9] [--workflow general] [--seed N] [--upscale-4k] [--no-optimize-prompt] [--json]
  generate --model <id> --mode <t2v|i2v|t2i|i2i> --prompt "..." [--duration 15] [--resolution 768p]
           [--ratio 16:9] [--workflow general] [--idempotency-key <key>] [--wait] [--json]
  status <job_id> [--api-key chili_sk_...] [--json]
  mcp

Global Flags:
  --api-key <key>     Override AICHILI_API_KEY (must start with chili_sk_)
  --base-url <url>    Override AICHILI_API_BASE (default: https://videoapi.aichili.ai)
  --json              Emit machine-readable JSON on stdout/stderr
  -h, --help          Show help
  -v, --version       Show CLI version
`;

const VALUE_FLAGS = new Set([
  "--scope",
  "--seconds",
  "--resolution",
  "--model",
  "--mode",
  "--prompt",
  "--duration",
  "--ratio",
  "--workflow",
  "--seed",
  "--script-units",
  "--subscribers",
  "--sub-price",
  "--ppv-count",
  "--ppv-price",
  "--idempotency-key",
  "--ref-asset",
  "--ref-role",
  "--poll-interval-ms",
  "--timeout-ms",
  "--api-key",
  "--base-url"
]);

const BOOLEAN_FLAGS = new Set([
  "--json",
  "--help",
  "-h",
  "--version",
  "-v",
  "--wait",
  "--free-used",
  "--upscale-4k",
  "--no-optimize-prompt"
]);

function parseCliArgs(argv) {
  const flags = {};
  const positionals = [];
  const multiFlags = { "--ref-asset": [], "--ref-role": [] };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith("-")) {
      const eqIndex = token.indexOf("=");
      const key = eqIndex === -1 ? token : token.slice(0, eqIndex);
      const inlineValue = eqIndex === -1 ? undefined : token.slice(eqIndex + 1);

      if (BOOLEAN_FLAGS.has(key)) {
        if (inlineValue !== undefined) {
          throw new AiChiliError("INVALID_ARGS", `Boolean flag '${key}' does not accept a value.`);
        }
        flags[key] = true;
        continue;
      }

      if (VALUE_FLAGS.has(key)) {
        const nextVal = inlineValue !== undefined ? inlineValue : argv[++i];
        if (nextVal === undefined || (inlineValue === undefined && nextVal.startsWith("-"))) {
          throw new AiChiliError("INVALID_ARGS", `Flag '${key}' requires a value.`);
        }
        if (key in multiFlags) {
          multiFlags[key].push(nextVal);
        } else {
          flags[key] = nextVal;
        }
        continue;
      }

      throw new AiChiliError("INVALID_ARGS", `Unknown flag '${key}'. Run 'aichili --help' for usage.`);
    }
    positionals.push(token);
  }

  return { flags, multiFlags, positionals };
}

function parseOptionalInt(raw, flagName) {
  if (raw === undefined) return undefined;
  const num = Number(raw);
  if (!Number.isInteger(num)) {
    throw new AiChiliError("INVALID_ARGS", `Flag '${flagName}' must be an integer (received '${raw}').`);
  }
  return num;
}

function parseOptionalNumber(raw, flagName) {
  if (raw === undefined) return undefined;
  const num = Number(raw);
  if (!Number.isFinite(num)) {
    throw new AiChiliError("INVALID_ARGS", `Flag '${flagName}' must be a valid number (received '${raw}').`);
  }
  return num;
}

function buildGenerationRequestFromFlags(flags, multiFlags) {
  const modelId = flags["--model"];
  const mode = flags["--mode"];
  const prompt = flags["--prompt"];
  if (!modelId || !mode || prompt === undefined) {
    throw new AiChiliError(
      "INVALID_ARGS",
      "Missing required flags: --model <id>, --mode <t2v|i2v|t2i|i2i>, and --prompt \"...\" are required."
    );
  }

  const params = { prompt };
  const duration = parseOptionalInt(flags["--duration"], "--duration");
  if (duration !== undefined) params.duration_s = duration;
  if (flags["--resolution"] !== undefined) params.resolution = flags["--resolution"];
  if (flags["--ratio"] !== undefined) params.ratio = flags["--ratio"];
  const seed = parseOptionalInt(flags["--seed"], "--seed");
  if (seed !== undefined) params.seed = seed;
  if (multiFlags["--ref-asset"].length > 0) params.ref_asset_ids = multiFlags["--ref-asset"];
  if (multiFlags["--ref-role"].length > 0) params.ref_roles = multiFlags["--ref-role"];

  return {
    apiKey: flags["--api-key"],
    baseUrl: flags["--base-url"],
    mode,
    modelId,
    params,
    workflow: flags["--workflow"],
    upscale4k: flags["--upscale-4k"] ? true : undefined,
    optimizePrompt: flags["--no-optimize-prompt"] ? false : undefined,
    idempotencyKey: flags["--idempotency-key"]
  };
}

function printOutput(data, jsonMode, humanFormatter) {
  if (jsonMode) {
    process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
  } else {
    process.stdout.write(`${humanFormatter(data)}\n`);
  }
}

function printError(err, jsonMode) {
  const payload =
    err instanceof AiChiliError
      ? { code: err.code, message: err.message, status: err.status }
      : { code: "CLI_ERROR", message: err instanceof Error ? err.message : String(err), status: null };
  if (jsonMode) {
    process.stderr.write(`${JSON.stringify({ error: payload })}\n`);
  } else {
    const statusSuffix = payload.status ? ` (HTTP ${payload.status})` : "";
    process.stderr.write(`[ERROR] ${payload.code}${statusSuffix}: ${payload.message}\n`);
  }
}

async function main(argv) {
  const wantsJsonEarly = argv.includes("--json");
  try {
    const { flags, multiFlags, positionals } = parseCliArgs(argv);
    const jsonMode = Boolean(flags["--json"]);

    if (flags["--version"] || flags["-v"]) {
      printOutput({ name: "@aichili/mcp", version: VERSION }, jsonMode, () => VERSION);
      return;
    }

    if (flags["--help"] || flags["-h"] || positionals.length === 0) {
      if (positionals.length === 0 && !flags["--help"] && !flags["-h"]) {
        throw new AiChiliError("INVALID_ARGS", "No command specified. Run 'aichili --help' for usage.");
      }
      process.stdout.write(HELP_TEXT);
      return;
    }

    const [command, ...rest] = positionals;

    if (command === "mcp" || command === "aichili-mcp") {
      startMcpStdioServer({ baseUrl: flags["--base-url"] });
      return;
    }

    switch (command) {
      case "models": {
        const result = await listModels({
          scope: flags["--scope"],
          baseUrl: flags["--base-url"]
        });
        printOutput(result, jsonMode, (res) => {
          const models = Array.isArray(res?.models) ? res.models : [];
          const lines = [`Live AI Chili Models (${models.length}):`];
          for (const m of models) {
            const durRange = `${m.single_call_durations_min ?? "?"}-${m.single_call_durations_max ?? "?"}s`;
            const modes = Array.from(
              new Set((m.workflows || []).flatMap((w) => w.modes || []))
            ).join(",");
            lines.push(`  - ${m.model_id} (${m.display_name}) | provider=${m.provider} | ${durRange} | modes=${modes}`);
          }
          return lines.join("\n");
        });
        return;
      }

      case "estimate": {
        const result = estimateCost({
          seconds: parseOptionalNumber(flags["--seconds"], "--seconds") ?? 15,
          resolution: flags["--resolution"] ?? "768p",
          modelId: flags["--model"] ?? "h3-vdn",
          scriptUnits: parseOptionalNumber(flags["--script-units"], "--script-units"),
          freeSignupCreditsUsed: Boolean(flags["--free-used"]),
          subscribers: parseOptionalNumber(flags["--subscribers"], "--subscribers") ?? 0,
          subPrice: parseOptionalNumber(flags["--sub-price"], "--sub-price") ?? 9.99,
          ppvCount: parseOptionalNumber(flags["--ppv-count"], "--ppv-count") ?? 0,
          ppvPrice: parseOptionalNumber(flags["--ppv-price"], "--ppv-price") ?? 4.99
        });
        printOutput(result, jsonMode, (est) => {
          const lines = [
            `AI Chili Cost Estimate (${est.rateBasis.modelId}):`,
            `  Total Credits:        ${est.totalCredits}`,
            `  Free Sign-Up Applied: -${est.freeCreditsApplied} (25 free sign-up credits)`,
            `  Billable Credits:     ${est.billableCredits}`,
            `  Studio Effective USD: $${est.effectiveUsdAtStudioRate.toFixed(2)} ($49.90 / 780 cr)`,
            `  Recommended Pack:     ${est.recommendedPack.name} ($${est.recommendedPack.checkoutSpendUsd.toFixed(2)})`
          ];
          if (est.onlyChiliProjection.grossRevenueUsd > 0) {
            lines.push(
              `  OnlyChili 80% Net:    $${est.onlyChiliProjection.creatorNetRevenueUsd.toFixed(2)} (across ${est.onlyChiliProjection.languagesSupported} languages)`
            );
          }
          return lines.join("\n");
        });
        return;
      }

      case "credits": {
        const result = await getCredits({
          apiKey: flags["--api-key"],
          baseUrl: flags["--base-url"]
        });
        printOutput(result, jsonMode, (cr) =>
          `Balance: ${cr.balance} credits | Plan: ${cr.plan ?? "free"} | PAYG Unlocked: ${Boolean(cr.payg_unlocked)}`
        );
        return;
      }

      case "plan": {
        const req = buildGenerationRequestFromFlags(flags, multiFlags);
        const result = await planGeneration(req);
        printOutput(
          result,
          jsonMode,
          (plan) =>
            `Plan Quote: ${plan.total_credits} credits | ${plan.total_duration_s}s across ${plan.segments} segment(s)${plan.estimated ? " (estimated)" : ""}`
        );
        return;
      }

      case "generate": {
        const req = buildGenerationRequestFromFlags(flags, multiFlags);
        let job = await createGeneration(req);
        if (flags["--wait"]) {
          job = await waitForGeneration({
            apiKey: req.apiKey,
            jobId: job.id,
            intervalMs: parseOptionalInt(flags["--poll-interval-ms"], "--poll-interval-ms") ?? 3000,
            timeoutMs: parseOptionalInt(flags["--timeout-ms"], "--timeout-ms") ?? 600000,
            baseUrl: req.baseUrl
          });
        }
        printOutput(
          job,
          jsonMode,
          (j) =>
            `Generation ${j.id}: status=${j.status} | model=${j.model_id} | credits=${j.credits_cost}`
        );
        if (flags["--wait"] && ["failed", "cancelled", "canceled"].includes(String(job?.status).toLowerCase())) {
          process.exitCode = 1;
        }
        return;
      }

      case "status": {
        if (rest.length !== 1) {
          throw new AiChiliError("INVALID_ARGS", "Usage: aichili status <job_id> [--json]");
        }
        const job = await getGeneration({
          apiKey: flags["--api-key"],
          jobId: rest[0],
          baseUrl: flags["--base-url"]
        });
        printOutput(
          job,
          jsonMode,
          (j) =>
            `Generation ${j.id}: status=${j.status} | model=${j.model_id} | credits=${j.credits_cost}`
        );
        return;
      }

      default:
        throw new AiChiliError(
          "UNKNOWN_COMMAND",
          `Unknown command '${command}'. Run 'aichili --help' for usage.`
        );
    }
  } catch (err) {
    printError(err, wantsJsonEarly);
    process.exitCode = 1;
  }
}

await main(process.argv.slice(2));
