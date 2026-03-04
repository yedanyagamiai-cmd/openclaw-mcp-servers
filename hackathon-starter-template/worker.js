/**
 * MCP Server Starter Template — Cloudflare Workers Edition
 *
 * A production-ready template for building MCP (Model Context Protocol) servers
 * on Cloudflare Workers. Includes built-in rate limiting, SSE transport,
 * and extensible tool definitions.
 *
 * Created for MCP_HACK//26 — Starter Track
 * Author: OpenClaw Intelligence (https://github.com/yedanyagamiai-cmd)
 *
 * Features:
 *   - Full MCP 2025-03-26 protocol compliance
 *   - SSE (Server-Sent Events) transport
 *   - KV-backed rate limiting (configurable per-IP daily limits)
 *   - Clean tool registration pattern
 *   - CORS support for browser-based MCP clients
 *   - Health check endpoint
 *   - Zero dependencies — runs on Cloudflare Workers free tier
 *
 * Usage:
 *   1. Clone this template
 *   2. Add your tools in the TOOLS object
 *   3. `npx wrangler deploy`
 *   4. Connect via any MCP client (Claude Desktop, Cursor, etc.)
 */

// ============================================================
// SERVER CONFIG — Customize these for your server
// ============================================================

const SERVER_INFO = {
  name: 'my-mcp-server',      // Change this
  version: '1.0.0',
};

const VENDOR = 'Your Name Here';  // Change this
const MCP_PROTOCOL_VERSION = '2025-03-26';
const CAPABILITIES = { tools: {} };

// Rate limiting config
const RATE_LIMIT = {
  max: 50,            // Max requests per IP per day
  window: 86400,      // Window in seconds (24h)
  keyPrefix: 'rl:',   // KV key prefix (unique per server!)
};

// ============================================================
// TOOLS — Add your MCP tools here
// ============================================================

const TOOLS = {
  hello_world: {
    description: 'Says hello — your first MCP tool! Replace this with something useful.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name to greet',
        },
      },
      required: ['name'],
    },
    handler: async (args) => {
      return `Hello, ${args.name}! This MCP server is running on Cloudflare Workers.`;
    },
  },

  get_timestamp: {
    description: 'Returns the current UTC timestamp in multiple formats.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      const now = new Date();
      return JSON.stringify({
        iso: now.toISOString(),
        unix: Math.floor(now.getTime() / 1000),
        human: now.toUTCString(),
      }, null, 2);
    },
  },

  echo_json: {
    description: 'Validates and pretty-prints JSON input. Useful for debugging.',
    inputSchema: {
      type: 'object',
      properties: {
        json_string: {
          type: 'string',
          description: 'JSON string to validate and format',
        },
      },
      required: ['json_string'],
    },
    handler: async (args) => {
      try {
        const parsed = JSON.parse(args.json_string);
        return JSON.stringify(parsed, null, 2);
      } catch (e) {
        return `Invalid JSON: ${e.message}`;
      }
    },
  },
};

// ============================================================
// RATE LIMITING (KV-backed, per IP)
// ============================================================

async function checkRateLimit(kv, ip) {
  if (!kv) return { allowed: true, remaining: RATE_LIMIT.max, total: RATE_LIMIT.max };

  const today = new Date().toISOString().slice(0, 10);
  const key = `${RATE_LIMIT.keyPrefix}${ip}:${today}`;

  let count = 0;
  try {
    const val = await kv.get(key);
    count = val ? parseInt(val, 10) : 0;
  } catch {
    return { allowed: true, remaining: RATE_LIMIT.max, total: RATE_LIMIT.max };
  }

  if (count >= RATE_LIMIT.max) {
    return { allowed: false, remaining: 0, total: RATE_LIMIT.max };
  }

  try {
    await kv.put(key, String(count + 1), { expirationTtl: RATE_LIMIT.window });
  } catch { /* non-fatal */ }

  return { allowed: true, remaining: RATE_LIMIT.max - count - 1, total: RATE_LIMIT.max };
}

// ============================================================
// MCP PROTOCOL HANDLERS
// ============================================================

function handleInitialize() {
  return {
    protocolVersion: MCP_PROTOCOL_VERSION,
    serverInfo: SERVER_INFO,
    capabilities: CAPABILITIES,
  };
}

function handleToolsList() {
  return {
    tools: Object.entries(TOOLS).map(([name, tool]) => ({
      name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  };
}

async function handleToolCall(params, kv, ip) {
  const { name, arguments: args } = params;
  const tool = TOOLS[name];
  if (!tool) {
    return { isError: true, content: [{ type: 'text', text: `Unknown tool: ${name}` }] };
  }

  // Rate limit check
  const rl = await checkRateLimit(kv, ip);
  if (!rl.allowed) {
    return {
      isError: true,
      content: [{
        type: 'text',
        text: `Rate limit exceeded (${rl.total}/day). Try again tomorrow.`,
      }],
    };
  }

  try {
    const result = await tool.handler(args || {});
    return {
      content: [{
        type: 'text',
        text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
      }],
      _meta: { rateLimit: { remaining: rl.remaining, total: rl.total } },
    };
  } catch (e) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Tool error: ${e.message}` }],
    };
  }
}

// ============================================================
// SSE TRANSPORT
// ============================================================

function sseResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

function sseEvent(id, data) {
  return `id: ${id}\ndata: ${JSON.stringify(data)}\n\n`;
}

// ============================================================
// MAIN REQUEST HANDLER
// ============================================================

async function handleMCPRequest(request, env) {
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
  const kv = env.KV || null;

  // Handle SSE GET (connection init)
  if (request.method === 'GET') {
    const url = new URL(request.url);
    if (url.pathname === '/mcp' || url.pathname === '/sse') {
      const sessionId = crypto.randomUUID();
      const initResult = handleInitialize();

      const stream = new ReadableStream({
        start(controller) {
          const enc = new TextEncoder();
          controller.enqueue(enc.encode(`event: endpoint\ndata: /mcp?session=${sessionId}\n\n`));
          controller.enqueue(enc.encode(sseEvent(sessionId, {
            jsonrpc: '2.0',
            method: 'initialized',
            params: initResult,
          })));
          // Keep-alive then close (stateless)
          controller.close();
        },
      });
      return sseResponse(stream);
    }
  }

  // Handle POST (MCP JSON-RPC)
  if (request.method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' } }, 400);
    }

    const { method, params, id } = body;
    let result;

    switch (method) {
      case 'initialize':
        result = handleInitialize();
        break;
      case 'tools/list':
        result = handleToolsList();
        break;
      case 'tools/call':
        result = await handleToolCall(params, kv, ip);
        break;
      case 'ping':
        result = {};
        break;
      default:
        return jsonResponse({
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: ${method}` },
        });
    }

    return jsonResponse({ jsonrpc: '2.0', id, result });
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}

// ============================================================
// WORKER ENTRY POINT
// ============================================================

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Health check
    if (url.pathname === '/' || url.pathname === '/health') {
      return jsonResponse({
        status: 'ok',
        server: SERVER_INFO,
        vendor: VENDOR,
        protocol: MCP_PROTOCOL_VERSION,
        tools: Object.keys(TOOLS).length,
        endpoints: {
          mcp: '/mcp',
          health: '/health',
        },
      });
    }

    // MCP endpoint
    if (url.pathname === '/mcp' || url.pathname === '/sse') {
      return handleMCPRequest(request, env);
    }

    return jsonResponse({ error: 'Not found', endpoints: { mcp: '/mcp', health: '/' } }, 404);
  },
};
