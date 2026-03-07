/**
 * OpenClaw Task Queue MCP Server
 * Persistent task queue for AI agents. 5 tools. KV-backed. Priority scheduling.
 *
 * Tools:
 *   1. create_task    — Create a new task with title, description, priority, metadata
 *   2. get_tasks      — List tasks filtered by status, agent, priority, or tag
 *   3. assign_task    — Assign task to agent or pull next unassigned task
 *   4. complete_task  — Mark task complete with output summary
 *   5. get_task_stats — Queue statistics: throughput, completion rate, backlog
 *
 * Vendor: OpenClaw Intelligence
 * MCP Protocol: 2025-03-26
 */

const SERVER_INFO = { name: 'task-queue', version: '2.0.0' };
const CAPABILITIES = { tools: {} };
const MCP_PROTOCOL_VERSION = '2025-03-26';

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW = 86400;
const PRO_DAILY_LIMIT = 1000;
const FREE_MAX_TASKS = 100;

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
  task_queue:       'https://task-queue-mcp.yagami8095.workers.dev/mcp',
  agent_orchestrator:'https://agent-orchestrator-mcp.yagami8095.workers.dev/mcp',
  database_toolkit: 'https://database-toolkit-mcp.yagami8095.workers.dev/mcp',
  telegram_bot:     'https://telegram-bot-mcp.yagami8095.workers.dev/mcp',
  store:            'https://product-store.yagami8095.workers.dev',
};

const PRIORITY_ORDER = { critical: 0, high: 1, normal: 2, low: 3 };

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
  const key = `rl:tq:${ip}:${today}`;
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
// KV Task Store
// ============================================================
function queueKey(scopeKey) { return `tq:queue:${scopeKey}`; }

async function getTasks(kv, scopeKey) {
  if (!kv) return [];
  try {
    const data = await kv.get(queueKey(scopeKey), { type: 'json' });
    return data || [];
  } catch { return []; }
}

async function saveTasks(kv, scopeKey, tasks) {
  if (!kv) return;
  try {
    await kv.put(queueKey(scopeKey), JSON.stringify(tasks.slice(-500)), { expirationTtl: 86400 * 90 });
  } catch {}
}

function scopeFromRequest(ip, proKey) {
  return proKey ? `pro:${proKey.slice(0, 16)}` : `free:${ip.replace(/[^a-z0-9]/gi, '_')}`;
}

// ============================================================
// Tool: create_task
// ============================================================
async function createTask({ title, description = '', priority = 'normal', tags = [], metadata = {}, agent_id = null, depends_on = [] }, kv, scope) {
  if (!title) return toolError('title is required');
  if (!['critical', 'high', 'normal', 'low'].includes(priority)) return toolError('priority must be critical/high/normal/low');

  const tasks = await getTasks(kv, scope);
  if (tasks.length >= FREE_MAX_TASKS) {
    return toolResult({ error: 'Free tier limit: 100 tasks max. Upgrade to Pro for unlimited tasks.', upgrade: 'https://buy.stripe.com/4gw5na5U19SP9TW288', ecosystem: ECOSYSTEM });
  }

  const id = `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const task = {
    id,
    title: title.slice(0, 200),
    description,
    priority,
    status: agent_id ? 'assigned' : 'queued',
    agent_id,
    depends_on,
    tags,
    metadata,
    created_at: new Date().toISOString(),
    assigned_at: agent_id ? new Date().toISOString() : null,
    completed_at: null,
    output: null,
  };

  tasks.push(task);
  await saveTasks(kv, scope, tasks);

  return toolResult({ success: true, id, title, priority, status: task.status, agent_id, created_at: task.created_at, ecosystem: ECOSYSTEM });
}

// ============================================================
// Tool: get_tasks
// ============================================================
async function getTasksList({ status = null, agent_id = null, priority = null, tag = null, limit = 20 }, kv, scope) {
  const tasks = await getTasks(kv, scope);
  let filtered = tasks;

  if (status) filtered = filtered.filter(t => t.status === status);
  if (agent_id) filtered = filtered.filter(t => t.agent_id === agent_id);
  if (priority) filtered = filtered.filter(t => t.priority === priority);
  if (tag) filtered = filtered.filter(t => t.tags && t.tags.includes(tag));

  filtered.sort((a, b) => {
    const pDiff = (PRIORITY_ORDER[a.priority] || 2) - (PRIORITY_ORDER[b.priority] || 2);
    if (pDiff !== 0) return pDiff;
    return new Date(a.created_at) - new Date(b.created_at);
  });

  return toolResult({
    tasks: filtered.slice(0, limit).map(t => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      status: t.status,
      agent_id: t.agent_id,
      tags: t.tags,
      created_at: t.created_at,
      assigned_at: t.assigned_at,
      completed_at: t.completed_at,
    })),
    total: filtered.length,
    shown: Math.min(filtered.length, limit),
    ecosystem: ECOSYSTEM,
  });
}

// ============================================================
// Tool: assign_task
// ============================================================
async function assignTask({ task_id = null, agent_id, role_hint = null }, kv, scope) {
  if (!agent_id) return toolError('agent_id is required');

  const tasks = await getTasks(kv, scope);

  let task;
  if (task_id) {
    task = tasks.find(t => t.id === task_id);
    if (!task) return toolError(`Task not found: ${task_id}`);
  } else {
    // Pull highest-priority unassigned task
    const available = tasks
      .filter(t => t.status === 'queued' && (!t.depends_on || t.depends_on.length === 0))
      .sort((a, b) => (PRIORITY_ORDER[a.priority] || 2) - (PRIORITY_ORDER[b.priority] || 2) || new Date(a.created_at) - new Date(b.created_at));
    task = available[0];
    if (!task) return toolResult({ task: null, message: 'No unassigned tasks available', ecosystem: ECOSYSTEM });
  }

  task.status = 'in_progress';
  task.agent_id = agent_id;
  task.assigned_at = new Date().toISOString();

  await saveTasks(kv, scope, tasks);

  return toolResult({ success: true, task_id: task.id, title: task.title, description: task.description, priority: task.priority, metadata: task.metadata, assigned_to: agent_id, assigned_at: task.assigned_at, ecosystem: ECOSYSTEM });
}

// ============================================================
// Tool: complete_task
// ============================================================
async function completeTask({ task_id, output = '', duration_sec = null }, kv, scope) {
  if (!task_id) return toolError('task_id is required');

  const tasks = await getTasks(kv, scope);
  const task = tasks.find(t => t.id === task_id);
  if (!task) return toolError(`Task not found: ${task_id}`);

  task.status = 'completed';
  task.completed_at = new Date().toISOString();
  task.output = output;
  if (duration_sec) task.duration_sec = duration_sec;

  // Unlock dependent tasks
  const unlocked = [];
  for (const t of tasks) {
    if (t.depends_on && t.depends_on.includes(task_id) && t.status === 'queued') {
      const allDone = t.depends_on.every(depId => {
        const dep = tasks.find(d => d.id === depId);
        return dep && dep.status === 'completed';
      });
      if (allDone) { t.status = 'queued'; unlocked.push(t.id); }
    }
  }

  await saveTasks(kv, scope, tasks);

  return toolResult({ success: true, task_id, status: 'completed', completed_at: task.completed_at, output_recorded: output.length > 0, unlocked_tasks: unlocked, ecosystem: ECOSYSTEM });
}

// ============================================================
// Tool: get_task_stats
// ============================================================
async function getTaskStats(args, kv, scope) {
  const tasks = await getTasks(kv, scope);
  const today = new Date().toISOString().slice(0, 10);

  const byStatus = { queued: 0, assigned: 0, in_progress: 0, completed: 0, failed: 0, cancelled: 0 };
  for (const t of tasks) {
    if (byStatus[t.status] !== undefined) byStatus[t.status]++;
  }

  const todayCompleted = tasks.filter(t => t.status === 'completed' && t.completed_at && t.completed_at.startsWith(today)).length;
  const todayCreated = tasks.filter(t => t.created_at && t.created_at.startsWith(today)).length;

  const completedWithDuration = tasks.filter(t => t.status === 'completed' && t.duration_sec);
  const avgDurationSec = completedWithDuration.length > 0 ? completedWithDuration.reduce((s, t) => s + t.duration_sec, 0) / completedWithDuration.length : null;

  const total = tasks.length;
  const completionRate = total > 0 ? Math.round((byStatus.completed / total) * 100) : 0;

  const backlogByPriority = { critical: 0, high: 0, normal: 0, low: 0 };
  for (const t of tasks.filter(t => t.status === 'queued' || t.status === 'assigned')) {
    if (backlogByPriority[t.priority] !== undefined) backlogByPriority[t.priority]++;
  }

  return toolResult({
    total_tasks: total,
    by_status: byStatus,
    tasks_completed_today: todayCompleted,
    tasks_created_today: todayCreated,
    avg_duration_min: avgDurationSec ? Math.round(avgDurationSec / 60) : null,
    completion_rate_pct: completionRate,
    backlog_by_priority: backlogByPriority,
    free_tier_remaining: Math.max(0, FREE_MAX_TASKS - total),
    ecosystem: ECOSYSTEM,
  });
}

// ============================================================
// Tools registry
// ============================================================
const TOOLS = [
  {
    name: 'create_task',
    description: 'Create a new task in the persistent queue. Survives agent restarts and session crashes. Supports priority (critical/high/normal/low), tags, metadata, and optional pre-assignment to an agent.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short task title (max 200 chars)' },
        description: { type: 'string', description: 'Full task details, context, and expected output' },
        priority: { type: 'string', enum: ['critical', 'high', 'normal', 'low'], description: 'Task priority (default: normal)', default: 'normal' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Free-form tags for filtering' },
        metadata: { type: 'object', description: 'Arbitrary key-value pairs for agent use' },
        agent_id: { type: 'string', description: 'Pre-assign to a specific agent (optional)' },
        depends_on: { type: 'array', items: { type: 'string' }, description: 'Task IDs that must complete before this one' },
      },
      required: ['title'],
    },
  },
  {
    name: 'get_tasks',
    description: 'List tasks with optional filters. Filter by status (queued/in_progress/completed/failed), agent_id, priority, or tag. Results sorted by priority then creation time.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['queued', 'assigned', 'in_progress', 'completed', 'failed', 'cancelled'], description: 'Filter by status' },
        agent_id: { type: 'string', description: 'Filter by assigned agent' },
        priority: { type: 'string', enum: ['critical', 'high', 'normal', 'low'], description: 'Filter by priority' },
        tag: { type: 'string', description: 'Filter by tag' },
        limit: { type: 'number', description: 'Max tasks to return (default: 20)', default: 20 },
      },
    },
  },
  {
    name: 'assign_task',
    description: 'Assign a specific task to an agent, or pull the next highest-priority unassigned task. Sets status to in_progress. Omit task_id to get the next available task by priority.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'Agent ID to assign the task to' },
        task_id: { type: 'string', description: 'Specific task ID (omit to get next highest-priority task)' },
        role_hint: { type: 'string', description: 'Role hint for routing (optional)' },
      },
      required: ['agent_id'],
    },
  },
  {
    name: 'complete_task',
    description: 'Mark a task as complete with an output summary. Records completion time, unlocks any tasks that depend on this one, and updates queue statistics.',
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'Task ID to mark complete' },
        output: { type: 'string', description: 'Summary of what was done and the result' },
        duration_sec: { type: 'number', description: 'Time taken in seconds (optional, for stats)' },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'get_task_stats',
    description: 'Get aggregate queue statistics: task counts by status, today throughput, completion rate, average duration, and backlog depth by priority.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>OpenClaw Task Queue MCP</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:800px;margin:0 auto;padding:40px 20px;background:#0a0a0a;color:#e0e0e0}
  h1{color:#aa88ff;font-size:2rem;margin-bottom:8px}
  .badge{display:inline-block;background:#1a1a2e;border:1px solid #aa88ff44;padding:4px 12px;border-radius:20px;font-size:0.8rem;margin-right:8px;color:#cc99ff}
  table{width:100%;border-collapse:collapse;margin:20px 0}
  th{background:#1a1a1a;color:#aa88ff;text-align:left;padding:10px}
  td{padding:10px;border-bottom:1px solid #222}
  .free{color:#44ff88;font-size:0.8rem;font-weight:bold}
  code{background:#1a1a1a;padding:2px 8px;border-radius:4px;font-size:0.9rem}
  .cta{background:#aa88ff;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;font-weight:bold}
  pre{background:#111;padding:16px;border-radius:8px;overflow-x:auto;font-size:0.85rem;border:1px solid #333}
</style>
</head>
<body>
<h1>📋 Task Queue MCP</h1>
<span class="badge">v2.0.0</span><span class="badge">5 tools</span><span class="badge">Free 20/day</span>
<p>Persistent task queue for AI agents. Survives restarts. Priority scheduling. Multi-agent assignment.</p>
<table>
<tr><th>Tool</th><th>Purpose</th><th>Tier</th></tr>
<tr><td><code>create_task</code></td><td>Create tasks with priority, tags, dependencies</td><td><span class="free">FREE</span></td></tr>
<tr><td><code>get_tasks</code></td><td>List and filter tasks by status/agent/priority/tag</td><td><span class="free">FREE</span></td></tr>
<tr><td><code>assign_task</code></td><td>Assign to agent or pull next highest-priority task</td><td><span class="free">FREE</span></td></tr>
<tr><td><code>complete_task</code></td><td>Mark complete, record output, unlock dependencies</td><td><span class="free">FREE</span></td></tr>
<tr><td><code>get_task_stats</code></td><td>Queue analytics: throughput, completion rate, backlog</td><td><span class="free">FREE</span></td></tr>
</table>
<h3>Add to Claude Desktop / Cursor / VS Code</h3>
<pre>{"openclaw-task-queue":{"type":"streamable-http","url":"https://task-queue-mcp.yagami8095.workers.dev/mcp"}}</pre>
<a class="cta" href="https://buy.stripe.com/4gw5na5U19SP9TW288">Get Pro — $9/mo (unlimited tasks)</a>
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
  const scope = scopeFromRequest(ip, proInfo ? apiKey : null);

  let body;
  try { body = await request.json(); } catch { return new Response(JSON.stringify(jsonRpcError(null, -32700, 'Parse error')), { status: 400, headers: { 'Content-Type': 'application/json' } }); }

  const { method, params, id } = body;

  if (method === 'initialize') return new Response(JSON.stringify(jsonRpcResponse(id, { protocolVersion: MCP_PROTOCOL_VERSION, serverInfo: SERVER_INFO, capabilities: CAPABILITIES })), { headers: { 'Content-Type': 'application/json', ...rlHeaders } });
  if (method === 'tools/list') return new Response(JSON.stringify(jsonRpcResponse(id, { tools: TOOLS })), { headers: { 'Content-Type': 'application/json', ...rlHeaders } });

  if (method === 'tools/call') {
    const { name, arguments: args = {} } = params || {};
    let result;

    if (name === 'create_task') result = await createTask(args, kv, scope);
    else if (name === 'get_tasks') result = await getTasksList(args, kv, scope);
    else if (name === 'assign_task') result = await assignTask(args, kv, scope);
    else if (name === 'complete_task') result = await completeTask(args, kv, scope);
    else if (name === 'get_task_stats') result = await getTaskStats(args, kv, scope);
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
      const txt = `# OpenClaw Task Queue MCP\n\nMCP endpoint: https://task-queue-mcp.yagami8095.workers.dev/mcp\nProtocol: MCP Streamable HTTP 2025-03-26\n\n## Tools\n- create_task: Create tasks with priority and dependencies\n- get_tasks: List and filter tasks\n- assign_task: Assign or pull next task by priority\n- complete_task: Mark done and unlock dependencies\n- get_task_stats: Queue analytics\n\nUpgrade: https://buy.stripe.com/4gw5na5U19SP9TW288\n`;
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
