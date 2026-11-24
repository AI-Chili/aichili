export const VERSION = "1.0.0";
export const DEFAULT_API_BASE = "https://videoapi.aichili.ai";
// Cloudflare on *.aichili.ai rejects bare language runtime User-Agents with HTTP 403 (error 1010) unless prefixed with curl/browser UA.
export const USER_AGENT = `curl/8.4.0 aichili-mcp/${VERSION}`;

export const FREE_SIGNUP_CREDITS = 25;

export const CREDIT_PACKS = Object.freeze([
  Object.freeze({ id: "free-signup", name: "Free Sign-Up", priceUsd: 0, credits: 25 }),
  Object.freeze({ id: "starter", name: "Starter", priceUsd: 9.9, credits: 150 }),
  Object.freeze({ id: "creator", name: "Creator", priceUsd: 29.9, credits: 460 }),
  Object.freeze({ id: "studio-api", name: "Studio & API", priceUsd: 49.9, credits: 780 })
]);

export const H3_VDN_RATES_PER_SECOND = Object.freeze({
  "480p": 0.6,
  "768p": 1.0,
  "1080p": 1.8,
  "2k": 2.5
});

export const AVATAR_TALK_PRICING = Object.freeze({
  creditsPerBlock: 0.2,
  blockUnits: 5,
  photoBaseClipCredits: 10,
  minDurationSeconds: 3,
  maxDurationSeconds: 300,
  resolutions: Object.freeze(["768p", "source"])
});

export const PUBLIC_MODELS = Object.freeze([
  Object.freeze({
    modelId: "h3-vdn",
    aliases: Object.freeze(["h3-sol"]),
    displayName: "MiniMax H3 · SOL NSFW",
    provider: "comfyui",
    modes: Object.freeze(["t2v", "i2v"]),
    minDurationSeconds: 5,
    maxDurationSeconds: 15,
    resolutions: Object.freeze(["480p", "768p", "1080p", "2k"]),
    audio: true,
    pricingSummary: "0.6 cr/s (480p), 1.0 cr/s (768p), 1.8 cr/s (1080p), 2.5 cr/s (2k), rounded up to whole credits"
  }),
  Object.freeze({
    modelId: "minimax-h3-gmi",
    displayName: "MiniMax H3",
    provider: "gmi",
    modes: Object.freeze(["t2v", "i2v"]),
    minDurationSeconds: 4,
    maxDurationSeconds: 15,
    resolutions: Object.freeze(["768P", "2K"]),
    audio: true,
    pricingSummary: "Live quote via POST /v1/generations/plan"
  }),
  Object.freeze({
    modelId: "wan3.0-video",
    displayName: "Wan 3.0",
    provider: "gmi",
    modes: Object.freeze(["t2v", "i2v"]),
    minDurationSeconds: 2,
    maxDurationSeconds: 30,
    resolutions: Object.freeze(["480P", "720P", "1080P"]),
    audio: true,
    pricingSummary: "Live quote via POST /v1/generations/plan"
  }),
  Object.freeze({
    modelId: "seedance-2.5",
    displayName: "Seedance 2.5",
    provider: "gmi",
    modes: Object.freeze(["t2v", "i2v"]),
    minDurationSeconds: 4,
    maxDurationSeconds: 15,
    resolutions: Object.freeze(["480p", "720p", "1080p"]),
    audio: true,
    pricingSummary: "Live quote via POST /v1/generations/plan"
  }),
  Object.freeze({
    modelId: "avatar-talk",
    displayName: "Avatar Talk",
    provider: "comfyui",
    modes: Object.freeze(["i2v"]),
    minDurationSeconds: 3,
    maxDurationSeconds: 300,
    resolutions: Object.freeze(["768p", "source"]),
    audio: true,
    pricingSummary: "0.2 credits per 5 script units (+10 base credits on workflow 'photo')"
  })
]);

export const ONLYCHILI_CINEMA = Object.freeze({
  name: "OnlyChili Cinema",
  url: "https://onlychili.aichili.ai",
  mcpUrl: "https://onlychili.aichili.ai/mcp",
  creatorNetRevenueSharePct: 80,
  platformFeePct: 20,
  languagesSupported: 47,
  membershipPriceRangeUsd: Object.freeze({ min: 2.99, max: 99.99 }),
  ppvPriceRangeUsd: Object.freeze({ min: 0.99, max: 500.0 })
});

const VALID_MODES = new Set(["t2v", "i2v", "t2i", "i2i"]);
const VALID_SCOPES = new Set(["available", "console"]);
const API_KEY_PATTERN = /^chili_sk_[A-Za-z0-9_-]{8,}$/;
const JOB_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const MODEL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const TERMINAL_STATUSES = new Set(["succeeded", "completed", "failed", "cancelled", "canceled"]);

export class AiChiliError extends Error {
  constructor(code, message, { status = null, details = null } = {}) {
    super(message);
    this.name = "AiChiliError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function round(value, decimals = 4) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
const VENDOR_QUOTED_MODELS = new Set(["wan3.0-video", "seedance-2.5", "minimax-h3-gmi"]);

export function resolveBaseUrl(baseUrl) {
  const raw = (baseUrl || process.env.AICHILI_API_BASE || DEFAULT_API_BASE).trim();
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new AiChiliError("INVALID_BASE_URL", `Invalid API base URL: ${raw}`);
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new AiChiliError("INVALID_BASE_URL", `Unsupported API protocol: ${parsed.protocol}`);
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new AiChiliError(
      "INVALID_BASE_URL",
      "API base URL must not include embedded credentials, query parameters, or hash fragments."
    );
  }
  if (parsed.protocol === "http:" && !LOOPBACK_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new AiChiliError(
      "INSECURE_BASE_URL",
      `Refusing cleartext HTTP API base URL '${parsed.origin}'. Use https:// (http:// is permitted only on localhost/loopback).`
    );
  }
  const cleanPath = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/+$/, "");
  return `${parsed.origin}${cleanPath}`;
}

export function validateApiKey(apiKey) {
  const resolved = typeof apiKey === "string" ? apiKey : process.env.AICHILI_API_KEY || "";
  const trimmed = resolved.trim();
  if (!trimmed) {
    throw new AiChiliError(
      "INVALID_API_KEY",
      "Missing AI Chili API key. Pass apiKey / --api-key or set AICHILI_API_KEY (must start with chili_sk_)."
    );
  }
  if (!API_KEY_PATTERN.test(trimmed)) {
    throw new AiChiliError(
      "INVALID_API_KEY",
      "Malformed AI Chili API key: expected 'chili_sk_' prefix followed by at least 8 alphanumeric characters."
    );
  }
  return trimmed;
}

export function validateJobId(jobId) {
  if (typeof jobId !== "string" || !jobId.trim()) {
    throw new AiChiliError("INVALID_JOB_ID", "Job ID must be a non-empty UUID or slug.");
  }
  const trimmed = jobId.trim();
  // Reject ".." even without slashes so path-segment traversal cannot slip through URL normalization.
  if (trimmed.includes("..") || !JOB_ID_PATTERN.test(trimmed)) {
    throw new AiChiliError(
      "INVALID_JOB_ID",
      "Invalid jobId: expected UUID or safe alphanumeric slug without path separators."
    );
  }
  return trimmed;
}

function validateGenerationRequest({ mode, modelId, params }) {
  if (typeof mode !== "string" || !VALID_MODES.has(mode)) {
    throw new AiChiliError(
      "INVALID_MODE",
      `Invalid generation mode '${mode}'. Expected one of: ${Array.from(VALID_MODES).join(", ")}.`
    );
  }
  if (typeof modelId !== "string" || !MODEL_ID_PATTERN.test(modelId.trim()) || modelId.includes("..")) {
    throw new AiChiliError("INVALID_MODEL_ID", "modelId must be a valid model identifier (e.g. h3-vdn, wan3.0-video).");
  }
  if (!params || typeof params !== "object" || Array.isArray(params)) {
    throw new AiChiliError("INVALID_PARAMS", "params must be a non-null JSON object.");
  }
  return { mode, modelId: modelId.trim(), params };
}

function buildGenerationBody({
  mode,
  modelId,
  params,
  workflow,
  storyboard,
  optimizePrompt,
  autoReference,
  upscale4k,
  likenessConsent,
  idempotencyKey
}) {
  const valid = validateGenerationRequest({ mode, modelId, params });
  const body = {
    mode: valid.mode,
    model_id: valid.modelId,
    params: valid.params
  };
  if (workflow !== undefined) body.workflow = workflow;
  if (storyboard !== undefined) body.storyboard = storyboard;
  if (optimizePrompt !== undefined) body.optimize_prompt = Boolean(optimizePrompt);
  if (autoReference !== undefined) body.auto_reference = Boolean(autoReference);
  if (upscale4k !== undefined) body.upscale_4k = Boolean(upscale4k);
  if (likenessConsent !== undefined) body.likeness_consent = Boolean(likenessConsent);
  if (idempotencyKey !== undefined) body.idempotency_key = idempotencyKey;
  return body;
}

async function requestJson({
  method,
  path,
  apiKey,
  requireAuth = false,
  body,
  baseUrl,
  fetchImpl = globalThis.fetch,
  timeoutMs = 30000
}) {
  const resolvedBase = resolveBaseUrl(baseUrl);
  const headers = {
    Accept: "application/json",
    "User-Agent": USER_AGENT
  };
  if (requireAuth || apiKey !== undefined) {
    const validKey = validateApiKey(apiKey);
    headers.Authorization = `Bearer ${validKey}`;
  }
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  let response;
  try {
    response = await fetchImpl(`${resolvedBase}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (err) {
    throw new AiChiliError(
      "NETWORK_ERROR",
      `Request to ${resolvedBase}${path} failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const rawText = await response.text();
  let parsed = null;
  if (rawText) {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = { raw: rawText };
    }
  }

  if (!response.ok) {
    const detail = parsed && typeof parsed === "object" ? parsed.detail : null;
    const code =
      detail && typeof detail === "object" && typeof detail.code === "string"
        ? detail.code
        : `HTTP_${response.status}`;
    const message =
      detail && typeof detail === "object" && typeof detail.message === "string"
        ? detail.message
        : typeof detail === "string"
          ? detail
          : `AI Chili API returned HTTP ${response.status}`;
    throw new AiChiliError(code, message, { status: response.status, details: parsed });
  }

  return parsed;
}

export function getPlatformOverview() {
  return {
    platform: "AI Chili (AIChili) Studio & API",
    version: VERSION,
    mcpName: "io.github.AI-Chili/aichili",
    endpoints: {
      website: "https://aichili.ai",
      developers: "https://aichili.ai/developers",
      openApiSpec: "https://aichili.ai/openapi.json",
      liveApiOpenApiSpec: "https://videoapi.aichili.ai/v1/openapi.json",
      remoteMcp: "https://aichili.ai/mcp",
      pricingDoc: "https://aichili.ai/pricing.md",
      videoApiBase: DEFAULT_API_BASE,
      onlyChiliWebsite: ONLYCHILI_CINEMA.url,
      onlyChiliMcp: ONLYCHILI_CINEMA.mcpUrl
    },
    freeSignupCredits: FREE_SIGNUP_CREDITS,
    creditPacks: CREDIT_PACKS,
    models: PUBLIC_MODELS,
    onlyChiliCinema: ONLYCHILI_CINEMA
  };
}

export async function listModels({ scope, baseUrl, fetchImpl } = {}) {
  let query = "";
  if (scope !== undefined && scope !== null && scope !== "") {
    if (typeof scope !== "string" || !VALID_SCOPES.has(scope)) {
      throw new AiChiliError(
        "INVALID_SCOPE",
        `Invalid scope '${scope}'. Expected 'available' or 'console'.`
      );
    }
    query = `?scope=${encodeURIComponent(scope)}`;
  }
  return requestJson({
    method: "GET",
    path: `/v1/registry${query}`,
    baseUrl,
    fetchImpl
  });
}

export function estimateCost({
  seconds = 15,
  resolution = "768p",
  modelId = "h3-vdn",
  workflow = "talk",
  scriptUnits,
  freeSignupCreditsUsed = false,
  subscribers = 0,
  subPrice = 9.99,
  ppvCount = 0,
  ppvPrice = 4.99
} = {}) {
  const normalizedModel = String(modelId || "h3-vdn").trim().toLowerCase();
  let totalCredits;
  let rateBasis;

  if (normalizedModel === "avatar-talk") {
    const normalizedWf = String(workflow || "talk").trim().toLowerCase();
    if (normalizedWf !== "talk" && normalizedWf !== "photo") {
      throw new AiChiliError("INVALID_WORKFLOW", "avatar-talk workflow must be 'talk' or 'photo'.");
    }
    const units = scriptUnits !== undefined ? Number(scriptUnits) : Number(seconds) * 3.8;
    if (!Number.isFinite(units) || units <= 0) {
      throw new AiChiliError("INVALID_SCRIPT_UNITS", "scriptUnits (or seconds) must be a positive number.");
    }
    const blocks = Math.ceil(units / AVATAR_TALK_PRICING.blockUnits);
    const baseClipCredits = normalizedWf === "photo" ? AVATAR_TALK_PRICING.photoBaseClipCredits : 0;
    totalCredits = Math.ceil(blocks * AVATAR_TALK_PRICING.creditsPerBlock + baseClipCredits);
    rateBasis = {
      modelId: "avatar-talk",
      workflow: normalizedWf,
      scriptUnits: units,
      blocks,
      creditsPerBlock: AVATAR_TALK_PRICING.creditsPerBlock,
      blockUnits: AVATAR_TALK_PRICING.blockUnits,
      baseClipCredits
    };
  } else if (normalizedModel === "h3-vdn" || normalizedModel === "h3-sol") {
    const dur = Number(seconds);
    if (!Number.isFinite(dur) || dur <= 0) {
      throw new AiChiliError("INVALID_DURATION", "seconds must be a positive number.");
    }
    const normalizedRes = String(resolution || "768p").trim().toLowerCase();
    const ratePerSecond = H3_VDN_RATES_PER_SECOND[normalizedRes];
    if (ratePerSecond === undefined) {
      throw new AiChiliError(
        "INVALID_RESOLUTION",
        `Unsupported resolution '${resolution}'. Expected one of: ${Object.keys(H3_VDN_RATES_PER_SECOND).join(", ")}.`
      );
    }
    totalCredits = Math.ceil(dur * ratePerSecond);
    rateBasis = {
      modelId: normalizedModel,
      seconds: dur,
      resolution: normalizedRes,
      creditsPerSecond: ratePerSecond
    };
  } else if (VENDOR_QUOTED_MODELS.has(normalizedModel)) {
    throw new AiChiliError(
      "VENDOR_QUOTED_MODEL",
      `Model '${normalizedModel}' uses live vendor quotes rather than fixed per-second rates. Call planGeneration / POST /v1/generations/plan (or MCP tool plan_video_generation) for an exact $0 dry-run quote.`
    );
  } else {
    throw new AiChiliError(
      "INVALID_MODEL_ID",
      `Unsupported local estimation model '${modelId}'. Supported offline models: h3-vdn (h3-sol), avatar-talk.`
    );
  }

  const subs = Number(subscribers);
  const ppvs = Number(ppvCount);
  const subUsd = Number(subPrice);
  const ppvUsd = Number(ppvPrice);

  if (!Number.isFinite(subs) || subs < 0) {
    throw new AiChiliError("INVALID_SUBSCRIBERS", "subscribers must be a non-negative number.");
  }
  if (!Number.isFinite(ppvs) || ppvs < 0) {
    throw new AiChiliError("INVALID_PPV_COUNT", "ppvCount must be a non-negative number.");
  }
  if (
    subs > 0 &&
    (!Number.isFinite(subUsd) ||
      subUsd < ONLYCHILI_CINEMA.membershipPriceRangeUsd.min ||
      subUsd > ONLYCHILI_CINEMA.membershipPriceRangeUsd.max)
  ) {
    throw new AiChiliError(
      "INVALID_SUB_PRICE",
      `OnlyChili membership price must be between $${ONLYCHILI_CINEMA.membershipPriceRangeUsd.min} and $${ONLYCHILI_CINEMA.membershipPriceRangeUsd.max}/mo.`
    );
  }
  if (
    ppvs > 0 &&
    (!Number.isFinite(ppvUsd) ||
      ppvUsd < ONLYCHILI_CINEMA.ppvPriceRangeUsd.min ||
      ppvUsd > ONLYCHILI_CINEMA.ppvPriceRangeUsd.max)
  ) {
    throw new AiChiliError(
      "INVALID_PPV_PRICE",
      `OnlyChili PPV price must be between $${ONLYCHILI_CINEMA.ppvPriceRangeUsd.min} and $${ONLYCHILI_CINEMA.ppvPriceRangeUsd.max}.`
    );
  }

  const freeCreditsApplied = freeSignupCreditsUsed ? 0 : Math.min(totalCredits, FREE_SIGNUP_CREDITS);
  const billableCredits = round(Math.max(0, totalCredits - freeCreditsApplied), 3);

  const paidPacks = CREDIT_PACKS.filter((p) => p.priceUsd > 0);
  const packBreakdown = paidPacks.map((pack) => {
    const usdPerCredit = pack.priceUsd / pack.credits;
    const packsNeeded = billableCredits === 0 ? 0 : Math.ceil(billableCredits / pack.credits);
    return {
      id: pack.id,
      name: pack.name,
      packPriceUsd: pack.priceUsd,
      packCredits: pack.credits,
      usdPerCredit: round(usdPerCredit, 4),
      effectiveCostUsd: round(billableCredits * usdPerCredit, 2),
      packsNeededAlone: packsNeeded,
      checkoutSpendUsd: round(packsNeeded * pack.priceUsd, 2)
    };
  });

  const recommendedPack = (() => {
    if (billableCredits === 0) {
      return { id: "free-signup", name: "Free Sign-Up", checkoutSpendUsd: 0, creditsIncluded: FREE_SIGNUP_CREDITS };
    }
    let best = { cost: Infinity, credits: 0, s: 0, c: 0, st: 0 };
    const maxStudio = Math.ceil(billableCredits / 780) + 1;
    for (let s = 0; s <= maxStudio; s += 1) {
      for (let c = 0; c <= 3; c += 1) {
        for (let st = 0; st <= 5; st += 1) {
          const credits = s * 780 + c * 460 + st * 150;
          if (credits < billableCredits) continue;
          const cost = round(s * 49.9 + c * 29.9 + st * 9.9, 2);
          if (cost < best.cost || (cost === best.cost && credits > best.credits)) {
            best = { cost, credits, s, c, st };
          }
        }
      }
    }
    const nonZero = [
      best.s > 0 ? { id: "studio-api", name: "Studio & API", count: best.s } : null,
      best.c > 0 ? { id: "creator", name: "Creator", count: best.c } : null,
      best.st > 0 ? { id: "starter", name: "Starter", count: best.st } : null
    ].filter(Boolean);
    if (nonZero.length === 1 && nonZero[0].count === 1) {
      return {
        id: nonZero[0].id,
        name: nonZero[0].name,
        checkoutSpendUsd: best.cost,
        creditsIncluded: best.credits
      };
    }
    return {
      id: nonZero.length === 1 ? nonZero[0].id : "mixed",
      name: nonZero.map((p) => `${p.count}x ${p.name}`).join(" + "),
      checkoutSpendUsd: best.cost,
      creditsIncluded: best.credits
    };
  })();

  const studioPack = paidPacks[paidPacks.length - 1];
  const effectiveUsdAtStudioRate = round(billableCredits * (studioPack.priceUsd / studioPack.credits), 2);

  const grossMembershipUsd = subs > 0 ? round(subs * subUsd, 2) : 0;
  const grossPpvUsd = ppvs > 0 ? round(ppvs * ppvUsd, 2) : 0;
  const grossRevenueUsd = round(grossMembershipUsd + grossPpvUsd, 2);
  const creatorNetRevenueUsd = round(
    grossRevenueUsd * (ONLYCHILI_CINEMA.creatorNetRevenueSharePct / 100),
    2
  );

  return {
    rateBasis,
    totalCredits,
    freeSignupCreditsAvailable: freeSignupCreditsUsed ? 0 : FREE_SIGNUP_CREDITS,
    freeCreditsApplied,
    billableCredits,
    effectiveUsdAtStudioRate,
    recommendedPack,
    packBreakdown,
    creditPacks: CREDIT_PACKS,
    onlyChiliProjection: {
      creatorNetRevenueSharePct: ONLYCHILI_CINEMA.creatorNetRevenueSharePct,
      languagesSupported: ONLYCHILI_CINEMA.languagesSupported,
      subscribers: subs,
      subPriceUsd: subs > 0 ? subUsd : 0,
      ppvCount: ppvs,
      ppvPriceUsd: ppvs > 0 ? ppvUsd : 0,
      grossRevenueUsd,
      creatorNetRevenueUsd,
      netAfterStudioVideoCostUsd: round(creatorNetRevenueUsd - effectiveUsdAtStudioRate, 2)
    }
  };
}

export async function getCredits({ apiKey, baseUrl, fetchImpl } = {}) {
  return requestJson({
    method: "GET",
    path: "/v1/credits",
    apiKey,
    requireAuth: true,
    baseUrl,
    fetchImpl
  });
}

export async function planGeneration({
  apiKey,
  mode,
  modelId,
  params,
  workflow,
  storyboard,
  optimizePrompt,
  autoReference,
  upscale4k,
  likenessConsent,
  baseUrl,
  fetchImpl
} = {}) {
  const validKey = validateApiKey(apiKey);
  const body = buildGenerationBody({
    mode,
    modelId,
    params,
    workflow,
    storyboard,
    optimizePrompt,
    autoReference,
    upscale4k,
    likenessConsent
  });
  return requestJson({
    method: "POST",
    path: "/v1/generations/plan",
    apiKey: validKey,
    requireAuth: true,
    body,
    baseUrl,
    fetchImpl
  });
}

export async function createGeneration({
  apiKey,
  mode,
  modelId,
  params,
  workflow,
  storyboard,
  optimizePrompt,
  autoReference,
  upscale4k,
  likenessConsent,
  idempotencyKey,
  baseUrl,
  fetchImpl
} = {}) {
  const validKey = validateApiKey(apiKey);
  const body = buildGenerationBody({
    mode,
    modelId,
    params,
    workflow,
    storyboard,
    optimizePrompt,
    autoReference,
    upscale4k,
    likenessConsent,
    idempotencyKey
  });
  return requestJson({
    method: "POST",
    path: "/v1/generations",
    apiKey: validKey,
    requireAuth: true,
    body,
    baseUrl,
    fetchImpl
  });
}

export async function getGeneration({ apiKey, jobId, baseUrl, fetchImpl } = {}) {
  const validKey = validateApiKey(apiKey);
  const validJobId = validateJobId(jobId);
  return requestJson({
    method: "GET",
    path: `/v1/generations/${encodeURIComponent(validJobId)}`,
    apiKey: validKey,
    requireAuth: true,
    baseUrl,
    fetchImpl
  });
}

export async function waitForGeneration({
  apiKey,
  jobId,
  intervalMs = 3000,
  timeoutMs = 600000,
  baseUrl,
  fetchImpl
} = {}) {
  const deadline = Date.now() + timeoutMs;
  while (true) {
    const job = await getGeneration({ apiKey, jobId, baseUrl, fetchImpl });
    if (job && typeof job.status === "string" && TERMINAL_STATUSES.has(job.status.toLowerCase())) {
      return job;
    }
    if (Date.now() + intervalMs > deadline) {
      throw new AiChiliError(
        "POLL_TIMEOUT",
        `Timed out after ${timeoutMs}ms waiting for generation ${jobId} (last status: ${job?.status ?? "unknown"}).`,
        { details: job }
      );
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
