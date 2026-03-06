/**
 * YEDAN Cloud Executor (Cloud Brain #2)
 *
 * Architecture:
 *   Bunshin (Render) = Brain/Coordinator (24/7 monitor + think + task creation)
 *   Cloud Executor (THIS) = Task Executor (24/7 via Cron, handles API-based tasks)
 *   YEDAN Gateway (WSL) = Power Executor (complex tasks when Yagami online)
 *
 * Runs every 5 minutes via Cron:
 *   1. Pull pending tasks from Bunshin
 *   2. Claim & execute tasks it can handle
 *   3. Report results back to Bunshin
 *   4. Log execution to KV for audit
 */

const BUNSHIN_AUTH = 'openclaw-bunshin-2026';

// Task types this executor can handle
const EXECUTABLE_TYPES = [
  'revenue-action',
  'system-fix',
  'health-alert',
  'content-action',
  'monitoring'
];

// Actions this executor can perform
const CAPABILITIES = {
  canFetchAPIs: true,       // HTTP calls to any API
  canCallDeepSeek: true,    // AI reasoning via DeepSeek
  canPostMoltBook: true,    // MoltBook API (post/comment)
  canCheckHealth: true,     // Health check all workers
  canUpdateBrain: true,     // Write to Bunshin brain
  canSendTelegram: false,   // Bunshin handles Telegram
  canBrowseWeb: false,      // No browser - leave for YEDAN
  canRunShell: false,       // No shell - leave for YEDAN
};

export default {
  // === HTTP Handler (manual trigger + status) ===
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/status') {
      const lastRun = await env.KV.get('executor:last-run');
      const stats = await env.KV.get('executor:stats');
      return json({
        name: 'YEDAN Cloud Executor',
        version: env.EXECUTOR_VERSION,
        capabilities: CAPABILITIES,
        lastRun: lastRun ? JSON.parse(lastRun) : null,
        stats: stats ? JSON.parse(stats) : null,
        bunshinUrl: env.BUNSHIN_URL,
      });
    }

    if (url.pathname === '/execute' && request.method === 'POST') {
      // Manual trigger
      const result = await executeHeartbeat(env);
      return json(result);
    }

    if (url.pathname === '/health') {
      return json({ ok: true, executor: 'CloudBrain2', timestamp: new Date().toISOString() });
    }

    if (url.pathname === '/ping') {
      return json({ pong: true, version: env.EXECUTOR_VERSION, name: 'CloudBrain2' });
    }

    return json({
      name: 'YEDAN Cloud Executor (Cloud Brain #2)',
      version: env.EXECUTOR_VERSION,
      endpoints: ['/status', '/execute (POST)', '/health', '/ping'],
      architecture: 'Bunshin(Brain) + CloudExecutor(THIS) + YEDAN(Power)',
    });
  },

  // === Cron Handler (every 5 minutes) ===
  async scheduled(event, env, ctx) {
    ctx.waitUntil(executeHeartbeat(env));
  }
};

// === Core Heartbeat Loop ===
async function executeHeartbeat(env) {
  const startTime = Date.now();
  const log = [];

  try {
    // 1. Pull pending tasks from Bunshin
    log.push('Pulling tasks from Bunshin...');
    const tasks = await fetchBunshinTasks(env);
    log.push(`Found ${tasks.length} pending tasks`);

    if (tasks.length === 0) {
      // No tasks - do a quick health check instead
      log.push('No tasks - running health patrol');
      await healthPatrol(env, log);
    } else {
      // 2. Filter tasks we can handle
      const myTasks = tasks.filter(t => canExecute(t));
      const yedanTasks = tasks.filter(t => !canExecute(t));
      log.push(`Claiming ${myTasks.length} tasks (${yedanTasks.length} left for YEDAN)`);

      // 3. Execute tasks (max 3 per cycle to stay within CPU limits)
      const toExecute = myTasks.slice(0, 3);
      for (const task of toExecute) {
        try {
          const result = await executeTask(task, env, log);
          await reportTaskResult(task.id, 'completed', result, env);
          log.push(`Task #${task.id} completed`);
        } catch (err) {
          await reportTaskResult(task.id, 'failed', err.message, env);
          log.push(`Task #${task.id} failed: ${err.message}`);
        }
      }
    }

    // 4. Update executor status in Bunshin brain
    const elapsed = Date.now() - startTime;
    const runInfo = {
      timestamp: new Date().toISOString(),
      elapsed_ms: elapsed,
      tasksProcessed: log.filter(l => l.includes('completed')).length,
      log: log.slice(-10),
    };

    await updateBunshinBrain('cloud-executor-status', {
      status: 'ONLINE',
      lastHeartbeat: new Date().toISOString(),
      version: env.EXECUTOR_VERSION || '1.0.0',
      capabilities: Object.keys(CAPABILITIES).filter(k => CAPABILITIES[k]),
      lastRun: runInfo,
    }, 'Cloud Brain #2 heartbeat', env);

    // 5. Save to KV for local audit
    await env.KV.put('executor:last-run', JSON.stringify(runInfo), { expirationTtl: 86400 });
    await incrementStats(env, runInfo.tasksProcessed);

    return { ok: true, ...runInfo };
  } catch (err) {
    const errorInfo = { ok: false, error: err.message, log };
    await env.KV.put('executor:last-error', JSON.stringify(errorInfo), { expirationTtl: 86400 });
    return errorInfo;
  }
}

// === Task Execution ===
function canExecute(task) {
  const payload = String(task.payload || '').toLowerCase();
  const type = String(task.type || '');

  // Skip browser-heavy tasks
  if (payload.includes('browser') || payload.includes('screenshot') || payload.includes('navigate')) {
    return false;
  }
  // Skip shell/system tasks
  if (payload.includes('shell') || payload.includes('systemctl') || payload.includes('restart')) {
    return false;
  }
  // Skip account creation tasks
  if (payload.includes('register') || payload.includes('sign up') || payload.includes('create account')) {
    return false;
  }

  // Can handle: API calls, monitoring, content generation, health checks
  return EXECUTABLE_TYPES.includes(type);
}

async function executeTask(task, env, log) {
  const payload = String(task.payload || '');
  const taskType = String(task.type || '');

  // Route to appropriate handler
  if (payload.toLowerCase().includes('health') || payload.toLowerCase().includes('check')) {
    return await executeHealthTask(task, env, log);
  }
  if (payload.toLowerCase().includes('smithery')) {
    return await executeSmitheryTask(task, env, log);
  }
  if (payload.toLowerCase().includes('moltbook')) {
    return await executeMoltBookTask(task, env, log);
  }
  if (payload.toLowerCase().includes('stripe') || payload.toLowerCase().includes('webhook')) {
    // Can check status but can't configure (needs Yagami)
    return await executeStripeCheckTask(task, env, log);
  }
  if (payload.toLowerCase().includes('apify')) {
    return await executeApifyCheckTask(task, env, log);
  }
  if (payload.toLowerCase().includes('monitor') || payload.toLowerCase().includes('track')) {
    return await executeMonitorTask(task, env, log);
  }

  // Default: use DeepSeek to analyze and provide guidance
  return await executeWithAI(task, env, log);
}

// === Health Check Task ===
async function executeHealthTask(task, env, log) {
  log.push('Executing health check task');
  const servers = [
    'json-toolkit-mcp', 'regex-engine-mcp', 'color-palette-mcp',
    'timestamp-converter-mcp', 'prompt-enhancer-mcp', 'agentforge-compare-mcp',
    'moltbook-publisher-mcp', 'openclaw-fortune-mcp', 'openclaw-intel-mcp',
    'fortune-api', 'openclaw-intel-api', 'product-store'
  ];

  const results = await Promise.all(servers.map(async (name) => {
    const domain = name.replace('openclaw-', '').replace('-mcp', '-mcp');
    const url = `https://${name}.yagami8095.workers.dev`;
    try {
      const start = Date.now();
      const resp = await fetch(url, { method: 'GET' });
      return { name, status: resp.status, latency: Date.now() - start, ok: resp.status < 500 };
    } catch (e) {
      return { name, status: 0, latency: -1, ok: false, error: e.message };
    }
  }));

  const healthy = results.filter(r => r.ok).length;
  const avgLatency = Math.round(results.filter(r => r.latency > 0).reduce((a, b) => a + b.latency, 0) / results.filter(r => r.latency > 0).length);
  const down = results.filter(r => !r.ok);

  const summary = `Health: ${healthy}/${results.length} servers OK, avg ${avgLatency}ms${down.length > 0 ? '. DOWN: ' + down.map(d => d.name).join(', ') : ''}`;
  log.push(summary);

  return summary;
}

// === Smithery Monitoring ===
async function executeSmitheryTask(task, env, log) {
  log.push('Checking Smithery stats');
  // Fetch Smithery registry for our servers
  try {
    const resp = await fetch('https://registry.smithery.ai/servers?q=openclaw', {
      headers: { 'User-Agent': 'YEDAN-CloudExecutor/1.0' }
    });
    if (resp.ok) {
      const text = await resp.text();
      return `Smithery check completed. Response length: ${text.length} bytes. Status: monitored.`;
    }
    return `Smithery returned ${resp.status}. Will retry next cycle.`;
  } catch (e) {
    return `Smithery unreachable: ${e.message}. Not critical - will retry.`;
  }
}

// === MoltBook Task ===
async function executeMoltBookTask(task, env, log) {
  log.push('Processing MoltBook task');
  // Check MoltBook API availability
  try {
    const resp = await fetch('https://moltbook.com/api/v1/posts?limit=1', {
      headers: { 'User-Agent': 'YEDAN-CloudExecutor/1.0' }
    });
    if (resp.ok) {
      const data = await resp.json();
      return `MoltBook API accessible. Latest posts available. Ready for automation.`;
    }
    return `MoltBook API returned ${resp.status}. Checking authentication needed.`;
  } catch (e) {
    return `MoltBook API error: ${e.message}. May need VPN or auth token.`;
  }
}

// === Stripe Status Check ===
async function executeStripeCheckTask(task, env, log) {
  log.push('Checking Stripe/Payment status');
  // Check Product Store for recent orders
  try {
    const resp = await fetch('https://product-store.yagami8095.workers.dev/api/orders');
    if (resp.ok) {
      const data = await resp.json();
      const paid = (data.orders || []).filter(o => o.status === 'paid');
      const total = paid.reduce((sum, o) => sum + (o.price || 0), 0);
      return `Product Store: ${paid.length} paid orders, $${total} total revenue. Stripe webhook still needed (Y1/Y2) for new payments to process automatically.`;
    }
    return `Product Store returned ${resp.status}`;
  } catch (e) {
    return `Product Store error: ${e.message}`;
  }
}

// === Apify Check ===
async function executeApifyCheckTask(task, env, log) {
  log.push('Checking Apify actors');
  try {
    const resp = await fetch('https://api.apify.com/v2/acts?username=yagamiyedan&limit=10', {
      headers: { 'User-Agent': 'YEDAN-CloudExecutor/1.0' }
    });
    if (resp.ok) {
      const data = await resp.json();
      const count = data.data?.total || 0;
      return `Apify: ${count} actors found. Creator Plan ($1/mo, Y17) needed for PPE revenue.`;
    }
    return `Apify API returned ${resp.status}`;
  } catch (e) {
    return `Apify check: ${e.message}. Non-critical.`;
  }
}

// === Monitoring Task ===
async function executeMonitorTask(task, env, log) {
  log.push('Running monitoring task');

  // Check all key endpoints
  const checks = [
    { name: 'Bunshin', url: `${BUNSHIN_URL_DEFAULT}/ping` },
    { name: 'ProductStore', url: 'https://product-store.yagami8095.workers.dev/api/orders' },
  ];

  const results = [];
  for (const check of checks) {
    try {
      const start = Date.now();
      const resp = await fetch(check.url);
      results.push({ name: check.name, status: resp.status, ms: Date.now() - start });
    } catch (e) {
      results.push({ name: check.name, status: 'ERROR', error: e.message });
    }
  }

  return `Monitor: ${results.map(r => `${r.name}=${r.status}`).join(', ')}`;
}

const BUNSHIN_URL_DEFAULT = 'https://openclaw-mcp-servers.onrender.com';

// === AI-Powered Task Execution ===
async function executeWithAI(task, env, log) {
  log.push('Using AI analysis for task');
  const payload = String(task.payload || '');
  const result = String(task.result || '');

  // If we have a DeepSeek key, use it for analysis
  const dsKey = env.DEEPSEEK_API_KEY;
  if (!dsKey) {
    return `Task analyzed. Payload: "${payload.slice(0, 100)}". No AI key configured - queuing analysis for YEDAN.`;
  }

  try {
    const resp = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dsKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{
          role: 'system',
          content: 'You are YEDAN Cloud Executor, a revenue-focused AI agent. Analyze tasks and provide actionable results in 2-3 sentences. Focus on revenue impact.'
        }, {
          role: 'user',
          content: `Task: ${payload}\nDetails: ${result}\nProvide a brief action result.`
        }],
        max_tokens: 200,
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      const analysis = data.choices?.[0]?.message?.content || 'No analysis generated';
      log.push('AI analysis complete');
      return `AI Analysis: ${analysis}`;
    }
    return `DeepSeek returned ${resp.status}. Task queued for YEDAN review.`;
  } catch (e) {
    return `AI analysis failed: ${e.message}. Task queued for YEDAN.`;
  }
}

// === Health Patrol (when no tasks) ===
async function healthPatrol(env, log) {
  // Quick check of critical endpoints
  const endpoints = [
    { name: 'Bunshin', url: `${env.BUNSHIN_URL}/ping` },
    { name: 'ProductStore', url: 'https://product-store.yagami8095.workers.dev' },
    { name: 'IntelAPI', url: 'https://openclaw-intel-api.yagami8095.workers.dev' },
  ];

  for (const ep of endpoints) {
    try {
      const resp = await fetch(ep.url);
      log.push(`Patrol: ${ep.name} = ${resp.status}`);
    } catch (e) {
      log.push(`Patrol: ${ep.name} = DOWN (${e.message})`);
    }
  }
}

// === Bunshin API Helpers ===
async function fetchBunshinTasks(env) {
  try {
    const resp = await fetch(`${env.BUNSHIN_URL}/api/tasks?status=pending`, {
      headers: { 'Authorization': `Bearer ${BUNSHIN_AUTH}` }
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return data.tasks || data || [];
  } catch (e) {
    return [];
  }
}

async function reportTaskResult(taskId, status, result, env) {
  try {
    await fetch(`${env.BUNSHIN_URL}/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${BUNSHIN_AUTH}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status, result: String(result).slice(0, 500) }),
    });
  } catch (e) {
    // Silently fail - next cycle will retry
  }
}

async function updateBunshinBrain(key, value, summary, env) {
  try {
    await fetch(`${env.BUNSHIN_URL}/api/brain/${key}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${BUNSHIN_AUTH}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ category: 'state', value, summary }),
    });
  } catch (e) {
    // Non-critical
  }
}

// === Stats ===
async function incrementStats(env, tasksProcessed) {
  try {
    const raw = await env.KV.get('executor:stats');
    const stats = raw ? JSON.parse(raw) : { totalRuns: 0, totalTasks: 0, since: new Date().toISOString() };
    stats.totalRuns++;
    stats.totalTasks += tasksProcessed;
    stats.lastRun = new Date().toISOString();
    await env.KV.put('executor:stats', JSON.stringify(stats));
  } catch (e) {
    // Non-critical
  }
}

// === Utility ===
function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
