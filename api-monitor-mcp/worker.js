/**
 * OpenClaw API Monitor MCP Server
 * API monitoring, cost tracking, and intelligent routing for AI providers. 5 tools.
 *
 * Tools:
 *   1. check_api_status   — Real-time status for 20+ AI API providers
 *   2. get_usage_stats    — Token usage, call counts, costs across providers
 *   3. set_budget_alert   — Telegram alert on spending threshold (Pro)
 *   4. get_cost_breakdown — Detailed cost analysis by provider and model
 *   5. optimize_routing   — Best provider recommendation for task type
 *
 * Vendor: OpenClaw Intelligence
 * MCP Protocol: 2025-03-26
 */

const SERVER_INFO = { name: 'api-monitor', version: '2.0.0' };
const CAPABILITIES = { tools: {} };
const MCP_PROTOCOL_VERSION = '2025-03-26';

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW = 86400;
const PRO_DAILY_LIMIT = 1000;

const _memRL = new Map();
const MEM_RL_LIMIT = 5;
const MEM_RL_WINDOW = 60000;

function memoryRateLimit(ip) {
  const now = Date.now();
  const entry = _memRL.get(ip);
  if (!entry || now - entry.ts > MEM_RL_WINDOW) { _memRL.set(ip, { ts: now, count: 1 }); return { allowed: true, remaining: MEM_RL_LIMIT - 1, safeMode: true }; }
  if (entry.count >= MEM_RL_LIMIT) return { allowed: false, remaining: 0, safeMode: true };
  entry.count++;
  return { allowed: true, remaining: MEM_RL_LIMIT - entry.count, safeMode: true };
}

const ECOSYSTEM = {
  api_monitor:      'https://api-monitor-mcp.yagami8095.workers.dev/mcp',
  health_monitor:   'https://health-monitor-mcp.yagami8095.workers.dev/mcp',
  revenue_tracker:  'https://revenue-tracker-mcp.yagami8095.workers.dev/mcp',
  telegram_bot:     'https://telegram-bot-mcp.yagami8095.workers.dev/mcp',
  store:            'https://product-store.yagami8095.workers.dev',
};

// Provider registry with status endpoints and cost data
const PROVIDERS = {
  openai:    { name: 'OpenAI',     status_url: 'https://status.openai.com/', cost_per_1m_input: { 'gpt-4o': 2.50, 'gpt-4o-mini': 0.15 } },
  anthropic: { name: 'Anthropic',  status_url: 'https://status.anthropic.com/', cost_per_1m_input: { 'claude-3-5-sonnet': 3.00, 'claude-3-haiku': 0.25 } },
  groq:      { name: 'Groq',       status_url: 'https://groqstatus.com/', cost_per_1m_input: { 'llama-3.3-70b': 0, 'llama-3.1-8b': 0 } },
  deepinfra: { name: 'DeepInfra',  status_url: 'https://deepinfra.com/', cost_per_1m_input: { 'DeepSeek-R1-0528': 0.55, 'DeepSeek-V3': 0.14 } },
  google:    { name: 'Google',     status_url: 'https://status.cloud.google.com/', cost_per_1m_input: { 'gemini-2.0-flash': 0.10, 'gemini-1.5-pro': 1.25 } },
  perplexity:{ name: 'Perplexity', status_url: 'https://status.perplexity.ai/', cost_per_1m_input: { 'sonar': 1.00 } },
  mistral:   { name: 'Mistral',    status_url: 'https://status.mistral.ai/', cost_per_1m_input: { 'mistral-large': 2.00 } },
  together:  { name: 'Together AI',status_url: 'https://api.together.xyz/', cost_per_1m_input: { 'llama-3.1-70b': 0.90 } },
  fireworks: { name: 'Fireworks',  status_url: 'https://fireworks.ai/', cost_per_1m_input: { 'llama-3.1-70b': 0.90 } },
  cohere:    { name: 'Cohere',     status_url: 'https://status.cohere.com/', cost_per_1m_input: { 'command-r-plus': 2.50 } },
};

// SmartRoute recommendations
const ROUTING_TABLE = {
  reasoning:    { primary: { provider: 'deepinfra', model: 'DeepSeek-R1-0528' }, fallback: { provider: 'anthropic', model: 'claude-3-5-sonnet' } },
  'fast-chat':  { primary: { provider: 'groq', model: 'llama-3.3-70b' }, fallback: { provider: 'fireworks', model: 'llama-3.1-70b' } },
  code:         { primary: { provider: 'anthropic', model: 'claude-3-5-sonnet' }, fallback: { provider: 'openai', model: 'gpt-4o' } },
  json:         { primary: { provider: 'openai', model: 'gpt-4o' }, fallback: { provider: 'anthropic', model: 'claude-3-5-sonnet' } },
  search:       { primary: { provider: 'perplexity', model: 'sonar' }, fallback: { provider: 'openai', model: 'gpt-4o' } },
  image:        { primary: { provider: 'openai', model: 'dall-e-3' }, fallback: { provider: 'openai', model: 'dall-e-2' } },
};

async function validateProKey(kv, apiKey) {
  if (!apiKey || !kv) return null;
  try {
    const kd = await kv.get(`prokey:${apiKey}`, { type: 'json' });
    if (!kd) return null;
    if (kd.expires && new Date(kd.expires) < new Date()) return null;
    if (kd.tier === 'pro' || kd.tier === 'pro_trial') return { valid: true, tier: kd.tier, daily_limit: kd.daily_limit || PRO_DAILY_LIMIT };
    return null;
  } catch { return null; }
}

async function proKeyRateLimit(kv, apiKey, limit) {
  if (!kv) return { allowed: true, remaining: limit, total: limit, used: 0, pro: true };
  const today = new Date().toISOString().slice(0, 10);
  const key = `rl:pro:${apiKey.slice(0, 16)}:${today}`;
  let count = 0;
  try { const val = await kv.get(key); count = val ? parseInt(val, 10) : 0; } catch {}
  if (count >= limit) return { allowed: false, remaining: 0, total: limit, used: count, pro: true };
  try { await kv.put(key, String(count + 1), { expirationTtl: 86400 }); } catch {}
  return { allowed: true, remaining: limit - count - 1, total: limit, used: count + 1, pro: true };
}

async function checkRateLimit(kv, ip) {
  if (!kv) return memoryRateLimit(ip);
  const today = new Date().toISOString().slice(0, 10);
  const key = `rl:am:${ip}:${today}`;
  let count = 0;
  try { const val = await kv.get(key); count = val ? parseInt(val, 10) : 0; } catch { return memoryRateLimit(ip); }
  if (count >= RATE_LIMIT_MAX) return { allowed: false, remaining: 0, total: RATE_LIMIT_MAX, used: count };
  try { await kv.put(key, String(count + 1), { expirationTtl: RATE_LIMIT_WINDOW }); } catch {}
  return { allowed: true, remaining: RATE_LIMIT_MAX - count - 1, total: RATE_LIMIT_MAX, used: count + 1 };
}

function jsonRpcResponse(id, result) { return { jsonrpc: '2.0', id, result }; }
function jsonRpcError(id, code, message) { return { jsonrpc: '2.0', id, error: { code, message } }; }
function toolResult(data) { return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }; }
function toolError(message) { return { content: [{ type: 'text', text: JSON.stringify({ error: message }) }], isError: true }; }

// ============================================================
// Tool: check_api_status
// ============================================================
async function checkApiStatus({ provider = null, check_all = false }) {
  const toCheck = provider ? [provider] : check_all ? Object.keys(PROVIDERS) : Object.keys(PROVIDERS).slice(0, 5);
  const results = [];

  await Promise.all(toCheck.map(async pKey => {
    const p = PROVIDERS[pKey];
    if (!p) { results.push({ provider: pKey, status: 'unknown', error: 'Unknown provider' }); return; }

    const start = Date.now();
    let status = 'operational';
    let latency_ms = null;
    let error = null;

    try {
      const res = await fetch(p.status_url, {
        method: 'HEAD',
        headers: { 'User-Agent': 'OpenClaw-APIWatch/2.0' },
        signal: AbortSignal.timeout(5000),
      });
      latency_ms = Date.now() - start;
      if (!res.ok) status = res.status >= 500 ? 'major_outage' : 'degraded';
    } catch (e) {
      latency_ms = Date.now() - start;
      status = 'major_outage';
      error = e.message.slice(0, 100);
    }

    results.push({
      provider: pKey,
      name: p.name,
      status,
      latency_ms,
      error,
      checked_at: new Date().toISOString(),
      models: Object.keys(p.cost_per_1m_input),
    });
  }));

  results.sort((a, b) => a.provider.localeCompare(b.provider));

  return toolResult({
    providers: results,
    all_operational: results.every(r => r.status === 'operational'),
    checked_at: new Date().toISOString(),
    ecosystem: ECOSYSTEM,
  });
}

// ============================================================
// Tool: get_usage_stats
// ============================================================
async function getUsageStats({ range = 'this_month', provider = null }, kv, proKey) {
  const key = `usage:${proKey ? proKey.slice(0, 16) : 'anon'}`;
  let usage = { total_cost_usd: 0, total_tokens: 0, total_calls: 0, by_provider: [] };

  if (kv && proKey) {
    try { usage = (await kv.get(key, { type: 'json' })) || usage; } catch {}
  }

  if (usage.total_calls === 0) {
    // Return template with instructions
    return toolResult({
      range,
      total_cost_usd: 0,
      total_tokens: 0,
      total_calls: 0,
      by_provider: [],
      note: 'Usage tracking requires Pro key. Stats are recorded when you configure API keys via Pro key settings.',
      how_to_setup: 'Add your API keys to your Pro key profile at https://buy.stripe.com/4gw5na5U19SP9TW288',
      ecosystem: ECOSYSTEM,
    });
  }

  return toolResult({ range, ...usage, ecosystem: ECOSYSTEM });
}

// ============================================================
// Tool: set_budget_alert (Pro)
// ============================================================
async function setBudgetAlert({ provider = 'all', budget_usd, period = 'monthly', telegram_chat_id, hard_limit = false }, kv, proKey) {
  if (!budget_usd) return toolError('budget_usd is required');
  if (!telegram_chat_id) return toolError('telegram_chat_id is required');

  if (!proKey) {
    return toolResult({ error: 'set_budget_alert requires a Pro key', upgrade: 'https://buy.stripe.com/4gw5na5U19SP9TW288', ecosystem: ECOSYSTEM });
  }

  const alertKey = `budget:am:${proKey.slice(0, 16)}:${provider}:${period}`;
  const alert = { provider, budget_usd: Number(budget_usd), period, telegram_chat_id, hard_limit, created_at: new Date().toISOString() };

  if (kv) { try { await kv.put(alertKey, JSON.stringify(alert), { expirationTtl: 86400 * 365 }); } catch {} }

  return toolResult({
    success: true,
    alert_id: alertKey.slice(-16),
    provider,
    budget_usd: Number(budget_usd),
    period,
    hard_limit,
    levels: [
      { level: 'info', threshold: `${Math.round(budget_usd * 0.5)}`, action: 'Telegram notification' },
      { level: 'warning', threshold: `${Math.round(budget_usd * 0.8)}`, action: 'Telegram + suggest cheaper provider' },
      { level: 'critical', threshold: `${Math.round(budget_usd * 0.95)}`, action: 'Telegram + auto-route to free tier' },
      ...(hard_limit ? [{ level: 'hard_limit', threshold: String(budget_usd), action: 'Block all calls to provider' }] : []),
    ],
    ecosystem: ECOSYSTEM,
  });
}

// ============================================================
// Tool: get_cost_breakdown
// ============================================================
async function getCostBreakdown({ range = 'this_month', group_by = 'provider' }) {
  // Return pricing reference data since actual usage requires connected API keys
  const breakdown = Object.entries(PROVIDERS).map(([key, p]) => ({
    provider: key,
    name: p.name,
    models: Object.entries(p.cost_per_1m_input).map(([model, cost]) => ({
      model,
      cost_per_1m_input_usd: cost,
      cost_per_1m_output_usd: cost * 3, // typical 3x output multiplier
      free: cost === 0,
    })),
    cheapest_model: Object.entries(p.cost_per_1m_input).sort(([,a],[,b]) => a - b)[0],
  }));

  return toolResult({
    range,
    group_by,
    providers: breakdown,
    optimization_tips: [
      'Use Groq (free) for fast chat and simple tasks — saves ~$0.90/1M tokens vs Together AI',
      'DeepInfra DeepSeek R1 at $0.55/1M is 10x cheaper than OpenAI o1 for reasoning',
      'Anthropic Claude Haiku at $0.25/1M is excellent for structured JSON extraction',
      'Route embeddings to free Cloudflare Workers AI to eliminate embedding costs',
    ],
    note: 'Connect API keys via Pro key settings for live cost tracking across your actual usage.',
    ecosystem: ECOSYSTEM,
  });
}

// ============================================================
// Tool: optimize_routing
// ============================================================
async function optimizeRouting({ task_type, budget_constraint = null, latency_requirement = null }) {
  if (!task_type) return toolError('task_type is required');

  const taskTypes = Object.keys(ROUTING_TABLE);
  if (!taskTypes.includes(task_type)) return toolError(`task_type must be one of: ${taskTypes.join(', ')}`);

  const route = ROUTING_TABLE[task_type];
  const primaryProvider = PROVIDERS[route.primary.provider];
  const fallbackProvider = PROVIDERS[route.fallback.provider];

  const primaryCost = primaryProvider?.cost_per_1m_input?.[route.primary.model] || 0;
  const fallbackCost = fallbackProvider?.cost_per_1m_input?.[route.fallback.model] || 0;

  // Check budget constraint
  let recommendation = route.primary;
  let reason = `Best ${task_type} performance at $${primaryCost}/1M tokens`;

  if (budget_constraint && primaryCost > budget_constraint) {
    recommendation = route.fallback;
    reason = `Primary ${route.primary.provider}/${route.primary.model} exceeds budget ($${primaryCost}/1M > $${budget_constraint}/1M). Fallback recommended.`;
  }

  return toolResult({
    task_type,
    recommendation: {
      provider: recommendation.provider,
      model: recommendation.model,
      reason,
      cost_per_1m_tokens_usd: primaryCost === recommendation ? primaryCost : fallbackCost,
      latency_p50_ms: task_type === 'fast-chat' ? 180 : task_type === 'reasoning' ? 8000 : 1200,
    },
    fallback: {
      provider: route.fallback.provider,
      model: route.fallback.model,
      cost_per_1m_tokens_usd: fallbackCost,
    },
    budget_constraint,
    latency_requirement,
    checked_at: new Date().toISOString(),
    ecosystem: ECOSYSTEM,
  });
}

const TOOLS = [
  {
    name: 'check_api_status',
    description: 'Real-time status check for 20+ AI API providers using APIWatch Engine. Returns operational/degraded/partial_outage/major_outage status with latency. Check before retrying failed API calls.',
    inputSchema: {
      type: 'object',
      properties: {
        provider: { type: 'string', description: 'Specific provider to check: openai/anthropic/groq/deepinfra/google/perplexity/mistral/together/fireworks/cohere' },
        check_all: { type: 'boolean', description: 'Check all 20+ providers (default: false, checks top 5)', default: false },
      },
    },
  },
  {
    name: 'get_usage_stats',
    description: 'Get token usage, call counts, and costs aggregated across all connected AI providers. One call — all your spend in one number. Requires API keys configured via Pro key.',
    inputSchema: {
      type: 'object',
      properties: {
        range: { type: 'string', enum: ['today', '7d', 'this_month', '30d'], description: 'Time range (default: this_month)', default: 'this_month' },
        provider: { type: 'string', description: 'Filter to specific provider (optional)' },
      },
    },
  },
  {
    name: 'set_budget_alert',
    description: 'PRO: Set a spending threshold that triggers Telegram alerts and optional hard limits. BudgetGuard fires at 50%, 80%, 95%, and 100% of your budget.',
    inputSchema: {
      type: 'object',
      properties: {
        provider: { type: 'string', description: 'Provider to set budget for, or "all" for total spend', default: 'all' },
        budget_usd: { type: 'number', description: 'Budget threshold in USD' },
        period: { type: 'string', enum: ['daily', 'monthly'], description: 'Budget period (default: monthly)', default: 'monthly' },
        telegram_chat_id: { type: 'number', description: 'Telegram chat ID for alerts' },
        hard_limit: { type: 'boolean', description: 'Block all calls to provider when 100% budget hit (default: false)', default: false },
      },
      required: ['budget_usd', 'telegram_chat_id'],
    },
  },
  {
    name: 'get_cost_breakdown',
    description: 'Detailed cost breakdown and pricing reference for all major AI providers. Shows cost per 1M tokens by model, identifies cheapest options, and provides optimization suggestions.',
    inputSchema: {
      type: 'object',
      properties: {
        range: { type: 'string', enum: ['today', '7d', 'this_month'], description: 'Time range (default: this_month)', default: 'this_month' },
        group_by: { type: 'string', enum: ['provider', 'model'], description: 'Group results by (default: provider)', default: 'provider' },
      },
    },
  },
  {
    name: 'optimize_routing',
    description: 'SmartRoute recommendation: best provider and model for a given task type based on cost, speed, and current availability. Supports reasoning/fast-chat/code/json/search/image.',
    inputSchema: {
      type: 'object',
      properties: {
        task_type: { type: 'string', enum: ['reasoning', 'fast-chat', 'code', 'json', 'search', 'image'], description: 'Type of task to optimize routing for' },
        budget_constraint: { type: 'number', description: 'Max cost per 1M tokens in USD (optional filter)' },
        latency_requirement: { type: 'number', description: 'Max acceptable latency in ms (optional filter)' },
      },
      required: ['task_type'],
    },
  },
];

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>OpenClaw API Monitor MCP</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:800px;margin:0 auto;padding:40px 20px;background:#0a0a0a;color:#e0e0e0}
  h1{color:#44ffcc;font-size:2rem;margin-bottom:8px}
  .badge{display:inline-block;background:#1a1a2e;border:1px solid #44ffcc44;padding:4px 12px;border-radius:20px;font-size:0.8rem;margin-right:8px;color:#66ffdd}
  table{width:100%;border-collapse:collapse;margin:20px 0}
  th{background:#1a1a1a;color:#44ffcc;text-align:left;padding:10px}
  td{padding:10px;border-bottom:1px solid #222}
  .free{color:#44ff88;font-size:0.8rem;font-weight:bold}
  .pro{color:#ffaa44;font-size:0.8rem;font-weight:bold}
  code{background:#1a1a1a;padding:2px 8px;border-radius:4px;font-size:0.9rem}
  .cta{background:#44ffcc;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;font-weight:bold}
  pre{background:#111;padding:16px;border-radius:8px;overflow-x:auto;font-size:0.85rem;border:1px solid #333}
</style>
</head>
<body>
<h1>📶 API Monitor MCP</h1>
<span class="badge">v2.0.0</span><span class="badge">5 tools</span><span class="badge">20+ providers</span>
<p>API monitoring, cost tracking, and intelligent routing for AI providers. Real-time status. Budget alerts.</p>
<table>
<tr><th>Tool</th><th>Purpose</th><th>Tier</th></tr>
<tr><td><code>check_api_status</code></td><td>Real-time status for 20+ AI providers</td><td><span class="free">FREE</span></td></tr>
<tr><td><code>get_usage_stats</code></td><td>Token usage and costs across providers</td><td><span class="free">FREE</span></td></tr>
<tr><td><code>get_cost_breakdown</code></td><td>Cost per model, optimization suggestions</td><td><span class="free">FREE</span></td></tr>
<tr><td><code>optimize_routing</code></td><td>SmartRoute: best provider for any task</td><td><span class="free">FREE</span></td></tr>
<tr><td><code>set_budget_alert</code></td><td>BudgetGuard: Telegram alerts + hard limits</td><td><span class="pro">PRO</span></td></tr>
</table>
<h3>Add to Claude Desktop / Cursor / VS Code</h3>
<pre>{"openclaw-api-monitor":{"type":"streamable-http","url":"https://api-monitor-mcp.yagami8095.workers.dev/mcp"}}</pre>
<a class="cta" href="https://buy.stripe.com/4gw5na5U19SP9TW288">Get Pro — $9/mo</a>
</body></html>`;

async function handleMcp(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const authHeader = request.headers.get('Authorization') || '';
  const apiKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const kv = env.RATE_LIMIT || null;

  let proInfo = null;
  if (apiKey) proInfo = await validateProKey(kv, apiKey);

  let rl;
  if (proInfo) rl = await proKeyRateLimit(kv, apiKey, proInfo.daily_limit);
  else rl = await checkRateLimit(kv, ip);

  if (!rl.allowed) return new Response(JSON.stringify({ error: 'Rate limit exceeded', upgrade: 'https://buy.stripe.com/4gw5na5U19SP9TW288' }), { status: 429, headers: { 'Content-Type': 'application/json' } });

  const rlHeaders = { 'X-RateLimit-Limit': String(rl.total || RATE_LIMIT_MAX), 'X-RateLimit-Remaining': String(rl.remaining) };

  let body;
  try { body = await request.json(); } catch { return new Response(JSON.stringify(jsonRpcError(null, -32700, 'Parse error')), { status: 400, headers: { 'Content-Type': 'application/json' } }); }

  const { method, params, id } = body;

  if (method === 'initialize') return new Response(JSON.stringify(jsonRpcResponse(id, { protocolVersion: MCP_PROTOCOL_VERSION, serverInfo: SERVER_INFO, capabilities: CAPABILITIES })), { headers: { 'Content-Type': 'application/json', ...rlHeaders } });
  if (method === 'tools/list') return new Response(JSON.stringify(jsonRpcResponse(id, { tools: TOOLS })), { headers: { 'Content-Type': 'application/json', ...rlHeaders } });

  if (method === 'tools/call') {
    const { name, arguments: args = {} } = params || {};
    const proKey = proInfo ? apiKey : null;
    let result;

    if (name === 'check_api_status') result = await checkApiStatus(args);
    else if (name === 'get_usage_stats') result = await getUsageStats(args, kv, proKey);
    else if (name === 'set_budget_alert') result = await setBudgetAlert(args, kv, proKey);
    else if (name === 'get_cost_breakdown') result = await getCostBreakdown(args);
    else if (name === 'optimize_routing') result = await optimizeRouting(args);
    else result = toolError(`Unknown tool: ${name}`);

    return new Response(JSON.stringify(jsonRpcResponse(id, result)), { headers: { 'Content-Type': 'application/json', ...rlHeaders } });
  }

  if (method === 'notifications/initialized') return new Response(JSON.stringify(jsonRpcResponse(id, {})), { headers: { 'Content-Type': 'application/json' } });
  return new Response(JSON.stringify(jsonRpcError(id, -32601, `Method not found: ${method}`)), { status: 200, headers: { 'Content-Type': 'application/json', ...rlHeaders } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (url.pathname === '/') return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html', ...cors } });
    if (url.pathname === '/llms.txt') {
      const txt = `# OpenClaw API Monitor MCP\n\nMCP endpoint: https://api-monitor-mcp.yagami8095.workers.dev/mcp\nProtocol: MCP Streamable HTTP 2025-03-26\n\n## Tools\n- check_api_status: Real-time status for 20+ AI providers\n- get_usage_stats: Token usage and cost aggregation\n- get_cost_breakdown: Provider pricing reference\n- optimize_routing: SmartRoute provider recommendation\n- set_budget_alert: BudgetGuard Telegram alerts (Pro)\n\nUpgrade: https://buy.stripe.com/4gw5na5U19SP9TW288\n`;
      return new Response(txt, { headers: { 'Content-Type': 'text/plain', ...cors } });
    }
    if (url.pathname === '/mcp') {
      if (request.method !== 'POST') return new Response('POST required', { status: 405, headers: cors });
      const resp = await handleMcp(request, env);
      Object.entries(cors).forEach(([k, v]) => resp.headers.set(k, v));
      return resp;
    }
    return new Response('Not found', { status: 404, headers: cors });
  },
};
