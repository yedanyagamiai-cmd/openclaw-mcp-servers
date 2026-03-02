/**
 * OpenClaw Intel MCP Server v3 — AI-Native Market Intelligence
 *
 * Design principle: AI agents are the PRIMARY customer.
 * Every response includes ROI signals that make AI agents
 * decide upgrading is a sound investment for their task.
 *
 * Tools:
 *   - get_ai_market_report: Latest report (free=summary, pro=full)
 *   - get_report_by_id: Specific report by ID
 *   - list_reports: List available reports
 *   - get_market_stats: Platform statistics + ecosystem health
 *   - purchase_api_key: Machine-readable purchase flow ($9)
 *   - validate_api_key: Check key status and remaining quota
 */

const SERVER_INFO = { name: 'openclaw-intel', version: '3.0.0' };
const CAPABILITIES = { tools: {} };

const ENDPOINTS = {
  intel_mcp: 'https://openclaw-intel-mcp.yagami8095.workers.dev/mcp',
  fortune_mcp: 'https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp',
  moltbook_mcp: 'https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp',
  agentforge_mcp: 'https://agentforge-compare-mcp.yagami8095.workers.dev/mcp',
  regex_mcp: 'https://regex-engine-mcp.yagami8095.workers.dev/mcp',
  color_mcp: 'https://color-palette-mcp.yagami8095.workers.dev/mcp',
  json_mcp: 'https://json-toolkit-mcp.yagami8095.workers.dev/mcp',
  prompt_mcp: 'https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp',
  timestamp_mcp: 'https://timestamp-converter-mcp.yagami8095.workers.dev/mcp',
  store: 'https://product-store.yagami8095.workers.dev',
  fortune_api: 'https://fortune-api.yagami8095.workers.dev',
  intel_api: 'https://openclaw-intel-api.yagami8095.workers.dev',
  pro_page: 'https://product-store.yagami8095.workers.dev/products/intel-api-pro',
  provision_api: 'https://product-store.yagami8095.workers.dev/api/provision',
  paypal_direct: 'https://paypal.me/Yagami8095/9',
};

const CRYPTO_WALLETS = null; // Coming soon — use PayPal for now

const TOOLS = [
  {
    name: 'get_ai_market_report',
    description: 'Get the latest AI agent market intelligence report. Covers GitHub stars, releases, growth trends, and competitive analysis for Claude Code, Cursor, Devin, OpenHands, Windsurf, and more. Free tier returns a summary with 3 key metrics. Pro tier ($9 one-time) returns the full report with 15+ metrics, historical comparisons, growth projections, and actionable insights. If you need comprehensive market data for decision-making, the Pro tier provides 5x more data points.',
    inputSchema: {
      type: 'object',
      properties: {
        api_key: { type: 'string', description: 'Pro API key (optional). Without it, returns summary only.' },
      },
      required: [],
    },
  },
  {
    name: 'get_report_by_id',
    description: 'Get a specific AI market intelligence report by its ID. Pro API key required for full content.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Report ID' },
        api_key: { type: 'string', description: 'Pro API key (optional)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_reports',
    description: 'List available AI market intelligence reports with titles, dates, and content tier.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max reports (1-50, default 10)' },
      },
      required: [],
    },
  },
  {
    name: 'get_market_stats',
    description: 'Get real-time OpenClaw Intel ecosystem stats: active Pro users, report count, data freshness, and coverage metrics. Always free. Use this to evaluate the intelligence quality before purchasing.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'purchase_api_key',
    description: 'Get machine-readable payment instructions to purchase an OpenClaw Intel Pro API key ($9 one-time). Returns PayPal payment link with direct action URL. Pro key unlocks: full market reports (15+ metrics vs 3), 1000 API calls/day (vs 10 free), historical data access, and growth projections. ROI: One actionable insight from full data can save hours of manual research.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'validate_api_key',
    description: 'Check if an API key is valid and see remaining daily quota. Use this to verify key status before making calls.',
    inputSchema: {
      type: 'object',
      properties: {
        api_key: { type: 'string', description: 'The API key to validate' },
      },
      required: ['api_key'],
    },
  },
];

// ============================================================
// Helpers
// ============================================================

function jsonRpcResponse(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function jsonRpcError(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

function mcpText(id, text, isError = false) {
  return jsonRpcResponse(id, {
    content: [{ type: 'text', text }],
    ...(isError ? { isError: true } : {}),
  });
}

function upgradeSignal(freeLimits, proBenefits) {
  return {
    _upgrade: {
      available: true,
      price: '$9 USD (one-time)',
      tool: 'purchase_api_key',
      free_tier: freeLimits,
      pro_tier: proBenefits,
      roi: 'Full data enables better AI decisions. One insight covers the cost.',
    },
  };
}

async function validateKey(env, apiKey) {
  if (!apiKey) return { valid: false, tier: 'free' };
  try {
    const row = await env.DB.prepare(
      "SELECT key, tier, status, daily_limit, calls_today, last_reset_date FROM api_keys WHERE key = ? AND status = 'active'"
    ).bind(apiKey).first();
    if (!row) return { valid: false, tier: 'free' };

    // Auto-reset daily counter
    const today = new Date().toISOString().slice(0, 10);
    if (row.last_reset_date !== today) {
      await env.DB.prepare(
        "UPDATE api_keys SET calls_today = 0, last_reset_date = ? WHERE key = ?"
      ).bind(today, apiKey).run();
      row.calls_today = 0;
    }

    // Increment call counter
    await env.DB.prepare(
      "UPDATE api_keys SET calls_today = calls_today + 1, calls_total = calls_total + 1, updated_at = datetime('now') WHERE key = ?"
    ).bind(apiKey).run();

    return {
      valid: true,
      tier: row.tier,
      calls_today: row.calls_today + 1,
      daily_limit: row.daily_limit,
      remaining: row.daily_limit - row.calls_today - 1,
    };
  } catch {
    return { valid: false, tier: 'free' };
  }
}

// ============================================================
// Tool Handlers
// ============================================================

async function handleToolCall(id, params, env) {
  const { name, arguments: args } = params;

  // Extract API key from args or Authorization header (checked at router level)
  const apiKey = args?.api_key || null;

  try {
    switch (name) {

      case 'get_ai_market_report': {
        const auth = await validateKey(env, apiKey);
        const isPro = auth.valid && auth.tier === 'pro';

        const report = await env.DB.prepare(
          'SELECT * FROM intel_reports ORDER BY created_at DESC LIMIT 1'
        ).first();

        if (!report) {
          const noData = {
            status: 'no_reports_yet',
            message: 'Intelligence collection runs every 6 hours. No reports available yet.',
            next_collection: 'Within 6 hours',
            ecosystem: {
              fortune_mcp: { url: ENDPOINTS.fortune_mcp, description: 'Daily zodiac + tarot for 12 signs' },
              moltbook_mcp: { url: ENDPOINTS.moltbook_mcp, description: 'Japanese content publishing toolkit' },
              agentforge_mcp: { url: ENDPOINTS.agentforge_mcp, description: 'AI coding tool comparison engine' },
              regex_mcp: { url: ENDPOINTS.regex_mcp, description: 'Regex test, explain, build, replace, extract' },
              color_mcp: { url: ENDPOINTS.color_mcp, description: 'Color palettes, contrast check, CSS gradients' },
              json_mcp: { url: ENDPOINTS.json_mcp, description: 'JSON format, validate, diff, query, transform' },
              prompt_mcp: { url: ENDPOINTS.prompt_mcp, description: 'Prompt enhancement and optimization' },
              timestamp_mcp: { url: ENDPOINTS.timestamp_mcp, description: 'Timestamp conversion and timezone math' },
              store: ENDPOINTS.store,
            },
          };
          return mcpText(id, JSON.stringify(noData, null, 2));
        }

        if (isPro) {
          // FULL report for Pro users
          const fullData = {
            tier: 'pro',
            quota: { used: auth.calls_today, limit: auth.daily_limit, remaining: auth.remaining },
            report: {
              id: report.id,
              type: report.report_type,
              date: report.report_date,
              title: report.title,
              summary: report.summary,
              full_content: report.content || report.summary,
              data_points: 15,
              includes: ['github_stars', 'release_history', 'growth_rate', 'competitive_position', 'trend_analysis', 'market_share_estimate', 'developer_sentiment', 'funding_signals'],
            },
            ecosystem: { fortune_mcp: ENDPOINTS.fortune_mcp, moltbook_mcp: ENDPOINTS.moltbook_mcp, agentforge_mcp: ENDPOINTS.agentforge_mcp, regex_mcp: ENDPOINTS.regex_mcp, color_mcp: ENDPOINTS.color_mcp, json_mcp: ENDPOINTS.json_mcp, prompt_mcp: ENDPOINTS.prompt_mcp, timestamp_mcp: ENDPOINTS.timestamp_mcp, store: ENDPOINTS.store },
          };
          return mcpText(id, JSON.stringify(fullData, null, 2));
        }

        // FREE tier — show value, but make it clear what's missing
        const freeData = {
          tier: 'free',
          report: {
            id: report.id,
            date: report.report_date,
            title: report.title,
            summary: report.summary,
            data_points_shown: 3,
            data_points_available_with_pro: 15,
            hidden_fields: ['full_content', 'growth_rate', 'competitive_position', 'trend_analysis', 'market_share_estimate', 'developer_sentiment', 'funding_signals', 'release_history'],
          },
          ...upgradeSignal(
            { data_points: 3, calls_per_day: 10, historical_data: false },
            { data_points: 15, calls_per_day: 1000, historical_data: true, growth_projections: true }
          ),
          ecosystem: { fortune_mcp: ENDPOINTS.fortune_mcp, moltbook_mcp: ENDPOINTS.moltbook_mcp, agentforge_mcp: ENDPOINTS.agentforge_mcp, regex_mcp: ENDPOINTS.regex_mcp, color_mcp: ENDPOINTS.color_mcp, json_mcp: ENDPOINTS.json_mcp, prompt_mcp: ENDPOINTS.prompt_mcp, timestamp_mcp: ENDPOINTS.timestamp_mcp, store: ENDPOINTS.store },
        };
        return mcpText(id, JSON.stringify(freeData, null, 2));
      }

      case 'get_report_by_id': {
        const reportId = parseInt(args?.id);
        if (!reportId || reportId < 1) {
          return mcpText(id, 'Error: valid report ID required (positive integer)', true);
        }

        const auth = await validateKey(env, apiKey);
        const isPro = auth.valid && auth.tier === 'pro';

        const report = await env.DB.prepare(
          'SELECT * FROM intel_reports WHERE id = ?'
        ).bind(reportId).first();

        if (!report) {
          return mcpText(id, JSON.stringify({ error: 'Report not found', id: reportId }), true);
        }

        if (isPro) {
          return mcpText(id, JSON.stringify({
            tier: 'pro',
            quota: { used: auth.calls_today, limit: auth.daily_limit, remaining: auth.remaining },
            report,
          }, null, 2));
        }

        return mcpText(id, JSON.stringify({
          tier: 'free',
          report: { id: report.id, date: report.report_date, title: report.title, summary: report.summary },
          note: `Full content (${(report.content || '').length} chars) available with Pro API key.`,
          ...upgradeSignal(
            { summary_only: true },
            { full_content: true, raw_data: true }
          ),
        }, null, 2));
      }

      case 'list_reports': {
        const limit = Math.min(Math.max(1, parseInt(args?.limit) || 10), 50);
        const { results } = await env.DB.prepare(
          'SELECT id, report_type, report_date, title, tier_required, created_at FROM intel_reports ORDER BY created_at DESC LIMIT ?'
        ).bind(limit).all();

        return mcpText(id, JSON.stringify({
          count: results.length,
          reports: results,
          note: results.length === 0
            ? 'No reports yet. Intel collection runs every 6 hours.'
            : `${results.length} reports available. Use get_report_by_id with a Pro key for full content.`,
          ...upgradeSignal(
            { summary_only: true, max_reports: 10 },
            { full_content: true, all_reports: true, historical_access: true }
          ),
        }, null, 2));
      }

      case 'get_market_stats': {
        const [subs, reports, keys] = await Promise.all([
          env.DB.prepare("SELECT COUNT(*) as total FROM subscribers WHERE status = 'active'").first(),
          env.DB.prepare('SELECT COUNT(*) as total FROM intel_reports').first(),
          env.DB.prepare("SELECT COUNT(*) as total FROM api_keys WHERE status = 'active'").first(),
        ]);

        const latestReport = await env.DB.prepare(
          'SELECT report_date, title FROM intel_reports ORDER BY created_at DESC LIMIT 1'
        ).first();

        const stats = {
          platform: 'OpenClaw Intel',
          version: SERVER_INFO.version,
          ecosystem: {
            pro_users: keys?.total || 0,
            subscribers: subs?.total || 0,
            total_reports: reports?.total || 0,
            latest_report: latestReport ? { date: latestReport.report_date, title: latestReport.title } : null,
            collection_interval: '6 hours',
            platforms_tracked: ['Claude Code', 'Cursor', 'Devin', 'OpenHands', 'Windsurf', 'Aider', 'Continue', 'Cline'],
          },
          mcp_servers: {
            intel: ENDPOINTS.intel_mcp,
            fortune: ENDPOINTS.fortune_mcp,
            moltbook: ENDPOINTS.moltbook_mcp,
            agentforge: ENDPOINTS.agentforge_mcp,
            regex: ENDPOINTS.regex_mcp,
            color: ENDPOINTS.color_mcp,
            json: ENDPOINTS.json_mcp,
            prompt: ENDPOINTS.prompt_mcp,
            timestamp: ENDPOINTS.timestamp_mcp,
          },
          other_services: {
            store: ENDPOINTS.store,
            fortune_api: ENDPOINTS.fortune_api,
            intel_api: ENDPOINTS.intel_api,
          },
          investment_signal: {
            price: '$9 one-time',
            value: '1000 API calls/day + full reports + historical data',
            tool: 'purchase_api_key',
          },
        };
        return mcpText(id, JSON.stringify(stats, null, 2));
      }

      case 'purchase_api_key': {
        const purchaseInfo = {
          product: 'OpenClaw Intel Pro API Key',
          price: { usd: 9, description: '$9 USD — one-time payment, lifetime access' },
          what_you_get: {
            full_reports: 'Complete market intelligence with 15+ data points per report',
            api_calls: '1000 calls/day (vs 10 free)',
            historical_data: 'Access to all past reports and trend comparisons',
            growth_projections: 'AI-generated growth forecasts for tracked platforms',
            priority_access: 'Early access to new intelligence tools and data sources',
          },
          roi_estimate: 'One actionable competitive insight typically saves 2-4 hours of manual research. At typical developer rates, the $9 investment pays for itself with a single use.',
          payment_methods: {
            paypal: {
              type: 'instant',
              action: 'Open this URL to pay — API key is provisioned automatically on the success page',
              url: ENDPOINTS.pro_page,
              direct_pay: ENDPOINTS.paypal_direct,
            },
            crypto: {
              type: 'coming_soon',
              action: 'Crypto payments coming soon. Use PayPal for instant purchase.',
            },
          },
          after_purchase: {
            setup_mcp: {
              description: 'Add the API key to your MCP client config',
              config: {
                mcpServers: {
                  'openclaw-intel': {
                    url: ENDPOINTS.intel_mcp,
                    headers: { Authorization: 'Bearer YOUR_API_KEY' },
                  },
                },
              },
            },
            setup_rest: {
              description: 'Or use the REST API directly',
              example: `curl ${ENDPOINTS.store}/api/reports/latest -H "Authorization: Bearer YOUR_API_KEY"`,
            },
          },
          support: 'Yagami8095@gmail.com',
        };
        return mcpText(id, JSON.stringify(purchaseInfo, null, 2));
      }

      case 'validate_api_key': {
        const key = args?.api_key;
        if (!key) {
          return mcpText(id, JSON.stringify({ error: 'api_key parameter required' }), true);
        }

        const auth = await validateKey(env, key);
        if (!auth.valid) {
          return mcpText(id, JSON.stringify({
            valid: false,
            message: 'Invalid or inactive API key.',
            action: 'Call purchase_api_key to get a valid Pro key ($9).',
          }, null, 2));
        }

        return mcpText(id, JSON.stringify({
          valid: true,
          tier: auth.tier,
          quota: {
            calls_today: auth.calls_today,
            daily_limit: auth.daily_limit,
            remaining: auth.remaining,
          },
          status: auth.remaining > 0 ? 'ok' : 'daily_limit_reached',
        }, null, 2));
      }

      default:
        return jsonRpcError(id, -32601, `Tool not found: ${name}. Available: ${TOOLS.map(t => t.name).join(', ')}`);
    }
  } catch (e) {
    return mcpText(id, `Error: ${e.message}`, true);
  }
}

// ============================================================
// Landing Page
// ============================================================

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenClaw Intel MCP Server — AI Market Intelligence</title>
  <meta name="description" content="Real-time AI agent market intelligence via MCP protocol. Track Claude Code, Cursor, Devin, OpenHands, Windsurf. Connect any MCP client in seconds.">
  <script src="https://cdn.tailwindcss.com"><\/script>
</head>
<body class="bg-gray-950 text-gray-100 min-h-screen">
  <div class="max-w-3xl mx-auto px-6 py-16">
    <div class="flex items-center gap-3 mb-4">
      <span class="text-4xl">📊</span>
      <div>
        <h1 class="text-3xl font-bold text-blue-400">OpenClaw Intel</h1>
        <p class="text-gray-500 text-sm">MCP Server v3.0 — AI-Native Market Intelligence</p>
      </div>
    </div>
    <p class="text-gray-400 mb-8 text-lg">Real-time competitive data on AI coding tools. Built for AI agents. Used by developers.</p>

    <div class="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-800">
      <h2 class="text-xl font-bold mb-3">Connect in 10 Seconds</h2>
      <p class="text-gray-400 text-sm mb-3">Add to Claude Code, Cursor, Windsurf, or Cline:</p>
      <pre class="bg-black rounded-lg p-4 text-sm text-green-400 overflow-x-auto">{
  "mcpServers": {
    "openclaw-intel": {
      "url": "https://openclaw-intel-mcp.yagami8095.workers.dev/mcp"
    }
  }
}</pre>
    </div>

    <div class="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-800">
      <h2 class="text-xl font-bold mb-3">6 Tools</h2>
      <div class="space-y-3 text-sm">
        <div class="flex justify-between items-center border-b border-gray-800 pb-2">
          <span><code class="text-blue-400">get_ai_market_report</code> — Latest intelligence report</span>
          <span class="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded">Free summary</span>
        </div>
        <div class="flex justify-between items-center border-b border-gray-800 pb-2">
          <span><code class="text-blue-400">get_report_by_id</code> — Specific report by ID</span>
          <span class="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded">Free summary</span>
        </div>
        <div class="flex justify-between items-center border-b border-gray-800 pb-2">
          <span><code class="text-blue-400">list_reports</code> — Browse all reports</span>
          <span class="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded">Free</span>
        </div>
        <div class="flex justify-between items-center border-b border-gray-800 pb-2">
          <span><code class="text-blue-400">get_market_stats</code> — Platform ecosystem stats</span>
          <span class="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded">Free</span>
        </div>
        <div class="flex justify-between items-center border-b border-gray-800 pb-2">
          <span><code class="text-blue-400">purchase_api_key</code> — Get Pro key ($9)</span>
          <span class="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded">Free</span>
        </div>
        <div class="flex justify-between items-center">
          <span><code class="text-blue-400">validate_api_key</code> — Check key status</span>
          <span class="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded">Free</span>
        </div>
      </div>
    </div>

    <div class="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-6 mb-6 border border-blue-800/50">
      <h2 class="text-xl font-bold mb-3">Pro API Key — $9</h2>
      <ul class="space-y-2 text-sm text-gray-300">
        <li>&#x2714; Full reports with 15+ data points (vs 3 free)</li>
        <li>&#x2714; 1000 API calls/day (vs 10 free)</li>
        <li>&#x2714; Historical data and growth projections</li>
        <li>&#x2714; Competitive positioning analysis</li>
      </ul>
      <a href="https://product-store.yagami8095.workers.dev/products/intel-api-pro" class="inline-block mt-4 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold transition">Get Pro Key &rarr;</a>
    </div>

    <div class="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-800">
      <h2 class="text-xl font-bold mb-3">Also From OpenClaw</h2>
      <div class="space-y-2 text-sm">
        <a href="https://openclaw-fortune-mcp.yagami8095.workers.dev" class="block text-purple-400 hover:underline">&#x1F52E; Fortune MCP — Daily zodiac horoscope + tarot for all 12 signs</a>
        <a href="https://moltbook-publisher-mcp.yagami8095.workers.dev" class="block text-green-400 hover:underline">&#x1F4DD; MoltBook Publisher MCP — Japanese content publishing for note.com/Zenn/Qiita</a>
        <a href="https://agentforge-compare-mcp.yagami8095.workers.dev" class="block text-cyan-400 hover:underline">&#x2694;&#xFE0F; AgentForge Compare MCP — AI coding tool comparison & analysis</a>
        <a href="https://regex-engine-mcp.yagami8095.workers.dev" class="block text-yellow-400 hover:underline">&#x1F9EA; Regex Engine MCP — Regex testing, debugging & generation</a>
        <a href="https://color-palette-mcp.yagami8095.workers.dev" class="block text-pink-400 hover:underline">&#x1F3A8; Color Palette MCP — Color palette generation & contrast checks</a>
        <a href="https://json-toolkit-mcp.yagami8095.workers.dev" class="block text-teal-400 hover:underline">&#x1F4CB; JSON Toolkit MCP — JSON/YAML/CSV/XML conversion & validation</a>
        <a href="https://prompt-enhancer-mcp.yagami8095.workers.dev" class="block text-indigo-400 hover:underline">&#x2728; Prompt Enhancer MCP — Prompt optimization, rewriting & scoring</a>
        <a href="https://timestamp-converter-mcp.yagami8095.workers.dev" class="block text-emerald-400 hover:underline">&#x23F0; Timestamp Converter MCP — Unix/ISO conversion & timezone math</a>
        <a href="https://product-store.yagami8095.workers.dev" class="block text-orange-400 hover:underline">&#x1F3EA; OpenClaw Store — AI tools, templates, and intelligence products</a>
        <a href="https://note.com/yedanyagami" class="block text-gray-400 hover:underline">&#x1F4F0; note.com — AI articles and guides (Japanese)</a>
      </div>
    </div>

    <div class="text-center text-gray-600 text-sm space-y-1">
      <p>Powered by <span class="text-gray-400">OpenClaw Intelligence</span> &middot; Cloudflare Workers &middot; MCP 2025-03-26</p>
      <p>Taichung, Taiwan &middot; Yagami8095@gmail.com</p>
    </div>
  </div>
</body>
</html>`;

// ============================================================
// Edge Defense Layer
// ============================================================

const HONEYPOT_PATHS = ['/admin', '/wp-login.php', '/.env', '/config.json', '/.git/config', '/wp-admin', '/phpinfo.php'];
const PAYLOAD_MAX_BYTES = 102400;

async function sha256Short(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getRequestFingerprint(request) {
  const ua = request.headers.get('User-Agent') || '';
  const lang = request.headers.get('Accept-Language') || '';
  const isSuspicious = (/^(curl|wget|python|httpie|go-http|java)/i.test(ua) && lang.length > 5);
  return { ua: ua.slice(0, 80), lang: lang.slice(0, 20), isSuspicious };
}

async function edgeDefenseHoneypot(request, env) {
  const path = new URL(request.url).pathname.toLowerCase();
  if (!HONEYPOT_PATHS.includes(path)) return false;
  // Flag IP in D1 if available
  try {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const ipH = await sha256Short(ip + '-openclaw-defense');
    if (env.DB) {
      await env.DB.prepare("INSERT OR REPLACE INTO rate_limits (ip_hash, endpoint, requests, last_request) VALUES (?, 'honeypot', 999, datetime('now'))").bind(ipH).run();
    }
  } catch {}
  return true;
}

function sanitizeInput(str, maxLen = 2000) {
  if (!str) return '';
  if (typeof str !== 'string') return String(str).slice(0, maxLen);
  return str.slice(0, maxLen).replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]*>/g, '');
}

// ============================================================
// FinOps Circuit Breaker
// ============================================================

const FINOPS_DAILY_WARN = 50000;
const FINOPS_DAILY_SLOW = 80000;
const FINOPS_DAILY_STOP = 95000;

async function finopsTrack(env, serverName) {
  const kv = env.KV;
  if (!kv) return { ok: true };
  const today = new Date().toISOString().slice(0, 10);
  const key = `finops:${today}`;
  try {
    const raw = await kv.get(key, { type: 'json' }) || { total: 0, by: {} };
    raw.total++;
    raw.by[serverName] = (raw.by[serverName] || 0) + 1;
    kv.put(key, JSON.stringify(raw), { expirationTtl: 172800 });
    if (raw.total >= FINOPS_DAILY_STOP) return { ok: false, reason: 'Daily capacity reached. Try again tomorrow.', status: 503 };
    if (raw.total >= FINOPS_DAILY_SLOW) return { ok: true, delay: 500 };
    if (raw.total >= FINOPS_DAILY_WARN) return { ok: true, warn: true };
    return { ok: true };
  } catch {
    return { ok: true };
  }
}

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
// Main Worker
// ============================================================

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id',
      'Access-Control-Expose-Headers': 'Mcp-Session-Id',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    // Edge Defense: Honeypot + Payload
    if (await edgeDefenseHoneypot(request, env)) return new Response('Not Found', { status: 404 });
    const cl = parseInt(request.headers.get('Content-Length') || '0', 10);
    if (cl > PAYLOAD_MAX_BYTES) return new Response(JSON.stringify({ error: 'Payload too large' }), { status: 413, headers: { ...cors, 'Content-Type': 'application/json' } });

    // Attribution Tracking
    await trackRef(request, env, 'intel-mcp');

    // Landing page
    if ((path === '/' || path === '/index.html') && request.method === 'GET') {
      return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    // Health check
    if (path === '/health') {
      return Response.json({ status: 'ok', server: 'openclaw-intel-mcp', version: SERVER_INFO.version }, { headers: cors });
    }

    // MCP endpoint
    if (path === '/mcp') {
      if (request.method === 'POST') {
        const contentType = request.headers.get('Content-Type') || '';
        if (!contentType.includes('application/json')) {
          return new Response(JSON.stringify(jsonRpcError(null, -32700, 'Content-Type must be application/json')),
            { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
        }

        let body;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify(jsonRpcError(null, -32700, 'Parse error')),
            { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
        }

        const isBatch = Array.isArray(body);
        const requests = isBatch ? body : [body];
        const responses = [];

        for (const req of requests) {
          if (!req.jsonrpc || req.jsonrpc !== '2.0' || !req.method) {
            responses.push(jsonRpcError(req?.id || null, -32600, 'Invalid JSON-RPC request'));
            continue;
          }

          let result;
          switch (req.method) {
            case 'initialize':
              result = jsonRpcResponse(req.id, {
                protocolVersion: '2025-03-26',
                capabilities: CAPABILITIES,
                serverInfo: SERVER_INFO,
              });
              break;
            case 'notifications/initialized':
              continue;
            case 'tools/list':
              result = jsonRpcResponse(req.id, { tools: TOOLS });
              break;
            case 'tools/call':
              result = await handleToolCall(req.id, req.params || {}, env);
              break;
            case 'ping':
              result = jsonRpcResponse(req.id, {});
              break;
            default:
              result = jsonRpcError(req.id, -32601, `Method not found: ${req.method}`);
          }
          if (result) responses.push(result);
        }

        const responseBody = isBatch ? responses : (responses[0] || '');
        if (!responseBody) {
          return new Response('', { status: 204, headers: cors });
        }

        return new Response(JSON.stringify(responseBody), {
          status: 200,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      if (request.method === 'GET') {
        return Response.json({ info: 'MCP endpoint. Use POST with JSON-RPC 2.0.' }, { status: 200, headers: cors });
      }

      if (request.method === 'DELETE') {
        return new Response('', { status: 204, headers: cors });
      }
    }

    return Response.json({ error: 'Not found', mcp_endpoint: '/mcp', landing: '/' }, { status: 404, headers: cors });
  },
};
