/**
 * OpenClaw Golem Agent v1.0
 * Lightweight adaptation of Project Golem patterns:
 *   - Butler Mode (proactive heartbeat)
 *   - Adaptive Strategy Engine (retry + fallback)
 *   - Error Budget (max 3 retries per task)
 *   - Telegram command interface
 *   - Health check HTTP server (Koyeb/Render)
 *
 * Browser: connects to CF Browser CDP endpoint OR launches local Chromium.
 * LLM:     DeepInfra (R1) primary, Groq (Llama) fallback.
 * State:   in-memory only — no DB dependency.
 */

require('dotenv').config();
const http = require('http');
const TelegramBot = require('node-telegram-bot-api');

// ─── Config ───────────────────────────────────────────────────────────────────

const CFG = {
  TG_TOKEN:       process.env.TELEGRAM_BOT_TOKEN || '',
  TG_CHAT_ID:     process.env.TELEGRAM_CHAT_ID   || '',
  CF_BROWSER_URL: process.env.CF_BROWSER_URL      || '',
  CF_BROWSER_TOKEN: process.env.CF_BROWSER_TOKEN  || '',
  DEEPINFRA_KEY:  process.env.DEEPINFRA_API_KEY   || '',
  GROQ_KEY:       process.env.GROQ_API_KEY        || '',
  BUNSHIN_URL:    process.env.BUNSHIN_URL         || '',
  BUNSHIN_TOKEN:  process.env.BUNSHIN_TOKEN       || '',
  YEDAN_URL:      process.env.YEDAN_GATEWAY       || '',
  YEDAN_TOKEN:    process.env.YEDAN_TOKEN         || '',
  PORT:           parseInt(process.env.PORT || '3000', 10),
  HEARTBEAT_MS:   15 * 60 * 1000,  // 15 minutes
};

// ─── Error Budget (Golem pattern: max 3 retries per task slot) ────────────────

class ErrorBudget {
  constructor(limit = 3) {
    this.limit  = limit;
    this.counts = new Map();
  }
  canRetry(key) {
    return (this.counts.get(key) || 0) < this.limit;
  }
  record(key) {
    this.counts.set(key, (this.counts.get(key) || 0) + 1);
  }
  reset(key) {
    this.counts.delete(key);
  }
  exhausted(key) {
    return !this.canRetry(key);
  }
}

// ─── State ────────────────────────────────────────────────────────────────────

const budget  = new ErrorBudget(3);
const state   = {
  startTime:    Date.now(),
  heartbeats:   0,
  tasksRun:     0,
  lastActivity: Date.now(),
  browserReady: false,
  errors:       [],
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function log(tag, msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] [${tag}] ${msg}`);
}

function uptimeStr() {
  const s = Math.floor((Date.now() - state.startTime) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h${m}m`;
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── HTTP fetch wrapper (no extra deps) ───────────────────────────────────────

async function fetchJSON(url, options = {}) {
  const { default: fetch } = await import('node-fetch').catch(() => {
    // node 18+ has built-in fetch
    return { default: globalThis.fetch };
  });
  const fn = fetch || globalThis.fetch;
  const res = await fn(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}`);
  return res.json();
}

// Use native fetch (Node 18+), fall back to http module
async function request(url, opts = {}) {
  try {
    const res = await globalThis.fetch(url, opts);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (e) {
    throw e;
  }
}

// ─── LLM (Adaptive Strategy: DeepInfra primary → Groq fallback) ──────────────

async function askLLM(prompt, context = 'general') {
  const budgetKey = `llm_${context}`;
  if (budget.exhausted(budgetKey)) {
    log('LLM', `Budget exhausted for ${context}, returning cached fallback`);
    return '[Budget exhausted — skipping LLM call]';
  }

  // Primary: DeepInfra DeepSeek-R1
  if (CFG.DEEPINFRA_KEY) {
    try {
      const body = JSON.stringify({
        model:    'deepseek-ai/DeepSeek-R1',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 512,
        temperature: 0.7,
      });
      const data = await request('https://api.deepinfra.com/v1/openai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CFG.DEEPINFRA_KEY}`,
          'Content-Type':  'application/json',
        },
        body,
      });
      budget.reset(budgetKey);
      return data.choices?.[0]?.message?.content || '';
    } catch (e) {
      budget.record(budgetKey);
      log('LLM', `DeepInfra error: ${e.message}`);
    }
  }

  // Fallback: Groq Llama (free)
  if (CFG.GROQ_KEY) {
    try {
      const body = JSON.stringify({
        model:    'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 512,
      });
      const data = await request('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CFG.GROQ_KEY}`,
          'Content-Type':  'application/json',
        },
        body,
      });
      budget.reset(budgetKey);
      return data.choices?.[0]?.message?.content || '';
    } catch (e) {
      budget.record(budgetKey);
      log('LLM', `Groq error: ${e.message}`);
    }
  }

  return '[No LLM available]';
}

// ─── Browser (Playwright — CF Browser CDP or local Chromium) ─────────────────

let pw_browser = null;
let pw_page    = null;

async function initBrowser() {
  if (state.browserReady) return true;

  const budgetKey = 'browser_init';
  if (budget.exhausted(budgetKey)) {
    log('BROWSER', 'Init budget exhausted — running without browser');
    return false;
  }

  try {
    const { chromium } = require('playwright-core');

    if (CFG.CF_BROWSER_URL && CFG.CF_BROWSER_TOKEN) {
      // Connect to Cloudflare Browser via CDP
      const cdpUrl = `${CFG.CF_BROWSER_URL}/cdp?token=${CFG.CF_BROWSER_TOKEN}`;
      log('BROWSER', `Connecting to CF Browser: ${CFG.CF_BROWSER_URL}`);
      pw_browser = await chromium.connectOverCDP(cdpUrl);
    } else {
      // Local Chromium (Koyeb/Render with Playwright system browsers)
      log('BROWSER', 'Launching local Chromium');
      pw_browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--single-process',
        ],
      });
    }

    const ctx  = await pw_browser.newContext({ viewport: { width: 1280, height: 720 } });
    pw_page    = await ctx.newPage();
    state.browserReady = true;
    budget.reset(budgetKey);
    log('BROWSER', 'Ready');
    return true;
  } catch (e) {
    budget.record(budgetKey);
    log('BROWSER', `Init failed (${e.message}) — continuing headless`);
    state.errors.push({ time: new Date().toISOString(), src: 'browser', msg: e.message });
    return false;
  }
}

async function browserNavigate(url) {
  if (!state.browserReady) return null;
  try {
    await pw_page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    const title = await pw_page.title();
    log('BROWSER', `Navigated to ${url} — "${title}"`);
    return title;
  } catch (e) {
    log('BROWSER', `Navigate error: ${e.message}`);
    return null;
  }
}

async function browserScreenshot() {
  if (!state.browserReady) return null;
  try {
    const buf = await pw_page.screenshot({ type: 'jpeg', quality: 60, fullPage: false });
    return buf;
  } catch (e) {
    log('BROWSER', `Screenshot error: ${e.message}`);
    return null;
  }
}

// ─── Service Monitor ──────────────────────────────────────────────────────────

const MONITORS = [
  { name: 'Bunshin',       url: CFG.BUNSHIN_URL + '/health' },
  { name: 'Intel Pro',     url: 'https://openclaw-intel-pro.onrender.com/api/v1/trending?limit=1' },
  { name: 'Product Store', url: 'https://product-store.yagami8095.workers.dev/api/orders' },
  { name: 'CF Browser',    url: CFG.CF_BROWSER_URL + '/health' },
];

async function checkServices() {
  const results = [];
  for (const svc of MONITORS) {
    if (!svc.url || svc.url.startsWith('/health') || svc.url === '/health') continue;
    const t0 = Date.now();
    try {
      const res = await globalThis.fetch(svc.url, {
        signal: AbortSignal.timeout(8000),
        headers: svc.name === 'Bunshin' ? { 'Authorization': `Bearer ${CFG.BUNSHIN_TOKEN}` } : {},
      });
      results.push({ name: svc.name, ok: res.ok, ms: Date.now() - t0, status: res.status });
    } catch (e) {
      results.push({ name: svc.name, ok: false, ms: Date.now() - t0, status: e.message.slice(0, 40) });
    }
  }
  return results;
}

// ─── Bunshin Task Queue ───────────────────────────────────────────────────────

async function fetchBunshinTasks() {
  if (!CFG.BUNSHIN_URL || !CFG.BUNSHIN_TOKEN) return [];
  try {
    const data = await request(`${CFG.BUNSHIN_URL}/api/tasks?status=pending&limit=3`, {
      headers: { 'Authorization': `Bearer ${CFG.BUNSHIN_TOKEN}` },
      signal:  AbortSignal.timeout(10000),
    });
    return Array.isArray(data) ? data : (data.tasks || []);
  } catch (e) {
    log('BUNSHIN', `Task fetch error: ${e.message}`);
    return [];
  }
}

async function completeBunshinTask(taskId, result) {
  if (!CFG.BUNSHIN_URL) return;
  try {
    await request(`${CFG.BUNSHIN_URL}/api/tasks/${taskId}`, {
      method:  'PATCH',
      headers: {
        'Authorization': `Bearer ${CFG.BUNSHIN_TOKEN}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ status: 'done', result }),
      signal: AbortSignal.timeout(10000),
    });
    log('BUNSHIN', `Task ${taskId} marked done`);
  } catch (e) {
    log('BUNSHIN', `Complete error: ${e.message}`);
  }
}

async function runBunshinTask(task) {
  const budgetKey = `task_${task.id}`;
  if (budget.exhausted(budgetKey)) {
    log('TASK', `Budget exhausted for task ${task.id} — skipping`);
    await completeBunshinTask(task.id, 'Error: budget exhausted after 3 retries');
    return;
  }

  try {
    log('TASK', `Running task ${task.id}: ${task.type || task.title}`);
    let result = '';

    const type = (task.type || '').toLowerCase();

    if (type === 'health_check') {
      const svcs = await checkServices();
      result = svcs.map(s => `${s.ok ? '✅' : '❌'} ${s.name} (${s.ms}ms)`).join('\n');

    } else if (type === 'content_gen' || type === 'generate') {
      const prompt = task.prompt || task.content || task.description || 'Write a short tech insight.';
      result = await askLLM(prompt, `task_${task.id}`);

    } else if (type === 'browse' || type === 'scrape') {
      const url = task.url || task.target;
      if (url && state.browserReady) {
        const title = await browserNavigate(url);
        result = `Browsed: ${url} — Title: ${title}`;
      } else {
        result = 'Browser not available or no URL specified';
      }

    } else {
      // Generic: ask LLM
      const prompt = `You are Golem Agent. Execute this task and reply concisely:\n${JSON.stringify(task)}`;
      result = await askLLM(prompt, `task_${task.id}`);
    }

    budget.reset(budgetKey);
    state.tasksRun++;
    await completeBunshinTask(task.id, result);

  } catch (e) {
    budget.record(budgetKey);
    log('TASK', `Error on task ${task.id}: ${e.message}`);
    state.errors.push({ time: new Date().toISOString(), src: 'task', msg: e.message });

    if (budget.exhausted(budgetKey)) {
      await completeBunshinTask(task.id, `Fatal error after 3 retries: ${e.message}`);
    }
  }
}

// ─── Heartbeat (Butler Mode — every 15 min) ───────────────────────────────────

async function heartbeat() {
  state.heartbeats++;
  state.lastActivity = Date.now();
  log('HEARTBEAT', `#${state.heartbeats} — uptime ${uptimeStr()}`);

  // 1. Check services
  const svcs = await checkServices();
  const down  = svcs.filter(s => !s.ok);
  if (down.length > 0) {
    const msg = `⚠️ Golem Alert: ${down.length} service(s) down\n${down.map(s => `• ${s.name}: ${s.status}`).join('\n')}`;
    log('HEARTBEAT', msg);
    await tgSend(msg);
  }

  // 2. Pull Bunshin tasks
  const tasks = await fetchBunshinTasks();
  for (const task of tasks) {
    await runBunshinTask(task);
  }

  // 3. Butler Mode: periodic AI thought (every 4th heartbeat = ~1h)
  if (state.heartbeats % 4 === 0) {
    const hour = new Date().getHours();
    if (hour >= 8 && hour <= 23) {
      const thought = await askLLM(
        'You are Golem, an AI agent. Share one brief useful insight or observation about AI/tech/revenue in 1-2 sentences. Be concise.',
        'butler'
      );
      if (thought && !thought.startsWith('[')) {
        await tgSend(`🤖 Golem Butler:\n${thought}`);
      }
    }
  }
}

// ─── Telegram ─────────────────────────────────────────────────────────────────

let tgBot = null;

async function tgSend(msg) {
  if (!tgBot || !CFG.TG_CHAT_ID) return;
  try {
    await tgBot.sendMessage(CFG.TG_CHAT_ID, msg, { parse_mode: 'Markdown' });
  } catch (e) {
    log('TG', `Send error: ${e.message}`);
  }
}

function setupTelegram() {
  if (!CFG.TG_TOKEN) {
    log('TG', 'No token — Telegram disabled');
    return;
  }

  tgBot = new TelegramBot(CFG.TG_TOKEN, { polling: true });
  log('TG', 'Polling started');

  const isAdmin = (msg) =>
    !CFG.TG_CHAT_ID || String(msg.chat.id) === String(CFG.TG_CHAT_ID);

  tgBot.on('message', async (msg) => {
    if (!isAdmin(msg)) return;
    const text = (msg.text || '').trim();
    const chatId = msg.chat.id;

    const reply = async (txt) => tgBot.sendMessage(chatId, txt, { parse_mode: 'Markdown' });

    try {
      // /status
      if (text === '/status' || text === '/start') {
        const svcs = await checkServices();
        const svcLines = svcs.map(s => `${s.ok ? '✅' : '❌'} ${s.name}`).join('\n');
        await reply(
          `*Golem Agent* — Online\n` +
          `Uptime: ${uptimeStr()}\n` +
          `Heartbeats: ${state.heartbeats}\n` +
          `Tasks run: ${state.tasksRun}\n` +
          `Browser: ${state.browserReady ? '✅' : '❌'}\n\n` +
          `*Services:*\n${svcLines}`
        );
        return;
      }

      // /help
      if (text === '/help') {
        await reply(
          '*Golem Agent Commands*\n' +
          '/status — System status\n' +
          '/health — Quick service check\n' +
          '/tasks — Pull Bunshin tasks now\n' +
          '/think <prompt> — Ask LLM\n' +
          '/browse <url> — Navigate browser\n' +
          '/screenshot — Take screenshot\n' +
          '/errors — Recent errors\n' +
          '/reset — Reset error budgets'
        );
        return;
      }

      // /health
      if (text === '/health') {
        const svcs = await checkServices();
        await reply(svcs.map(s => `${s.ok ? '✅' : '❌'} ${s.name} — ${s.ms}ms`).join('\n') || 'No monitors configured');
        return;
      }

      // /tasks
      if (text === '/tasks') {
        await reply('Pulling tasks from Bunshin...');
        const tasks = await fetchBunshinTasks();
        if (tasks.length === 0) { await reply('No pending tasks'); return; }
        await reply(`Found ${tasks.length} task(s), executing...`);
        for (const t of tasks) await runBunshinTask(t);
        await reply(`Done. Tasks run: ${state.tasksRun}`);
        return;
      }

      // /think <prompt>
      if (text.startsWith('/think ')) {
        const prompt = text.slice(7).trim();
        await reply('Thinking...');
        const ans = await askLLM(prompt, 'manual');
        await reply(ans || 'No response');
        return;
      }

      // /browse <url>
      if (text.startsWith('/browse ')) {
        const url = text.slice(8).trim();
        if (!state.browserReady) { await reply('Browser not ready'); return; }
        const title = await browserNavigate(url);
        await reply(`Navigated to: ${url}\nTitle: ${title || '(unknown)'}`);
        return;
      }

      // /screenshot
      if (text === '/screenshot') {
        if (!state.browserReady) { await reply('Browser not ready'); return; }
        const buf = await browserScreenshot();
        if (buf) {
          await tgBot.sendPhoto(chatId, buf, { caption: 'Current browser view' });
        } else {
          await reply('Screenshot failed');
        }
        return;
      }

      // /errors
      if (text === '/errors') {
        const recent = state.errors.slice(-5);
        if (recent.length === 0) { await reply('No recent errors'); return; }
        await reply(recent.map(e => `[${e.time.slice(11, 19)}] ${e.src}: ${e.msg}`).join('\n'));
        return;
      }

      // /reset
      if (text === '/reset') {
        budget.counts.clear();
        state.errors = [];
        await reply('Error budgets and error log cleared');
        return;
      }

      // Fallback: route to LLM
      const ans = await askLLM(text, 'chat');
      await reply(ans || 'No response');

    } catch (e) {
      log('TG', `Handler error: ${e.message}`);
      try { await reply(`Error: ${e.message}`); } catch (_) {}
    }
  });

  tgBot.on('error', (e) => log('TG', `Bot error: ${e.message}`));
  tgBot.on('polling_error', (e) => log('TG', `Polling error: ${e.message}`));
}

// ─── Health Check HTTP Server (Koyeb/Render) ─────────────────────────────────

function startHttpServer() {
  const server = http.createServer(async (req, res) => {
    if (req.url === '/health' || req.url === '/') {
      const payload = JSON.stringify({
        status:       'ok',
        uptime:       uptimeStr(),
        heartbeats:   state.heartbeats,
        tasksRun:     state.tasksRun,
        browserReady: state.browserReady,
        errorCount:   state.errors.length,
        ts:           new Date().toISOString(),
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(payload);
      return;
    }

    if (req.url === '/services') {
      const svcs = await checkServices();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(svcs));
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  });

  server.listen(CFG.PORT, () => log('HTTP', `Health server on :${CFG.PORT}`));
  server.on('error', (e) => log('HTTP', `Server error: ${e.message}`));
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

(async () => {
  log('BOOT', 'OpenClaw Golem Agent starting...');

  // HTTP health endpoint first (Render/Koyeb checks it quickly)
  startHttpServer();

  // Telegram
  setupTelegram();

  // Browser (non-blocking — agent works without it)
  initBrowser().then(ok => {
    if (ok) log('BOOT', 'Browser connected');
  });

  // Initial heartbeat after 10s warm-up
  await sleep(10000);
  await heartbeat();

  // Heartbeat loop every 15 minutes
  setInterval(heartbeat, CFG.HEARTBEAT_MS);

  // Boot notification
  await tgSend(
    `🛡️ *Golem Agent Online*\n` +
    `Time: ${new Date().toISOString().slice(0, 19)}Z\n` +
    `Browser: ${state.browserReady ? 'CF Browser' : 'Pending'}\n` +
    `Heartbeat: every 15m`
  );

  log('BOOT', 'Ready');
})();

// ─── Global error guards (Golem pattern) ─────────────────────────────────────

process.on('uncaughtException', (err) => {
  log('CRITICAL', `Uncaught: ${err.message}`);
  state.errors.push({ time: new Date().toISOString(), src: 'uncaught', msg: err.message });
});

process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  log('WARNING', `Unhandled rejection: ${msg}`);
  state.errors.push({ time: new Date().toISOString(), src: 'rejection', msg });
});
