const express = require('express');
const { Pool } = require('pg');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ============================================================
// YEDAN BUNSHIN (分身) — OpenClaw Autonomous Agent on Render
// 24/7 health monitoring, task execution, persistent memory
// ============================================================

const IDENTITY = {
  name: 'YEDAN-Bunshin',
  version: '2.0.0',
  role: 'Autonomous MCP Server Monitor & Task Executor',
  parent: 'YEDAN Alpha Gateway (WSL2)',
  operator: 'Yagami',
};

// Auth token for protected endpoints
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'openclaw-bunshin-2026';

// OpenClaw MCP Server endpoints
const MCP_SERVERS = [
  { name: 'json-toolkit', url: 'https://json-toolkit-mcp.yagami8095.workers.dev' },
  { name: 'regex-engine', url: 'https://regex-engine-mcp.yagami8095.workers.dev' },
  { name: 'color-palette', url: 'https://color-palette-mcp.yagami8095.workers.dev' },
  { name: 'timestamp-converter', url: 'https://timestamp-converter-mcp.yagami8095.workers.dev' },
  { name: 'prompt-enhancer', url: 'https://prompt-enhancer-mcp.yagami8095.workers.dev' },
  { name: 'agentforge-compare', url: 'https://agentforge-compare-mcp.yagami8095.workers.dev' },
  { name: 'moltbook-publisher', url: 'https://moltbook-publisher-mcp.yagami8095.workers.dev' },
  { name: 'fortune', url: 'https://openclaw-fortune-mcp.yagami8095.workers.dev' },
  { name: 'intel', url: 'https://openclaw-intel-mcp.yagami8095.workers.dev' },
];

// PostgreSQL connection (Render internal network)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com') ? { rejectUnauthorized: false } : false,
  max: 3, // Free tier: keep connections low
  idleTimeoutMillis: 30000,
});

// In-memory cache for fast responses
const healthCache = { latest: null, history: [] };
const MAX_MEMORY_HISTORY = 100;

// ============================================================
// DATABASE SETUP
// ============================================================
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
        retry_count INTEGER DEFAULT 0
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
      CREATE INDEX IF NOT EXISTS idx_health_timestamp ON health_checks(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status, priority DESC);
      CREATE INDEX IF NOT EXISTS idx_events_type ON events(type, timestamp DESC);
    `);
    console.log('[DB] Tables initialized');
    await logEvent('system', 'db_init', { tables: ['health_checks', 'tasks', 'events', 'kv_store'] });
  } catch (err) {
    console.error('[DB] Init error:', err.message);
  }
}

// ============================================================
// CORE FUNCTIONS
// ============================================================
async function checkServer(server) {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(server.url, { signal: controller.signal });
    clearTimeout(timeout);
    return {
      name: server.name,
      url: server.url,
      status: res.status,
      ok: res.status >= 200 && res.status < 500,
      latency: Date.now() - start,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      name: server.name,
      url: server.url,
      status: 0,
      ok: false,
      latency: Date.now() - start,
      error: err.message,
      timestamp: new Date().toISOString(),
    };
  }
}

async function checkAllServers() {
  const results = await Promise.all(MCP_SERVERS.map(checkServer));
  const healthy = results.filter(r => r.ok).length;
  const latencyAvg = results.reduce((sum, r) => sum + r.latency, 0) / results.length;
  const record = {
    timestamp: new Date().toISOString(),
    servers: results,
    healthy,
    total: results.length,
    latencyAvg: Math.round(latencyAvg),
  };

  // Update memory cache
  healthCache.latest = record;
  healthCache.history.unshift(record);
  if (healthCache.history.length > MAX_MEMORY_HISTORY) healthCache.history.pop();

  // Persist to database
  try {
    await pool.query(
      'INSERT INTO health_checks (healthy, total, servers, latency_avg) VALUES ($1, $2, $3, $4)',
      [healthy, results.length, JSON.stringify(results), latencyAvg]
    );
  } catch (err) {
    console.error('[DB] Failed to persist health check:', err.message);
  }

  return record;
}

async function logEvent(type, source, data = {}) {
  try {
    await pool.query(
      'INSERT INTO events (type, source, data) VALUES ($1, $2, $3)',
      [type, source, JSON.stringify(data)]
    );
  } catch (err) {
    console.error('[DB] Event log error:', err.message);
  }
}

async function kvSet(key, value) {
  await pool.query(
    `INSERT INTO kv_store (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    [key, JSON.stringify(value)]
  );
}

async function kvGet(key) {
  const { rows } = await pool.query('SELECT value FROM kv_store WHERE key = $1', [key]);
  return rows[0]?.value ?? null;
}

// Auth middleware for protected endpoints
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
  if (token !== AUTH_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ============================================================
// PUBLIC ROUTES (no auth)
// ============================================================
app.get('/', (req, res) => {
  res.json({
    ...IDENTITY,
    endpoints: {
      '/': 'Identity & endpoints',
      '/health': 'Check all 9 MCP servers now',
      '/health/history': 'Recent health check history (memory)',
      '/health/:name': 'Check specific server',
      '/status': 'Quick status summary',
      '/ping': 'Keep-alive endpoint (for cron)',
    },
    protectedEndpoints: {
      '/api/tasks': 'GET/POST task queue (auth required)',
      '/api/tasks/:id': 'GET/PATCH specific task',
      '/api/events': 'GET event log',
      '/api/kv/:key': 'GET/PUT key-value store',
      '/api/db/health-history': 'GET persistent health history from DB',
      '/api/db/stats': 'GET database statistics',
      '/api/command': 'POST execute command from YEDAN',
    },
    servers: MCP_SERVERS.length,
    uptime: process.uptime(),
    dbConnected: pool.totalCount > 0,
  });
});

// Keep-alive endpoint for Render Cron Job
app.get('/ping', async (req, res) => {
  const start = Date.now();
  let dbOk = false;
  try {
    await pool.query('SELECT 1');
    dbOk = true;
  } catch {}
  res.json({
    pong: true,
    uptime: process.uptime(),
    dbConnected: dbOk,
    latency: Date.now() - start,
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', async (req, res) => {
  const result = await checkAllServers();
  await logEvent('health_check', 'api', { healthy: result.healthy, total: result.total });
  const statusCode = result.healthy === result.total ? 200 : 503;
  res.status(statusCode).json(result);
});

app.get('/health/history', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, MAX_MEMORY_HISTORY);
  res.json({
    source: 'memory',
    count: healthCache.history.length,
    history: healthCache.history.slice(0, limit),
  });
});

app.get('/health/:name', async (req, res) => {
  const server = MCP_SERVERS.find(s => s.name === req.params.name);
  if (!server) {
    return res.status(404).json({ error: 'Server not found', available: MCP_SERVERS.map(s => s.name) });
  }
  const result = await checkServer(server);
  res.json(result);
});

app.get('/status', (req, res) => {
  const latest = healthCache.latest;
  if (!latest) {
    return res.json({ message: 'No health checks yet. Visit /health first.', servers: MCP_SERVERS.length });
  }
  res.json({
    healthy: latest.healthy,
    total: latest.total,
    allOk: latest.healthy === latest.total,
    latencyAvg: latest.latencyAvg,
    lastCheck: latest.timestamp,
    uptime: process.uptime(),
  });
});

// ============================================================
// PROTECTED ROUTES (auth required)
// ============================================================

// Task Queue
app.get('/api/tasks', authMiddleware, async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const { rows } = await pool.query(
      'SELECT * FROM tasks WHERE status = $1 ORDER BY priority DESC, created_at ASC LIMIT $2',
      [status, limit]
    );
    res.json({ count: rows.length, tasks: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks', authMiddleware, async (req, res) => {
  try {
    const { type, payload = {}, priority = 5 } = req.body;
    if (!type) return res.status(400).json({ error: 'type is required' });
    const { rows } = await pool.query(
      'INSERT INTO tasks (type, payload, priority) VALUES ($1, $2, $3) RETURNING *',
      [type, JSON.stringify(payload), priority]
    );
    await logEvent('task_created', 'api', { taskId: rows[0].id, type });
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Task not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const { status, result, error } = req.body;
    const sets = ['updated_at = NOW()'];
    const vals = [];
    let idx = 1;
    if (status) { sets.push(`status = $${idx++}`); vals.push(status); }
    if (result !== undefined) { sets.push(`result = $${idx++}`); vals.push(JSON.stringify(result)); }
    if (error !== undefined) { sets.push(`error = $${idx++}`); vals.push(error); }
    vals.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE tasks SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, vals
    );
    if (!rows[0]) return res.status(404).json({ error: 'Task not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Event Log
app.get('/api/events', authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const type = req.query.type;
    let query = 'SELECT * FROM events';
    const vals = [];
    if (type) { query += ' WHERE type = $1'; vals.push(type); }
    query += ' ORDER BY timestamp DESC LIMIT $' + (vals.length + 1);
    vals.push(limit);
    const { rows } = await pool.query(query, vals);
    res.json({ count: rows.length, events: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// KV Store
app.get('/api/kv/:key', authMiddleware, async (req, res) => {
  try {
    const value = await kvGet(req.params.key);
    if (value === null) return res.status(404).json({ error: 'Key not found' });
    res.json({ key: req.params.key, value });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/kv/:key', authMiddleware, async (req, res) => {
  try {
    await kvSet(req.params.key, req.body.value);
    res.json({ key: req.params.key, value: req.body.value, updated: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Persistent health history from database
app.get('/api/db/health-history', authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    const hours = parseInt(req.query.hours) || 24;
    const { rows } = await pool.query(
      `SELECT id, timestamp, healthy, total, latency_avg
       FROM health_checks
       WHERE timestamp > NOW() - INTERVAL '1 hour' * $1
       ORDER BY timestamp DESC LIMIT $2`,
      [hours, limit]
    );
    res.json({ count: rows.length, hours, history: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Database stats
app.get('/api/db/stats', authMiddleware, async (req, res) => {
  try {
    const [healthCount, taskCount, eventCount, kvCount] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM health_checks'),
      pool.query("SELECT status, COUNT(*) as count FROM tasks GROUP BY status"),
      pool.query('SELECT COUNT(*) as count FROM events'),
      pool.query('SELECT COUNT(*) as count FROM kv_store'),
    ]);
    res.json({
      healthChecks: parseInt(healthCount.rows[0].count),
      tasks: taskCount.rows.reduce((acc, r) => { acc[r.status] = parseInt(r.count); return acc; }, {}),
      events: parseInt(eventCount.rows[0].count),
      kvEntries: parseInt(kvCount.rows[0].count),
      poolStats: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Command endpoint - YEDAN can send commands to bunshin
app.post('/api/command', authMiddleware, async (req, res) => {
  try {
    const { command, args = {} } = req.body;
    if (!command) return res.status(400).json({ error: 'command is required' });

    await logEvent('command_received', 'yedan', { command, args });

    let result;
    switch (command) {
      case 'health-check':
        result = await checkAllServers();
        break;
      case 'create-task':
        const { rows } = await pool.query(
          'INSERT INTO tasks (type, payload, priority) VALUES ($1, $2, $3) RETURNING *',
          [args.type || 'general', JSON.stringify(args.payload || {}), args.priority || 5]
        );
        result = rows[0];
        break;
      case 'get-status':
        const [hc, tc, ec] = await Promise.all([
          pool.query('SELECT COUNT(*) FROM health_checks'),
          pool.query("SELECT COUNT(*) FROM tasks WHERE status = 'pending'"),
          pool.query("SELECT COUNT(*) FROM events WHERE timestamp > NOW() - INTERVAL '1 hour'"),
        ]);
        result = {
          lastHealth: healthCache.latest,
          pendingTasks: parseInt(tc.rows[0].count),
          recentEvents: parseInt(ec.rows[0].count),
          totalHealthChecks: parseInt(hc.rows[0].count),
          uptime: process.uptime(),
        };
        break;
      case 'kv-set':
        await kvSet(args.key, args.value);
        result = { key: args.key, stored: true };
        break;
      case 'kv-get':
        result = { key: args.key, value: await kvGet(args.key) };
        break;
      case 'cleanup':
        // Clean old data to stay within free tier limits
        const deleted = await pool.query(
          "DELETE FROM health_checks WHERE timestamp < NOW() - INTERVAL '7 days' RETURNING id"
        );
        const eventsDeleted = await pool.query(
          "DELETE FROM events WHERE timestamp < NOW() - INTERVAL '7 days' RETURNING id"
        );
        result = { healthChecksDeleted: deleted.rowCount, eventsDeleted: eventsDeleted.rowCount };
        break;
      default:
        return res.status(400).json({ error: `Unknown command: ${command}` });
    }

    await logEvent('command_executed', 'bunshin', { command, success: true });
    res.json({ command, result, timestamp: new Date().toISOString() });
  } catch (err) {
    await logEvent('command_error', 'bunshin', { command: req.body.command, error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// AUTONOMOUS OPERATIONS
// ============================================================

// Health check every 5 minutes
setInterval(async () => {
  try {
    const result = await checkAllServers();
    const down = result.servers.filter(s => !s.ok);
    if (down.length > 0) {
      console.error(`[ALERT] ${down.length} servers DOWN: ${down.map(s => s.name).join(', ')}`);
      await logEvent('alert', 'monitor', { down: down.map(s => s.name), healthy: result.healthy });
    } else {
      console.log(`[OK] All ${result.total} servers healthy | avg ${result.latencyAvg}ms`);
    }
  } catch (err) {
    console.error('[ERROR] Health check failed:', err.message);
  }
}, 5 * 60 * 1000);

// Database cleanup every 6 hours (keep free tier storage low)
setInterval(async () => {
  try {
    const hc = await pool.query("DELETE FROM health_checks WHERE timestamp < NOW() - INTERVAL '7 days'");
    const ev = await pool.query("DELETE FROM events WHERE timestamp < NOW() - INTERVAL '14 days'");
    const tasks = await pool.query("DELETE FROM tasks WHERE status = 'completed' AND updated_at < NOW() - INTERVAL '3 days'");
    console.log(`[CLEANUP] Deleted: ${hc.rowCount} health_checks, ${ev.rowCount} events, ${tasks.rowCount} tasks`);
  } catch (err) {
    console.error('[CLEANUP] Error:', err.message);
  }
}, 6 * 60 * 60 * 1000);

// ============================================================
// STARTUP
// ============================================================
async function boot() {
  await initDatabase();

  // Initial health check
  setTimeout(async () => {
    try {
      const result = await checkAllServers();
      console.log(`[BOOT] Health: ${result.healthy}/${result.total} | avg ${result.latencyAvg}ms`);
      await logEvent('boot', 'system', {
        healthy: result.healthy,
        total: result.total,
        uptime: process.uptime(),
      });
    } catch (err) {
      console.error('[BOOT] Health check error:', err.message);
    }
  }, 3000);
}

app.listen(PORT, () => {
  console.log(`=== YEDAN BUNSHIN v${IDENTITY.version} ===`);
  console.log(`Port ${PORT} | Monitoring ${MCP_SERVERS.length} MCP servers`);
  console.log(`Database: ${process.env.DATABASE_URL ? 'configured' : 'NOT SET'}`);
  boot();
});
