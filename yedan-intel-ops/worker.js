/**
 * YEDAN Intel Operations v2.0 — OODA OBSERVE Layer
 * Cron: every 15 minutes (changed from 1h for real-time intel)
 *
 * OODA Role: OBSERVE — Collect real-time intelligence from 5+ free APIs
 * Stores structured data in D1 intel_feed for Orchestrator to analyze
 */

const BUNSHIN_URL = 'https://openclaw-mcp-servers.onrender.com';
const BUNSHIN_AUTH = 'openclaw-bunshin-2026';
const TELEGRAM_CHAT_ID = '7848052227';

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
        return json({ status: 'operational', role: 'intel-ops', version: '2.0.0', ooda: 'OBSERVE' });
      case '/sweep':
        if (request.method === 'POST') {
          const result = await intelSweep(env);
          return json({ ok: true, result });
        }
        return json({ error: 'POST required' }, 405);
      case '/feed':
        return await getIntelFeed(env);
      case '/execute':
        if (request.method === 'POST') {
          await intelSweep(env);
          return json({ ok: true, message: 'Intel sweep executed' });
        }
        return json({ error: 'POST required' }, 405);
      case '/ping':
        return json({ pong: true, brain: 'intel-ops', version: '2.0.0', ts: Date.now() });
      default:
        return json({ error: 'Not found' }, 404);
    }
  }
};

async function intelSweep(env) {
  const start = Date.now();
  let totalItems = 0;

  // Ensure intel_feed table exists
  await ensureTables(env);

  // Parallel collection from 5 sources
  const [github, hn, npm, hf, smithery] = await Promise.allSettled([
    collectGitHub(env),
    collectHackerNews(env),
    collectNpm(env),
    collectHuggingFace(env),
    collectSmithery(env)
  ]);

  // Count items collected
  const sources = { github, hn, npm, hf, smithery };
  for (const [name, result] of Object.entries(sources)) {
    if (result.status === 'fulfilled') totalItems += result.value || 0;
  }

  // Also check our own 9 MCP server health
  const ownHealth = await checkOwnServers(env);

  const duration = Date.now() - start;

  // Update fleet status
  try {
    await env.ARMY_DB.prepare(
      `UPDATE fleet_workers SET last_heartbeat = datetime('now'), status = 'active', tasks_completed = tasks_completed + 1 WHERE id = 'yedan-intel-ops'`
    ).run();
  } catch {}

  // Store sweep metadata
  const sweepReport = {
    timestamp: new Date().toISOString(),
    duration_ms: duration,
    items_collected: totalItems,
    sources: {
      github: github.status === 'fulfilled' ? github.value : 0,
      hacker_news: hn.status === 'fulfilled' ? hn.value : 0,
      npm: npm.status === 'fulfilled' ? npm.value : 0,
      huggingface: hf.status === 'fulfilled' ? hf.value : 0,
      smithery: smithery.status === 'fulfilled' ? smithery.value : 0
    },
    own_servers: ownHealth
  };

  await env.ARMY_KV.put('intel:last-sweep', JSON.stringify(sweepReport), { expirationTtl: 7200 });

  // Telegram notification if significant intel found
  if (totalItems > 0 && env.TELEGRAM_BOT_TOKEN) {
    const msg = `OODA OBSERVE | ${totalItems} intel items collected in ${duration}ms\nGH:${sweepReport.sources.github} HN:${sweepReport.sources.hacker_news} npm:${sweepReport.sources.npm} HF:${sweepReport.sources.huggingface} SM:${sweepReport.sources.smithery}\nMCP: ${ownHealth.up}/${ownHealth.total} up`;
    await sendTelegram(env, msg);
  }

  // Report to Bunshin
  await reportBunshin('intel-ops-status', sweepReport, env);

  return sweepReport;
}

// === SOURCE 1: GitHub Trending AI/MCP Repos ===
async function collectGitHub(env) {
  let count = 0;
  try {
    // Search for recently created/updated MCP and AI agent repos
    const queries = [
      'mcp server language:javascript',
      'mcp server language:typescript',
      'ai agent framework stars:>50'
    ];

    for (const q of queries) {
      const resp = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=updated&order=desc&per_page=5`, {
        signal: AbortSignal.timeout(8000),
        headers: { 'User-Agent': 'YedanIntelOps/2.0', 'Accept': 'application/vnd.github.v3+json' }
      });

      if (resp.ok) {
        const data = await resp.json();
        for (const repo of (data.items || []).slice(0, 5)) {
          await insertIntelFeed(env, {
            source: 'github',
            title: `${repo.full_name} (${repo.stargazers_count} stars)`,
            url: repo.html_url,
            summary: (repo.description || '').slice(0, 200),
            metadata: JSON.stringify({
              stars: repo.stargazers_count,
              forks: repo.forks_count,
              language: repo.language,
              updated: repo.updated_at
            })
          });
          count++;
        }
      }
    }
  } catch {}
  return count;
}

// === SOURCE 2: Hacker News AI/MCP Stories ===
async function collectHackerNews(env) {
  let count = 0;
  try {
    const queries = ['MCP server', 'AI agent', 'LLM tool'];
    for (const q of queries) {
      const resp = await fetch(`https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=5`, {
        signal: AbortSignal.timeout(8000)
      });

      if (resp.ok) {
        const data = await resp.json();
        for (const hit of (data.hits || []).slice(0, 3)) {
          await insertIntelFeed(env, {
            source: 'hacker_news',
            title: hit.title || 'Untitled',
            url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
            summary: `Points: ${hit.points || 0}, Comments: ${hit.num_comments || 0}`,
            metadata: JSON.stringify({
              points: hit.points,
              comments: hit.num_comments,
              author: hit.author,
              created_at: hit.created_at
            })
          });
          count++;
        }
      }
    }
  } catch {}
  return count;
}

// === SOURCE 3: npm MCP Packages ===
async function collectNpm(env) {
  let count = 0;
  try {
    const resp = await fetch('https://registry.npmjs.org/-/v1/search?text=mcp+server&size=10&quality=0.5&popularity=0.5&maintenance=0.0', {
      signal: AbortSignal.timeout(8000)
    });

    if (resp.ok) {
      const data = await resp.json();
      for (const obj of (data.objects || []).slice(0, 8)) {
        const pkg = obj.package;
        await insertIntelFeed(env, {
          source: 'npm',
          title: `${pkg.name}@${pkg.version}`,
          url: `https://www.npmjs.com/package/${pkg.name}`,
          summary: (pkg.description || '').slice(0, 200),
          metadata: JSON.stringify({
            version: pkg.version,
            publisher: pkg.publisher?.username,
            date: pkg.date
          })
        });
        count++;
      }
    }
  } catch {}
  return count;
}

// === SOURCE 4: HuggingFace Trending Models ===
async function collectHuggingFace(env) {
  let count = 0;
  try {
    const resp = await fetch('https://huggingface.co/api/models?sort=likes&direction=-1&limit=10&full=false', {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'YedanIntelOps/2.0' }
    });

    if (resp.ok) {
      const models = await resp.json();
      for (const model of (models || []).slice(0, 8)) {
        await insertIntelFeed(env, {
          source: 'huggingface',
          title: model.modelId || model.id || 'unknown',
          url: `https://huggingface.co/${model.modelId || model.id}`,
          summary: `Downloads: ${model.downloads || 0}, Likes: ${model.likes || 0}, Pipeline: ${model.pipeline_tag || 'N/A'}`,
          metadata: JSON.stringify({
            downloads: model.downloads,
            likes: model.likes,
            pipeline: model.pipeline_tag,
            library: model.library_name,
            updated: model.lastModified
          })
        });
        count++;
      }
    }
  } catch {}
  return count;
}

// === SOURCE 5: Smithery MCP Registry ===
async function collectSmithery(env) {
  let count = 0;
  try {
    // Check for trending/new MCP servers on Smithery
    const resp = await fetch('https://registry.smithery.ai/servers?q=&pageSize=10', {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'YedanIntelOps/2.0' }
    });

    if (resp.ok) {
      const text = await resp.text();
      try {
        const data = JSON.parse(text);
        const servers = data.servers || data.results || data || [];
        if (Array.isArray(servers)) {
          for (const srv of servers.slice(0, 8)) {
            await insertIntelFeed(env, {
              source: 'smithery',
              title: srv.name || srv.qualifiedName || 'unknown',
              url: srv.homepage || `https://smithery.ai/server/${srv.qualifiedName || ''}`,
              summary: (srv.description || '').slice(0, 200),
              metadata: JSON.stringify({
                qualifiedName: srv.qualifiedName,
                useCount: srv.useCount,
                tools: srv.tools?.length
              })
            });
            count++;
          }
        }
      } catch {
        // Smithery may not return JSON, log raw response size
        await insertIntelFeed(env, {
          source: 'smithery',
          title: 'Smithery registry scan',
          url: 'https://smithery.ai',
          summary: `Raw response: ${text.length} bytes`,
          metadata: '{}'
        });
        count++;
      }
    }
  } catch {}
  return count;
}

// === Own MCP Server Health ===
async function checkOwnServers(env) {
  let up = 0;
  const checks = OUR_MCP_SERVERS.map(async (name) => {
    try {
      const resp = await fetch(`https://${name}.yagami8095.workers.dev/health`, {
        signal: AbortSignal.timeout(5000)
      });
      if (resp.ok) up++;
    } catch {}
  });
  await Promise.allSettled(checks);
  return { up, total: OUR_MCP_SERVERS.length };
}

// === D1 Operations ===
async function ensureTables(env) {
  try {
    await env.ARMY_DB.exec(`
      CREATE TABLE IF NOT EXISTS intel_feed (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        title TEXT NOT NULL,
        url TEXT,
        summary TEXT,
        metadata TEXT DEFAULT '{}',
        analyzed INTEGER DEFAULT 0,
        analysis_score INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        analyzed_at TEXT
      )
    `);
    await env.ARMY_DB.exec(`
      CREATE TABLE IF NOT EXISTS intel_analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        feed_id INTEGER REFERENCES intel_feed(id),
        score INTEGER NOT NULL,
        opportunity TEXT,
        action_needed TEXT,
        analysis TEXT,
        model TEXT DEFAULT 'deepseek-r1',
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
  } catch {}
}

async function insertIntelFeed(env, item) {
  try {
    // Deduplicate by url within last 24h
    const existing = await env.ARMY_DB.prepare(
      `SELECT id FROM intel_feed WHERE url = ? AND created_at > datetime('now', '-24 hours')`
    ).bind(item.url || '').first();

    if (existing) return; // Skip duplicate

    await env.ARMY_DB.prepare(
      `INSERT INTO intel_feed (source, title, url, summary, metadata) VALUES (?, ?, ?, ?, ?)`
    ).bind(item.source, item.title, item.url || '', item.summary || '', item.metadata || '{}').run();
  } catch {}
}

// === Intel Feed API ===
async function getIntelFeed(env) {
  await ensureTables(env);
  const { results } = await env.ARMY_DB.prepare(
    `SELECT * FROM intel_feed ORDER BY created_at DESC LIMIT 50`
  ).all().catch(() => ({ results: [] }));

  const { results: stats } = await env.ARMY_DB.prepare(
    `SELECT source, COUNT(*) as count, SUM(CASE WHEN analyzed = 0 THEN 1 ELSE 0 END) as unanalyzed FROM intel_feed GROUP BY source`
  ).all().catch(() => ({ results: [] }));

  return json({ feed: results, stats });
}

async function getIntelStatus(env) {
  const lastSweep = await env.ARMY_KV.get('intel:last-sweep', 'json').catch(() => null);

  let feedCount = 0, unanalyzed = 0;
  try {
    const row = await env.ARMY_DB.prepare(
      `SELECT COUNT(*) as total, SUM(CASE WHEN analyzed = 0 THEN 1 ELSE 0 END) as pending FROM intel_feed`
    ).first();
    feedCount = row?.total || 0;
    unanalyzed = row?.pending || 0;
  } catch {}

  return json({
    role: 'intel-ops',
    version: '2.0.0',
    ooda_layer: 'OBSERVE',
    timestamp: new Date().toISOString(),
    sources: ['github', 'hacker_news', 'npm', 'huggingface', 'smithery'],
    intel_feed: { total: feedCount, unanalyzed },
    last_sweep: lastSweep,
    monitored_servers: OUR_MCP_SERVERS.length
  });
}

// === Telegram ===
async function sendTelegram(env, text) {
  if (!env.TELEGRAM_BOT_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'Markdown' }),
      signal: AbortSignal.timeout(5000)
    });
  } catch {}
}

// === Bunshin ===
async function reportBunshin(key, value, env) {
  try {
    await fetch(`${BUNSHIN_URL}/api/brain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${BUNSHIN_AUTH}` },
      body: JSON.stringify({ key, value, context: 'Intel Ops OODA OBSERVE' }),
      signal: AbortSignal.timeout(8000)
    });
  } catch {}
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
