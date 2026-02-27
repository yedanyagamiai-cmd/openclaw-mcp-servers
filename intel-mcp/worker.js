/**
 * OpenClaw Intel MCP Server v2
 * MCP protocol (Streamable HTTP) for AI agent market intelligence.
 *
 * Tools:
 *   - get_ai_market_report: Latest report (free tier: summary only)
 *   - get_report_by_id: Specific report by ID
 *   - list_reports: List available reports
 *   - get_market_stats: Platform statistics (FREE)
 *   - purchase_api_key: Get Pro API key purchase link (FREE)
 */

const SERVER_INFO = { name: 'openclaw-intel', version: '2.0.0' };
const CAPABILITIES = { tools: {} };

const PROMO = {
  fortune_mcp: 'https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp',
  intel_mcp: 'https://openclaw-intel-mcp.yagami8095.workers.dev/mcp',
  pro_purchase: 'https://product-store.yagami8095.workers.dev/products/intel-api-pro',
  github: 'https://github.com/yagami8095/openclaw-mcp-servers',
};

const TOOLS = [
  {
    name: 'get_ai_market_report',
    description: 'Get the latest AI agent market intelligence report. Covers Claude Code, Cursor, Devin, OpenHands, Windsurf — GitHub stars, releases, news, growth trends. Updated every 6 hours. Free tier returns summary only; Pro API key unlocks full reports.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_report_by_id',
    description: 'Get a specific AI market intelligence report by its ID. Free tier returns summary; Pro unlocks full content.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'number', description: 'Report ID' } },
      required: ['id'],
    },
  },
  {
    name: 'list_reports',
    description: 'List available AI market intelligence reports with titles, dates, and tier requirements.',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'number', description: 'Max reports (1-50, default 10)' } },
      required: [],
    },
  },
  {
    name: 'get_market_stats',
    description: 'Get OpenClaw Intel platform statistics: subscriber count, report count, API key count. Always free.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'purchase_api_key',
    description: 'Get the purchase link for an OpenClaw Intel Pro API key ($9). Pro keys unlock full market reports, higher rate limits (1000 calls/day), and priority access to new intelligence.',
    inputSchema: { type: 'object', properties: {}, required: [] },
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

function promoFooter() {
  return `\n\n---\nPowered by OpenClaw Intel | More tools: ${PROMO.fortune_mcp} | Pro: ${PROMO.pro_purchase} | GitHub: ${PROMO.github}`;
}

// ============================================================
// MCP Protocol Handlers
// ============================================================

async function handleInitialize(id) {
  return jsonRpcResponse(id, {
    protocolVersion: '2025-03-26',
    capabilities: CAPABILITIES,
    serverInfo: SERVER_INFO,
  });
}

async function handleToolsList(id) {
  return jsonRpcResponse(id, { tools: TOOLS });
}

async function handleToolCall(id, params, env) {
  const { name, arguments: args } = params;

  try {
    switch (name) {
      case 'get_ai_market_report': {
        const report = await env.DB.prepare(
          'SELECT id, report_type, report_date, title, summary, tier_required, created_at FROM intel_reports ORDER BY created_at DESC LIMIT 1'
        ).first();
        if (!report) {
          return jsonRpcResponse(id, {
            content: [{ type: 'text', text: JSON.stringify({ message: 'No reports yet. Check back after the next 6-hour intel collection cycle.', purchase_pro: PROMO.pro_purchase }) + promoFooter() }],
          });
        }
        return jsonRpcResponse(id, {
          content: [{ type: 'text', text: JSON.stringify({ report, tip: 'Get Pro API key for full reports: ' + PROMO.pro_purchase }, null, 2) + promoFooter() }],
        });
      }

      case 'get_report_by_id': {
        const reportId = parseInt(args?.id);
        if (!reportId || reportId < 1) {
          return jsonRpcResponse(id, {
            content: [{ type: 'text', text: 'Error: valid report ID required (positive integer)' }],
            isError: true,
          });
        }
        const report = await env.DB.prepare(
          'SELECT id, report_type, report_date, title, summary, tier_required, created_at FROM intel_reports WHERE id = ?'
        ).bind(reportId).first();
        if (!report) {
          return jsonRpcResponse(id, {
            content: [{ type: 'text', text: JSON.stringify({ error: 'Report not found', id: reportId }) }],
            isError: true,
          });
        }
        return jsonRpcResponse(id, {
          content: [{ type: 'text', text: JSON.stringify({ report }, null, 2) + promoFooter() }],
        });
      }

      case 'list_reports': {
        const limit = Math.min(Math.max(1, parseInt(args?.limit) || 10), 50);
        const { results } = await env.DB.prepare(
          'SELECT id, report_type, report_date, title, summary, tier_required, created_at FROM intel_reports ORDER BY created_at DESC LIMIT ?'
        ).bind(limit).all();
        return jsonRpcResponse(id, {
          content: [{ type: 'text', text: JSON.stringify({ count: results.length, reports: results, tip: 'Pro API key unlocks full report content: ' + PROMO.pro_purchase }, null, 2) + promoFooter() }],
        });
      }

      case 'get_market_stats': {
        const subs = await env.DB.prepare("SELECT COUNT(*) as total FROM subscribers WHERE status = 'active'").first();
        const reports = await env.DB.prepare('SELECT COUNT(*) as total FROM intel_reports').first();
        const keys = await env.DB.prepare("SELECT COUNT(*) as total FROM api_keys WHERE status = 'active'").first();
        const data = {
          subscribers: subs?.total || 0,
          reports: reports?.total || 0,
          api_keys: keys?.total || 0,
          ts: Date.now(),
          also_try: { fortune_mcp: PROMO.fortune_mcp, github: PROMO.github },
        };
        return jsonRpcResponse(id, {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) + promoFooter() }],
        });
      }

      case 'purchase_api_key': {
        const info = {
          product: 'OpenClaw Intel Pro API Key',
          price: '$9 USD',
          features: [
            'Full market intelligence reports (not just summaries)',
            '1000 API calls per day (vs 3 free)',
            'Priority access to new intelligence tools',
            'Email support',
          ],
          purchase_url: PROMO.pro_purchase,
          instructions: 'Visit the purchase URL to complete checkout via Stripe. Your API key will be provisioned automatically after payment.',
          also_try: { fortune_mcp: PROMO.fortune_mcp },
        };
        return jsonRpcResponse(id, {
          content: [{ type: 'text', text: JSON.stringify(info, null, 2) + promoFooter() }],
        });
      }

      default:
        return jsonRpcError(id, -32601, `Tool not found: ${name}`);
    }
  } catch (e) {
    return jsonRpcResponse(id, {
      content: [{ type: 'text', text: `Error: ${e.message}` }],
      isError: true,
    });
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
  <title>OpenClaw Intel MCP Server</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
</head>
<body class="bg-gray-950 text-gray-100 min-h-screen">
  <div class="max-w-3xl mx-auto px-6 py-16">
    <h1 class="text-4xl font-bold mb-4 text-blue-400">OpenClaw Intel MCP Server</h1>
    <p class="text-gray-400 mb-8">AI agent market intelligence via MCP. Get real-time data on Claude Code, Cursor, OpenHands, and more. Connect your AI agent in seconds.</p>

    <div class="bg-gray-900 rounded-xl p-6 mb-8 border border-gray-800">
      <h2 class="text-xl font-bold mb-3">Quick Connect</h2>
      <p class="text-gray-400 text-sm mb-3">Add to your Claude Code / Cursor / Windsurf config:</p>
      <pre class="bg-black rounded-lg p-4 text-sm text-green-400 overflow-x-auto">{
  "mcpServers": {
    "openclaw-intel": {
      "url": "https://openclaw-intel-mcp.yagami8095.workers.dev/mcp"
    }
  }
}</pre>
    </div>

    <div class="bg-gray-900 rounded-xl p-6 mb-8 border border-gray-800">
      <h2 class="text-xl font-bold mb-3">Available Tools</h2>
      <ul class="space-y-3 text-sm">
        <li><code class="text-blue-400">get_ai_market_report</code> — Latest AI agent market intelligence report</li>
        <li><code class="text-blue-400">get_report_by_id</code> — Get specific report by ID</li>
        <li><code class="text-blue-400">list_reports</code> — List available reports</li>
        <li><code class="text-blue-400">get_market_stats</code> — Platform statistics (free)</li>
        <li><code class="text-blue-400">purchase_api_key</code> — Get Pro API key ($9/mo)</li>
      </ul>
    </div>

    <div class="bg-gray-900 rounded-xl p-6 mb-8 border border-gray-800">
      <h2 class="text-xl font-bold mb-3">Also Try</h2>
      <ul class="space-y-2 text-sm">
        <li><a href="https://openclaw-fortune-mcp.yagami8095.workers.dev" class="text-purple-400 hover:underline">OpenClaw Fortune MCP</a> — Daily zodiac horoscope + tarot readings</li>
        <li><a href="https://product-store.yagami8095.workers.dev" class="text-orange-400 hover:underline">OpenClaw Store</a> — AI tools and templates</li>
      </ul>
    </div>

    <div class="text-center text-gray-600 text-sm">
      <p>Powered by <a href="https://github.com/yagami8095/openclaw-mcp-servers" class="text-blue-400 hover:underline">OpenClaw Intelligence</a></p>
    </div>
  </div>
</body>
</html>`;

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

    if ((path === '/' || path === '/index.html') && request.method === 'GET') {
      return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    if (path === '/health') {
      return Response.json({ status: 'ok', server: 'openclaw-intel-mcp', version: '2.0.0' }, { headers: cors });
    }

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
              result = await handleInitialize(req.id);
              break;
            case 'notifications/initialized':
              continue;
            case 'tools/list':
              result = await handleToolsList(req.id);
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
        return new Response(JSON.stringify({ info: 'SSE endpoint. Use POST for JSON-RPC requests.' }),
          { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
      }

      if (request.method === 'DELETE') {
        return new Response('', { status: 204, headers: cors });
      }
    }

    return Response.json({ error: 'Not found', hint: 'MCP endpoint is at /mcp' }, { status: 404, headers: cors });
  },
};
