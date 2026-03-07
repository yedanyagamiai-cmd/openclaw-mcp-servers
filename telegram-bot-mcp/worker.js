/**
 * OpenClaw Telegram Bot MCP Server
 * Telegram bot toolkit for AI agents. 5 tools. Rich formatting. Bidirectional.
 *
 * Tools:
 *   1. send_message  — Send text or Markdown message to any chat
 *   2. send_alert    — Formatted alert with severity level and action buttons
 *   3. get_updates   — Poll for new messages and commands from Telegram users
 *   4. set_commands  — Register bot command menu (Pro)
 *   5. send_report   — Structured multi-section report with tables
 *
 * Vendor: OpenClaw Intelligence
 * MCP Protocol: 2025-03-26
 */

const SERVER_INFO = { name: 'telegram-bot', version: '2.0.0' };
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
  telegram_bot:     'https://telegram-bot-mcp.yagami8095.workers.dev/mcp',
  health_monitor:   'https://health-monitor-mcp.yagami8095.workers.dev/mcp',
  revenue_tracker:  'https://revenue-tracker-mcp.yagami8095.workers.dev/mcp',
  api_monitor:      'https://api-monitor-mcp.yagami8095.workers.dev/mcp',
  store:            'https://product-store.yagami8095.workers.dev',
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
  const key = `rl:tg:${ip}:${today}`;
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
// Telegram API helper
// ============================================================
async function telegramRequest(method, payload, botToken) {
  if (!botToken) throw new Error('bot_token is required');
  const url = `https://api.telegram.org/bot${botToken}/${method}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

// ============================================================
// Tool: send_message
// ============================================================
async function sendMessage({ chat_id, text, parse_mode = 'Markdown', bot_token, disable_notification = false }) {
  if (!chat_id) return toolError('chat_id is required');
  if (!text) return toolError('text is required');
  if (!bot_token) return toolError('bot_token is required — your Telegram bot token from @BotFather');

  try {
    const result = await telegramRequest('sendMessage', {
      chat_id,
      text: text.slice(0, 4096),
      parse_mode,
      disable_notification,
    }, bot_token);

    if (!result.ok) return toolError(`Telegram API error: ${result.description}`);
    return toolResult({
      success: true,
      message_id: result.result.message_id,
      chat_id,
      delivered_at: new Date().toISOString(),
      ecosystem: ECOSYSTEM,
    });
  } catch (e) {
    return toolError(`Failed to send message: ${e.message}`);
  }
}

// ============================================================
// Tool: send_alert
// ============================================================
const SEVERITY_EMOJI = { info: 'ℹ️', warning: '⚠️', error: '🔴', critical: '🚨' };

async function sendAlert({ chat_id, severity = 'info', title, description = null, actions = [], bot_token }) {
  if (!chat_id) return toolError('chat_id is required');
  if (!title) return toolError('title is required');
  if (!bot_token) return toolError('bot_token is required');

  const emoji = SEVERITY_EMOJI[severity] || 'ℹ️';
  let text = `${emoji} *${severity.toUpperCase()}*: ${title}`;
  if (description) text += `\n\n${description}`;
  text += `\n\n_${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC_`;

  const keyboard = actions.length > 0 ? {
    inline_keyboard: [actions.map(a => ({ text: a.label, url: a.url || undefined, callback_data: a.callback_data || undefined }))],
  } : undefined;

  try {
    const result = await telegramRequest('sendMessage', {
      chat_id,
      text,
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    }, bot_token);

    if (!result.ok) return toolError(`Telegram API error: ${result.description}`);
    return toolResult({
      success: true,
      message_id: result.result.message_id,
      severity,
      title,
      delivered_at: new Date().toISOString(),
      ecosystem: ECOSYSTEM,
    });
  } catch (e) {
    return toolError(`Failed to send alert: ${e.message}`);
  }
}

// ============================================================
// Tool: get_updates
// ============================================================
async function getUpdates({ bot_token, offset = null, limit = 20, timeout = 0 }) {
  if (!bot_token) return toolError('bot_token is required');

  try {
    const payload = { limit: Math.min(limit, 100), timeout };
    if (offset != null) payload.offset = offset;

    const result = await telegramRequest('getUpdates', payload, bot_token);
    if (!result.ok) return toolError(`Telegram API error: ${result.description}`);

    const updates = (result.result || []).map(u => {
      const msg = u.message || u.callback_query?.message;
      const text = u.message?.text || '';
      const isCommand = text.startsWith('/');

      return {
        update_id: u.update_id,
        type: u.callback_query ? 'callback' : isCommand ? 'command' : 'text',
        command: isCommand ? text.split(' ')[0].slice(1).split('@')[0] : null,
        args: isCommand ? text.split(' ').slice(1) : [],
        text: isCommand ? null : text,
        callback_data: u.callback_query?.data || null,
        chat_id: msg?.chat?.id || u.callback_query?.message?.chat?.id,
        user: msg?.from?.username || u.callback_query?.from?.username,
        timestamp: new Date((msg?.date || 0) * 1000).toISOString(),
      };
    });

    const nextOffset = updates.length > 0 ? updates[updates.length - 1].update_id + 1 : offset;

    return toolResult({
      updates,
      count: updates.length,
      next_offset: nextOffset,
      ecosystem: ECOSYSTEM,
    });
  } catch (e) {
    return toolError(`Failed to get updates: ${e.message}`);
  }
}

// ============================================================
// Tool: set_commands (Pro)
// ============================================================
async function setCommands({ bot_token, commands, scope = 'all' }, proKey) {
  if (!bot_token) return toolError('bot_token is required');
  if (!commands || !Array.isArray(commands) || commands.length === 0) return toolError('commands array is required');

  if (!proKey) {
    return toolResult({
      error: 'set_commands requires a Pro key',
      upgrade: 'https://buy.stripe.com/4gw5na5U19SP9TW288',
      message: 'Get Pro ($9/mo) for bot command registration, AlertStack escalation, and 1000 calls/day',
      ecosystem: ECOSYSTEM,
    });
  }

  const scopePayload = scope === 'private' ? { type: 'all_private_chats' } : scope === 'group' ? { type: 'all_group_chats' } : { type: 'default' };

  try {
    const result = await telegramRequest('setMyCommands', {
      commands: commands.map(c => ({ command: c.command.replace(/^\//, ''), description: c.description.slice(0, 256) })),
      scope: scopePayload,
    }, bot_token);

    if (!result.ok) return toolError(`Telegram API error: ${result.description}`);
    return toolResult({
      success: true,
      commands_registered: commands.length,
      scope,
      message: 'Bot command menu updated. Users will see these commands when they type "/" in your bot.',
      ecosystem: ECOSYSTEM,
    });
  } catch (e) {
    return toolError(`Failed to set commands: ${e.message}`);
  }
}

// ============================================================
// Tool: send_report
// ============================================================
async function sendReport({ chat_id, bot_token, title, sections = [], footer = null }) {
  if (!chat_id) return toolError('chat_id is required');
  if (!bot_token) return toolError('bot_token is required');
  if (!title) return toolError('title is required');

  const lines = [`*${title}*`, ''];
  for (const section of sections) {
    if (section.heading) lines.push(`*${section.heading}*`);
    if (section.content) lines.push(section.content);
    lines.push('');
  }
  if (footer) lines.push(`_${footer}_`);
  lines.push(`_Sent: ${new Date().toISOString().replace('T', ' ').slice(0, 16)} UTC_`);

  const fullText = lines.join('\n');
  const chunks = [];
  for (let i = 0; i < fullText.length; i += 4096) chunks.push(fullText.slice(i, i + 4096));

  try {
    const messageIds = [];
    for (const chunk of chunks) {
      const result = await telegramRequest('sendMessage', { chat_id, text: chunk, parse_mode: 'Markdown' }, bot_token);
      if (!result.ok) return toolError(`Telegram API error: ${result.description}`);
      messageIds.push(result.result.message_id);
    }
    return toolResult({
      success: true,
      message_ids: messageIds,
      messages_sent: chunks.length,
      total_chars: fullText.length,
      delivered_at: new Date().toISOString(),
      ecosystem: ECOSYSTEM,
    });
  } catch (e) {
    return toolError(`Failed to send report: ${e.message}`);
  }
}

// ============================================================
// Tools registry
// ============================================================
const TOOLS = [
  {
    name: 'send_message',
    description: 'Send a text or Markdown-formatted message to a Telegram chat. Supports bold, italic, code formatting. Delivered in <2 seconds via Cloudflare edge.',
    inputSchema: {
      type: 'object',
      properties: {
        chat_id: { type: 'number', description: 'Telegram chat ID to send to' },
        text: { type: 'string', description: 'Message text (Markdown supported, max 4096 chars)' },
        parse_mode: { type: 'string', enum: ['Markdown', 'HTML', 'MarkdownV2'], description: 'Text formatting mode (default: Markdown)', default: 'Markdown' },
        bot_token: { type: 'string', description: 'Your Telegram bot token from @BotFather' },
        disable_notification: { type: 'boolean', description: 'Send silently (default: false)', default: false },
      },
      required: ['chat_id', 'text', 'bot_token'],
    },
  },
  {
    name: 'send_alert',
    description: 'Send a formatted severity alert (info/warning/error/critical) with emoji, title, description, and optional action buttons. AlertStack deduplicates identical alerts.',
    inputSchema: {
      type: 'object',
      properties: {
        chat_id: { type: 'number', description: 'Telegram chat ID' },
        severity: { type: 'string', enum: ['info', 'warning', 'error', 'critical'], description: 'Alert severity level (default: info)', default: 'info' },
        title: { type: 'string', description: 'Alert title (short, descriptive)' },
        description: { type: 'string', description: 'Alert description with details (optional)' },
        actions: { type: 'array', description: 'Inline button actions (optional)', items: { type: 'object', properties: { label: { type: 'string' }, url: { type: 'string' } } } },
        bot_token: { type: 'string', description: 'Your Telegram bot token from @BotFather' },
      },
      required: ['chat_id', 'title', 'bot_token'],
    },
  },
  {
    name: 'get_updates',
    description: 'Poll for new messages, commands, and button callbacks from your Telegram bot. Returns parsed updates with command/args/text/callback_data. Use offset to avoid duplicate updates.',
    inputSchema: {
      type: 'object',
      properties: {
        bot_token: { type: 'string', description: 'Your Telegram bot token from @BotFather' },
        offset: { type: 'number', description: 'Update offset for pagination (use next_offset from previous response)' },
        limit: { type: 'number', description: 'Max updates to return (default: 20, max: 100)', default: 20 },
        timeout: { type: 'number', description: 'Long polling timeout in seconds (default: 0 = no wait)', default: 0 },
      },
      required: ['bot_token'],
    },
  },
  {
    name: 'set_commands',
    description: 'PRO: Register the bot command menu that appears when users type "/" in your Telegram bot. Commands appear with descriptions in the Telegram UI.',
    inputSchema: {
      type: 'object',
      properties: {
        bot_token: { type: 'string', description: 'Your Telegram bot token from @BotFather' },
        commands: { type: 'array', description: 'Commands to register', items: { type: 'object', properties: { command: { type: 'string', description: 'Command name (without /)' }, description: { type: 'string', description: 'Short description shown in menu' } }, required: ['command', 'description'] } },
        scope: { type: 'string', enum: ['all', 'private', 'group'], description: 'Where commands are shown (default: all)', default: 'all' },
      },
      required: ['bot_token', 'commands'],
    },
  },
  {
    name: 'send_report',
    description: 'Send a multi-section formatted report to Telegram. Supports section headings, content, and footer. Auto-splits into multiple messages if over 4096 chars.',
    inputSchema: {
      type: 'object',
      properties: {
        chat_id: { type: 'number', description: 'Telegram chat ID' },
        bot_token: { type: 'string', description: 'Your Telegram bot token from @BotFather' },
        title: { type: 'string', description: 'Report title shown at top' },
        sections: { type: 'array', description: 'Report sections', items: { type: 'object', properties: { heading: { type: 'string' }, content: { type: 'string' } } } },
        footer: { type: 'string', description: 'Optional footer text (shown at bottom in italic)' },
      },
      required: ['chat_id', 'bot_token', 'title'],
    },
  },
];

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>OpenClaw Telegram Bot MCP</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:800px;margin:0 auto;padding:40px 20px;background:#0a0a0a;color:#e0e0e0}
  h1{color:#229ed9;font-size:2rem;margin-bottom:8px}
  .badge{display:inline-block;background:#1a1a2e;border:1px solid #229ed944;padding:4px 12px;border-radius:20px;font-size:0.8rem;margin-right:8px;color:#44aaff}
  table{width:100%;border-collapse:collapse;margin:20px 0}
  th{background:#1a1a1a;color:#229ed9;text-align:left;padding:10px}
  td{padding:10px;border-bottom:1px solid #222}
  .free{color:#44ff88;font-size:0.8rem;font-weight:bold}
  .pro{color:#ffaa44;font-size:0.8rem;font-weight:bold}
  code{background:#1a1a1a;padding:2px 8px;border-radius:4px;font-size:0.9rem}
  .cta{background:#229ed9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;font-weight:bold}
  pre{background:#111;padding:16px;border-radius:8px;overflow-x:auto;font-size:0.85rem;border:1px solid #333}
</style>
</head>
<body>
<h1>💬 Telegram Bot MCP</h1>
<span class="badge">v2.0.0</span><span class="badge">5 tools</span><span class="badge">Free 20/day</span>
<p>Telegram bot toolkit for AI agents. Rich formatting. Instant delivery. Bidirectional command handling.</p>
<table>
<tr><th>Tool</th><th>Purpose</th><th>Tier</th></tr>
<tr><td><code>send_message</code></td><td>Send text or Markdown message to any chat</td><td><span class="free">FREE</span></td></tr>
<tr><td><code>send_alert</code></td><td>Formatted severity alert with action buttons</td><td><span class="free">FREE</span></td></tr>
<tr><td><code>get_updates</code></td><td>Poll for new messages and commands</td><td><span class="free">FREE</span></td></tr>
<tr><td><code>send_report</code></td><td>Multi-section report with sections and tables</td><td><span class="free">FREE</span></td></tr>
<tr><td><code>set_commands</code></td><td>Register bot command menu</td><td><span class="pro">PRO</span></td></tr>
</table>
<h3>Add to Claude Desktop / Cursor / VS Code</h3>
<pre>{"openclaw-telegram-bot":{"type":"streamable-http","url":"https://telegram-bot-mcp.yagami8095.workers.dev/mcp"}}</pre>
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

    if (name === 'send_message') result = await sendMessage(args);
    else if (name === 'send_alert') result = await sendAlert(args);
    else if (name === 'get_updates') result = await getUpdates(args);
    else if (name === 'set_commands') result = await setCommands(args, proKey);
    else if (name === 'send_report') result = await sendReport(args);
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
      const txt = `# OpenClaw Telegram Bot MCP\n\nMCP endpoint: https://telegram-bot-mcp.yagami8095.workers.dev/mcp\nProtocol: MCP Streamable HTTP 2025-03-26\n\n## Tools\n- send_message: Send text/Markdown to any chat\n- send_alert: Severity alerts with action buttons\n- get_updates: Poll for messages and commands\n- send_report: Multi-section formatted report\n- set_commands: Register bot command menu (Pro)\n\nUpgrade: https://buy.stripe.com/4gw5na5U19SP9TW288\n`;
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
