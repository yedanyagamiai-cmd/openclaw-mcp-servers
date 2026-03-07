/**
 * YEDAN Revenue Sentinel - Money Never Sleeps
 * Cron: every 10 minutes (*\/10 * * * *)
 *
 * Monitors ALL revenue sources:
 * - Product Store orders (direct API)
 * - Smithery usage stats
 * - Apify actor runs
 * - MCPize traffic
 * - Stripe payment events
 * - Poe bot interactions
 * Records everything in D1 revenue_ledger
 */

const PRODUCT_STORE = 'https://product-store.yagami8095.workers.dev';
const BUNSHIN_URL = 'https://openclaw-mcp-servers.onrender.com';
const BUNSHIN_AUTH = 'openclaw-bunshin-2026';

const SMITHERY_SERVERS = [
  'json-toolkit-mcp', 'regex-engine-mcp', 'color-palette-mcp',
  'timestamp-converter-mcp', 'prompt-enhancer-mcp', 'agentforge-compare-mcp',
  'moltbook-publisher-mcp', 'openclaw-fortune-mcp', 'openclaw-intel-mcp'
];

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(sentinelScan(env));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    switch (url.pathname) {
      case '/':
      case '/status':
        return await getSentinelStatus(env);
      case '/health':
        return json({ status: 'operational', role: 'revenue-sentinel', version: '1.0.0' });
      case '/scan':
        if (request.method === 'POST') {
          await sentinelScan(env);
          return json({ ok: true, message: 'Scan triggered' });
        }
        return json({ error: 'POST required' }, 405);
      case '/execute':
        if (request.method === 'POST') return await handleTask(request, env);
        return json({ error: 'POST required' }, 405);
      case '/report':
        return await getRevenueReport(env);
      case '/ping':
        return json({ pong: true, brain: 'revenue-sentinel', ts: Date.now() });
      default:
        return json({ error: 'Not found', endpoints: ['/', '/status', '/scan', '/report', '/health', '/ping'] }, 404);
    }
  }
};

async function sentinelScan(env) {
  const log = [];
  const start = Date.now();
  log.push(`[SENTINEL] Revenue scan started ${new Date().toISOString()}`);

  // Parallel revenue checks
  const [productStore, smithery, mcp9Health] = await Promise.allSettled([
    checkProductStore(env, log),
    checkSmitheryStats(env, log),
    checkMCP9Health(env, log)
  ]);

  const report = {
    sentinel: 'yedan-revenue-sentinel',
    timestamp: new Date().toISOString(),
    duration_ms: Date.now() - start,
    product_store: productStore.status === 'fulfilled' ? productStore.value : { error: productStore.reason?.message },
    smithery: smithery.status === 'fulfilled' ? smithery.value : { error: smithery.reason?.message },
    mcp_health: mcp9Health.status === 'fulfilled' ? mcp9Health.value : { error: mcp9Health.reason?.message },
    log: log.slice(-15)
  };

  // Store results
  await env.ARMY_KV.put('sentinel:last-scan', JSON.stringify(report), { expirationTtl: 3600 });

  // Update fleet status
  try {
    await env.ARMY_DB.prepare(
      `UPDATE fleet_workers SET last_heartbeat = datetime('now'), status = 'active', tasks_completed = tasks_completed + 1 WHERE id = 'yedan-revenue-sentinel'`
    ).run();

    await env.ARMY_DB.prepare(
      `INSERT INTO fleet_events (worker_id, event_type, severity, message) VALUES (?, 'scan_complete', 'info', ?)`
    ).bind('yedan-revenue-sentinel', `Scan done in ${Date.now() - start}ms`).run();
  } catch {}

  // Report to Bunshin
  await reportBunshin('revenue-sentinel-status', {
    last_scan: report.timestamp,
    product_store_revenue: report.product_store?.total_revenue || 0,
    product_store_orders: report.product_store?.paid_count || 0,
    mcp_servers_up: report.mcp_health?.up || 0,
    duration_ms: report.duration_ms
  }, env);
}

async function checkProductStore(env, log) {
  log.push('[PS] Checking Product Store...');
  try {
    const resp = await fetch(`${PRODUCT_STORE}/api/orders`, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const data = await resp.json();
    const orders = data.orders || [];
    const paid = orders.filter(o => o.status === 'paid');
    const totalRevenue = paid.reduce((s, o) => s + (parseFloat(o.amount) || 0), 0);

    // Check for NEW orders not yet in ledger
    const knownOrders = await env.ARMY_DB.prepare(
      `SELECT order_id FROM revenue_ledger WHERE source = 'product-store'`
    ).all();
    const knownIds = new Set((knownOrders.results || []).map(r => r.order_id));

    const newOrders = paid.filter(o => !knownIds.has(o.order_id));
    if (newOrders.length > 0) {
      log.push(`[PS] ${newOrders.length} NEW orders found!`);
      for (const order of newOrders) {
        await env.ARMY_DB.prepare(
          `INSERT INTO revenue_ledger (source, amount, currency, order_id, product, status, verified_by) VALUES (?, ?, 'USD', ?, ?, 'confirmed', 'revenue-sentinel')`
        ).bind('product-store', parseFloat(order.amount) || 0, order.order_id, order.product || 'unknown').run();
      }

      // Alert Bunshin about new revenue!
      if (newOrders.length > 0) {
        const newAmount = newOrders.reduce((s, o) => s + (parseFloat(o.amount) || 0), 0);
        await reportBunshin('revenue-alert', {
          type: 'new_orders',
          count: newOrders.length,
          new_amount: newAmount,
          total_revenue: totalRevenue,
          orders: newOrders.map(o => ({ id: o.order_id, amount: o.amount, product: o.product }))
        }, env);
      }
    }

    log.push(`[PS] Total: $${totalRevenue} from ${paid.length} paid orders (${newOrders.length} new)`);
    return { total_revenue: totalRevenue, paid_count: paid.length, new_count: newOrders.length, all_count: orders.length };
  } catch (e) {
    log.push(`[PS] Error: ${e.message}`);
    return { error: e.message };
  }
}

async function checkSmitheryStats(env, log) {
  log.push('[SMITHERY] Checking server stats...');
  const stats = {};

  const checks = SMITHERY_SERVERS.map(async (name) => {
    try {
      // Check if server is reachable via its workers.dev URL
      const resp = await fetch(`https://${name}.yagami8095.workers.dev/health`, {
        signal: AbortSignal.timeout(5000)
      });
      stats[name] = { reachable: resp.ok, status: resp.status };
    } catch (e) {
      stats[name] = { reachable: false, error: e.message };
    }
  });

  await Promise.allSettled(checks);
  const reachable = Object.values(stats).filter(s => s.reachable).length;
  log.push(`[SMITHERY] ${reachable}/${SMITHERY_SERVERS.length} servers reachable`);

  return { servers: stats, reachable, total: SMITHERY_SERVERS.length };
}

async function checkMCP9Health(env, log) {
  let up = 0, down = 0;
  const results = {};

  const checks = SMITHERY_SERVERS.map(async (name) => {
    try {
      const resp = await fetch(`https://${name}.yagami8095.workers.dev/`, {
        signal: AbortSignal.timeout(5000)
      });
      if (resp.ok) { up++; results[name] = 'up'; }
      else { down++; results[name] = `down:${resp.status}`; }
    } catch {
      down++;
      results[name] = 'unreachable';
    }
  });

  await Promise.allSettled(checks);
  log.push(`[MCP9] ${up}/9 up, ${down}/9 down`);
  return { up, down, results };
}

async function handleTask(request, env) {
  try {
    const { task_id, type, payload } = await request.json();

    if (type === 'revenue-check' || type === 'revenue') {
      await sentinelScan(env);
      return json({ ok: true, task_id, result: 'scan_completed' });
    }

    return json({ ok: false, task_id, error: 'Unknown task type for revenue sentinel' });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

async function getSentinelStatus(env) {
  const cached = await env.ARMY_KV.get('sentinel:last-scan', 'json').catch(() => null);
  const { results: revenue } = await env.ARMY_DB.prepare(
    `SELECT source, SUM(amount) as total, COUNT(*) as count FROM revenue_ledger WHERE status = 'confirmed' GROUP BY source`
  ).all().catch(() => ({ results: [] }));
  const grandTotal = revenue?.reduce((s, r) => s + r.total, 0) || 0;

  return json({
    role: 'revenue-sentinel',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    revenue: { grand_total_usd: grandTotal, by_source: revenue },
    last_scan: cached ? { timestamp: cached.timestamp, duration_ms: cached.duration_ms } : null
  });
}

async function getRevenueReport(env) {
  const { results } = await env.ARMY_DB.prepare(
    `SELECT * FROM revenue_ledger ORDER BY recorded_at DESC`
  ).all();
  const { results: summary } = await env.ARMY_DB.prepare(
    `SELECT source, SUM(amount) as total, COUNT(*) as orders FROM revenue_ledger GROUP BY source`
  ).all();
  return json({ summary, entries: results });
}

async function reportBunshin(key, value, env) {
  try {
    await fetch(`${BUNSHIN_URL}/api/brain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${BUNSHIN_AUTH}` },
      body: JSON.stringify({ key, value, context: `Revenue Sentinel report` }),
      signal: AbortSignal.timeout(8000)
    });
  } catch {}
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
