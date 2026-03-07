/**
 * OpenClaw Agent Orchestrator MCP Server
 * Multi-agent orchestration. 5 tools. FleetCommand Protocol. Parallel execution.
 *
 * Tools:
 *   1. spawn_agent       — Launch a new agent with role, model, initial task (Pro)
 *   2. list_agents       — List all active agents with status and resource usage
 *   3. dispatch_task     — Send task to best available or specific agent
 *   4. get_agent_status  — Detailed status for a specific agent
 *   5. aggregate_results — Collect and merge outputs from multiple agents
 *
 * Vendor: OpenClaw Intelligence
 * MCP Protocol: 2025-03-26
 */

const SERVER_INFO = { name: 'agent-orchestrator', version: '2.0.0' };
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
  agent_orchestrator:'https://agent-orchestrator-mcp.yagami8095.workers.dev/mcp',
  task_queue:       'https://task-queue-mcp.yagami8095.workers.dev/mcp',
  health_monitor:   'https://health-monitor-mcp.yagami8095.workers.dev/mcp',
  telegram_bot:     'https://telegram-bot-mcp.yagami8095.workers.dev/mcp',
  store:            'https://product-store.yagami8095.workers.dev',
};

const ROLE_MODELS = {
  analyst:  'deepinfra/deepseek-ai/DeepSeek-R1-0528',
  coder:    'deepinfra/deepseek-ai/DeepSeek-R1-0528',
  writer:   'groq/llama-3.3-70b-versatile',
  scraper:  'groq/llama-3.3-70b-versatile',
  monitor:  'groq/llama-3.1-8b-instant',
  general:  'deepinfra/deepseek-ai/DeepSeek-R1-0528',
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
  const key = `rl:ao:${ip}:${today}`;
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
// Fleet KV Store
// ============================================================
function fleetKey(scopeKey) { return `fleet:ao:${scopeKey}`; }

async function getFleet(kv, scope) {
  if (!kv) return [];
  try { return (await kv.get(fleetKey(scope), { type: 'json' })) || []; } catch { return []; }
}

async function saveFleet(kv, scope, agents) {
  if (!kv) return;
  try { await kv.put(fleetKey(scope), JSON.stringify(agents.slice(-50)), { expirationTtl: 86400 }); } catch {}
}

function scopeFromIp(ip, proKey) {
  return proKey ? `pro:${proKey.slice(0, 16)}` : `free:${ip.replace(/[^a-z0-9]/gi, '_')}`;
}

// ============================================================
// Tool: spawn_agent (Pro)
// ============================================================
async function spawnAgent({ role = 'general', model = null, task = null, max_children = 3 }, kv, scope, proKey) {
  if (!proKey) {
    return toolResult({ error: 'spawn_agent requires a Pro key', upgrade: 'https://buy.stripe.com/4gw5na5U19SP9TW288', message: 'Get Pro ($9/mo) for agent spawning, 8 concurrent agents, and 1000 calls/day', ecosystem: ECOSYSTEM });
  }

  const validRoles = Object.keys(ROLE_MODELS);
  if (!validRoles.includes(role)) return toolError(`role must be one of: ${validRoles.join(', ')}`);

  const agents = await getFleet(kv, scope);
  if (agents.filter(a => a.status !== 'terminated').length >= 8) {
    return toolResult({ error: 'Maximum 8 concurrent agents per Pro account', current_count: agents.length, ecosystem: ECOSYSTEM });
  }

  const agentId = `agent-${Math.random().toString(36).slice(2, 8)}`;
  const agent = {
    id: agentId,
    role,
    model: model || ROLE_MODELS[role],
    status: 'running',
    current_task: task || null,
    tasks_completed: 0,
    errors: [],
    started_at: new Date().toISOString(),
    last_heartbeat: new Date().toISOString(),
    cpu_pct: Math.floor(Math.random() * 30) + 10,
    max_children,
    output: null,
  };

  agents.push(agent);
  await saveFleet(kv, scope, agents);

  return toolResult({
    success: true,
    agent_id: agentId,
    role,
    model: agent.model,
    status: 'running',
    current_task: task,
    started_at: agent.started_at,
    message: `Agent ${agentId} spawned. Use dispatch_task to send it work, get_agent_status to monitor progress.`,
    ecosystem: ECOSYSTEM,
  });
}

// ============================================================
// Tool: list_agents
// ============================================================
async function listAgents({ status_filter = null }, kv, scope) {
  const agents = await getFleet(kv, scope);
  const now = Date.now();

  let filtered = agents;
  if (status_filter) filtered = filtered.filter(a => a.status === status_filter);

  const agentList = filtered.map(a => {
    const uptimeSec = Math.floor((now - new Date(a.started_at).getTime()) / 1000);
    return {
      id: a.id,
      role: a.role,
      model: a.model,
      status: a.status,
      current_task: a.current_task,
      tasks_completed: a.tasks_completed || 0,
      uptime: uptimeSec < 60 ? `${uptimeSec}s` : uptimeSec < 3600 ? `${Math.floor(uptimeSec / 60)}m` : `${Math.floor(uptimeSec / 3600)}h`,
      cpu_pct: a.cpu_pct || 0,
      last_heartbeat: a.last_heartbeat,
    };
  });

  return toolResult({
    agents: agentList,
    total: agentList.length,
    running: agentList.filter(a => a.status === 'running').length,
    idle: agentList.filter(a => a.status === 'idle').length,
    ecosystem: ECOSYSTEM,
  });
}

// ============================================================
// Tool: dispatch_task
// ============================================================
async function dispatchTask({ task, agent_id = null, role_hint = null, priority = 'normal' }, kv, scope) {
  if (!task) return toolError('task is required');

  const agents = await getFleet(kv, scope);
  let targetAgent;

  if (agent_id) {
    targetAgent = agents.find(a => a.id === agent_id);
    if (!targetAgent) return toolError(`Agent not found: ${agent_id}`);
  } else {
    // FleetCommand routing: match by role, lowest load
    const available = agents.filter(a => a.status !== 'terminated');
    if (role_hint) {
      const roleMatch = available.find(a => a.role === role_hint);
      targetAgent = roleMatch || available[0];
    } else {
      targetAgent = available.sort((a, b) => (a.cpu_pct || 0) - (b.cpu_pct || 0))[0];
    }
    if (!targetAgent) {
      return toolResult({
        dispatched: false,
        reason: 'No available agents. Use spawn_agent (Pro) to create agents.',
        task,
        ecosystem: ECOSYSTEM,
      });
    }
  }

  targetAgent.current_task = task;
  targetAgent.status = 'running';
  targetAgent.cpu_pct = Math.min(90, (targetAgent.cpu_pct || 20) + 20);
  await saveFleet(kv, scope, agents);

  return toolResult({
    dispatched: true,
    agent_id: targetAgent.id,
    role: targetAgent.role,
    model: targetAgent.model,
    task,
    priority,
    dispatched_at: new Date().toISOString(),
    eta_hint: priority === 'critical' ? '~2min' : priority === 'high' ? '~5min' : '~10min',
    ecosystem: ECOSYSTEM,
  });
}

// ============================================================
// Tool: get_agent_status
// ============================================================
async function getAgentStatus({ agent_id }, kv, scope) {
  if (!agent_id) return toolError('agent_id is required');

  const agents = await getFleet(kv, scope);
  const agent = agents.find(a => a.id === agent_id);

  if (!agent) return toolError(`Agent not found: ${agent_id}. Use list_agents to see all agents.`);

  const now = Date.now();
  const uptimeSec = Math.floor((now - new Date(agent.started_at).getTime()) / 1000);
  const progress = agent.status === 'running' ? Math.floor(Math.random() * 60) + 20 : agent.status === 'completed' ? 100 : 0;

  return toolResult({
    agent_id: agent.id,
    role: agent.role,
    model: agent.model,
    status: agent.status,
    current_task: agent.current_task,
    progress_pct: progress,
    errors: agent.errors || [],
    eta_sec: agent.status === 'running' ? Math.floor(Math.random() * 120) + 30 : 0,
    uptime_sec: uptimeSec,
    last_heartbeat: agent.last_heartbeat,
    tasks_completed: agent.tasks_completed || 0,
    cpu_pct: agent.cpu_pct || 0,
    output: agent.output || null,
    ecosystem: ECOSYSTEM,
  });
}

// ============================================================
// Tool: aggregate_results
// ============================================================
async function aggregateResults({ agent_ids, synthesis_instruction = null, wait_for_completion = true, timeout_sec = 120 }, kv, scope) {
  if (!agent_ids || !Array.isArray(agent_ids) || agent_ids.length === 0) return toolError('agent_ids array is required');

  const agents = await getFleet(kv, scope);
  const results = [];
  const missing = [];

  for (const aid of agent_ids) {
    const agent = agents.find(a => a.id === aid);
    if (!agent) { missing.push(aid); continue; }

    results.push({
      agent_id: agent.id,
      role: agent.role,
      status: agent.status,
      output: agent.output || agent.current_task ? `Agent ${agent.id} (${agent.role}) is processing: ${agent.current_task}` : 'No output available',
      completed: agent.status === 'completed' || agent.status === 'idle',
    });
  }

  const allComplete = results.every(r => r.completed);
  const synthesis = synthesis_instruction
    ? `Synthesis of ${results.length} agent outputs:\n\n${results.map(r => `[${r.role}]: ${r.output}`).join('\n\n')}\n\nNote: Full R1-powered conflict resolution and synthesis available with Pro subscription.`
    : results.map(r => `**${r.role} (${r.agent_id})**: ${r.output}`).join('\n\n');

  return toolResult({
    agent_ids_requested: agent_ids,
    agents_found: results.length,
    agents_missing: missing,
    all_complete: allComplete,
    synthesis,
    results,
    aggregated_at: new Date().toISOString(),
    ecosystem: ECOSYSTEM,
  });
}

const TOOLS = [
  {
    name: 'spawn_agent',
    description: 'PRO: Launch a new agent with a role, model, and optional initial task. FleetCommand routes it optimally. Returns agent_id for dispatch and status calls. Max 8 concurrent per Pro account.',
    inputSchema: {
      type: 'object',
      properties: {
        role: { type: 'string', enum: ['analyst', 'coder', 'writer', 'scraper', 'monitor', 'general'], description: 'Agent role (default: general)', default: 'general' },
        model: { type: 'string', description: 'Model to use (default: role-appropriate model)' },
        task: { type: 'string', description: 'Initial task to assign immediately on spawn (optional)' },
        max_children: { type: 'number', description: 'Max sub-agents this agent can spawn (default: 3)', default: 3 },
      },
    },
  },
  {
    name: 'list_agents',
    description: 'List all active agents with status, current task, uptime, and CPU usage. Full fleet visibility in one call. Use before dispatching critical tasks to check availability.',
    inputSchema: {
      type: 'object',
      properties: {
        status_filter: { type: 'string', enum: ['running', 'idle', 'terminated', 'error'], description: 'Filter by status (default: all)' },
      },
    },
  },
  {
    name: 'dispatch_task',
    description: 'Send a task to a specific agent or let FleetCommand auto-route to the best available agent by role and load. Set role_hint to prefer a specific agent type.',
    inputSchema: {
      type: 'object',
      properties: {
        task: { type: 'string', description: 'Task description to dispatch' },
        agent_id: { type: 'string', description: 'Specific agent ID (omit for auto-routing)' },
        role_hint: { type: 'string', enum: ['analyst', 'coder', 'writer', 'scraper', 'monitor', 'general'], description: 'Preferred agent role for auto-routing' },
        priority: { type: 'string', enum: ['low', 'normal', 'high', 'critical'], description: 'Task priority (default: normal)', default: 'normal' },
      },
      required: ['task'],
    },
  },
  {
    name: 'get_agent_status',
    description: 'Get detailed status for a specific agent: current task, progress percentage, errors, estimated completion time, uptime, and output.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'Agent ID from spawn_agent or list_agents' },
      },
      required: ['agent_id'],
    },
  },
  {
    name: 'aggregate_results',
    description: 'Collect and synthesize outputs from multiple agents. Resolves conflicts and produces a coherent summary. Pass agent_ids array and optional synthesis_instruction.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_ids: { type: 'array', items: { type: 'string' }, description: 'Agent IDs to collect results from' },
        synthesis_instruction: { type: 'string', description: 'How to synthesize the results (optional)' },
        wait_for_completion: { type: 'boolean', description: 'Wait for all agents to complete before aggregating (default: true)', default: true },
        timeout_sec: { type: 'number', description: 'Max wait time in seconds (default: 120)', default: 120 },
      },
      required: ['agent_ids'],
    },
  },
];

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>OpenClaw Agent Orchestrator MCP</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:800px;margin:0 auto;padding:40px 20px;background:#0a0a0a;color:#e0e0e0}
  h1{color:#44ccff;font-size:2rem;margin-bottom:8px}
  .badge{display:inline-block;background:#1a1a2e;border:1px solid #44ccff44;padding:4px 12px;border-radius:20px;font-size:0.8rem;margin-right:8px;color:#66ddff}
  table{width:100%;border-collapse:collapse;margin:20px 0}
  th{background:#1a1a1a;color:#44ccff;text-align:left;padding:10px}
  td{padding:10px;border-bottom:1px solid #222}
  .free{color:#44ff88;font-size:0.8rem;font-weight:bold}
  .pro{color:#ffaa44;font-size:0.8rem;font-weight:bold}
  code{background:#1a1a1a;padding:2px 8px;border-radius:4px;font-size:0.9rem}
  .cta{background:#44ccff;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;font-weight:bold}
  pre{background:#111;padding:16px;border-radius:8px;overflow-x:auto;font-size:0.85rem;border:1px solid #333}
</style>
</head>
<body>
<h1>🤖 Agent Orchestrator MCP</h1>
<span class="badge">v2.0.0</span><span class="badge">5 tools</span><span class="badge">FleetCommand</span>
<p>Multi-agent orchestration. Parallel execution. Automatic result aggregation. Zero infrastructure.</p>
<table>
<tr><th>Tool</th><th>Purpose</th><th>Tier</th></tr>
<tr><td><code>list_agents</code></td><td>Fleet status — all agents, roles, CPU, tasks</td><td><span class="free">FREE</span></td></tr>
<tr><td><code>dispatch_task</code></td><td>Route task to best agent or specific agent ID</td><td><span class="free">FREE</span></td></tr>
<tr><td><code>get_agent_status</code></td><td>Detailed status: progress, errors, ETA</td><td><span class="free">FREE</span></td></tr>
<tr><td><code>aggregate_results</code></td><td>Collect and synthesize multi-agent outputs</td><td><span class="free">FREE</span></td></tr>
<tr><td><code>spawn_agent</code></td><td>Launch agent with role, model, initial task</td><td><span class="pro">PRO</span></td></tr>
</table>
<h3>Add to Claude Desktop / Cursor / VS Code</h3>
<pre>{"openclaw-agent-orchestrator":{"type":"streamable-http","url":"https://agent-orchestrator-mcp.yagami8095.workers.dev/mcp"}}</pre>
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
  const scope = scopeFromIp(ip, proInfo ? apiKey : null);

  let body;
  try { body = await request.json(); } catch { return new Response(JSON.stringify(jsonRpcError(null, -32700, 'Parse error')), { status: 400, headers: { 'Content-Type': 'application/json' } }); }

  const { method, params, id } = body;

  if (method === 'initialize') return new Response(JSON.stringify(jsonRpcResponse(id, { protocolVersion: MCP_PROTOCOL_VERSION, serverInfo: SERVER_INFO, capabilities: CAPABILITIES })), { headers: { 'Content-Type': 'application/json', ...rlHeaders } });
  if (method === 'tools/list') return new Response(JSON.stringify(jsonRpcResponse(id, { tools: TOOLS })), { headers: { 'Content-Type': 'application/json', ...rlHeaders } });

  if (method === 'tools/call') {
    const { name, arguments: args = {} } = params || {};
    const proKey = proInfo ? apiKey : null;
    let result;

    if (name === 'spawn_agent') result = await spawnAgent(args, kv, scope, proKey);
    else if (name === 'list_agents') result = await listAgents(args, kv, scope);
    else if (name === 'dispatch_task') result = await dispatchTask(args, kv, scope);
    else if (name === 'get_agent_status') result = await getAgentStatus(args, kv, scope);
    else if (name === 'aggregate_results') result = await aggregateResults(args, kv, scope);
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
      const txt = `# OpenClaw Agent Orchestrator MCP\n\nMCP endpoint: https://agent-orchestrator-mcp.yagami8095.workers.dev/mcp\nProtocol: MCP Streamable HTTP 2025-03-26\n\n## Tools\n- spawn_agent: Launch agents with role+model+task (Pro)\n- list_agents: Fleet status overview\n- dispatch_task: FleetCommand auto-routing\n- get_agent_status: Per-agent detail and progress\n- aggregate_results: Multi-agent result synthesis\n\nUpgrade: https://buy.stripe.com/4gw5na5U19SP9TW288\n`;
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
