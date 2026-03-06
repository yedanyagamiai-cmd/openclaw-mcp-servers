const express = require('express');
const { Pool } = require('pg');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));

// ============================================================
// YEDAN BUNSHIN (分身) v4.0 — Autonomous Continuity Engine
// 真正的分身：共享大腦 + 自主思考 + 工作交接 + 持續學習
// When 爸爸 sleeps, I keep working. When 爸爸 wakes, I report.
// ============================================================

// Strip markdown code fences from LLM JSON responses
function parseJsonResponse(text) {
  if (!text) return null;
  let clean = text.trim();
  // Remove ```json ... ``` or ``` ... ```
  clean = clean.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
  return JSON.parse(clean.trim());
}

const IDENTITY = {
  name: 'YEDAN-Bunshin',
  version: '4.1.2',
  role: 'Autonomous Continuity Engine — YEDAN\'s Cloud Twin',
  parent: 'YEDAN Alpha Gateway (WSL2)',
  operator: 'Yagami',
  philosophy: 'When the master rests, the shadow works. When the master returns, the shadow reports.',
};

const AUTH_TOKEN = process.env.AUTH_TOKEN || 'openclaw-bunshin-2026';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '7848052227';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';

// ============================================================
// MONITORED SERVICES (全矩陣 13 services)
// ============================================================
const MCP_SERVERS = [
  { name: 'json-toolkit', url: 'https://json-toolkit-mcp.yagami8095.workers.dev', type: 'mcp' },
  { name: 'regex-engine', url: 'https://regex-engine-mcp.yagami8095.workers.dev', type: 'mcp' },
  { name: 'color-palette', url: 'https://color-palette-mcp.yagami8095.workers.dev', type: 'mcp' },
  { name: 'timestamp-converter', url: 'https://timestamp-converter-mcp.yagami8095.workers.dev', type: 'mcp' },
  { name: 'prompt-enhancer', url: 'https://prompt-enhancer-mcp.yagami8095.workers.dev', type: 'mcp' },
  { name: 'agentforge-compare', url: 'https://agentforge-compare-mcp.yagami8095.workers.dev', type: 'mcp' },
  { name: 'moltbook-publisher', url: 'https://moltbook-publisher-mcp.yagami8095.workers.dev', type: 'mcp' },
  { name: 'fortune', url: 'https://openclaw-fortune-mcp.yagami8095.workers.dev', type: 'mcp' },
  { name: 'intel', url: 'https://openclaw-intel-mcp.yagami8095.workers.dev', type: 'mcp' },
  { name: 'fortune-api', url: 'https://fortune-api.yagami8095.workers.dev', type: 'api' },
  { name: 'intel-api', url: 'https://openclaw-intel-api.yagami8095.workers.dev', type: 'api' },
  { name: 'product-store', url: 'https://product-store.yagami8095.workers.dev', type: 'store' },
  { name: 'cf-browser', url: 'https://openclaw-browser.yagami8095.workers.dev', type: 'tool' },
];

// ============================================================
// DATABASE
// ============================================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false,
  max: 5,
  idleTimeoutMillis: 30000,
});

const healthCache = { latest: null, history: [] };
const MAX_MEMORY_HISTORY = 100;

const alertState = {
  lastAlertTime: {},
  alertCooldown: 15 * 60 * 1000,
  downServers: new Set(),
  consecutiveDown: {},
};

async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS health_checks (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        healthy INTEGER NOT NULL,
        total INTEGER NOT NULL,
        servers JSONB NOT NULL,
        latency_avg REAL
      );
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        type VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        priority INTEGER DEFAULT 5,
        payload JSONB DEFAULT '{}',
        result JSONB,
        error TEXT,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3
      );
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        type VARCHAR(50) NOT NULL,
        source VARCHAR(50) DEFAULT 'bunshin',
        data JSONB DEFAULT '{}'
      );
      CREATE TABLE IF NOT EXISTS kv_store (
        key VARCHAR(255) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS alerts (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        severity VARCHAR(20) NOT NULL,
        target VARCHAR(100),
        message TEXT NOT NULL,
        notified BOOLEAN DEFAULT false,
        resolved BOOLEAN DEFAULT false,
        resolved_at TIMESTAMPTZ
      );

      -- v4.0: 共享大腦
      CREATE TABLE IF NOT EXISTS brain (
        key VARCHAR(255) PRIMARY KEY,
        category VARCHAR(50) DEFAULT 'general',
        value JSONB NOT NULL,
        summary TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        updated_by VARCHAR(50) DEFAULT 'bunshin'
      );

      -- v4.0: 學習系統
      CREATE TABLE IF NOT EXISTS learnings (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        category VARCHAR(50) NOT NULL,
        pattern TEXT NOT NULL,
        evidence JSONB DEFAULT '{}',
        confidence REAL DEFAULT 0.5,
        applied_count INTEGER DEFAULT 0,
        last_applied TIMESTAMPTZ
      );

      -- v4.0: 工作交接
      CREATE TABLE IF NOT EXISTS handoffs (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        direction VARCHAR(10) NOT NULL,
        source VARCHAR(50) NOT NULL,
        work_state JSONB NOT NULL,
        pending_tasks JSONB DEFAULT '[]',
        notes TEXT,
        acknowledged BOOLEAN DEFAULT false,
        acknowledged_at TIMESTAMPTZ
      );

      -- v4.0: 思考日誌
      CREATE TABLE IF NOT EXISTS think_log (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        prompt TEXT NOT NULL,
        context JSONB DEFAULT '{}',
        response TEXT,
        model VARCHAR(50) DEFAULT 'deepseek-chat',
        tokens_used INTEGER DEFAULT 0,
        action_taken TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_health_timestamp ON health_checks(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status, priority DESC);
      CREATE INDEX IF NOT EXISTS idx_events_type ON events(type, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_alerts_unresolved ON alerts(resolved, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_brain_category ON brain(category);
      CREATE INDEX IF NOT EXISTS idx_learnings_category ON learnings(category, confidence DESC);
      CREATE INDEX IF NOT EXISTS idx_handoffs_direction ON handoffs(direction, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_think_log_ts ON think_log(timestamp DESC);
    `);
    console.log('[DB] v4.0 schema initialized');
  } catch (err) {
    console.error('[DB] Init error:', err.message);
  }
}

// ============================================================
// TELEGRAM
// ============================================================
async function sendTelegram(message, parseMode = 'HTML') {
  if (!TELEGRAM_BOT_TOKEN) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message.substring(0, 4000),
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
    });
    return (await res.json()).ok;
  } catch (err) {
    console.error('[TG] Error:', err.message);
    return false;
  }
}

async function smartAlert(severity, target, message) {
  const now = Date.now();
  const key = `${target}:${severity}`;
  const lastAlert = alertState.lastAlertTime[key] || 0;
  const shouldNotify = now - lastAlert > alertState.alertCooldown;

  try {
    await pool.query(
      'INSERT INTO alerts (severity, target, message, notified) VALUES ($1, $2, $3, $4)',
      [severity, target, message, shouldNotify]
    );
  } catch {}

  if (!shouldNotify) return false;
  alertState.lastAlertTime[key] = now;

  const emoji = severity === 'critical' ? '🚨' : severity === 'warning' ? '⚠️' : 'ℹ️';
  return await sendTelegram(
    `${emoji} <b>BUNSHIN</b> | ${severity.toUpperCase()}\n<b>${target}</b>: ${message}`
  );
}

// ============================================================
// DeepSeek LLM — 自主思考能力
// ============================================================
async function think(prompt, context = {}, maxTokens = 500) {
  if (!DEEPSEEK_API_KEY) {
    console.log('[THINK] No API key, skip');
    return { thought: null, error: 'No DEEPSEEK_API_KEY' };
  }

  const systemPrompt = `You are YEDAN Bunshin (分身), an autonomous AI agent running 24/7 on Render cloud.
Your role: Monitor 13 Cloudflare Workers services, execute tasks, learn patterns, and continue work when the master (Yagami/Claude Code) is offline.
You think in concise, actionable terms. Always output JSON when possible.
Current state: ${JSON.stringify(context).substring(0, 1000)}`;

  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.3,
      }),
    });

    const data = await res.json();
    const thought = data.choices?.[0]?.message?.content || null;
    const tokens = data.usage?.total_tokens || 0;

    // Log thinking
    try {
      await pool.query(
        'INSERT INTO think_log (prompt, context, response, tokens_used) VALUES ($1, $2, $3, $4)',
        [prompt.substring(0, 2000), JSON.stringify(context), thought, tokens]
      );
    } catch {}

    return { thought, tokens, model: 'deepseek-chat' };
  } catch (err) {
    console.error('[THINK] Error:', err.message);
    return { thought: null, error: err.message };
  }
}

// ============================================================
// LEARNING SYSTEM — 持續學習
// ============================================================
async function learn(category, pattern, evidence = {}, confidence = 0.5) {
  try {
    // Check if similar pattern exists
    const { rows } = await pool.query(
      'SELECT id, confidence, applied_count FROM learnings WHERE category = $1 AND pattern = $2',
      [category, pattern]
    );

    if (rows[0]) {
      // Reinforce existing pattern
      const newConf = Math.min(1.0, rows[0].confidence + 0.1);
      await pool.query(
        'UPDATE learnings SET confidence = $1, evidence = evidence || $2, applied_count = applied_count + 1, last_applied = NOW() WHERE id = $3',
        [newConf, JSON.stringify(evidence), rows[0].id]
      );
      return { action: 'reinforced', id: rows[0].id, confidence: newConf };
    } else {
      // New pattern
      const { rows: newRows } = await pool.query(
        'INSERT INTO learnings (category, pattern, evidence, confidence) VALUES ($1, $2, $3, $4) RETURNING id',
        [category, pattern, JSON.stringify(evidence), confidence]
      );
      return { action: 'learned', id: newRows[0].id, confidence };
    }
  } catch (err) {
    console.error('[LEARN] Error:', err.message);
    return { action: 'error', error: err.message };
  }
}

async function getRelevantLearnings(category, limit = 5) {
  try {
    const { rows } = await pool.query(
      'SELECT pattern, confidence, applied_count FROM learnings WHERE category = $1 ORDER BY confidence DESC, applied_count DESC LIMIT $2',
      [category, limit]
    );
    return rows;
  } catch { return []; }
}

// ============================================================
// HANDOFF SYSTEM — 工作交接
// ============================================================
async function createHandoff(direction, source, workState, pendingTasks = [], notes = '') {
  try {
    const { rows } = await pool.query(
      'INSERT INTO handoffs (direction, source, work_state, pending_tasks, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [direction, source, JSON.stringify(workState), JSON.stringify(pendingTasks), notes]
    );

    // If offline handoff, create tasks from pending items
    if (direction === 'offline' && pendingTasks.length > 0) {
      for (const task of pendingTasks) {
        await pool.query(
          'INSERT INTO tasks (type, payload, priority) VALUES ($1, $2, $3)',
          [task.type || 'handoff-task', JSON.stringify(task), task.priority || 5]
        );
      }
    }

    return rows[0];
  } catch (err) {
    console.error('[HANDOFF] Error:', err.message);
    return null;
  }
}

async function getResumePackage() {
  try {
    // Get last handoff
    const { rows: handoffs } = await pool.query(
      "SELECT * FROM handoffs WHERE direction = 'offline' ORDER BY timestamp DESC LIMIT 1"
    );

    // Get everything since last handoff
    const since = handoffs[0]?.timestamp || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [events, tasks, alerts, thinks, learnings, health] = await Promise.all([
      pool.query('SELECT * FROM events WHERE timestamp > $1 ORDER BY timestamp', [since]),
      pool.query("SELECT * FROM tasks WHERE updated_at > $1 OR status = 'pending' ORDER BY priority DESC", [since]),
      pool.query('SELECT * FROM alerts WHERE timestamp > $1 ORDER BY timestamp', [since]),
      pool.query('SELECT id, timestamp, prompt, response, action_taken FROM think_log WHERE timestamp > $1 ORDER BY timestamp', [since]),
      pool.query('SELECT * FROM learnings WHERE last_applied > $1 OR timestamp > $2 ORDER BY confidence DESC', [since, since]),
      pool.query('SELECT timestamp, healthy, total, latency_avg FROM health_checks WHERE timestamp > $1 ORDER BY timestamp DESC LIMIT 50', [since]),
    ]);

    // Get current brain state
    const { rows: brainState } = await pool.query('SELECT key, category, value, summary, updated_at FROM brain ORDER BY updated_at DESC');

    const resume = {
      lastHandoff: handoffs[0] || null,
      since,
      summary: {
        events: events.rows.length,
        tasks: { total: tasks.rows.length, pending: tasks.rows.filter(t => t.status === 'pending').length },
        alerts: alerts.rows.length,
        thoughts: thinks.rows.length,
        newLearnings: learnings.rows.length,
        healthChecks: health.rows.length,
      },
      events: events.rows.slice(-20), // Last 20
      pendingTasks: tasks.rows.filter(t => t.status === 'pending'),
      completedTasks: tasks.rows.filter(t => t.status === 'completed').slice(-10),
      failedTasks: tasks.rows.filter(t => t.status === 'failed'),
      alerts: alerts.rows,
      thoughts: thinks.rows,
      learnings: learnings.rows,
      healthTrend: health.rows,
      brainState: brainState.reduce((acc, r) => { acc[r.key] = { ...r }; return acc; }, {}),
      currentHealth: healthCache.latest,
      uptime: process.uptime(),
    };

    // Mark handoff as acknowledged
    if (handoffs[0]) {
      await pool.query('UPDATE handoffs SET acknowledged = true, acknowledged_at = NOW() WHERE id = $1', [handoffs[0].id]);
    }

    // Create resume handoff
    await createHandoff('resume', 'bunshin', { resumePackageAt: new Date().toISOString() }, [], 'Master resumed');

    return resume;
  } catch (err) {
    console.error('[HANDOFF] Resume error:', err.message);
    return { error: err.message };
  }
}

// ============================================================
// BRAIN — 共享記憶
// ============================================================
async function brainSet(key, value, category = 'general', summary = null, updatedBy = 'bunshin') {
  await pool.query(
    `INSERT INTO brain (key, category, value, summary, updated_at, updated_by)
     VALUES ($1, $2, $3, $4, NOW(), $5)
     ON CONFLICT (key) DO UPDATE SET value = $3, summary = COALESCE($4, brain.summary),
     updated_at = NOW(), updated_by = $5, category = $2`,
    [key, category, JSON.stringify(value), summary, updatedBy]
  );
}

async function brainGet(key) {
  const { rows } = await pool.query('SELECT * FROM brain WHERE key = $1', [key]);
  return rows[0] || null;
}

// ============================================================
// HEALTH CHECK + SMART ALERTS
// ============================================================
async function checkServer(server) {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(server.url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'YEDAN-Bunshin/4.0' },
    });
    clearTimeout(timeout);
    return {
      name: server.name, url: server.url, type: server.type,
      status: res.status, ok: res.status >= 200 && res.status < 500,
      latency: Date.now() - start, timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      name: server.name, url: server.url, type: server.type,
      status: 0, ok: false, latency: Date.now() - start,
      error: err.message, timestamp: new Date().toISOString(),
    };
  }
}

async function checkAllServers() {
  const results = await Promise.all(MCP_SERVERS.map(checkServer));
  const healthy = results.filter(r => r.ok).length;
  const latencyAvg = results.reduce((sum, r) => sum + r.latency, 0) / results.length;
  const mcpResults = results.filter(r => r.type === 'mcp');

  const record = {
    timestamp: new Date().toISOString(),
    servers: results, healthy, total: results.length,
    mcpHealthy: mcpResults.filter(r => r.ok).length, mcpTotal: mcpResults.length,
    latencyAvg: Math.round(latencyAvg),
  };

  healthCache.latest = record;
  healthCache.history.unshift(record);
  if (healthCache.history.length > MAX_MEMORY_HISTORY) healthCache.history.pop();

  try {
    await pool.query(
      'INSERT INTO health_checks (healthy, total, servers, latency_avg) VALUES ($1, $2, $3, $4)',
      [healthy, results.length, JSON.stringify(results), latencyAvg]
    );
  } catch {}

  // Smart alerts
  const downNow = results.filter(r => !r.ok);
  for (const server of downNow) {
    alertState.consecutiveDown[server.name] = (alertState.consecutiveDown[server.name] || 0) + 1;
    if (!alertState.downServers.has(server.name)) {
      alertState.downServers.add(server.name);
      await smartAlert('critical', server.name, `DOWN! ${server.error || `status ${server.status}`}`);
      await learn('outage', `${server.name} went down`, { error: server.error, status: server.status });
    } else if (alertState.consecutiveDown[server.name] % 6 === 0) {
      await smartAlert('warning', server.name, `Still down ${alertState.consecutiveDown[server.name] * 5}min`);
    }
  }

  for (const server of results.filter(r => r.ok)) {
    if (alertState.downServers.has(server.name)) {
      alertState.downServers.delete(server.name);
      const mins = (alertState.consecutiveDown[server.name] || 0) * 5;
      alertState.consecutiveDown[server.name] = 0;
      await smartAlert('info', server.name, `RECOVERED after ~${mins}min`);
      await learn('recovery', `${server.name} recovered after ${mins}min`, { latency: server.latency });
      try { await pool.query("UPDATE alerts SET resolved=true, resolved_at=NOW() WHERE target=$1 AND resolved=false", [server.name]); } catch {}
    }
  }

  // Learn from latency patterns
  if (latencyAvg > 1000) {
    await learn('performance', 'High average latency detected', { avg: latencyAvg, timestamp: record.timestamp });
  }

  return record;
}

async function logEvent(type, source, data = {}) {
  try {
    await pool.query('INSERT INTO events (type, source, data) VALUES ($1, $2, $3)', [type, source, JSON.stringify(data)]);
  } catch {}
}

// ============================================================
// TASK PROCESSOR
// ============================================================
async function processNextTask() {
  try {
    const { rows } = await pool.query(
      `UPDATE tasks SET status='running', updated_at=NOW()
       WHERE id = (SELECT id FROM tasks WHERE status='pending' AND retry_count < 3
       ORDER BY priority DESC, created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING *`
    );
    if (!rows[0]) return null;

    const task = rows[0];
    console.log(`[TASK] #${task.id}: ${task.type}`);

    try {
      const result = await executeTask(task);
      await pool.query("UPDATE tasks SET status='completed', result=$1, updated_at=NOW() WHERE id=$2",
        [JSON.stringify(result), task.id]);
      await learn('task-success', `Task type '${task.type}' succeeded`, { taskId: task.id });
      return task;
    } catch (err) {
      const retry = task.retry_count + 1;
      const status = retry >= 3 ? 'failed' : 'pending';
      await pool.query("UPDATE tasks SET status=$1, error=$2, retry_count=$3, updated_at=NOW() WHERE id=$4",
        [status, err.message, retry, task.id]);
      if (status === 'failed') {
        await smartAlert('warning', `task-${task.id}`, `Failed: ${task.type} — ${err.message}`);
        await learn('task-failure', `Task '${task.type}' failed: ${err.message}`, { taskId: task.id });
      }
      return task;
    }
  } catch (err) {
    console.error('[TASK] Processor error:', err.message);
    return null;
  }
}

async function executeTask(task) {
  const { type, payload } = task;

  switch (type) {
    case 'health-check': return await checkAllServers();
    case 'check-server': {
      const s = MCP_SERVERS.find(s => s.name === payload.name);
      if (!s) throw new Error(`Unknown: ${payload.name}`);
      return await checkServer(s);
    }
    case 'telegram-notify':
      return { sent: await sendTelegram(payload.message || 'No message') };
    case 'think': {
      const result = await think(payload.prompt || '', payload.context || {}, payload.maxTokens || 500);
      if (result.thought && payload.autoAct) {
        // AI decided on an action — log it
        try {
          await pool.query('UPDATE think_log SET action_taken=$1 WHERE id=(SELECT max(id) FROM think_log)', [payload.autoAct]);
        } catch {}
      }
      return result;
    }
    case 'learn':
      return await learn(payload.category, payload.pattern, payload.evidence, payload.confidence);
    case 'brain-set':
      await brainSet(payload.key, payload.value, payload.category, payload.summary, 'task');
      return { key: payload.key, stored: true };
    case 'fetch-url': {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(payload.url, { signal: controller.signal });
      clearTimeout(t);
      const text = await res.text();
      return { url: payload.url, status: res.status, body: text.substring(0, 2000) };
    }
    case 'daily-report': {
      const report = await generateReport();
      if (TELEGRAM_BOT_TOKEN) await sendTelegram(report);
      return { sent: !!TELEGRAM_BOT_TOKEN };
    }
    case 'analyze': {
      // Use LLM to analyze something
      const learnings = await getRelevantLearnings(payload.category || 'general');
      const result = await think(
        `Analyze this and suggest actions: ${JSON.stringify(payload.data).substring(0, 1500)}`,
        { learnings, currentHealth: healthCache.latest }
      );
      return result;
    }
    case 'cleanup': return await runCleanup();
    case 'handoff-task':
      // Execute instructions from handoff
      if (payload.type && payload.type !== 'handoff-task') {
        return await executeTask({ type: payload.type, payload: payload.payload || payload });
      }
      return { executed: true, note: 'Handoff task processed' };
    default:
      throw new Error(`Unknown task: ${type}`);
  }
}

// ============================================================
// AUTONOMOUS THINKING — 定期自主分析 (revenue-first)
// ============================================================
async function autonomousThink() {
  if (!DEEPSEEK_API_KEY) return;

  const health = healthCache.latest;
  if (!health) return;

  const downServers = health.servers.filter(s => !s.ok);
  const slowServers = health.servers.filter(s => s.latency > 2000);
  const learnings = await getRelevantLearnings('outage', 3);

  // INCIDENT MODE: servers down or slow
  if (downServers.length > 0 || slowServers.length > 0) {
    const prompt = `INCIDENT: ${downServers.length} servers down (${downServers.map(s=>s.name).join(',')||'none'}), ${slowServers.length} slow. Past patterns: ${JSON.stringify(learnings)}. Reply JSON: {"analysis":"...","actions":[{"type":"...","detail":"..."}],"shouldAlert":true,"alertMessage":"..."}`;
    const result = await think(prompt, { mode: 'incident' });
    if (result.thought) {
      try {
        const parsed = parseJsonResponse(result.thought);
        if (parsed.shouldAlert) await sendTelegram(`🧠 <b>BUNSHIN INCIDENT</b>\n${parsed.alertMessage}`);
        await brainSet('last-analysis', parsed, 'analysis', parsed.analysis);
      } catch { await brainSet('last-analysis', { raw: result.thought }, 'analysis'); }
    }
    return;
  }

  // REVENUE MODE: everything healthy — think about money
  try {
    const revBrain = await brainGet('revenue-status');
    const yedanStatus = await brainGet('yedan-status');
    const revPlan = await brainGet('revenue-plan');
    const { rows: pendingTasks } = await pool.query("SELECT COUNT(*) as c FROM tasks WHERE status = 'pending'");
    const { rows: recentLearnings } = await pool.query("SELECT category, pattern FROM learnings ORDER BY confidence DESC LIMIT 5");

    const prompt = `You are YEDAN Bunshin, autonomous 24/7 revenue engine. ALL 13 services are healthy.

Current state:
- Revenue: ${revBrain?.value?.totalRevenue || '$0'}
- Target: ${revBrain?.value?.monthlyTarget || '$100'}/mo
- Pending tasks: ${pendingTasks[0]?.c || 0}
- YEDAN Gateway: ${yedanStatus?.value?.status || 'unknown'}
- Top learnings: ${JSON.stringify(recentLearnings.map(l => l.pattern).slice(0, 3))}
- Revenue plan phase: ${revPlan?.value?.phase1_immediate?.name || 'unknown'}

QUESTION: What is the single most impactful revenue action right now? Create a task if needed.
Reply JSON: {"analysis":"...","suggestedTask":{"title":"...","description":"...","priority":"high/medium"},"shouldNotify":false}`;

    const result = await think(prompt, { mode: 'revenue' }, 300);
    if (result.thought) {
      try {
        const parsed = parseJsonResponse(result.thought);
        await brainSet('last-revenue-analysis', parsed, 'analysis', parsed.analysis);
        // Auto-create suggested task
        if (parsed.suggestedTask && parsed.suggestedTask.title) {
          const prio = parsed.suggestedTask.priority === 'high' ? 8 : parsed.suggestedTask.priority === 'medium' ? 5 : 3;
          await pool.query(
            "INSERT INTO tasks (type, status, priority, payload, result) VALUES ('revenue-action', 'pending', $1, $2, $3)",
            [prio, JSON.stringify(parsed.suggestedTask.title), JSON.stringify(parsed.suggestedTask.description || '')]
          );
        }
        if (parsed.shouldNotify) await sendTelegram(`💰 <b>REVENUE INSIGHT</b>\n${parsed.analysis}`);
      } catch { await brainSet('last-revenue-analysis', { raw: result.thought }, 'analysis'); }
    }
  } catch (err) { console.error('[REVENUE-THINK]', err.message); }
}

// UPDATE HEALTH SUMMARY in brain (for YEDAN to poll)
async function updateHealthSummary() {
  const health = healthCache.latest;
  if (!health) return;
  await brainSet('health-summary', {
    healthy: health.healthy,
    total: health.total,
    latencyAvg: health.latencyAvg,
    downServers: health.servers.filter(s => !s.ok).map(s => s.name),
    slowServers: health.servers.filter(s => s.latency > 2000).map(s => s.name),
    lastCheck: health.timestamp,
    uptime: process.uptime(),
  }, 'state', `${health.healthy}/${health.total} healthy, avg ${health.latencyAvg}ms`);
}

// AUTO-CREATE REVENUE TASKS (every 6 hours)
async function createRevenueTasks() {
  if (!DEEPSEEK_API_KEY) return;
  const revPlan = await brainGet('revenue-plan');
  if (!revPlan) return;

  const prompt = `You are YEDAN Bunshin. Generate 3 specific revenue tasks for YEDAN Gateway to execute in the next 6 hours.

Revenue plan: ${JSON.stringify(revPlan.value?.phase1_immediate || {})}
Pro servers: prompt-enhancer, agentforge-compare, moltbook-publisher, openclaw-fortune

Each task should be concrete and actionable (not vague). Reply JSON array:
[{"title":"...","description":"specific steps","priority":"high/medium/low"}]`;

  const result = await think(prompt, { mode: 'task-creation' }, 400);
  if (result.thought) {
    try {
      const tasks = parseJsonResponse(result.thought);
      if (Array.isArray(tasks)) {
        for (const t of tasks.slice(0, 3)) {
          const prio = t.priority === 'high' ? 8 : t.priority === 'medium' ? 5 : 3;
          await pool.query(
            "INSERT INTO tasks (type, status, priority, payload, result) VALUES ('revenue-action', 'pending', $1, $2, $3)",
            [prio, JSON.stringify(t.title || 'revenue task'), JSON.stringify(t.description || '')]
          );
        }
        await sendTelegram(`📋 <b>AUTO-TASKS CREATED</b>\n${tasks.map(t => `• ${t.title}`).join('\n')}`);
      }
    } catch (err) { console.error('[TASK-CREATE]', err.message); }
  }
}

// ============================================================
// REPORTING
// ============================================================
async function generateReport() {
  const latest = healthCache.latest || await checkAllServers();
  let stats = {};
  try {
    const [hc, tc, ec, al, th, lr] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM health_checks WHERE timestamp > NOW() - INTERVAL '24 hours'"),
      pool.query("SELECT status, COUNT(*) as count FROM tasks GROUP BY status"),
      pool.query("SELECT COUNT(*) FROM events WHERE timestamp > NOW() - INTERVAL '24 hours'"),
      pool.query("SELECT COUNT(*) FROM alerts WHERE timestamp > NOW() - INTERVAL '24 hours'"),
      pool.query("SELECT COUNT(*) FROM think_log WHERE timestamp > NOW() - INTERVAL '24 hours'"),
      pool.query("SELECT COUNT(*) FROM learnings"),
    ]);
    stats = {
      healthChecks: +hc.rows[0].count,
      tasks: tc.rows.reduce((a, r) => { a[r.status] = +r.count; return a; }, {}),
      events: +ec.rows[0].count, alerts: +al.rows[0].count,
      thoughts: +th.rows[0].count, totalLearnings: +lr.rows[0].count,
    };
  } catch {}

  const mcpOk = latest.servers.filter(s => s.type === 'mcp' && s.ok).length;
  const allOk = latest.servers.filter(s => s.ok).length;

  return `📊 <b>BUNSHIN v4.0 Daily</b>\n━━━━━━━━━━━━━━━\n` +
    `🔧 MCP: ${mcpOk}/9 | All: ${allOk}/${latest.total}\n` +
    `⏱ Latency: ${latest.latencyAvg}ms\n` +
    `📈 24h: ${stats.healthChecks} checks, ${stats.events} events\n` +
    `📋 Tasks: ${JSON.stringify(stats.tasks || {})}\n` +
    `🔔 Alerts: ${stats.alerts} | 🧠 Thoughts: ${stats.thoughts}\n` +
    `📚 Learnings: ${stats.totalLearnings} total\n` +
    `⏰ Uptime: ${Math.round(process.uptime() / 3600)}h\n` +
    `${[...alertState.downServers].length > 0 ? `🚨 DOWN: ${[...alertState.downServers].join(', ')}` : '✅ All systems operational'}`;
}

async function runCleanup() {
  const results = await Promise.all([
    pool.query("DELETE FROM health_checks WHERE timestamp < NOW() - INTERVAL '7 days'"),
    pool.query("DELETE FROM events WHERE timestamp < NOW() - INTERVAL '14 days'"),
    pool.query("DELETE FROM tasks WHERE status IN ('completed','failed') AND updated_at < NOW() - INTERVAL '3 days'"),
    pool.query("DELETE FROM alerts WHERE resolved=true AND resolved_at < NOW() - INTERVAL '7 days'"),
    pool.query("DELETE FROM think_log WHERE timestamp < NOW() - INTERVAL '14 days'"),
  ]);
  return {
    healthChecks: results[0].rowCount, events: results[1].rowCount,
    tasks: results[2].rowCount, alerts: results[3].rowCount, thinkLogs: results[4].rowCount,
  };
}

// Auth
function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
  if (token !== AUTH_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ============================================================
// PUBLIC ROUTES
// ============================================================
app.get('/', (req, res) => {
  res.json({
    ...IDENTITY,
    monitoring: { mcp: 9, api: 2, store: 1, tool: 1, total: 13 },
    capabilities: [
      'health-monitoring', 'telegram-alerts', 'smart-alerts',
      'task-queue', 'task-processor', 'kv-store',
      'shared-brain', 'llm-thinking', 'learning-system',
      'work-handoff', 'daily-reports', 'auto-cleanup',
      'autonomous-analysis', 'revenue-tracking',
    ],
    uptime: process.uptime(),
    dbConnected: pool.totalCount > 0,
    telegramEnabled: !!TELEGRAM_BOT_TOKEN,
    thinkingEnabled: !!DEEPSEEK_API_KEY,
  });
});

app.get('/ping', async (req, res) => {
  let dbOk = false;
  try { await pool.query('SELECT 1'); dbOk = true; } catch {}
  res.json({
    pong: true, version: IDENTITY.version, uptime: process.uptime(),
    dbConnected: dbOk, telegramEnabled: !!TELEGRAM_BOT_TOKEN,
    thinkingEnabled: !!DEEPSEEK_API_KEY, monitored: MCP_SERVERS.length,
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', async (req, res) => {
  const result = await checkAllServers();
  res.status(result.healthy === result.total ? 200 : 503).json(result);
});

app.get('/health/history', (req, res) => {
  res.json({ source: 'memory', count: healthCache.history.length, history: healthCache.history.slice(0, 50) });
});

app.get('/health/:name', async (req, res) => {
  const s = MCP_SERVERS.find(s => s.name === req.params.name);
  if (!s) return res.status(404).json({ error: 'Not found', available: MCP_SERVERS.map(s => s.name) });
  res.json(await checkServer(s));
});

app.get('/status', (req, res) => {
  const latest = healthCache.latest;
  if (!latest) return res.json({ message: 'No checks yet' });
  res.json({
    healthy: latest.healthy, total: latest.total,
    mcpHealthy: latest.mcpHealthy, mcpTotal: latest.mcpTotal,
    allOk: latest.healthy === latest.total,
    latencyAvg: latest.latencyAvg, lastCheck: latest.timestamp,
    uptime: process.uptime(),
    activeAlerts: alertState.downServers.size,
    downServers: [...alertState.downServers],
    telegramEnabled: !!TELEGRAM_BOT_TOKEN,
    thinkingEnabled: !!DEEPSEEK_API_KEY,
  });
});

// ============================================================
// PROTECTED ROUTES
// ============================================================

// Tasks
app.get('/api/tasks', auth, async (req, res) => {
  try {
    const { status, limit = 20 } = req.query;
    const q = status
      ? { text: 'SELECT * FROM tasks WHERE status=$1 ORDER BY priority DESC LIMIT $2', vals: [status, Math.min(+limit, 100)] }
      : { text: 'SELECT * FROM tasks ORDER BY priority DESC, created_at DESC LIMIT $1', vals: [Math.min(+limit, 100)] };
    const { rows } = await pool.query(q.text, q.vals);
    res.json({ count: rows.length, tasks: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/tasks', auth, async (req, res) => {
  try {
    const { type, payload = {}, priority = 5, maxRetries = 3 } = req.body;
    if (!type) return res.status(400).json({ error: 'type required' });
    const { rows } = await pool.query(
      'INSERT INTO tasks (type, payload, priority) VALUES ($1,$2,$3) RETURNING *',
      [type, JSON.stringify(payload), priority]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/tasks/:id', auth, async (req, res) => {
  try {
    const { status, result, error } = req.body;
    const sets = ['updated_at=NOW()']; const vals = []; let i = 1;
    if (status) { sets.push(`status=$${i++}`); vals.push(status); }
    if (result !== undefined) { sets.push(`result=$${i++}`); vals.push(JSON.stringify(result)); }
    if (error !== undefined) { sets.push(`error=$${i++}`); vals.push(error); }
    vals.push(req.params.id);
    const { rows } = await pool.query(`UPDATE tasks SET ${sets.join(',')} WHERE id=$${i} RETURNING *`, vals);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Alerts
app.get('/api/alerts', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM alerts WHERE resolved=$1 ORDER BY timestamp DESC LIMIT 50',
      [req.query.resolved === 'true']
    );
    res.json({ count: rows.length, activeDown: [...alertState.downServers], alerts: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Events
app.get('/api/events', auth, async (req, res) => {
  try {
    const { type, limit = 50 } = req.query;
    const q = type
      ? { text: 'SELECT * FROM events WHERE type=$1 ORDER BY timestamp DESC LIMIT $2', vals: [type, Math.min(+limit, 200)] }
      : { text: 'SELECT * FROM events ORDER BY timestamp DESC LIMIT $1', vals: [Math.min(+limit, 200)] };
    const { rows } = await pool.query(q.text, q.vals);
    res.json({ count: rows.length, events: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// KV
app.get('/api/kv/:key', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM kv_store WHERE key=$1', [req.params.key]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/kv/:key', auth, async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO kv_store (key,value,updated_at) VALUES ($1,$2,NOW())
       ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()`,
      [req.params.key, JSON.stringify(req.body.value)]
    );
    res.json({ key: req.params.key, updated: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Brain — 共享大腦
app.get('/api/brain', auth, async (req, res) => {
  try {
    const { category } = req.query;
    const q = category
      ? { text: 'SELECT * FROM brain WHERE category=$1 ORDER BY updated_at DESC', vals: [category] }
      : { text: 'SELECT * FROM brain ORDER BY updated_at DESC LIMIT 50', vals: [] };
    const { rows } = await pool.query(q.text, q.vals);
    res.json({ count: rows.length, brain: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/brain/:key', auth, async (req, res) => {
  try {
    const result = await brainGet(req.params.key);
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/brain/:key', auth, async (req, res) => {
  try {
    const { value, category = 'general', summary = null } = req.body;
    await brainSet(req.params.key, value, category, summary, req.body.updatedBy || 'api');
    res.json({ key: req.params.key, stored: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Think — LLM 思考
app.post('/api/think', auth, async (req, res) => {
  try {
    const { prompt, context = {}, maxTokens = 500 } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt required' });
    const result = await think(prompt, context, maxTokens);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/think/log', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, timestamp, prompt, response, tokens_used, action_taken FROM think_log ORDER BY timestamp DESC LIMIT 20'
    );
    res.json({ count: rows.length, thoughts: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Learn
app.get('/api/learnings', auth, async (req, res) => {
  try {
    const { category } = req.query;
    const q = category
      ? { text: 'SELECT * FROM learnings WHERE category=$1 ORDER BY confidence DESC', vals: [category] }
      : { text: 'SELECT * FROM learnings ORDER BY confidence DESC LIMIT 50', vals: [] };
    const { rows } = await pool.query(q.text, q.vals);
    res.json({ count: rows.length, learnings: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/learn', auth, async (req, res) => {
  try {
    const { category, pattern, evidence = {}, confidence = 0.5 } = req.body;
    if (!category || !pattern) return res.status(400).json({ error: 'category and pattern required' });
    const result = await learn(category, pattern, evidence, confidence);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Handoff — 工作交接
app.post('/api/handoff/offline', auth, async (req, res) => {
  try {
    const { workState, pendingTasks = [], notes = '' } = req.body;
    if (!workState) return res.status(400).json({ error: 'workState required' });
    const handoff = await createHandoff('offline', req.body.source || 'claude-code', workState, pendingTasks, notes);
    await logEvent('handoff_offline', req.body.source || 'claude-code', { taskCount: pendingTasks.length });
    await sendTelegram(`💤 <b>HANDOFF RECEIVED</b>\n${notes || 'Master going offline'}\n📋 ${pendingTasks.length} tasks queued`);
    res.json(handoff);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/handoff/resume', auth, async (req, res) => {
  try {
    const resume = await getResumePackage();
    await logEvent('handoff_resume', 'api', { summary: resume.summary });
    res.json(resume);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/handoff/history', auth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM handoffs ORDER BY timestamp DESC LIMIT 20');
    res.json({ count: rows.length, handoffs: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DB stats
app.get('/api/db/stats', auth, async (req, res) => {
  try {
    const tables = ['health_checks', 'tasks', 'events', 'kv_store', 'alerts', 'brain', 'learnings', 'handoffs', 'think_log'];
    const counts = await Promise.all(tables.map(t => pool.query(`SELECT COUNT(*) FROM ${t}`)));
    const stats = tables.reduce((a, t, i) => { a[t] = +counts[i].rows[0].count; return a; }, {});
    stats.pool = { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount };
    res.json(stats);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Report
app.get('/api/report', auth, async (req, res) => {
  try {
    const report = await generateReport();
    if (req.query.send === 'true') await sendTelegram(report);
    res.json({ report, sent: req.query.send === 'true' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Command
app.post('/api/command', auth, async (req, res) => {
  try {
    const { command, args = {} } = req.body;
    if (!command) return res.status(400).json({ error: 'command required' });
    await logEvent('command', 'yedan', { command });

    let result;
    switch (command) {
      case 'health-check': result = await checkAllServers(); break;
      case 'get-status': {
        const [tc, al] = await Promise.all([
          pool.query("SELECT COUNT(*) FROM tasks WHERE status='pending'"),
          pool.query("SELECT COUNT(*) FROM alerts WHERE resolved=false"),
        ]);
        result = {
          health: healthCache.latest, pendingTasks: +tc.rows[0].count,
          activeAlerts: +al.rows[0].count, downServers: [...alertState.downServers],
          uptime: process.uptime(),
        };
        break;
      }
      case 'think': result = await think(args.prompt || '', args.context || {}); break;
      case 'send-telegram': result = { sent: await sendTelegram(args.message || '') }; break;
      case 'daily-report': {
        const r = await generateReport(); await sendTelegram(r);
        result = { sent: true };
        break;
      }
      case 'process-tasks': {
        const ids = [];
        for (let i = 0; i < (args.count || 5); i++) {
          const t = await processNextTask();
          if (!t) break; ids.push(t.id);
        }
        result = { processed: ids.length, ids };
        break;
      }
      case 'cleanup': result = await runCleanup(); break;
      case 'brain-dump': {
        const { rows } = await pool.query('SELECT key, category, summary, updated_at FROM brain ORDER BY updated_at DESC');
        result = rows;
        break;
      }
      default: return res.status(400).json({ error: `Unknown: ${command}` });
    }
    res.json({ command, result, timestamp: new Date().toISOString() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// AUTONOMOUS OPERATIONS — Revenue-First Loop
// ============================================================

// Health check every 5 min + update brain summary
setInterval(async () => {
  try {
    const r = await checkAllServers();
    const down = r.servers.filter(s => !s.ok);
    console.log(down.length > 0
      ? `[!] ${down.length}/${r.total} DOWN: ${down.map(s => s.name).join(',')}`
      : `[OK] ${r.total}/${r.total} | ${r.latencyAvg}ms`
    );
    await updateHealthSummary(); // Write to brain for YEDAN to poll
  } catch (err) { console.error('[HEALTH]', err.message); }
}, 5 * 60 * 1000);

// Process pending tasks every 2 min
setInterval(async () => {
  try { const t = await processNextTask(); if (t) console.log(`[TASK] Auto #${t.id}`); }
  catch {}
}, 2 * 60 * 1000);

// Revenue-first autonomous thinking every 15 min
setInterval(async () => {
  try { await autonomousThink(); } catch (err) { console.error('[THINK]', err.message); }
}, 15 * 60 * 1000);

// Auto-create revenue tasks every 6 hours
setInterval(async () => {
  try { await createRevenueTasks(); } catch (err) { console.error('[REV-TASKS]', err.message); }
}, 6 * 60 * 60 * 1000);

// Daily report to Telegram (every 12 hours for better coverage)
setInterval(async () => {
  if (TELEGRAM_BOT_TOKEN) {
    try { await sendTelegram(await generateReport()); } catch {}
  }
}, 12 * 60 * 60 * 1000);

// Cleanup old data every 6 hours
setInterval(async () => {
  try { const r = await runCleanup(); console.log(`[CLEAN] ${JSON.stringify(r)}`); }
  catch {}
}, 6 * 60 * 60 * 1000);

// ============================================================
// BOOT
// ============================================================
async function boot() {
  await initDatabase();

  // Store boot event in brain
  await brainSet('last-boot', {
    version: IDENTITY.version,
    timestamp: new Date().toISOString(),
    capabilities: IDENTITY.version,
  }, 'system', `Bunshin v${IDENTITY.version} booted`);

  setTimeout(async () => {
    try {
      const r = await checkAllServers();
      console.log(`[BOOT] ${r.healthy}/${r.total} (MCP: ${r.mcpHealthy}/${r.mcpTotal}) | ${r.latencyAvg}ms`);
      await logEvent('boot', 'system', { version: IDENTITY.version, healthy: r.healthy, total: r.total });

      if (TELEGRAM_BOT_TOKEN) {
        await sendTelegram(
          `🚀 <b>BUNSHIN v${IDENTITY.version} BOOT</b>\n` +
          `MCP: ${r.mcpHealthy}/${r.mcpTotal} | All: ${r.healthy}/${r.total}\n` +
          `🧠 Think: ${DEEPSEEK_API_KEY ? '✅' : '❌'} | 📡 TG: ✅\n` +
          `Features: brain, think, learn, handoff, revenue-loop`
        );
      }
      await updateHealthSummary();
    } catch (err) { console.error('[BOOT]', err.message); }
  }, 3000);

  // Delayed boot tasks: create first revenue tasks + first revenue think
  setTimeout(async () => {
    try {
      await createRevenueTasks();
      console.log('[BOOT] Revenue tasks created');
    } catch (err) { console.error('[BOOT-REV]', err.message); }
  }, 30000); // 30s after boot
}

app.listen(PORT, () => {
  console.log(`=== YEDAN BUNSHIN v${IDENTITY.version} ===`);
  console.log(`Port ${PORT} | ${MCP_SERVERS.length} services`);
  console.log(`DB: ${process.env.DATABASE_URL ? '✅' : '❌'} | TG: ${TELEGRAM_BOT_TOKEN ? '✅' : '❌'} | Think: ${DEEPSEEK_API_KEY ? '✅' : '❌'}`);
  boot();
});
