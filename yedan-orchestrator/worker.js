/**
 * YEDAN Fleet Orchestrator - Master Brain
 * The supreme coordinator of the entire cloud army
 * Cron: every 2 minutes (*\/2 * * * *)
 *
 * Responsibilities:
 * - Coordinate all fleet workers
 * - Dispatch tasks to appropriate workers
 * - Monitor fleet health and performance
 * - Auto-scale and redistribute workload
 * - Report aggregated status to Bunshin
 * - Revenue aggregation across all sources
 */

const FLEET_WORKERS = [
  { id: 'yedan-orchestrator', url: 'https://yedan-orchestrator.yagami8095.workers.dev' },
  { id: 'yedan-revenue-sentinel', url: 'https://yedan-revenue-sentinel.yagami8095.workers.dev' },
  { id: 'yedan-content-engine', url: 'https://yedan-content-engine.yagami8095.workers.dev' },
  { id: 'yedan-intel-ops', url: 'https://yedan-intel-ops.yagami8095.workers.dev' },
  { id: 'yedan-health-commander', url: 'https://yedan-health-commander.yagami8095.workers.dev' },
  { id: 'yedan-cloud-executor', url: 'https://yedan-cloud-executor.yagami8095.workers.dev' },
];

const MCP_SERVERS = [
  'json-toolkit-mcp', 'regex-engine-mcp', 'color-palette-mcp',
  'timestamp-converter-mcp', 'prompt-enhancer-mcp', 'agentforge-compare-mcp',
  'moltbook-publisher-mcp', 'openclaw-fortune-mcp', 'openclaw-intel-mcp'
];

const BUNSHIN_URL = 'https://openclaw-mcp-servers.onrender.com';
const BUNSHIN_AUTH = 'openclaw-bunshin-2026';

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(orchestrate(env));
  },

  async fetch(request, env) {
    const url = new URL(request.url);

    switch (url.pathname) {
      case '/':
      case '/status':
        return await getFleetStatus(env);
      case '/health':
        return json({ status: 'operational', role: 'fleet-orchestrator', version: '1.0.0', timestamp: new Date().toISOString() });
      case '/fleet':
        return await getFleetDetails(env);
      case '/revenue':
        return await getRevenueReport(env);
      case '/dispatch':
        if (request.method === 'POST') return await dispatchTask(request, env);
        return json({ error: 'POST required' }, 405);
      case '/metrics':
        return await getMetrics(env);
      case '/ping':
        return json({ pong: true, brain: 'orchestrator', ts: Date.now() });
      default:
        return json({ error: 'Unknown endpoint', endpoints: ['/', '/status', '/fleet', '/revenue', '/dispatch', '/metrics', '/health', '/ping'] }, 404);
    }
  }
};

// === CORE ORCHESTRATION ===
async function orchestrate(env) {
  const log = [];
  const startTime = Date.now();
  log.push(`[ORCHESTRATOR] Heartbeat started at ${new Date().toISOString()}`);

  try {
    // Phase 1: Fleet Health Check
    const fleetHealth = await checkFleetHealth(env, log);

    // Phase 2: Task Distribution
    const taskResults = await distributeTasks(env, log);

    // Phase 3: Revenue Aggregation
    const revenue = await aggregateRevenue(env, log);

    // Phase 4: Metrics Recording
    await recordMetrics(env, fleetHealth, taskResults, revenue, log);

    // Phase 5: Report to Bunshin
    const report = {
      orchestrator: 'yedan-fleet-orchestrator',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      fleet: {
        total: FLEET_WORKERS.length,
        healthy: fleetHealth.healthy,
        unhealthy: fleetHealth.unhealthy,
        workers: fleetHealth.details
      },
      tasks: taskResults,
      revenue: revenue,
      mcp_servers: fleetHealth.mcpStatus,
      log: log.slice(-20)
    };

    await reportToBunshin(report, env);

    // Store in KV for dashboard
    await env.KV.put('fleet:last-orchestration', JSON.stringify(report), { expirationTtl: 3600 });
    await env.ARMY_KV.put('orchestrator:last-run', JSON.stringify(report), { expirationTtl: 7200 });

    log.push(`[ORCHESTRATOR] Complete in ${Date.now() - startTime}ms`);
  } catch (err) {
    log.push(`[ORCHESTRATOR] FATAL: ${err.message}`);
    await logEvent(env, 'yedan-orchestrator', 'orchestration_error', 'critical', err.message);
  }
}

// === FLEET HEALTH ===
async function checkFleetHealth(env, log) {
  log.push('[HEALTH] Checking fleet workers...');
  const details = {};
  let healthy = 0, unhealthy = 0;

  const checks = FLEET_WORKERS.map(async (w) => {
    try {
      const resp = await fetch(`${w.url}/health`, {
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'YedanOrchestrator/1.0' }
      });
      if (resp.ok) {
        details[w.id] = { status: 'healthy', code: resp.status };
        healthy++;
      } else {
        details[w.id] = { status: 'degraded', code: resp.status };
        unhealthy++;
      }
    } catch (e) {
      details[w.id] = { status: 'unreachable', error: e.message };
      unhealthy++;
    }
  });

  await Promise.allSettled(checks);

  // Check MCP servers
  const mcpStatus = {};
  const mcpChecks = MCP_SERVERS.map(async (name) => {
    try {
      const resp = await fetch(`https://${name}.yagami8095.workers.dev/health`, {
        signal: AbortSignal.timeout(5000)
      });
      mcpStatus[name] = resp.ok ? 'up' : `down:${resp.status}`;
    } catch {
      mcpStatus[name] = 'unreachable';
    }
  });

  await Promise.allSettled(mcpChecks);

  const mcpUp = Object.values(mcpStatus).filter(s => s === 'up').length;
  log.push(`[HEALTH] Fleet: ${healthy}/${FLEET_WORKERS.length} healthy | MCP: ${mcpUp}/${MCP_SERVERS.length} up`);

  // Update D1
  try {
    await env.ARMY_DB.prepare(
      `UPDATE fleet_workers SET last_heartbeat = datetime('now'), status = 'active' WHERE id = 'yedan-orchestrator'`
    ).run();
  } catch {}

  return { healthy, unhealthy, details, mcpStatus, mcpUp };
}

// === TASK DISTRIBUTION ===
async function distributeTasks(env, log) {
  log.push('[TASKS] Checking for pending tasks...');

  try {
    // Get pending tasks from D1
    const { results } = await env.ARMY_DB.prepare(
      `SELECT * FROM fleet_tasks WHERE status = 'pending' ORDER BY priority ASC, created_at ASC LIMIT 10`
    ).all();

    if (!results || results.length === 0) {
      log.push('[TASKS] No pending tasks');
      return { dispatched: 0, total_pending: 0 };
    }

    let dispatched = 0;
    for (const task of results) {
      const targetWorker = routeTask(task);
      if (targetWorker) {
        try {
          // Dispatch to worker
          const resp = await fetch(`${targetWorker.url}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_id: task.id, type: task.type, payload: JSON.parse(task.payload || '{}') }),
            signal: AbortSignal.timeout(10000)
          });

          if (resp.ok) {
            await env.ARMY_DB.prepare(
              `UPDATE fleet_tasks SET status = 'running', worker_id = ?, started_at = datetime('now') WHERE id = ?`
            ).bind(targetWorker.id, task.id).run();
            dispatched++;
          }
        } catch (e) {
          log.push(`[TASKS] Dispatch failed for ${task.id}: ${e.message}`);
        }
      }
    }

    log.push(`[TASKS] Dispatched ${dispatched}/${results.length} tasks`);
    return { dispatched, total_pending: results.length };
  } catch (e) {
    log.push(`[TASKS] Error: ${e.message}`);
    return { dispatched: 0, error: e.message };
  }
}

function routeTask(task) {
  const routing = {
    'revenue': 'yedan-revenue-sentinel',
    'revenue-check': 'yedan-revenue-sentinel',
    'content': 'yedan-content-engine',
    'content-create': 'yedan-content-engine',
    'intel': 'yedan-intel-ops',
    'intel-gather': 'yedan-intel-ops',
    'health': 'yedan-health-commander',
    'health-check': 'yedan-health-commander',
    'execute': 'yedan-cloud-executor',
    'general': 'yedan-cloud-executor',
  };

  const workerId = routing[task.type] || 'yedan-cloud-executor';
  return FLEET_WORKERS.find(w => w.id === workerId);
}

// === REVENUE AGGREGATION ===
async function aggregateRevenue(env, log) {
  log.push('[REVENUE] Aggregating...');

  try {
    const { results } = await env.ARMY_DB.prepare(
      `SELECT source, SUM(amount) as total, COUNT(*) as count, currency FROM revenue_ledger WHERE status = 'confirmed' GROUP BY source, currency`
    ).all();

    const totalUSD = results?.reduce((sum, r) => r.currency === 'USD' ? sum + r.total : sum, 0) || 0;

    log.push(`[REVENUE] Total confirmed: $${totalUSD} from ${results?.length || 0} sources`);

    // Also check Product Store live
    let liveRevenue = null;
    try {
      const resp = await fetch('https://product-store.yagami8095.workers.dev/api/orders', {
        signal: AbortSignal.timeout(5000)
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.orders) {
          const paid = data.orders.filter(o => o.status === 'paid');
          liveRevenue = {
            total: paid.reduce((s, o) => s + (parseFloat(o.amount) || 0), 0),
            count: paid.length,
            source: 'product-store-live'
          };
        }
      }
    } catch {}

    return {
      confirmed_total_usd: totalUSD,
      sources: results || [],
      live_check: liveRevenue,
      checked_at: new Date().toISOString()
    };
  } catch (e) {
    log.push(`[REVENUE] Error: ${e.message}`);
    return { error: e.message };
  }
}

// === METRICS ===
async function recordMetrics(env, fleetHealth, taskResults, revenue, log) {
  try {
    const batch = [
      env.ARMY_DB.prepare(`INSERT INTO fleet_metrics (worker_id, metric_name, metric_value, unit) VALUES (?, ?, ?, ?)`)
        .bind('yedan-orchestrator', 'fleet_healthy_count', fleetHealth.healthy, 'count'),
      env.ARMY_DB.prepare(`INSERT INTO fleet_metrics (worker_id, metric_name, metric_value, unit) VALUES (?, ?, ?, ?)`)
        .bind('yedan-orchestrator', 'mcp_up_count', fleetHealth.mcpUp || 0, 'count'),
      env.ARMY_DB.prepare(`INSERT INTO fleet_metrics (worker_id, metric_name, metric_value, unit) VALUES (?, ?, ?, ?)`)
        .bind('yedan-orchestrator', 'tasks_dispatched', taskResults.dispatched || 0, 'count'),
      env.ARMY_DB.prepare(`INSERT INTO fleet_metrics (worker_id, metric_name, metric_value, unit) VALUES (?, ?, ?, ?)`)
        .bind('yedan-orchestrator', 'revenue_total_usd', revenue.confirmed_total_usd || 0, 'USD'),
    ];
    await env.ARMY_DB.batch(batch);
  } catch (e) {
    log.push(`[METRICS] Error: ${e.message}`);
  }
}

// === BUNSHIN REPORTING ===
async function reportToBunshin(report, env) {
  try {
    await fetch(`${BUNSHIN_URL}/api/brain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BUNSHIN_AUTH}`
      },
      body: JSON.stringify({
        key: 'fleet-orchestrator-status',
        value: {
          fleet_size: report.fleet.total,
          fleet_healthy: report.fleet.healthy,
          mcp_up: report.mcp_servers ? Object.values(report.mcp_servers).filter(s => s === 'up').length : 0,
          revenue_usd: report.revenue?.confirmed_total_usd || 0,
          tasks_dispatched: report.tasks?.dispatched || 0,
          last_run: report.timestamp,
          duration_ms: report.duration_ms
        },
        context: 'Fleet Orchestrator heartbeat report'
      }),
      signal: AbortSignal.timeout(8000)
    });
  } catch {}
}

// === D1 EVENT LOG ===
async function logEvent(env, workerId, eventType, severity, message, data) {
  try {
    await env.ARMY_DB.prepare(
      `INSERT INTO fleet_events (worker_id, event_type, severity, message, data) VALUES (?, ?, ?, ?, ?)`
    ).bind(workerId, eventType, severity, message, JSON.stringify(data || {})).run();
  } catch {}
}

// === HTTP ENDPOINTS ===
async function getFleetStatus(env) {
  const cached = await env.ARMY_KV.get('orchestrator:last-run', 'json').catch(() => null);

  const { results: workers } = await env.ARMY_DB.prepare(
    `SELECT id, name, type, status, last_heartbeat, tasks_completed, error_count FROM fleet_workers`
  ).all().catch(() => ({ results: [] }));

  const { results: recentEvents } = await env.ARMY_DB.prepare(
    `SELECT * FROM fleet_events ORDER BY created_at DESC LIMIT 20`
  ).all().catch(() => ({ results: [] }));

  return json({
    fleet: 'YEDAN Cloud Army',
    version: '1.0.0',
    orchestrator: 'yedan-orchestrator',
    timestamp: new Date().toISOString(),
    workers: workers || [],
    recent_events: recentEvents || [],
    last_orchestration: cached ? { duration_ms: cached.duration_ms, fleet_healthy: cached.fleet?.healthy } : null
  });
}

async function getFleetDetails(env) {
  const { results: workers } = await env.ARMY_DB.prepare(`SELECT * FROM fleet_workers`).all();
  const { results: metrics } = await env.ARMY_DB.prepare(
    `SELECT worker_id, metric_name, metric_value, unit, recorded_at FROM fleet_metrics ORDER BY recorded_at DESC LIMIT 50`
  ).all();
  return json({ workers, metrics });
}

async function getRevenueReport(env) {
  const { results: ledger } = await env.ARMY_DB.prepare(
    `SELECT * FROM revenue_ledger ORDER BY recorded_at DESC`
  ).all();
  const { results: totals } = await env.ARMY_DB.prepare(
    `SELECT source, SUM(amount) as total, COUNT(*) as orders, currency FROM revenue_ledger WHERE status = 'confirmed' GROUP BY source, currency`
  ).all();
  const grandTotal = totals?.reduce((s, r) => s + (r.currency === 'USD' ? r.total : 0), 0) || 0;
  return json({ grand_total_usd: grandTotal, by_source: totals, all_entries: ledger });
}

async function dispatchTask(request, env) {
  try {
    const { type, priority, payload } = await request.json();
    if (!type) return json({ error: 'type required' }, 400);

    const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await env.ARMY_DB.prepare(
      `INSERT INTO fleet_tasks (id, type, priority, payload) VALUES (?, ?, ?, ?)`
    ).bind(id, type, priority || 5, JSON.stringify(payload || {})).run();

    return json({ ok: true, task_id: id, type, priority: priority || 5 });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

async function getMetrics(env) {
  const { results } = await env.ARMY_DB.prepare(
    `SELECT worker_id, metric_name, metric_value, unit, recorded_at FROM fleet_metrics ORDER BY recorded_at DESC LIMIT 100`
  ).all();
  return json({ metrics: results });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
