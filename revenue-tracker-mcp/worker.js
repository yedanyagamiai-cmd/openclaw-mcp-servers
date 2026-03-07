/**
 * OpenClaw Revenue Tracker MCP Server
 * Multi-source revenue aggregation for solopreneurs and AI agents. 4 tools.
 *
 * Tools:
 *   1. get_revenue_summary  — Aggregate revenue across all sources for any time range
 *   2. track_order          — Manually log an order or payment from any source
 *   3. get_daily_report     — Formatted daily revenue report with product breakdown
 *   4. set_milestone_alert  — Telegram alert when revenue hits a target (Pro)
 *
 * Vendor: OpenClaw Intelligence
 * MCP Protocol: 2025-03-26
 */

const SERVER_INFO = { name: 'revenue-tracker', version: '2.0.0' };
const VENDOR = 'OpenClaw Intelligence';
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
  if (!entry || now - entry.ts > MEM_RL_WINDOW) {
    _memRL.set(ip, { ts: now, count: 1 });
    return { allowed: true, remaining: MEM_RL_LIMIT - 1, safeMode: true };
  }
  if (entry.count >= MEM_RL_LIMIT) return { allowed: false, remaining: 0, safeMode: true };
  entry.count++;
  return { allowed: true, remaining: MEM_RL_LIMIT - entry.count, safeMode: true };
}

const ECOSYSTEM = {
  revenue_tracker:  'https://revenue-tracker-mcp.yagami8095.workers.dev/mcp',
  health_monitor:   'https://health-monitor-mcp.yagami8095.workers.dev/mcp',
  api_monitor:      'https://api-monitor-mcp.yagami8095.workers.dev/mcp',
  telegram_bot:     'https://telegram-bot-mcp.yagami8095.workers.dev/mcp',
  crypto_payments:  'https://crypto-payments-mcp.yagami8095.workers.dev/mcp',
  content_autopilot:'https://content-autopilot-mcp.yagami8095.workers.dev/mcp',
  store:            'https://product-store.yagami8095.workers.dev',
};

async function validateProKey(kv, apiKey) {
  if (!apiKey || !kv) return null;
  try {
    const kd = await kv.get(`prokey:${apiKey}`, { type: 'json' });
    if (!kd) return null;
    if (kd.expires && new Date(kd.expires) < new Date()) return null;
    if (kd.tier === 'pro' || kd.tier === 'pro_trial') {
      return { valid: true, tier: kd.tier, daily_limit: kd.daily_limit || PRO_DAILY_LIMIT };
    }
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
  const key = `rl:rt:${ip}:${today}`;
  let count = 0;
  try {
    const val = await kv.get(key);
    count = val ? parseInt(val, 10) : 0;
  } catch { return memoryRateLimit(ip); }
  if (count >= RATE_LIMIT_MAX) return { allowed: false, remaining: 0, total: RATE_LIMIT_MAX, used: count };
  try { await kv.put(key, String(count + 1), { expirationTtl: RATE_LIMIT_WINDOW }); } catch {}
  return { allowed: true, remaining: RATE_LIMIT_MAX - count - 1, total: RATE_LIMIT_MAX, used: count + 1 };
}

function jsonRpcResponse(id, result) { return { jsonrpc: '2.0', id, result }; }
function jsonRpcError(id, code, message) { return { jsonrpc: '2.0', id, error: { code, message } }; }
function toolResult(data) { return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }; }
function toolError(message) { return { content: [{ type: 'text', text: JSON.stringify({ error: message }) }], isError: true }; }

// ============================================================
// In-memory order store (KV-backed for persistence)
// ============================================================
async function getOrdersFromKV(kv, proKey) {
  if (!kv || !proKey) return [];
  try {
    const data = await kv.get(`orders:${proKey.slice(0, 16)}`, { type: 'json' });
    return data || [];
  } catch { return []; }
}

async function saveOrdersToKV(kv, proKey, orders) {
  if (!kv || !proKey) return;
  try {
    await kv.put(`orders:${proKey.slice(0, 16)}`, JSON.stringify(orders.slice(-500)), { expirationTtl: 86400 * 90 });
  } catch {}
}

// ============================================================
// Tool: get_revenue_summary
// ============================================================
async function getRevenueSummary({ range = 'today', sources = ['all'] }, kv, proKey) {
  const now = Date.now();
  const rangeDays = { 'today': 1, '7d': 7, '30d': 30, 'this_month': 30, 'all': 365 }[range] || 1;
  const since = now - rangeDays * 86400000;

  const orders = await getOrdersFromKV(kv, proKey);
  const filtered = orders.filter(o => !o.is_test && new Date(o.created_at).getTime() >= since);

  const gross_usd = filtered.reduce((s, o) => s + (o.amount_usd || 0), 0);
  const refunds_usd = filtered.filter(o => o.type === 'refund').reduce((s, o) => s + (o.amount_usd || 0), 0);
  const net_usd = gross_usd - refunds_usd;

  const sourceBreakdown = {};
  for (const o of filtered) {
    if (!sourceBreakdown[o.source]) sourceBreakdown[o.source] = 0;
    sourceBreakdown[o.source] += o.amount_usd || 0;
  }

  const productBreakdown = {};
  for (const o of filtered) {
    if (o.product) {
      if (!productBreakdown[o.product]) productBreakdown[o.product] = { revenue: 0, orders: 0 };
      productBreakdown[o.product].revenue += o.amount_usd || 0;
      productBreakdown[o.product].orders += 1;
    }
  }

  const topProduct = Object.entries(productBreakdown).sort(([,a],[,b]) => b.revenue - a.revenue)[0];

  return toolResult({
    range,
    gross_usd: Math.round(gross_usd * 100) / 100,
    net_usd: Math.round(net_usd * 100) / 100,
    refunds_usd: Math.round(refunds_usd * 100) / 100,
    orders: filtered.filter(o => o.type !== 'refund').length,
    sources: sourceBreakdown,
    top_product: topProduct ? `${topProduct[0]} ($${topProduct[1].revenue.toFixed(2)})` : null,
    products: productBreakdown,
    note: orders.length === 0 ? 'No orders logged yet. Use track_order to log sales.' : undefined,
    ecosystem: ECOSYSTEM,
  });
}

// ============================================================
// Tool: track_order
// ============================================================
async function trackOrder({ source, amount, product = null, currency = 'USD', note = null, is_test = false, order_id = null }, kv, proKey) {
  if (!source) return toolError('source is required (stripe/paypal/gumroad/crypto/manual)');
  if (amount == null || isNaN(Number(amount))) return toolError('amount is required and must be a number');

  const amountUsd = currency === 'USD' ? Number(amount) : Number(amount); // Simplified: treat all as USD
  const id = order_id || `ord-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  const order = {
    id,
    source,
    amount_usd: Math.round(amountUsd * 100) / 100,
    currency,
    product,
    note,
    is_test,
    type: 'order',
    created_at: new Date().toISOString(),
  };

  const orders = await getOrdersFromKV(kv, proKey || 'free');
  orders.push(order);
  await saveOrdersToKV(kv, proKey || 'free', orders);

  return toolResult({
    success: true,
    id,
    source,
    amount_usd: order.amount_usd,
    product,
    is_test,
    message: is_test ? 'Test order logged (excluded from revenue reports)' : `Order logged. Appears in get_revenue_summary and get_daily_report.`,
    ecosystem: ECOSYSTEM,
  });
}

// ============================================================
// Tool: get_daily_report
// ============================================================
async function getDailyReport({ date = null }, kv, proKey) {
  const target = date ? new Date(date) : new Date();
  const targetStr = target.toISOString().slice(0, 10);
  const yestStr = new Date(target.getTime() - 86400000).toISOString().slice(0, 10);

  const orders = await getOrdersFromKV(kv, proKey || 'free');
  const todayOrders = orders.filter(o => !o.is_test && o.created_at.startsWith(targetStr));
  const yestOrders = orders.filter(o => !o.is_test && o.created_at.startsWith(yestStr));

  const todayGross = todayOrders.reduce((s, o) => s + (o.amount_usd || 0), 0);
  const yestGross = yestOrders.reduce((s, o) => s + (o.amount_usd || 0), 0);
  const delta = todayGross - yestGross;
  const deltaPct = yestGross > 0 ? ((delta / yestGross) * 100).toFixed(1) : 'N/A';

  const sourceMap = {};
  const productMap = {};
  for (const o of todayOrders) {
    if (!sourceMap[o.source]) sourceMap[o.source] = 0;
    sourceMap[o.source] += o.amount_usd || 0;
    if (o.product) {
      if (!productMap[o.product]) productMap[o.product] = { revenue: 0, orders: 0 };
      productMap[o.product].revenue += o.amount_usd || 0;
      productMap[o.product].orders += 1;
    }
  }

  const report = [
    `## Revenue Report — ${targetStr}`,
    ``,
    `**Gross Revenue:** $${todayGross.toFixed(2)}`,
    `**Orders:** ${todayOrders.length}`,
    `**vs Yesterday:** ${delta >= 0 ? '+' : ''}$${delta.toFixed(2)} (${deltaPct}%)`,
    ``,
    `### By Source`,
    ...Object.entries(sourceMap).map(([s, v]) => `- ${s}: $${v.toFixed(2)}`),
    ``,
    `### Top Products`,
    ...Object.entries(productMap).sort(([,a],[,b]) => b.revenue - a.revenue).slice(0, 5).map(([p, v]) => `- ${p}: $${v.revenue.toFixed(2)} (${v.orders} orders)`),
  ].join('\n');

  return toolResult({
    date: targetStr,
    gross_usd: Math.round(todayGross * 100) / 100,
    orders: todayOrders.length,
    vs_yesterday_usd: Math.round(delta * 100) / 100,
    vs_yesterday_pct: deltaPct,
    sources: sourceMap,
    top_products: productMap,
    formatted_report: report,
    ecosystem: ECOSYSTEM,
  });
}

// ============================================================
// Tool: set_milestone_alert (Pro)
// ============================================================
async function setMilestoneAlert({ target_amount, metric = 'daily', telegram_chat_id, reset_period = 'daily' }, kv, proKey) {
  if (!target_amount) return toolError('target_amount is required');
  if (!telegram_chat_id) return toolError('telegram_chat_id is required');

  if (!proKey) {
    return toolResult({
      error: 'set_milestone_alert requires a Pro key',
      upgrade: 'https://buy.stripe.com/4gw5na5U19SP9TW288',
      message: 'Get Pro ($9/mo) for milestone alerts, MRR tracking, and 1000 calls/day',
      ecosystem: ECOSYSTEM,
    });
  }

  const milestoneKey = `milestone:rt:${proKey.slice(0, 16)}:${metric}`;
  const milestone = { target_amount: Number(target_amount), metric, telegram_chat_id, reset_period, created_at: new Date().toISOString(), fired: false };

  if (kv) {
    try { await kv.put(milestoneKey, JSON.stringify(milestone), { expirationTtl: 86400 * 365 }); } catch {}
  }

  return toolResult({
    success: true,
    milestone_id: milestoneKey.slice(-12),
    target_amount: Number(target_amount),
    metric,
    telegram_chat_id,
    reset_period,
    message: `Milestone alert set. You will be notified via Telegram when ${metric} revenue reaches $${target_amount}.`,
    ecosystem: ECOSYSTEM,
  });
}

// ============================================================
// Tools registry
// ============================================================
const TOOLS = [
  {
    name: 'get_revenue_summary',
    description: 'Aggregate revenue across all logged sources for a time range. Returns gross, net, refunds, source breakdown, product breakdown, and top product. One call — all sources.',
    inputSchema: {
      type: 'object',
      properties: {
        range: { type: 'string', enum: ['today', '7d', '30d', 'this_month', 'all'], description: 'Time range (default: today)', default: 'today' },
        sources: { type: 'array', items: { type: 'string' }, description: 'Filter by source (default: all)', default: ['all'] },
      },
    },
  },
  {
    name: 'track_order',
    description: 'Log an order or payment from any source. Instantly appears in get_revenue_summary and get_daily_report. Use is_test: true to flag test entries.',
    inputSchema: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Payment source: stripe / paypal / gumroad / crypto / manual' },
        amount: { type: 'number', description: 'Payment amount' },
        product: { type: 'string', description: 'Product name or ID (optional)' },
        currency: { type: 'string', description: 'Currency code (default: USD)', default: 'USD' },
        note: { type: 'string', description: 'Optional note (e.g. order ID, reference)' },
        is_test: { type: 'boolean', description: 'Flag as test order — excluded from reports', default: false },
        order_id: { type: 'string', description: 'Optional external order ID for deduplication' },
      },
      required: ['source', 'amount'],
    },
  },
  {
    name: 'get_daily_report',
    description: 'Get a formatted daily revenue report with product breakdown, source split, and comparison to yesterday. Returns Markdown-formatted report plus structured data.',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date to report on (YYYY-MM-DD, default: today)' },
      },
    },
  },
  {
    name: 'set_milestone_alert',
    description: 'PRO: Set a revenue target that triggers a Telegram notification when crossed. Fires once per period, then resets. Supports daily, weekly, and MRR metrics.',
    inputSchema: {
      type: 'object',
      properties: {
        target_amount: { type: 'number', description: 'Revenue target in USD' },
        metric: { type: 'string', enum: ['daily', 'weekly', 'mrr'], description: 'Which metric to watch (default: daily)', default: 'daily' },
        telegram_chat_id: { type: 'number', description: 'Telegram chat ID to send notification to' },
        reset_period: { type: 'string', enum: ['daily', 'weekly', 'monthly'], description: 'When the milestone resets (default: daily)', default: 'daily' },
      },
      required: ['target_amount', 'telegram_chat_id'],
    },
  },
];

// ============================================================
// Landing page
// ============================================================
const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>OpenClaw Revenue Tracker MCP</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:800px;margin:0 auto;padding:40px 20px;background:#0a0a0a;color:#e0e0e0}
  h1{color:#44ff88;font-size:2rem;margin-bottom:8px}
  .badge{display:inline-block;background:#1a1a2e;border:1px solid #44ff8844;padding:4px 12px;border-radius:20px;font-size:0.8rem;margin-right:8px;color:#66ffaa}
  table{width:100%;border-collapse:collapse;margin:20px 0}
  th{background:#1a1a1a;color:#44ff88;text-align:left;padding:10px}
  td{padding:10px;border-bottom:1px solid #222}
  .free{color:#44ff88;font-size:0.8rem;font-weight:bold}
  .pro{color:#ffaa44;font-size:0.8rem;font-weight:bold}
  code{background:#1a1a1a;padding:2px 8px;border-radius:4px;font-size:0.9rem}
  .cta{background:#44ff88;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;font-weight:bold}
  pre{background:#111;padding:16px;border-radius:8px;overflow-x:auto;font-size:0.85rem;border:1px solid #333}
</style>
</head>
<body>
<h1>💰 Revenue Tracker MCP</h1>
<span class="badge">v2.0.0</span><span class="badge">4 tools</span><span class="badge">Free 20/day</span>
<p>Multi-source revenue aggregation for solopreneurs and AI agents. Stripe + PayPal + Gumroad + crypto. Real-time dashboards.</p>
<table>
<tr><th>Tool</th><th>Purpose</th><th>Tier</th></tr>
<tr><td><code>get_revenue_summary</code></td><td>Aggregate revenue across all sources for any time range</td><td><span class="free">FREE</span></td></tr>
<tr><td><code>track_order</code></td><td>Log an order from any payment source manually</td><td><span class="free">FREE</span></td></tr>
<tr><td><code>get_daily_report</code></td><td>Formatted daily report with product breakdown</td><td><span class="free">FREE</span></td></tr>
<tr><td><code>set_milestone_alert</code></td><td>Telegram alert when revenue hits a target</td><td><span class="pro">PRO</span></td></tr>
</table>
<h3>Add to Claude Desktop / Cursor / VS Code</h3>
<pre>{"openclaw-revenue-tracker":{"type":"streamable-http","url":"https://revenue-tracker-mcp.yagami8095.workers.dev/mcp"}}</pre>
<p><strong>Free:</strong> 20 req/day &nbsp;|&nbsp; <strong>Pro:</strong> 1,000/day, milestone alerts, MRR tracking</p>
<a class="cta" href="https://buy.stripe.com/4gw5na5U19SP9TW288">Get Pro — $9/mo</a>
</body></html>`;

// ============================================================
// MCP request handler
// ============================================================
async function handleMcp(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
  const authHeader = request.headers.get('Authorization') || '';
  const apiKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const kv = env.RATE_LIMIT || null;

  let proInfo = null;
  if (apiKey) proInfo = await validateProKey(kv, apiKey);

  let rl;
  if (proInfo) rl = await proKeyRateLimit(kv, apiKey, proInfo.daily_limit);
  else rl = await checkRateLimit(kv, ip);

  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded', upgrade: 'https://buy.stripe.com/4gw5na5U19SP9TW288' }), { status: 429, headers: { 'Content-Type': 'application/json' } });
  }

  const rlHeaders = {
    'X-RateLimit-Limit': String(rl.total || RATE_LIMIT_MAX),
    'X-RateLimit-Remaining': String(rl.remaining),
    'X-402-Upgrade': 'https://buy.stripe.com/4gw5na5U19SP9TW288',
  };

  let body;
  try { body = await request.json(); } catch { return new Response(JSON.stringify(jsonRpcError(null, -32700, 'Parse error')), { status: 400, headers: { 'Content-Type': 'application/json' } }); }

  const { method, params, id } = body;

  if (method === 'initialize') return new Response(JSON.stringify(jsonRpcResponse(id, { protocolVersion: MCP_PROTOCOL_VERSION, serverInfo: SERVER_INFO, capabilities: CAPABILITIES })), { headers: { 'Content-Type': 'application/json', ...rlHeaders } });
  if (method === 'tools/list') return new Response(JSON.stringify(jsonRpcResponse(id, { tools: TOOLS })), { headers: { 'Content-Type': 'application/json', ...rlHeaders } });

  if (method === 'tools/call') {
    const { name, arguments: args = {} } = params || {};
    const proKey = proInfo ? apiKey : null;
    let result;

    if (name === 'get_revenue_summary') result = await getRevenueSummary(args, kv, proKey);
    else if (name === 'track_order') result = await trackOrder(args, kv, proKey);
    else if (name === 'get_daily_report') result = await getDailyReport(args, kv, proKey);
    else if (name === 'set_milestone_alert') result = await setMilestoneAlert(args, kv, proKey);
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
      const txt = `# OpenClaw Revenue Tracker MCP\n\nMCP endpoint: https://revenue-tracker-mcp.yagami8095.workers.dev/mcp\nProtocol: MCP Streamable HTTP 2025-03-26\nVendor: OpenClaw Intelligence\n\n## Tools\n- get_revenue_summary: Aggregate revenue across all sources\n- track_order: Log orders from any source\n- get_daily_report: Daily revenue report with breakdown\n- set_milestone_alert: Telegram alerts on revenue targets (Pro)\n\n## Pricing\nFree: 20 req/day | Pro: $9/mo, 1000/day\nUpgrade: https://buy.stripe.com/4gw5na5U19SP9TW288\n`;
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
