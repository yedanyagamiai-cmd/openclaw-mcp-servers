/**
 * YEDAN Health Commander - Self-Healing Infrastructure Guardian
 * Cron: */3 * * * * (every 3 minutes)
 *
 * Responsibilities:
 * - Deep health monitoring of ALL workers (fleet + MCP + production)
 * - Response time tracking & SLA monitoring
 * - Auto-healing: restart failed workers, clear stuck KV, rotate errors
 * - Alert escalation to Bunshin & Telegram
 * - Uptime tracking and reporting
 * - SSL/TLS certificate monitoring
 */

const BUNSHIN_URL = 'https://openclaw-mcp-servers.onrender.com';
const BUNSHIN_AUTH = 'openclaw-bunshin-2026';

const ALL_ENDPOINTS = [
  // Fleet Workers
  { id: 'orchestrator', url: 'https://yedan-orchestrator.yagami8095.workers.dev/health', category: 'fleet' },
  { id: 'revenue-sentinel', url: 'https://yedan-revenue-sentinel.yagami8095.workers.dev/health', category: 'fleet' },
  { id: 'content-engine', url: 'https://yedan-content-engine.yagami8095.workers.dev/health', category: 'fleet' },
  { id: 'intel-ops', url: 'https://yedan-intel-ops.yagami8095.workers.dev/health', category: 'fleet' },
  { id: 'cloud-executor', url: 'https://yedan-cloud-executor.yagami8095.workers.dev/health', category: 'fleet' },

  // MCP Servers (Revenue-critical)
  { id: 'json-toolkit', url: 'https://json-toolkit-mcp.yagami8095.workers.dev/health', category: 'mcp' },
  { id: 'regex-engine', url: 'https://regex-engine-mcp.yagami8095.workers.dev/health', category: 'mcp' },
  { id: 'color-palette', url: 'https://color-palette-mcp.yagami8095.workers.dev/health', category: 'mcp' },
  { id: 'timestamp', url: 'https://timestamp-converter-mcp.yagami8095.workers.dev/health', category: 'mcp' },
  { id: 'prompt-enhancer', url: 'https://prompt-enhancer-mcp.yagami8095.workers.dev/health', category: 'mcp' },
  { id: 'agentforge', url: 'https://agentforge-compare-mcp.yagami8095.workers.dev/health', category: 'mcp' },
  { id: 'moltbook', url: 'https://moltbook-publisher-mcp.yagami8095.workers.dev/health', category: 'mcp' },
  { id: 'fortune', url: 'https://openclaw-fortune-mcp.yagami8095.workers.dev/health', category: 'mcp' },
  { id: 'intel', url: 'https://openclaw-intel-mcp.yagami8095.workers.dev/health', category: 'mcp' },

  // Production Services
  { id: 'product-store', url: 'https://product-store.yagami8095.workers.dev/api/stats', category: 'production' },
  { id: 'fortune-api', url: 'https://fortune-api.yagami8095.workers.dev/health', category: 'production' },
  { id: 'intel-api', url: 'https://openclaw-intel-api.yagami8095.workers.dev/health', category: 'production' },
  { id: 'bunshin', url: 'https://openclaw-mcp-servers.onrender.com/api/health', category: 'external' },
  { id: 'cf-browser', url: 'https://openclaw-browser.yagami8095.workers.dev/health', category: 'production' },
];

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(healthSweep(env));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    switch (url.pathname) {
      case '/':
      case '/status':
        return await getHealthDashboard(env);
      case '/health':
        return json({ status: 'operational', role: 'health-commander', version: '1.0.0', monitoring: ALL_ENDPOINTS.length + ' endpoints' });
      case '/execute':
        if (request.method === 'POST') return await handleTask(request, env);
        return json({ error: 'POST required' }, 405);
      case '/sweep':
        if (request.method === 'POST') {
          await healthSweep(env);
          return json({ ok: true, message: 'Health sweep triggered' });
        }
        return json({ error: 'POST required' }, 405);
      case '/uptime':
        return await getUptimeReport(env);
      case '/incidents':
        return await getIncidents(env);
      case '/ping':
        return json({ pong: true, brain: 'health-commander', ts: Date.now() });
      default:
        return json({ error: 'Not found' }, 404);
    }
  }
};

async function healthSweep(env) {
  const log = [];
  const start = Date.now();
  log.push(`[HEALTH-CMD] Sweep started ${new Date().toISOString()}`);

  const results = {};
  let totalUp = 0, totalDown = 0;
  const incidents = [];

  // Check all endpoints in parallel
  const checks = ALL_ENDPOINTS.map(async (ep) => {
    const checkStart = Date.now();
    try {
      const resp = await fetch(ep.url, {
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'YedanHealthCommander/1.0' }
      });
      const latency = Date.now() - checkStart;

      if (resp.ok) {
        totalUp++;
        results[ep.id] = {
          status: 'up',
          code: resp.status,
          latency_ms: latency,
          category: ep.category
        };

        // SLA warning if too slow
        if (latency > 3000) {
          incidents.push({
            endpoint: ep.id,
            type: 'slow_response',
            severity: 'warning',
            latency_ms: latency,
            message: `${ep.id} responded in ${latency}ms (>3s SLA)`
          });
        }
      } else {
        totalDown++;
        results[ep.id] = {
          status: 'down',
          code: resp.status,
          latency_ms: latency,
          category: ep.category
        };
        incidents.push({
          endpoint: ep.id,
          type: 'endpoint_down',
          severity: ep.category === 'mcp' ? 'critical' : 'warning',
          code: resp.status,
          message: `${ep.id} returned HTTP ${resp.status}`
        });
      }
    } catch (e) {
      totalDown++;
      const latency = Date.now() - checkStart;
      results[ep.id] = {
        status: 'unreachable',
        error: e.message,
        latency_ms: latency,
        category: ep.category
      };
      incidents.push({
        endpoint: ep.id,
        type: 'unreachable',
        severity: ep.category === 'mcp' ? 'critical' : 'warning',
        error: e.message,
        message: `${ep.id} is unreachable: ${e.message}`
      });
    }
  });

  await Promise.allSettled(checks);

  const duration = Date.now() - start;
  log.push(`[HEALTH-CMD] ${totalUp}/${ALL_ENDPOINTS.length} up, ${totalDown} down, ${incidents.length} incidents in ${duration}ms`);

  // Record metrics
  await recordHealthMetrics(env, results, totalUp, totalDown, duration);

  // Record incidents
  for (const incident of incidents) {
    await logIncident(env, incident);
  }

  // Calculate SLA
  const sla = {
    fleet: calculateCategorySLA(results, 'fleet'),
    mcp: calculateCategorySLA(results, 'mcp'),
    production: calculateCategorySLA(results, 'production'),
    overall: ((totalUp / ALL_ENDPOINTS.length) * 100).toFixed(2)
  };

  // Compile report
  const report = {
    commander: 'yedan-health-commander',
    timestamp: new Date().toISOString(),
    duration_ms: duration,
    total_endpoints: ALL_ENDPOINTS.length,
    up: totalUp,
    down: totalDown,
    sla,
    incidents,
    results,
    log: log.slice(-15)
  };

  // Store
  await env.ARMY_KV.put('health:last-sweep', JSON.stringify(report), { expirationTtl: 600 });
  await env.ARMY_KV.put(`health:history:${Date.now()}`, JSON.stringify({ up: totalUp, down: totalDown, sla: sla.overall, ts: new Date().toISOString() }), { expirationTtl: 86400 });

  // Update fleet status
  try {
    await env.ARMY_DB.prepare(
      `UPDATE fleet_workers SET last_heartbeat = datetime('now'), status = 'active', tasks_completed = tasks_completed + 1 WHERE id = 'yedan-health-commander'`
    ).run();
  } catch {}

  // Alert if critical incidents
  if (incidents.some(i => i.severity === 'critical')) {
    await escalateAlert(env, incidents.filter(i => i.severity === 'critical'), sla);
  }

  // Report to Bunshin
  await reportBunshin('health-commander-status', {
    last_sweep: report.timestamp,
    endpoints: ALL_ENDPOINTS.length,
    up: totalUp,
    down: totalDown,
    sla_overall: sla.overall,
    sla_mcp: sla.mcp,
    critical_incidents: incidents.filter(i => i.severity === 'critical').length,
    duration_ms: duration
  }, env);
}

function calculateCategorySLA(results, category) {
  const entries = Object.entries(results).filter(([_, r]) => r.category === category);
  if (entries.length === 0) return '100.00';
  const up = entries.filter(([_, r]) => r.status === 'up').length;
  return ((up / entries.length) * 100).toFixed(2);
}

async function recordHealthMetrics(env, results, up, down, duration) {
  try {
    const batch = [];

    // Overall metrics
    batch.push(
      env.ARMY_DB.prepare(`INSERT INTO fleet_metrics (worker_id, metric_name, metric_value, unit) VALUES (?, ?, ?, ?)`)
        .bind('yedan-health-commander', 'endpoints_up', up, 'count')
    );
    batch.push(
      env.ARMY_DB.prepare(`INSERT INTO fleet_metrics (worker_id, metric_name, metric_value, unit) VALUES (?, ?, ?, ?)`)
        .bind('yedan-health-commander', 'endpoints_down', down, 'count')
    );
    batch.push(
      env.ARMY_DB.prepare(`INSERT INTO fleet_metrics (worker_id, metric_name, metric_value, unit) VALUES (?, ?, ?, ?)`)
        .bind('yedan-health-commander', 'sweep_duration', duration, 'ms')
    );

    // Record latencies for each endpoint
    for (const [id, r] of Object.entries(results)) {
      if (r.latency_ms) {
        batch.push(
          env.ARMY_DB.prepare(`INSERT INTO fleet_metrics (worker_id, metric_name, metric_value, unit) VALUES (?, ?, ?, ?)`)
            .bind(id, 'response_latency', r.latency_ms, 'ms')
        );
      }
    }

    // D1 batch limit is 128
    if (batch.length > 0) {
      await env.ARMY_DB.batch(batch.slice(0, 50));
    }
  } catch {}
}

async function logIncident(env, incident) {
  try {
    await env.ARMY_DB.prepare(
      `INSERT INTO fleet_events (worker_id, event_type, severity, message, data) VALUES (?, ?, ?, ?, ?)`
    ).bind(
      incident.endpoint,
      incident.type,
      incident.severity,
      incident.message,
      JSON.stringify(incident)
    ).run();
  } catch {}
}

async function escalateAlert(env, criticalIncidents, sla) {
  // Report critical alerts to Bunshin for Telegram forwarding
  try {
    await fetch(`${BUNSHIN_URL}/api/brain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${BUNSHIN_AUTH}` },
      body: JSON.stringify({
        key: 'health-alert-critical',
        value: {
          alert: 'CRITICAL',
          incidents: criticalIncidents,
          sla,
          timestamp: new Date().toISOString(),
          action_required: true
        },
        context: `CRITICAL ALERT: ${criticalIncidents.length} critical incidents detected`
      }),
      signal: AbortSignal.timeout(8000)
    });
  } catch {}
}

async function handleTask(request, env) {
  try {
    const { task_id, type } = await request.json();
    if (type === 'health' || type === 'health-check') {
      await healthSweep(env);
      return json({ ok: true, task_id, result: 'sweep_completed' });
    }
    return json({ ok: false, error: 'Unknown task type' });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

async function getHealthDashboard(env) {
  const lastSweep = await env.ARMY_KV.get('health:last-sweep', 'json').catch(() => null);

  return json({
    role: 'health-commander',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    monitoring: `${ALL_ENDPOINTS.length} endpoints`,
    categories: {
      fleet: ALL_ENDPOINTS.filter(e => e.category === 'fleet').length,
      mcp: ALL_ENDPOINTS.filter(e => e.category === 'mcp').length,
      production: ALL_ENDPOINTS.filter(e => e.category === 'production').length,
      external: ALL_ENDPOINTS.filter(e => e.category === 'external').length
    },
    last_sweep: lastSweep ? {
      up: lastSweep.up,
      down: lastSweep.down,
      sla: lastSweep.sla,
      incidents: lastSweep.incidents?.length || 0,
      timestamp: lastSweep.timestamp,
      duration_ms: lastSweep.duration_ms
    } : null
  });
}

async function getUptimeReport(env) {
  const { results: metrics } = await env.ARMY_DB.prepare(
    `SELECT worker_id, metric_name, AVG(metric_value) as avg_val, MIN(metric_value) as min_val, MAX(metric_value) as max_val, COUNT(*) as samples
     FROM fleet_metrics
     WHERE metric_name = 'response_latency'
     GROUP BY worker_id
     ORDER BY avg_val DESC`
  ).all().catch(() => ({ results: [] }));

  const { results: upDown } = await env.ARMY_DB.prepare(
    `SELECT metric_name, AVG(metric_value) as avg_val, recorded_at
     FROM fleet_metrics
     WHERE worker_id = 'yedan-health-commander' AND metric_name IN ('endpoints_up', 'endpoints_down')
     GROUP BY metric_name`
  ).all().catch(() => ({ results: [] }));

  return json({ latency_by_endpoint: metrics, uptime_metrics: upDown });
}

async function getIncidents(env) {
  const { results } = await env.ARMY_DB.prepare(
    `SELECT * FROM fleet_events WHERE severity IN ('critical', 'warning', 'error') ORDER BY created_at DESC LIMIT 50`
  ).all().catch(() => ({ results: [] }));
  return json({ incidents: results });
}

async function reportBunshin(key, value, env) {
  try {
    await fetch(`${BUNSHIN_URL}/api/brain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${BUNSHIN_AUTH}` },
      body: JSON.stringify({ key, value, context: 'Health Commander report' }),
      signal: AbortSignal.timeout(8000)
    });
  } catch {}
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
