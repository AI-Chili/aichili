import readline from "node:readline";
import {
  AiChiliError,
  VERSION,
  createGeneration,
  estimateCost,
  getCredits,
  getGeneration,
  getPlatformOverview,
  listModels,
  planGeneration
} from "./client.mjs";

const SUPPORTED_PROTOCOL_VERSIONS = new Set([
  "2025-11-25",
  "2025-06-18",
  "2025-03-26",
  "2024-11-05"
]);
const DEFAULT_PROTOCOL_VERSION = "2025-06-18";

export const MCP_TOOLS = Object.freeze([
  {
    name: "platform_overview",
    title: "AI Chili & OnlyChili Platform Overview",
    description:
      "Return canonical metadata for AI Chili Studio & API, the 5 public video/avatar models, PAYG credit packs, API docs URLs, and OnlyChili Cinema creator monetization terms.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  {
    name: "list_video_models",
    title: "List Live AI Chili Video & Avatar Models",
    description:
      "Fetch live capabilities, durations, resolutions, aspect ratios, and credit pricing rules from GET /v1/registry on videoapi.aichili.ai.",
    inputSchema: {
      type: "object",
      properties: {
        scope: {
          type: "string",
          enum: ["available", "console"],
          description: "Optional registry scope ('available' default or 'console')."
        }
      },
      additionalProperties: false
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  {
    name: "estimate_video_cost",
    title: "Estimate AI Chili PAYG Credits & OnlyChili Creator Earnings",
    description:
      "Deterministically calculate PAYG credit usage, recommended credit packs ($0 Free 25 cr, $9.90 Starter 150 cr, $29.90 Creator 460 cr, $49.90 Studio & API 780 cr), and optional OnlyChili Cinema 80% net creator revenue share.",
    inputSchema: {
      type: "object",
      properties: {
        seconds: {
          type: "number",
          description: "Target total video duration in seconds (default 15)."
        },
        resolution: {
          type: "string",
          enum: ["480p", "768p", "1080p", "2k"],
          description: "Output resolution for h3-vdn rate estimation (default '768p')."
        },
        model_id: {
          type: "string",
          enum: ["h3-vdn", "h3-sol", "avatar-talk"],
          description: "Model ID ('h3-vdn' / 'h3-sol' default, or 'avatar-talk')."
        },
        workflow: {
          type: "string",
          enum: ["talk", "photo"],
          description: "For avatar-talk: 'photo' adds +10 base-clip credits; 'talk' adds 0."
        },
        script_units: {
          type: "number",
          description: "Script units for avatar-talk (billed at 0.2 credits per 5 script units, plus +10 on workflow 'photo')."
        },
        free_signup_credits_used: {
          type: "boolean",
          description: "Set true if the 25 free sign-up credits have already been spent."
        },
        subscribers: {
          type: "number",
          description: "Projected OnlyChili Cinema monthly subscribers."
        },
        sub_price: {
          type: "number",
          description: "OnlyChili monthly membership price in USD ($2.99-$99.99)."
        },
        sub_price_usd: {
          type: "number",
          description: "Alias for sub_price (monthly membership price in USD)."
        },
        ppv_count: {
          type: "number",
          description: "Projected OnlyChili pay-per-view unlocks."
        },
        ppv_unlocks: {
          type: "number",
          description: "Alias for ppv_count (monthly PPV episode unlocks)."
        },
        ppv_price: {
          type: "number",
          description: "OnlyChili PPV unlock price in USD ($0.99-$500.00)."
        },
        ppv_price_usd: {
          type: "number",
          description: "Alias for ppv_price (PPV unlock price in USD)."
        }
      },
      additionalProperties: false
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  {
    name: "get_credit_balance",
    title: "Get AI Chili Credit Wallet Balance",
    description:
      "Fetch live credit wallet balance, daily grant status, and PAYG tier state via GET /v1/credits. Requires chili_sk_... API key.",
    inputSchema: {
      type: "object",
      properties: {
        api_key: {
          type: "string",
          description: "Optional AI Chili API key (chili_sk_...). Defaults to AICHILI_API_KEY env var."
        }
      },
      additionalProperties: false
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  {
    name: "plan_video_generation",
    title: "Dry-Run & Price a Video Generation Plan",
    description:
      "Validate parameters and quote exact segment count, duration, and total credits via POST /v1/generations/plan without charging credits or enqueueing a job.",
    inputSchema: {
      type: "object",
      required: ["mode", "model_id"],
      properties: {
        mode: {
          type: "string",
          enum: ["t2v", "i2v", "t2i", "i2i"],
          description: "Generation mode (e.g. 't2v' or 'i2v')."
        },
        model_id: {
          type: "string",
          description: "Model ID (e.g. 'h3-vdn', 'wan3.0-video', 'seedance-2.5', 'minimax-h3-gmi', 'avatar-talk')."
        },
        prompt: {
          type: "string",
          description: "Scene, motion, camera, and audio prompt."
        },
        duration_s: {
          type: "integer",
          description: "Requested duration in seconds."
        },
        resolution: {
          type: "string",
          description: "Output resolution matching the selected model's registry entry."
        },
        ratio: {
          type: "string",
          description: "Aspect ratio (e.g. '16:9', '9:16', '1:1', '3:4', '4:3', '21:9')."
        },
        workflow: {
          type: "string",
          description: "Optional model workflow ID (e.g. 'general', 'reference', 'photo', 'talk')."
        },
        ref_asset_ids: {
          type: "array",
          items: { type: "string" },
          description: "Optional uploaded reference image/video asset UUIDs for i2v."
        },
        ref_roles: {
          type: "array",
          items: { type: "string" },
          description: "Optional roles matching ref_asset_ids (reference_image, reference_video, first_frame, last_frame)."
        },
        params: {
          type: "object",
          description: "Optional raw GenerationParamsIn object (merged with top-level prompt/duration_s/resolution/ratio)."
        },
        upscale_4k: {
          type: "boolean",
          description: "Include 4K upscale in the dry-run quote."
        },
        optimize_prompt: {
          type: "boolean",
          description: "Enable prompt optimization (default true on server)."
        },
        api_key: {
          type: "string",
          description: "Optional AI Chili API key (chili_sk_...). Defaults to AICHILI_API_KEY env var."
        }
      },
      additionalProperties: false
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  },
  {
    name: "create_video_generation",
    title: "Submit an AI Chili Video or Avatar Generation",
    description:
      "Validate, charge credits, and enqueue a video or talking-avatar generation job via POST /v1/generations. Supports idempotency_key for safe retries.",
    inputSchema: {
      type: "object",
      required: ["mode", "model_id"],
      properties: {
        mode: {
          type: "string",
          enum: ["t2v", "i2v", "t2i", "i2i"],
          description: "Generation mode (e.g. 't2v' or 'i2v')."
        },
        model_id: {
          type: "string",
          description: "Model ID (e.g. 'h3-vdn', 'wan3.0-video', 'seedance-2.5', 'minimax-h3-gmi', 'avatar-talk')."
        },
        prompt: {
          type: "string",
          description: "Scene, motion, camera, and audio prompt."
        },
        duration_s: {
          type: "integer",
          description: "Requested duration in seconds."
        },
        resolution: {
          type: "string",
          description: "Output resolution matching the selected model's registry entry."
        },
        ratio: {
          type: "string",
          description: "Aspect ratio (e.g. '16:9', '9:16', '1:1', '3:4', '4:3', '21:9')."
        },
        workflow: {
          type: "string",
          description: "Optional model workflow ID (e.g. 'general', 'reference', 'photo', 'talk')."
        },
        ref_asset_ids: {
          type: "array",
          items: { type: "string" },
          description: "Optional uploaded reference image/video asset UUIDs for i2v."
        },
        ref_roles: {
          type: "array",
          items: { type: "string" },
          description: "Optional roles matching ref_asset_ids (reference_image, reference_video, first_frame, last_frame)."
        },
        params: {
          type: "object",
          description: "Optional raw GenerationParamsIn object (merged with top-level prompt/duration_s/resolution/ratio)."
        },
        upscale_4k: {
          type: "boolean",
          description: "Request 4K upscale on output."
        },
        optimize_prompt: {
          type: "boolean",
          description: "Enable prompt optimization."
        },
        idempotency_key: {
          type: "string",
          description: "Optional idempotency key so retries return the original job without double charging."
        },
        api_key: {
          type: "string",
          description: "Optional AI Chili API key (chili_sk_...). Defaults to AICHILI_API_KEY env var."
        }
      },
      additionalProperties: false
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true
    }
  },
  {
    name: "get_video_generation",
    title: "Get AI Chili Generation Job Status & Output",
    description:
      "Poll job status, segment progress, credit cost, and output asset metadata via GET /v1/generations/{job_id}.",
    inputSchema: {
      type: "object",
      required: ["job_id"],
      properties: {
        job_id: {
          type: "string",
          description: "Generation job UUID returned by create_video_generation."
        },
        api_key: {
          type: "string",
          description: "Optional AI Chili API key (chili_sk_...). Defaults to AICHILI_API_KEY env var."
        }
      },
      additionalProperties: false
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    }
  }
]);

function mergeGenerationParams(args) {
  const base =
    args.params && typeof args.params === "object" && !Array.isArray(args.params)
      ? { ...args.params }
      : {};
  if (args.prompt !== undefined) base.prompt = args.prompt;
  if (args.duration_s !== undefined) base.duration_s = args.duration_s;
  if (args.resolution !== undefined) base.resolution = args.resolution;
  if (args.ratio !== undefined) base.ratio = args.ratio;
  if (Array.isArray(args.ref_asset_ids) && args.ref_asset_ids.length > 0) {
    base.ref_asset_ids = args.ref_asset_ids;
  }
  if (Array.isArray(args.ref_roles) && args.ref_roles.length > 0) {
    base.ref_roles = args.ref_roles;
  }
  return base;
}

function formatToolSuccess(payload) {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
    isError: false
  };
}

function formatToolError(err) {
  const errorPayload =
    err instanceof AiChiliError
      ? { code: err.code, message: err.message, status: err.status, details: err.details }
      : { code: "TOOL_EXECUTION_ERROR", message: err instanceof Error ? err.message : String(err) };
  return {
    content: [{ type: "text", text: JSON.stringify({ error: errorPayload }, null, 2) }],
    isError: true
  };
}

async function dispatchToolCall(params, { baseUrl, fetchImpl } = {}) {
  if (!params || typeof params !== "object" || typeof params.name !== "string") {
    return formatToolError(new AiChiliError("INVALID_TOOL_CALL", "Tool call requires a string 'name'."));
  }
  const args =
    params.arguments && typeof params.arguments === "object" && !Array.isArray(params.arguments)
      ? params.arguments
      : {};

  try {
    switch (params.name) {
      case "platform_overview":
        return formatToolSuccess(getPlatformOverview());

      case "list_video_models":
        return formatToolSuccess(await listModels({ scope: args.scope, baseUrl, fetchImpl }));

      case "estimate_video_cost":
        return formatToolSuccess(
          estimateCost({
            seconds: args.seconds,
            resolution: args.resolution,
            modelId: args.model_id ?? args.modelId,
            workflow: args.workflow,
            scriptUnits: args.script_units ?? args.scriptUnits,
            freeSignupCreditsUsed: args.free_signup_credits_used ?? args.freeSignupCreditsUsed,
            subscribers: args.subscribers,
            subPrice: args.sub_price ?? args.sub_price_usd ?? args.subPrice,
            ppvCount: args.ppv_count ?? args.ppv_unlocks ?? args.ppvCount,
            ppvPrice: args.ppv_price ?? args.ppv_price_usd ?? args.ppvPrice
          })
        );

      case "get_credit_balance":
        return formatToolSuccess(
          await getCredits({ apiKey: args.api_key ?? args.apiKey, baseUrl, fetchImpl })
        );

      case "plan_video_generation":
        return formatToolSuccess(
          await planGeneration({
            apiKey: args.api_key ?? args.apiKey,
            mode: args.mode,
            modelId: args.model_id ?? args.modelId,
            params: mergeGenerationParams(args),
            workflow: args.workflow,
            upscale4k: args.upscale_4k,
            optimizePrompt: args.optimize_prompt,
            baseUrl,
            fetchImpl
          })
        );

      case "create_video_generation":
        return formatToolSuccess(
          await createGeneration({
            apiKey: args.api_key ?? args.apiKey,
            mode: args.mode,
            modelId: args.model_id ?? args.modelId,
            params: mergeGenerationParams(args),
            workflow: args.workflow,
            upscale4k: args.upscale_4k,
            optimizePrompt: args.optimize_prompt,
            idempotencyKey: args.idempotency_key ?? args.idempotencyKey,
            baseUrl,
            fetchImpl
          })
        );

      case "get_video_generation":
        return formatToolSuccess(
          await getGeneration({
            apiKey: args.api_key ?? args.apiKey,
            jobId: args.job_id ?? args.jobId,
            baseUrl,
            fetchImpl
          })
        );

      default:
        return formatToolError(
          new AiChiliError("UNKNOWN_TOOL", `Unknown MCP tool '${params.name}'.`)
        );
    }
  } catch (err) {
    return formatToolError(err);
  }
}

export async function handleJsonRpcMessage(message, options = {}) {
  if (!message || typeof message !== "object" || Array.isArray(message) || message.jsonrpc !== "2.0") {
    return {
      jsonrpc: "2.0",
      id: message && typeof message === "object" && "id" in message ? message.id : null,
      error: { code: -32600, message: "Invalid JSON-RPC 2.0 request." }
    };
  }

  const hasId = Object.prototype.hasOwnProperty.call(message, "id") && message.id !== undefined;
  const { method, params } = message;

  // JSON-RPC 2.0 notifications (such as notifications/initialized) must never emit a response frame.
  if (!hasId) {
    return null;
  }

  switch (method) {
    case "initialize": {
      const requestedVersion =
        params && typeof params === "object" && typeof params.protocolVersion === "string"
          ? params.protocolVersion
          : DEFAULT_PROTOCOL_VERSION;
      const protocolVersion = SUPPORTED_PROTOCOL_VERSIONS.has(requestedVersion)
        ? requestedVersion
        : DEFAULT_PROTOCOL_VERSION;
      return {
        jsonrpc: "2.0",
        id: message.id,
        result: {
          protocolVersion,
          capabilities: {
            tools: { listChanged: false }
          },
          serverInfo: {
            name: "io.github.AI-Chili/aichili",
            title: "AI Chili Video Generation Studio & API",
            version: VERSION
          },
          instructions:
            "Inspect live AI Chili video/avatar models, estimate PAYG credits & OnlyChili Cinema creator earnings, dry-run generation quotes, submit jobs, and poll status. Set AICHILI_API_KEY (chili_sk_...) for authenticated endpoints."
        }
      };
    }

    case "ping":
      return { jsonrpc: "2.0", id: message.id, result: {} };

    case "tools/list":
      return { jsonrpc: "2.0", id: message.id, result: { tools: MCP_TOOLS } };

    case "tools/call": {
      const result = await dispatchToolCall(params, options);
      return { jsonrpc: "2.0", id: message.id, result };
    }

    default:
      return {
        jsonrpc: "2.0",
        id: message.id,
        error: { code: -32601, message: `Method not found: ${String(method)}` }
      };
  }
}

export function startMcpStdioServer({
  input = process.stdin,
  output = process.stdout,
  baseUrl,
  fetchImpl
} = {}) {
  const rl = readline.createInterface({ input, crlfDelay: Infinity });
  let pending = Promise.resolve();

  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    pending = pending.then(async () => {
      let parsed;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        output.write(
          `${JSON.stringify({
            jsonrpc: "2.0",
            id: null,
            error: { code: -32700, message: "Parse error: invalid JSON" }
          })}\n`
        );
        return;
      }

      if (Array.isArray(parsed)) {
        const responses = [];
        for (const item of parsed) {
          const res = await handleJsonRpcMessage(item, { baseUrl, fetchImpl });
          if (res !== null) responses.push(res);
        }
        if (responses.length > 0) {
          output.write(`${JSON.stringify(responses)}\n`);
        }
        return;
      }

      const response = await handleJsonRpcMessage(parsed, { baseUrl, fetchImpl });
      if (response !== null) {
        output.write(`${JSON.stringify(response)}\n`);
      }
    });
  });

  return rl;
}
