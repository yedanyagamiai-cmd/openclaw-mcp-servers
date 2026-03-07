/**
 * YEDAN Content Engine - Automated Content Factory
 * Cron: every 30 minutes (*\/30 * * * *)
 *
 * Responsibilities:
 * - Generate content using Workers AI
 * - Post to MoltBook automatically
 * - Track content performance metrics
 * - Content arbitrage (EN→JP trending topics)
 * - SEO optimization signals
 */

const BUNSHIN_URL = 'https://openclaw-mcp-servers.onrender.com';
const BUNSHIN_AUTH = 'openclaw-bunshin-2026';
const MOLTBOOK_API = 'https://moltbook-publisher-mcp.yagami8095.workers.dev';

const CONTENT_TOPICS = [
  { category: 'mcp', topics: ['MCP server development tips', 'AI agent integration patterns', 'Model Context Protocol best practices'] },
  { category: 'ai-tools', topics: ['Prompt engineering techniques', 'AI workflow automation', 'Multi-agent systems design'] },
  { category: 'dev', topics: ['Cloudflare Workers optimization', 'Edge computing patterns', 'Serverless architecture'] },
  { category: 'revenue', topics: ['Developer tool monetization', 'SaaS micro-pricing strategies', 'API marketplace insights'] },
];

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(contentCycle(env));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    switch (url.pathname) {
      case '/':
      case '/status':
        return await getStatus(env);
      case '/health':
        return json({ status: 'operational', role: 'content-engine', version: '1.0.0' });
      case '/generate':
        if (request.method === 'POST') return await generateContent(request, env);
        return json({ error: 'POST required' }, 405);
      case '/execute':
        if (request.method === 'POST') return await handleTask(request, env);
        return json({ error: 'POST required' }, 405);
      case '/history':
        return await getContentHistory(env);
      case '/ping':
        return json({ pong: true, brain: 'content-engine', ts: Date.now() });
      default:
        return json({ error: 'Not found' }, 404);
    }
  }
};

async function contentCycle(env) {
  const log = [];
  const start = Date.now();
  log.push(`[CONTENT] Cycle started ${new Date().toISOString()}`);

  try {
    // Check if we should generate content this cycle
    const lastGen = await env.ARMY_KV.get('content:last-generation');
    const hoursSinceLastGen = lastGen ? (Date.now() - new Date(lastGen).getTime()) / 3600000 : 999;

    if (hoursSinceLastGen < 2) {
      log.push(`[CONTENT] Last generation was ${hoursSinceLastGen.toFixed(1)}h ago, skipping (interval: 2h)`);
      // Still do metrics check
      await checkContentMetrics(env, log);
    } else {
      // Generate new content
      const content = await generateAIContent(env, log);
      if (content) {
        // Try to post to MoltBook
        const posted = await postToMoltBook(content, env, log);

        // Store content record
        await env.ARMY_DB.prepare(
          `INSERT INTO fleet_events (worker_id, event_type, severity, message, data) VALUES (?, 'content_generated', 'info', ?, ?)`
        ).bind('yedan-content-engine', content.title, JSON.stringify({ posted, content: content.body?.slice(0, 200) })).run();

        await env.ARMY_KV.put('content:last-generation', new Date().toISOString());
        await env.ARMY_KV.put('content:last-piece', JSON.stringify(content), { expirationTtl: 86400 });
      }
    }

    // Update fleet status
    await env.ARMY_DB.prepare(
      `UPDATE fleet_workers SET last_heartbeat = datetime('now'), status = 'active', tasks_completed = tasks_completed + 1 WHERE id = 'yedan-content-engine'`
    ).run();

    // Report
    await reportBunshin('content-engine-status', {
      last_cycle: new Date().toISOString(),
      duration_ms: Date.now() - start,
      hours_since_last_gen: hoursSinceLastGen
    }, env);

  } catch (e) {
    log.push(`[CONTENT] Error: ${e.message}`);
    await logEvent(env, 'content_error', 'error', e.message);
  }
}

async function generateAIContent(env, log) {
  log.push('[AI] Generating content with Workers AI...');

  // Pick random topic
  const category = CONTENT_TOPICS[Math.floor(Math.random() * CONTENT_TOPICS.length)];
  const topic = category.topics[Math.floor(Math.random() * category.topics.length)];

  try {
    const resp = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content: 'You are a technical content writer for OpenClaw, an AI MCP server ecosystem. Write engaging, informative posts for the developer community. Keep posts concise (150-300 words), include practical tips, and maintain a professional but approachable tone.'
        },
        {
          role: 'user',
          content: `Write a short technical post about: "${topic}". Include one practical tip or code snippet. Format: Title on first line, then blank line, then content. No markdown headers.`
        }
      ],
      max_tokens: 500
    });

    const text = resp.response || '';
    const lines = text.trim().split('\n');
    const title = lines[0]?.replace(/^#+\s*/, '').trim() || topic;
    const body = lines.slice(1).join('\n').trim();

    log.push(`[AI] Generated: "${title}" (${body.length} chars)`);

    return {
      title,
      body,
      topic,
      category: category.category,
      generated_at: new Date().toISOString(),
      model: '@cf/meta/llama-3.1-8b-instruct'
    };
  } catch (e) {
    log.push(`[AI] Generation failed: ${e.message}`);
    return null;
  }
}

async function postToMoltBook(content, env, log) {
  log.push('[MOLTBOOK] Posting content...');
  try {
    // Use the MoltBook API to create a post
    const resp = await fetch(`${MOLTBOOK_API}/api/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: content.title,
        content: content.body,
        submolt_name: 'openclaw',
        submolt: 'openclaw'
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (resp.ok) {
      log.push('[MOLTBOOK] Posted successfully');
      return true;
    } else {
      const err = await resp.text().catch(() => 'unknown');
      log.push(`[MOLTBOOK] Post failed: ${resp.status} - ${err.slice(0, 100)}`);
      return false;
    }
  } catch (e) {
    log.push(`[MOLTBOOK] Error: ${e.message}`);
    return false;
  }
}

async function checkContentMetrics(env, log) {
  log.push('[METRICS] Checking content metrics...');
  const { results } = await env.ARMY_DB.prepare(
    `SELECT COUNT(*) as total, MAX(created_at) as latest FROM fleet_events WHERE worker_id = 'yedan-content-engine' AND event_type = 'content_generated'`
  ).all().catch(() => ({ results: [{ total: 0, latest: null }] }));

  log.push(`[METRICS] Total content pieces: ${results?.[0]?.total || 0}`);
}

async function handleTask(request, env) {
  try {
    const { task_id, type, payload } = await request.json();

    if (type === 'content' || type === 'content-create') {
      const content = await generateAIContent(env, []);
      if (content) {
        await postToMoltBook(content, env, []);
        return json({ ok: true, task_id, result: 'content_generated', title: content.title });
      }
      return json({ ok: false, task_id, error: 'Generation failed' });
    }

    return json({ ok: false, error: 'Unknown task type' });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

async function generateContent(request, env) {
  try {
    const { topic } = await request.json();
    const content = await generateAIContent(env, []);
    return json({ ok: true, content });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

async function getStatus(env) {
  const lastGen = await env.ARMY_KV.get('content:last-generation');
  const lastPiece = await env.ARMY_KV.get('content:last-piece', 'json').catch(() => null);
  return json({
    role: 'content-engine',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    last_generation: lastGen,
    last_content: lastPiece ? { title: lastPiece.title, category: lastPiece.category } : null
  });
}

async function getContentHistory(env) {
  const { results } = await env.ARMY_DB.prepare(
    `SELECT * FROM fleet_events WHERE worker_id = 'yedan-content-engine' AND event_type = 'content_generated' ORDER BY created_at DESC LIMIT 20`
  ).all().catch(() => ({ results: [] }));
  return json({ history: results });
}

async function logEvent(env, eventType, severity, message) {
  try {
    await env.ARMY_DB.prepare(
      `INSERT INTO fleet_events (worker_id, event_type, severity, message) VALUES ('yedan-content-engine', ?, ?, ?)`
    ).bind(eventType, severity, message).run();
  } catch {}
}

async function reportBunshin(key, value, env) {
  try {
    await fetch(`${BUNSHIN_URL}/api/brain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${BUNSHIN_AUTH}` },
      body: JSON.stringify({ key, value, context: 'Content Engine report' }),
      signal: AbortSignal.timeout(8000)
    });
  } catch {}
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
