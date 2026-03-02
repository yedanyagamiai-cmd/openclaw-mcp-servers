/**
 * OpenClaw Intel API — Hardened with 6-Layer Security
 * Rate limiting, API key auth (SHA-256 hashed), abuse detection, input validation
 *
 * ENV VARS (set via wrangler secret):
 *   INGEST_KEY - Secret key for report ingestion (rotated UUID)
 *   ADMIN_KEY  - Admin key for key management
 *   TELEGRAM_CHAT_ID - For abuse alerts
 *   TELEGRAM_BOT_TOKEN - For abuse alerts
 */

// ============================================================
// SECURITY UTILITIES
// ============================================================

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function ipHash(request) {
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
  // We hash the IP so we never store raw IPs
  return sha256(ip + '-salt-openclaw-2026');
}

function sanitize(str, maxLen = 500) {
  if (!str) return '';
  return String(str).slice(0, maxLen).replace(/<[^>]*>/g, '').replace(/[^\w\s\-.,!?@#$%^&*()+=\[\]{}|\\/:;"'<>~`]/g, '');
}

function getDateUTC() {
  return new Date().toISOString().slice(0, 10);
}

// ============================================================
// RATE LIMITING
// ============================================================

const RATE_LIMITS = {
  free:       { daily: 3,    perMinute: 5  },
  pro:        { daily: 1000, perMinute: 60 },
  enterprise: { daily: 10000, perMinute: 200 },
  admin:      { daily: 999999, perMinute: 999 },
};

async function checkRateLimit(ipH, tier, endpoint, env) {
  const today = getDateUTC();
  const limits = RATE_LIMITS[tier] || RATE_LIMITS.free;

  // Check daily limit
  const row = await env.DB.prepare(
    'SELECT calls FROM rate_limits WHERE ip_hash = ? AND endpoint = ? AND date = ?'
  ).bind(ipH, endpoint, today).first();

  const currentCalls = row?.calls || 0;
  if (currentCalls >= limits.daily) {
    return { allowed: false, remaining: 0, limit: limits.daily, resetAt: today + 'T23:59:59Z' };
  }

  // Upsert rate limit counter
  await env.DB.prepare(
    `INSERT INTO rate_limits (ip_hash, endpoint, date, calls, last_call)
     VALUES (?, ?, ?, 1, datetime('now'))
     ON CONFLICT(ip_hash, endpoint, date) DO UPDATE SET
       calls = calls + 1,
       last_call = datetime('now')`
  ).bind(ipH, endpoint, today).run();

  return { allowed: true, remaining: limits.daily - currentCalls - 1, limit: limits.daily };
}

// ============================================================
// API KEY RESOLUTION
// ============================================================

async function resolveAuth(request, env) {
  const auth = request.headers.get('Authorization');
  if (!auth) return { tier: 'free', keyPrefix: null };

  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token || token.length < 8) return { tier: 'free', keyPrefix: null };

  // Check API keys (SHA-256 hashed)
  const keyHash = await sha256(token);
  const keyRow = await env.DB.prepare(
    "SELECT key_prefix, tier, status FROM api_keys WHERE key_hash = ? AND status = 'active'"
  ).bind(keyHash).first();

  if (keyRow) {
    // Increment usage counter
    const today = getDateUTC();
    await env.DB.prepare(
      `UPDATE api_keys SET calls_today = CASE WHEN last_reset_date = ? THEN calls_today + 1 ELSE 1 END,
       calls_total = calls_total + 1, last_reset_date = ?, updated_at = datetime('now')
       WHERE key_hash = ?`
    ).bind(today, today, keyHash).run();
    return { tier: keyRow.tier, keyPrefix: keyRow.key_prefix };
  }

  // Legacy: check subscribers table (Telegram ID as bearer)
  const sub = await env.DB.prepare(
    "SELECT tier FROM subscribers WHERE telegram_id = ? AND status = 'active'"
  ).bind(token).first();
  if (sub) return { tier: sub.tier || 'free', keyPrefix: 'tg:' + token.slice(0, 4) };

  return { tier: 'free', keyPrefix: null };
}

// ============================================================
// ACCESS LOGGING
// ============================================================

async function logAccess(ipH, keyPrefix, endpoint, statusCode, tier, env) {
  try {
    await env.DB.prepare(
      'INSERT INTO access_logs (ip_hash, key_prefix, endpoint, status_code, tier) VALUES (?, ?, ?, ?, ?)'
    ).bind(ipH, keyPrefix, endpoint, statusCode, tier).run();
  } catch (_) { /* non-critical */ }
}

// ============================================================
// ABUSE DETECTION
// ============================================================

async function checkAbuse(ipH, env) {
  // Check if IP has > 50 failed auths today
  const today = getDateUTC();
  const fails = await env.DB.prepare(
    "SELECT COUNT(*) as cnt FROM access_logs WHERE ip_hash = ? AND status_code IN (401, 403, 429) AND created_at > ? || 'T00:00:00'"
  ).bind(ipH, today).first();

  if (fails && fails.cnt > 100) {
    return { blocked: true, reason: 'Too many failed requests' };
  }
  return { blocked: false };
}

// ============================================================
// RESPONSE HELPERS
// ============================================================

function json(data, cors, status = 200, rateInfo = null) {
  const headers = { ...cors, 'Content-Type': 'application/json' };
  if (rateInfo) {
    headers['X-RateLimit-Limit'] = String(rateInfo.limit);
    headers['X-RateLimit-Remaining'] = String(rateInfo.remaining);
    if (rateInfo.resetAt) headers['X-RateLimit-Reset'] = rateInfo.resetAt;
  }
  return new Response(JSON.stringify(data, null, 2), { status, headers });
}

function errorResponse(message, cors, status, rateInfo = null) {
  return json({ error: message }, cors, status, rateInfo);
}

// ============================================================
// LANDING PAGE
// ============================================================

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenClaw Intel - AI Agent Market Intelligence</title>
  <meta name="description" content="Daily competitive analysis of Claude Code, Cursor, Devin, OpenHands, Windsurf. Real GitHub metrics, news tracking, and trend alerts.">
  <meta property="og:title" content="OpenClaw Intel - AI Agent Market Intelligence">
  <meta property="og:description" content="Daily reports on AI coding agents: GitHub stars, releases, news, and growth trends. Free tier available.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://openclaw-intel-api.yagami8095.workers.dev">
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>
    .gradient-bg { background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%); }
    .card-glow:hover { box-shadow: 0 0 30px rgba(59, 130, 246, 0.15); }
  </style>
</head>
<body class="gradient-bg text-gray-100 min-h-screen">
  <nav class="border-b border-gray-800 px-6 py-4">
    <div class="max-w-6xl mx-auto flex justify-between items-center">
      <div class="text-xl font-bold text-blue-400">OpenClaw Intel</div>
      <div class="flex gap-3">
        <a href="/api/health" class="text-gray-400 hover:text-gray-200 text-sm">Health</a>
        <a href="/api/reports/latest" class="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-medium transition">Try Free</a>
      </div>
    </div>
  </nav>
  <main class="max-w-6xl mx-auto px-6 py-16">
    <section class="text-center mb-20">
      <h1 class="text-4xl md:text-5xl font-bold mb-6">
        AI Agent <span class="text-blue-400">Market Intelligence</span>
      </h1>
      <p class="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
        Daily competitive analysis of Claude Code, Cursor, Devin, OpenHands, Windsurf and more.
        Real GitHub metrics, news tracking, and trend alerts. <strong>API-first for AI agents.</strong>
      </p>
      <div class="flex gap-4 justify-center flex-wrap">
        <a href="/api/reports/latest" class="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-lg font-medium transition">Free Sample Report</a>
        <a href="/api/keys/info" class="border border-gray-600 hover:border-gray-400 px-6 py-3 rounded-lg font-medium transition">API Docs</a>
      </div>
    </section>
    <section class="grid md:grid-cols-3 gap-8 mb-20">
      <div class="bg-gray-800/50 border border-gray-700 rounded-xl p-8 card-glow transition">
        <div class="text-green-400 text-sm font-semibold mb-2">FREE</div>
        <div class="text-3xl font-bold mb-1">$0</div>
        <div class="text-gray-500 text-sm mb-6">3 API calls/day</div>
        <ul class="space-y-3 text-sm text-gray-300 mb-8">
          <li>Latest report summary</li>
          <li>GitHub star tracking</li>
          <li>Basic news digest</li>
          <li>Rate-limited API</li>
        </ul>
        <a href="/api/reports/latest" class="block text-center border border-gray-600 hover:border-green-400 py-2 rounded-lg transition">Try Now</a>
      </div>
      <div class="bg-gray-800/50 border-2 border-blue-500 rounded-xl p-8 card-glow transition relative">
        <div class="absolute -top-3 right-6 bg-blue-600 text-xs px-3 py-1 rounded-full">BEST FOR AGENTS</div>
        <div class="text-blue-400 text-sm font-semibold mb-2">PRO</div>
        <div class="text-3xl font-bold mb-1">$9<span class="text-lg text-gray-400">/mo</span></div>
        <div class="text-gray-500 text-sm mb-6">1,000 calls/day</div>
        <ul class="space-y-3 text-sm text-gray-300 mb-8">
          <li>All reports (daily + weekly)</li>
          <li>Delta analysis (growth %)</li>
          <li>Release tracking</li>
          <li>Priority alerts</li>
          <li>Dedicated API key</li>
        </ul>
        <a href="https://t.me/yedanyagami_moltbot" class="block text-center bg-blue-600 hover:bg-blue-500 py-2 rounded-lg transition">Get Pro Key</a>
      </div>
      <div class="bg-gray-800/50 border border-gray-700 rounded-xl p-8 card-glow transition">
        <div class="text-purple-400 text-sm font-semibold mb-2">ENTERPRISE</div>
        <div class="text-3xl font-bold mb-1">$99<span class="text-lg text-gray-400">/mo</span></div>
        <div class="text-gray-500 text-sm mb-6">10,000 calls/day</div>
        <ul class="space-y-3 text-sm text-gray-300 mb-8">
          <li>Everything in Pro</li>
          <li>Custom target tracking</li>
          <li>Raw data export (JSON)</li>
          <li>Webhook delivery</li>
          <li>Priority support</li>
        </ul>
        <a href="https://t.me/yedanyagami_moltbot" class="block text-center border border-gray-600 hover:border-purple-400 py-2 rounded-lg transition">Contact Us</a>
      </div>
    </section>
    <section class="text-center mb-16">
      <h2 class="text-2xl font-bold mb-4">What We Track</h2>
      <div class="grid md:grid-cols-3 gap-6 text-sm">
        <div class="bg-gray-800/30 rounded-lg p-6">
          <div class="text-2xl mb-2">&#9733;</div>
          <div class="font-semibold mb-2">GitHub Metrics</div>
          <div class="text-gray-400">Stars, forks, issues, releases, commit activity</div>
        </div>
        <div class="bg-gray-800/30 rounded-lg p-6">
          <div class="text-2xl mb-2">&#128240;</div>
          <div class="font-semibold mb-2">News &amp; Media</div>
          <div class="text-gray-400">Real-time news tracking via search APIs</div>
        </div>
        <div class="bg-gray-800/30 rounded-lg p-6">
          <div class="text-2xl mb-2">&#128200;</div>
          <div class="font-semibold mb-2">Trend Analysis</div>
          <div class="text-gray-400">Growth rates, momentum shifts, competitive alerts</div>
        </div>
      </div>
    </section>
    <section class="bg-gray-800/30 rounded-xl p-8 mb-16">
      <h2 class="text-2xl font-bold mb-4 text-center">Quick Start for AI Agents</h2>
      <div class="bg-black/40 rounded-lg p-4 font-mono text-sm text-green-400 max-w-2xl mx-auto">
        <p class="text-gray-500"># Free (no auth needed, 3/day limit)</p>
        <p>curl https://openclaw-intel-api.yagami8095.workers.dev/api/reports/latest</p>
        <p class="mt-3 text-gray-500"># Pro (with API key)</p>
        <p>curl -H "Authorization: Bearer YOUR_API_KEY" \\</p>
        <p>&nbsp; https://openclaw-intel-api.yagami8095.workers.dev/api/reports</p>
      </div>
    </section>
  </main>
  <footer class="border-t border-gray-800 px-6 py-8 text-center text-gray-500 text-sm">
    <p>Powered by OpenClaw Intelligence Pipeline &middot; Data refreshed every 6 hours</p>
    <p class="mt-1"><a href="/api/health" class="text-blue-400 hover:underline">/api/health</a> &middot; <a href="https://fortune-api.yagami8095.workers.dev" class="text-blue-400 hover:underline">Fortune API</a></p>
  </footer>
</body>
</html>`;

// ============================================================
// Edge Defense: Honeypot Layer (intel-api already has abuse detection)
// ============================================================

const HONEYPOT_PATHS_DEFENSE = ['/admin', '/wp-login.php', '/.env', '/config.json', '/.git/config', '/wp-admin', '/phpinfo.php'];

// Attribution Tracking — ?ref= parameter
async function trackRef(request, env, serverName) {
  const kv = env.KV;
  if (!kv) return;
  const ref = new URL(request.url).searchParams.get('ref');
  if (!ref) return;
  const source = ref.slice(0, 30).replace(/[^a-zA-Z0-9_-]/g, '');
  if (!source) return;
  const today = new Date().toISOString().slice(0, 10);
  const key = `ref:${source}:${serverName}:${today}`;
  try {
    const count = parseInt(await kv.get(key) || '0', 10);
    await kv.put(key, String(count + 1), { expirationTtl: 2592000 }); // 30 days
  } catch {}
}

// ============================================================
// MAIN WORKER
// ============================================================

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    // Edge Defense: Honeypot (intel-api already has robust abuse detection)
    if (HONEYPOT_PATHS_DEFENSE.includes(path.toLowerCase())) {
      try {
        const ipH = await ipHash(request);
        await env.DB.prepare("UPDATE rate_limits SET requests = 999 WHERE ip_hash = ?").bind(ipH).run();
      } catch {}
      return new Response('Not Found', { status: 404 });
    }

    // Attribution Tracking
    await trackRef(request, env, 'intel-api');

    // --- Landing page (no auth, no rate limit) ---
    if (path === '/' || path === '/index.html') {
      return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    try {
      // --- Resolve authentication ---
      const ipH = await ipHash(request);
      const { tier, keyPrefix } = await resolveAuth(request, env);

      // --- Abuse check ---
      const abuse = await checkAbuse(ipH, env);
      if (abuse.blocked) {
        await logAccess(ipH, keyPrefix, path, 403, tier, env);
        return errorResponse('Blocked: ' + abuse.reason, cors, 403);
      }

      // --- Health (no rate limit) ---
      if (path === '/api/health') {
        return json({ status: 'ok', service: 'openclaw-intel-api', version: '2.0-hardened', ts: Date.now() }, cors);
      }

      // --- API key info ---
      if (path === '/api/keys/info') {
        return json({
          service: 'OpenClaw Intel API v2.0',
          auth: 'Bearer token in Authorization header',
          tiers: {
            free: { limit: '3 calls/day', price: '$0', auth: 'none (IP-based)' },
            pro: { limit: '1,000 calls/day', price: '$9/mo', auth: 'API key' },
            enterprise: { limit: '10,000 calls/day', price: '$99/mo', auth: 'API key' },
          },
          endpoints: [
            'GET /api/health',
            'GET /api/reports — List reports (limit param)',
            'GET /api/reports/latest — Latest report',
            'GET /api/reports/:id — Full report (tier-gated)',
            'GET /api/stats — Platform stats',
            'POST /api/subscribe — Subscribe (telegram_id/email)',
            'POST /api/reports/ingest — Ingest report (admin only)',
            'POST /api/keys/generate — Generate API key (admin only)',
          ],
          contact: 'https://t.me/yedanyagami_moltbot'
        }, cors);
      }

      // --- Rate limit (admin endpoints bypass) ---
      let rateResult = { allowed: true, remaining: 999, limit: 1000 };
      if (path !== '/api/reports/ingest' && path !== '/api/keys/generate') {
        rateResult = await checkRateLimit(ipH, tier, 'api', env);
        if (!rateResult.allowed) {
          await logAccess(ipH, keyPrefix, path, 429, tier, env);
          return errorResponse('Rate limit exceeded. Upgrade to Pro for 1,000 calls/day.', cors, 429, rateResult);
        }
      }

      // --- GET /api/reports ---
      if (path === '/api/reports' && request.method === 'GET') {
        const limit = Math.min(Math.max(1, parseInt(url.searchParams.get('limit') || '10')), 50);
        const { results } = await env.DB.prepare(
          'SELECT id, report_type, report_date, title, summary, tier_required, created_at FROM intel_reports ORDER BY created_at DESC LIMIT ?'
        ).bind(limit).all();
        await logAccess(ipH, keyPrefix, path, 200, tier, env);
        return json({ count: results.length, reports: results, your_tier: tier }, cors, 200, rateResult);
      }

      // --- GET /api/reports/latest ---
      if (path === '/api/reports/latest' && request.method === 'GET') {
        const report = await env.DB.prepare(
          'SELECT id, report_type, report_date, title, summary, tier_required, created_at FROM intel_reports ORDER BY created_at DESC LIMIT 1'
        ).first();
        if (!report) {
          await logAccess(ipH, keyPrefix, path, 404, tier, env);
          return json({ error: 'No reports yet', your_tier: tier }, cors, 404, rateResult);
        }
        await logAccess(ipH, keyPrefix, path, 200, tier, env);
        return json({ report, your_tier: tier }, cors, 200, rateResult);
      }

      // --- GET /api/reports/:id ---
      if (path.match(/^\/api\/reports\/\d+$/) && request.method === 'GET') {
        const id = parseInt(path.split('/').pop());
        if (isNaN(id) || id < 1) {
          return errorResponse('Invalid report ID', cors, 400, rateResult);
        }
        const report = await env.DB.prepare('SELECT * FROM intel_reports WHERE id = ?').bind(id).first();
        if (!report) {
          await logAccess(ipH, keyPrefix, path, 404, tier, env);
          return json({ error: 'Report not found' }, cors, 404, rateResult);
        }
        const tierRank = { free: 0, pro: 1, enterprise: 2 };
        if ((tierRank[report.tier_required] || 0) > (tierRank[tier] || 0)) {
          await logAccess(ipH, keyPrefix, path, 403, tier, env);
          return json({
            error: 'Upgrade required',
            required_tier: report.tier_required,
            your_tier: tier,
            upgrade_url: 'https://t.me/yedanyagami_moltbot',
          }, cors, 403, rateResult);
        }
        await logAccess(ipH, keyPrefix, path, 200, tier, env);
        return json({ report, your_tier: tier }, cors, 200, rateResult);
      }

      // --- POST /api/subscribe ---
      if (path === '/api/subscribe' && request.method === 'POST') {
        if (request.headers.get('Content-Length') > 10240) {
          return errorResponse('Payload too large', cors, 413);
        }
        const body = await request.json().catch(() => null);
        if (!body) return errorResponse('Invalid JSON', cors, 400);
        const telegram_id = sanitize(body.telegram_id, 50);
        const email = sanitize(body.email, 200);
        const reqTier = sanitize(body.tier, 20) || 'free';
        if (!telegram_id && !email) {
          return errorResponse('telegram_id or email required', cors, 400);
        }
        if (telegram_id) {
          await env.DB.prepare(
            `INSERT INTO subscribers (telegram_id, email, tier, status)
             VALUES (?, ?, ?, 'active')
             ON CONFLICT(telegram_id) DO UPDATE SET
               email = COALESCE(excluded.email, email),
               tier = excluded.tier, status = 'active'`
          ).bind(telegram_id, email || null, reqTier).run();
        }
        await logAccess(ipH, keyPrefix, path, 200, tier, env);
        return json({ ok: true, tier: reqTier, telegram_id }, cors, 200, rateResult);
      }

      // --- POST /api/reports/ingest (ADMIN ONLY) ---
      if (path === '/api/reports/ingest' && request.method === 'POST') {
        const key = request.headers.get('X-API-Key');
        if (!env.INGEST_KEY || key !== env.INGEST_KEY) {
          await logAccess(ipH, keyPrefix, path, 401, 'admin', env);
          return errorResponse('Unauthorized', cors, 401);
        }
        if (request.headers.get('Content-Length') > 102400) {
          return errorResponse('Payload too large (max 100KB)', cors, 413);
        }
        const body = await request.json().catch(() => null);
        if (!body) return errorResponse('Invalid JSON', cors, 400);
        const { report_type, report_date, title, summary, full_content, tier_required } = body;
        if (!title || !report_date) {
          return errorResponse('title and report_date required', cors, 400);
        }
        const result = await env.DB.prepare(
          'INSERT INTO intel_reports (report_type, report_date, title, summary, full_content, tier_required) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(
          sanitize(report_type, 50) || 'daily',
          sanitize(report_date, 20),
          sanitize(title, 500),
          sanitize(summary, 2000) || '',
          (full_content || '').slice(0, 50000),
          sanitize(tier_required, 20) || 'free'
        ).run();
        await logAccess(ipH, 'admin', path, 200, 'admin', env);
        return json({ ok: true, id: result.meta.last_row_id }, cors);
      }

      // --- POST /api/keys/generate (ADMIN ONLY) ---
      if (path === '/api/keys/generate' && request.method === 'POST') {
        const adminKey = request.headers.get('X-Admin-Key');
        if (!env.ADMIN_KEY || adminKey !== env.ADMIN_KEY) {
          await logAccess(ipH, keyPrefix, path, 401, 'admin', env);
          return errorResponse('Unauthorized', cors, 401);
        }
        const body = await request.json().catch(() => null);
        if (!body) return errorResponse('Invalid JSON', cors, 400);
        const keyTier = sanitize(body.tier, 20) || 'pro';
        const ownerEmail = sanitize(body.email, 200);
        const ownerTg = sanitize(body.telegram_id, 50);
        // Generate secure random API key
        const rawKey = 'oci_' + crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
        const keyHash = await sha256(rawKey);
        const keyPfx = rawKey.slice(0, 8);
        await env.DB.prepare(
          'INSERT INTO api_keys (key_hash, key_prefix, tier, owner_email, owner_telegram, last_reset_date) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(keyHash, keyPfx, keyTier, ownerEmail || null, ownerTg || null, getDateUTC()).run();
        // Return the key ONLY ONCE — never stored in plaintext
        await logAccess(ipH, 'admin', path, 200, 'admin', env);
        return json({
          ok: true,
          api_key: rawKey,
          prefix: keyPfx,
          tier: keyTier,
          warning: 'Save this key now. It cannot be retrieved again.',
        }, cors);
      }

      // --- GET /api/stats ---
      if (path === '/api/stats' && request.method === 'GET') {
        const subs = await env.DB.prepare("SELECT COUNT(*) as total FROM subscribers WHERE status = 'active'").first();
        const reports = await env.DB.prepare('SELECT COUNT(*) as total FROM intel_reports').first();
        const keys = await env.DB.prepare("SELECT COUNT(*) as total FROM api_keys WHERE status = 'active'").first();
        await logAccess(ipH, keyPrefix, path, 200, tier, env);
        return json({
          subscribers: subs?.total || 0,
          reports: reports?.total || 0,
          api_keys: keys?.total || 0,
          your_tier: tier,
          ts: Date.now(),
        }, cors, 200, rateResult);
      }

      // --- 404 ---
      return json({
        service: 'OpenClaw Intel API v2.0',
        error: 'Not found',
        endpoints: ['/api/health', '/api/reports', '/api/reports/latest', '/api/reports/:id', '/api/subscribe', '/api/stats', '/api/keys/info'],
      }, cors, 404);

    } catch (e) {
      // Never expose stack traces
      return json({ error: 'Internal server error' }, cors, 500);
    }
  },
};
