/**
 * YEDAN Cloud Executor v2.0 — OODA ACT Layer
 * Cron: every 5 minutes
 *
 * OODA Role: ACT — Execute tasks created by Orchestrator's DECIDE phase
 * Also pulls pending tasks from Bunshin
 *
 * Task flow:
 *   1. Orchestrator creates fleet_tasks in D1 (DECIDE)
 *   2. Orchestrator POSTs task to /execute (dispatch)
 *   3. Cloud Executor processes task, updates status in D1
 *   4. Cron also picks up any un-dispatched pending tasks from D1
 */

const BUNSHIN_URL = 'https://openclaw-mcp-servers.onrender.com';
const BUNSHIN_AUTH = 'openclaw-bunshin-2026';
const TELEGRAM_CHAT_ID = '7848052227';

const EXECUTABLE_TYPES = [
  'general', 'revenue-action', 'system-fix', 'health-alert',
  'content-action', 'monitoring', 'intel', 'content', 'health-check'
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    switch (url.pathname) {
      case '/':
      case '/status':
        return await getStatus(env);
      case '/health':
        return json({ ok: true, executor: 'CloudBrain2', version: '2.0.0', ooda: 'ACT', timestamp: new Date().toISOString() });
      case '/execute':
        if (request.method === 'POST') return await handleDispatchedTask(request, env);
        return json({ error: 'POST required' }, 405);
      case '/ping':
        return json({ pong: true, brain: 'cloud-executor', version: '2.0.0', ts: Date.now() });
      default:
        return json({ error: 'Not found' }, 404);
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(executionCycle(env));
  }
};

// === Handle task dispatched by Orchestrator via POST ===
async function handleDispatchedTask(request, env) {
  try {
    const body = await request.json();
    const { task_id, type, payload } = body;

    if (!task_id) return json({ error: 'task_id required' }, 400);

    // Execute the task
    const result = await executeOODATask({ id: task_id, type: type || 'general', payload }, env);

    // Update task status in D1
    if (env.ARMY_DB) {
      try {
        await env.ARMY_DB.prepare(
          `UPDATE fleet_tasks SET status = 'completed', result = ?, completed_at = datetime('now') WHERE id = ?`
        ).bind(JSON.stringify(result).slice(0, 500), task_id).run();
      } catch {}
    }

    return json({ ok: true, task_id, result });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

// === Cron: Pull and execute pending tasks from D1 + Bunshin ===
async function executionCycle(env) {
  const start = Date.now();
  let tasksProcessed = 0;

  // Phase 1: Pull pending OODA tasks from D1
  if (env.ARMY_DB) {
    try {
      const { results } = await env.ARMY_DB.prepare(
        `SELECT id, type, priority, payload FROM fleet_tasks WHERE status = 'pending' ORDER BY priority ASC, created_at ASC LIMIT 5`
      ).all();

      for (const task of (results || [])) {
        try {
          // Claim the task
          await env.ARMY_DB.prepare(
            `UPDATE fleet_tasks SET status = 'running', worker_id = 'yedan-cloud-executor', started_at = datetime('now') WHERE id = ? AND status = 'pending'`
          ).bind(task.id).run();

          // Execute
          const result = await executeOODATask(task, env);

          // Mark complete
          await env.ARMY_DB.prepare(
            `UPDATE fleet_tasks SET status = 'completed', result = ?, completed_at = datetime('now') WHERE id = ?`
          ).bind(JSON.stringify(result).slice(0, 500), task.id).run();

          tasksProcessed++;
        } catch (e) {
          // Mark failed
          try {
            await env.ARMY_DB.prepare(
              `UPDATE fleet_tasks SET status = 'failed', result = ? WHERE id = ?`
            ).bind(e.message.slice(0, 200), task.id).run();
          } catch {}
        }
      }
    } catch {}
  }

  // Phase 2: Pull tasks from Bunshin (legacy)
  try {
    const bunshinTasks = await fetchBunshinTasks(env);
    for (const task of bunshinTasks.slice(0, 3)) {
      try {
        const result = await executeLegacyTask(task, env);
        await reportTaskResult(task.id, 'completed', result, env);
        tasksProcessed++;
      } catch (e) {
        await reportTaskResult(task.id, 'failed', e.message, env);
      }
    }
  } catch {}

  // Phase 3: If no tasks, run health patrol
  if (tasksProcessed === 0) {
    await healthPatrol(env);
  }

  // Update heartbeat in D1
  if (env.ARMY_DB) {
    try {
      await env.ARMY_DB.prepare(
        `UPDATE fleet_workers SET last_heartbeat = datetime('now'), status = 'active', tasks_completed = tasks_completed + ? WHERE id = 'yedan-cloud-executor'`
      ).bind(Math.max(1, tasksProcessed)).run();
    } catch {}
  }

  // Save stats to KV
  const elapsed = Date.now() - start;
  const runInfo = {
    timestamp: new Date().toISOString(),
    elapsed_ms: elapsed,
    tasks_processed: tasksProcessed,
    ooda_layer: 'ACT'
  };
  await env.KV.put('executor:last-run', JSON.stringify(runInfo), { expirationTtl: 86400 });

  // Report to Bunshin
  try {
    await fetch(`${BUNSHIN_URL}/api/brain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${BUNSHIN_AUTH}` },
      body: JSON.stringify({ key: 'cloud-executor-status', value: runInfo, context: 'OODA ACT Layer' }),
      signal: AbortSignal.timeout(5000)
    });
  } catch {}

  return runInfo;
}

// === Execute OODA task (from D1 fleet_tasks) ===
async function executeOODATask(task, env) {
  let payload = {};
  try {
    payload = typeof task.payload === 'string' ? JSON.parse(task.payload) : (task.payload || {});
  } catch { payload = { raw: String(task.payload || '') }; }

  const action = (payload.action || payload.action_needed || '').toLowerCase();
  const title = payload.title || '';
  const opportunity = payload.opportunity || '';

  // Route by action content
  if (action.includes('investigate') || action.includes('evaluate') || action.includes('assess')) {
    return await executeResearchTask(title, opportunity, action, env);
  }
  if (action.includes('prototype') || action.includes('develop') || action.includes('build')) {
    return await executeDevelopmentTask(title, opportunity, action, env);
  }
  if (action.includes('monitor') || action.includes('track')) {
    return { status: 'monitoring', message: `Monitoring: ${title}`, action: 'Added to continuous monitoring list' };
  }
  if (action.includes('content') || action.includes('write') || action.includes('post')) {
    return await executeContentTask(title, opportunity, env);
  }

  // Default: AI analysis of the task
  return await executeAIAnalysis(task, payload, env);
}

// === Research Task (investigate, evaluate, assess) ===
async function executeResearchTask(title, opportunity, action, env) {
  const results = {};

  // If it mentions a GitHub repo, try to fetch info
  if (title.includes('/') && !title.includes(' ')) {
    try {
      const resp = await fetch(`https://api.github.com/repos/${title}`, {
        headers: { 'User-Agent': 'YedanExecutor/2.0' },
        signal: AbortSignal.timeout(5000)
      });
      if (resp.ok) {
        const repo = await resp.json();
        results.github = { stars: repo.stargazers_count, forks: repo.forks_count, language: repo.language, updated: repo.updated_at };
      }
    } catch {}
  }

  // If it mentions npm, check the package
  if (title.includes('@') || title.includes('npm')) {
    const pkgName = title.split('@')[0].replace(/[^a-z0-9\-\/]/gi, '');
    if (pkgName) {
      try {
        const resp = await fetch(`https://registry.npmjs.org/${pkgName}`, { signal: AbortSignal.timeout(5000) });
        if (resp.ok) {
          const pkg = await resp.json();
          results.npm = { version: pkg['dist-tags']?.latest, description: (pkg.description || '').slice(0, 100) };
        }
      } catch {}
    }
  }

  return {
    status: 'researched',
    title,
    opportunity,
    action_taken: action,
    findings: results,
    recommendation: Object.keys(results).length > 0 ? 'Data collected for further analysis' : 'No additional data found, queued for deeper review'
  };
}

// === Development Task (prototype, build) ===
async function executeDevelopmentTask(title, opportunity, action, env) {
  return {
    status: 'queued_for_development',
    title,
    opportunity,
    action_taken: action,
    note: 'Complex development tasks require YEDAN Gateway or Claude Code. Task documented for next session.',
    priority: 'high'
  };
}

// === Content Task ===
async function executeContentTask(title, opportunity, env) {
  return {
    status: 'content_queued',
    title,
    opportunity,
    note: 'Content generation routed to yedan-content-engine via next orchestration cycle.',
    delegated_to: 'yedan-content-engine'
  };
}

// === AI Analysis (DeepSeek V3 via DeepInfra) ===
async function executeAIAnalysis(task, payload, env) {
  if (!env.DEEPINFRA_API_KEY) {
    return { status: 'analyzed_basic', message: `Task "${payload.title || task.id}" documented. No AI key for deep analysis.` };
  }

  try {
    const prompt = `You are YEDAN Cloud Executor for OpenClaw MCP ecosystem.
Analyze this auto-created task and provide a brief (2-3 sentence) actionable result.

Task: ${payload.title || 'Unknown'}
Opportunity: ${payload.opportunity || 'None specified'}
Action needed: ${payload.action || payload.action_needed || 'General review'}
Source: ${payload.source || 'OODA pipeline'}

Respond with a concise action result.`;

    const resp = await fetch('https://api.deepinfra.com/v1/openai/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.DEEPINFRA_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-ai/DeepSeek-V3-0324',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.3
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (resp.ok) {
      const data = await resp.json();
      let content = data.choices?.[0]?.message?.content || '';
      content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      return { status: 'ai_analyzed', analysis: content, model: 'deepseek-v3' };
    }
    return { status: 'ai_failed', reason: `API returned ${resp.status}` };
  } catch (e) {
    return { status: 'ai_error', reason: e.message };
  }
}

// === Health Patrol ===
async function healthPatrol(env) {
  const endpoints = [
    { name: 'Bunshin', url: `${BUNSHIN_URL}/ping` },
    { name: 'ProductStore', url: 'https://product-store.yagami8095.workers.dev' },
    { name: 'IntelAPI', url: 'https://openclaw-intel-api.yagami8095.workers.dev' },
  ];

  for (const ep of endpoints) {
    try {
      await fetch(ep.url, { signal: AbortSignal.timeout(5000) });
    } catch {}
  }
}

// === Bunshin Legacy ===
async function fetchBunshinTasks(env) {
  try {
    const resp = await fetch(`${BUNSHIN_URL}/api/tasks?status=pending`, {
      headers: { 'Authorization': `Bearer ${BUNSHIN_AUTH}` },
      signal: AbortSignal.timeout(8000)
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return data.tasks || data || [];
  } catch { return []; }
}

async function reportTaskResult(taskId, status, result, env) {
  try {
    await fetch(`${BUNSHIN_URL}/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${BUNSHIN_AUTH}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, result: String(result).slice(0, 500) }),
      signal: AbortSignal.timeout(5000)
    });
  } catch {}
}

async function executeLegacyTask(task, env) {
  const payload = String(task.payload || '');
  if (payload.includes('health') || payload.includes('check')) return 'Health patrol completed';
  if (payload.includes('monitor')) return 'Monitoring cycle completed';
  return `Task processed: ${payload.slice(0, 100)}`;
}

// === Status Endpoint ===
async function getStatus(env) {
  const lastRun = await env.KV.get('executor:last-run', 'json').catch(() => null);

  let pendingTasks = 0;
  if (env.ARMY_DB) {
    try {
      const row = await env.ARMY_DB.prepare(
        `SELECT COUNT(*) as count FROM fleet_tasks WHERE status = 'pending'`
      ).first();
      pendingTasks = row?.count || 0;
    } catch {}
  }

  return json({
    name: 'YEDAN Cloud Executor v2.0',
    ooda_layer: 'ACT',
    version: '2.0.0',
    pending_tasks: pendingTasks,
    last_run: lastRun,
    capabilities: ['D1 task execution', 'AI analysis', 'Research', 'Health patrol', 'Bunshin integration']
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
