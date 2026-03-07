/**
 * YEDAN Intel Operations - Competitive Intelligence Gatherer
 * Cron: every hour (0 *\/1 * * *)
 *
 * Responsibilities:
 * - Monitor MCP ecosystem trends
 * - Track competitor MCP servers
 * - Analyze Smithery/Apify marketplace
 * - GitHub trending analysis
 * - Aggregate intel reports for strategic decisions
 * - Feed intelligence to YEDAN for action
 */

const BUNSHIN_URL = 'https://openclaw-mcp-servers.onrender.com';
const BUNSHIN_AUTH = 'openclaw-bunshin-2026';

const INTEL_TARGETS = {
  smithery: 'https://smithery.ai',
  mcp_registry: 'https://registry.modelcontextprotocol.io',
  apify_store: 'https://apify.com/store',
  github_trending: 'https://github.com/trending',
  mcp_so: 'https://mcp.so',
  pulsemcp: 'https://pulsemcp.com',
};

const OUR_MCP_SERVERS = [
  'json-toolkit-mcp', 'regex-engine-mcp', 'color-palette-mcp',
  'timestamp-converter-mcp', 'prompt-enhancer-mcp', 'agentforge-compare-mcp',
  'moltbook-publisher-mcp', 'openclaw-fortune-mcp', 'openclaw-intel-mcp'
];

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(intelSweep(env));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    switch (url.pathname) {
      case '/':
      case '/status':
        return await getIntelStatus(env);
      case '/health':
        return json({ status: 'operational', role: 'intel-ops', version: '1.0.0' });
      case '/execute':
        if (request.method === 'POST') return await handleTask(request, env);
        return json({ error: 'POST required' }, 405);
      case '/sweep':
        if (request.method === 'POST') {
          await intelSweep(env);
          return json({ ok: true, message: 'Intel sweep triggered' });
        }
        return json({ error: 'POST required' }, 405);
      case '/reports':
        return await getIntelReports(env);
      case '/ping':
        return json({ pong: true, brain: 'intel-ops', ts: Date.now() });
      default:
        return json({ error: 'Not found' }, 404);
    }
  }
};

async function intelSweep(env) {
  const log = [];
  const start = Date.now();
  log.push(`[INTEL] Sweep started ${new Date().toISOString()}`);

  const [ecosystemIntel, ownServerIntel, marketIntel] = await Promise.allSettled([
    gatherEcosystemIntel(env, log),
    gatherOwnServerIntel(env, log),
    gatherMarketIntel(env, log)
  ]);

  const report = {
    agent: 'yedan-intel-ops',
    timestamp: new Date().toISOString(),
    duration_ms: Date.now() - start,
    ecosystem: ecosystemIntel.status === 'fulfilled' ? ecosystemIntel.value : { error: ecosystemIntel.reason?.message },
    own_servers: ownServerIntel.status === 'fulfilled' ? ownServerIntel.value : { error: ownServerIntel.reason?.message },
    market: marketIntel.status === 'fulfilled' ? marketIntel.value : { error: marketIntel.reason?.message },
    log: log.slice(-20)
  };

  // Store intel report
  await env.ARMY_KV.put('intel:last-sweep', JSON.stringify(report), { expirationTtl: 7200 });
  await env.ARMY_KV.put(`intel:report:${new Date().toISOString().split('T')[0]}`, JSON.stringify(report), { expirationTtl: 604800 });

  // Update fleet status
  try {
    await env.ARMY_DB.prepare(
      `UPDATE fleet_workers SET last_heartbeat = datetime('now'), status = 'active', tasks_completed = tasks_completed + 1 WHERE id = 'yedan-intel-ops'`
    ).run();

    await env.ARMY_DB.prepare(
      `INSERT INTO fleet_events (worker_id, event_type, severity, message, data) VALUES ('yedan-intel-ops', 'intel_sweep', 'info', ?, ?)`
    ).bind(`Sweep completed in ${Date.now() - start}ms`, JSON.stringify({
      ecosystem_targets: Object.keys(INTEL_TARGETS).length,
      own_servers: OUR_MCP_SERVERS.length
    })).run();
  } catch {}

  // Report to Bunshin
  await reportBunshin('intel-ops-status', {
    last_sweep: report.timestamp,
    duration_ms: report.duration_ms,
    mcp_directories_checked: Object.keys(INTEL_TARGETS).length,
    own_servers_monitored: OUR_MCP_SERVERS.length,
    ecosystem_signals: report.ecosystem?.signals || 0
  }, env);
}

async function gatherEcosystemIntel(env, log) {
  log.push('[ECOSYSTEM] Scanning MCP ecosystem...');
  const signals = [];

  // Check Smithery for trending MCP servers
  try {
    const resp = await fetch('https://smithery.ai/api/servers?sort=trending&limit=10', {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'YedanIntelOps/1.0' }
    });
    if (resp.ok) {
      const data = await resp.json().catch(() => null);
      if (data) {
        signals.push({ source: 'smithery-trending', data: 'fetched', count: Array.isArray(data) ? data.length : 'unknown' });
        log.push(`[ECOSYSTEM] Smithery trending data collected`);
      }
    }
  } catch (e) {
    log.push(`[ECOSYSTEM] Smithery fetch failed: ${e.message}`);
  }

  // Check GitHub for MCP-related repos
  try {
    const resp = await fetch('https://api.github.com/search/repositories?q=mcp+server&sort=stars&order=desc&per_page=5', {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'YedanIntelOps/1.0', 'Accept': 'application/vnd.github.v3+json' }
    });
    if (resp.ok) {
      const data = await resp.json();
      const repos = (data.items || []).map(r => ({ name: r.full_name, stars: r.stargazers_count, updated: r.updated_at }));
      signals.push({ source: 'github-mcp-repos', repos: repos.slice(0, 5) });
      log.push(`[ECOSYSTEM] GitHub top MCP repos: ${repos.map(r => r.name).join(', ')}`);
    }
  } catch (e) {
    log.push(`[ECOSYSTEM] GitHub API failed: ${e.message}`);
  }

  // Check npm for MCP package trends
  try {
    const resp = await fetch('https://registry.npmjs.org/-/v1/search?text=mcp+server&size=5', {
      signal: AbortSignal.timeout(8000)
    });
    if (resp.ok) {
      const data = await resp.json();
      const packages = (data.objects || []).map(o => ({
        name: o.package?.name,
        version: o.package?.version,
        description: o.package?.description?.slice(0, 80)
      }));
      signals.push({ source: 'npm-mcp-packages', packages });
      log.push(`[ECOSYSTEM] npm MCP packages: ${packages.length}`);
    }
  } catch (e) {
    log.push(`[ECOSYSTEM] npm API failed: ${e.message}`);
  }

  return { signals: signals.length, data: signals };
}

async function gatherOwnServerIntel(env, log) {
  log.push('[OWN] Checking our 9 MCP servers...');
  const results = {};

  const checks = OUR_MCP_SERVERS.map(async (name) => {
    try {
      const resp = await fetch(`https://${name}.yagami8095.workers.dev/health`, {
        signal: AbortSignal.timeout(5000)
      });
      const data = resp.ok ? await resp.json().catch(() => ({})) : {};
      results[name] = {
        status: resp.ok ? 'up' : `down:${resp.status}`,
        data: data
      };
    } catch (e) {
      results[name] = { status: 'unreachable', error: e.message };
    }
  });

  await Promise.allSettled(checks);
  const up = Object.values(results).filter(r => r.status === 'up').length;
  log.push(`[OWN] ${up}/${OUR_MCP_SERVERS.length} servers operational`);

  return { servers: results, up, total: OUR_MCP_SERVERS.length };
}

async function gatherMarketIntel(env, log) {
  log.push('[MARKET] Analyzing market opportunities...');

  // Check Product Store stats
  let storeStats = null;
  try {
    const resp = await fetch('https://product-store.yagami8095.workers.dev/api/stats', {
      signal: AbortSignal.timeout(5000)
    });
    if (resp.ok) storeStats = await resp.json().catch(() => null);
  } catch {}

  // Check Apify actor stats
  let apifyStats = null;
  try {
    const resp = await fetch('https://api.apify.com/v2/acts?my=true&limit=9', {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'YedanIntelOps/1.0' }
    });
    if (resp.ok) {
      const data = await resp.json().catch(() => null);
      apifyStats = { total_actors: data?.data?.total || 0 };
    }
  } catch {}

  log.push('[MARKET] Market intel collected');
  return { product_store: storeStats, apify: apifyStats };
}

async function handleTask(request, env) {
  try {
    const { task_id, type } = await request.json();
    if (type === 'intel' || type === 'intel-gather') {
      await intelSweep(env);
      return json({ ok: true, task_id, result: 'sweep_completed' });
    }
    return json({ ok: false, error: 'Unknown task type' });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

async function getIntelStatus(env) {
  const lastSweep = await env.ARMY_KV.get('intel:last-sweep', 'json').catch(() => null);
  return json({
    role: 'intel-ops',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    targets: Object.keys(INTEL_TARGETS),
    monitored_servers: OUR_MCP_SERVERS.length,
    last_sweep: lastSweep ? { timestamp: lastSweep.timestamp, duration_ms: lastSweep.duration_ms } : null
  });
}

async function getIntelReports(env) {
  const { results } = await env.ARMY_DB.prepare(
    `SELECT * FROM fleet_events WHERE worker_id = 'yedan-intel-ops' ORDER BY created_at DESC LIMIT 20`
  ).all().catch(() => ({ results: [] }));
  return json({ reports: results });
}

async function reportBunshin(key, value, env) {
  try {
    await fetch(`${BUNSHIN_URL}/api/brain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${BUNSHIN_AUTH}` },
      body: JSON.stringify({ key, value, context: 'Intel Ops report' }),
      signal: AbortSignal.timeout(8000)
    });
  } catch {}
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
