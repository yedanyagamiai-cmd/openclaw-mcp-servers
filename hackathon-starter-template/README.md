# MCP Server Starter Template — Cloudflare Workers

> Build and deploy a production-ready MCP server in 5 minutes, for free.

Created for [MCP_HACK//26](https://aihackathon.dev/) — Starter Track

## What You Get

- Full MCP 2025-03-26 protocol compliance
- SSE transport (works with Claude Desktop, Cursor, Windsurf, etc.)
- KV-backed rate limiting (configurable per-IP daily limits)
- Clean, extensible tool registration pattern
- CORS support for browser-based clients
- Health check endpoint
- **Zero dependencies** — runs on Cloudflare Workers free tier

## Quick Start

```bash
# 1. Clone
git clone https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers
cd openclaw-mcp-servers/hackathon-starter-template

# 2. Customize SERVER_INFO and VENDOR in worker.js

# 3. Add your tools in the TOOLS object

# 4. Deploy (free Cloudflare account required)
npx wrangler deploy

# 5. Connect from Claude Desktop config:
# {
#   "mcpServers": {
#     "my-server": {
#       "url": "https://my-mcp-server.YOUR-SUBDOMAIN.workers.dev/mcp"
#     }
#   }
# }
```

## Adding Tools

Tools are defined in the `TOOLS` object. Each tool needs:
- `description` — What the tool does (shown to AI agents)
- `inputSchema` — JSON Schema for the tool's parameters
- `handler` — Async function that processes the request

```javascript
const TOOLS = {
  my_tool: {
    description: 'Describe what this tool does for AI agents.',
    inputSchema: {
      type: 'object',
      properties: {
        input: { type: 'string', description: 'The input to process' },
      },
      required: ['input'],
    },
    handler: async (args) => {
      // Your logic here
      return `Processed: ${args.input}`;
    },
  },
};
```

## Enabling Rate Limiting

1. Create a KV namespace:
   ```bash
   npx wrangler kv namespace create MY_KV
   ```

2. Add the binding to `wrangler.toml`:
   ```toml
   [[kv_namespaces]]
   binding = "KV"
   id = "your-namespace-id-from-step-1"
   ```

3. Configure limits in `worker.js`:
   ```javascript
   const RATE_LIMIT = {
     max: 50,            // requests per IP per day
     window: 86400,      // 24 hours
     keyPrefix: 'rl:',   // unique prefix for your server
   };
   ```

## Architecture

```
Client (Claude/Cursor/etc.)
    │
    ▼
  GET /mcp  ──→  SSE endpoint (session init)
  POST /mcp ──→  JSON-RPC handler
    │
    ├── initialize    → server info + capabilities
    ├── tools/list    → available tools
    └── tools/call    → execute tool (rate limited)
         │
         ▼
       KV Store (rate limit tracking)
```

## Production Examples

This template powers 9 production MCP servers at OpenClaw:

| Server | Tools | Users |
|--------|-------|-------|
| [JSON Toolkit](https://json-toolkit-mcp.yagami8095.workers.dev/) | 6 JSON utilities | 500+ |
| [Regex Engine](https://regex-engine-mcp.yagami8095.workers.dev/) | 5 regex tools | 300+ |
| [Color Palette](https://color-palette-mcp.yagami8095.workers.dev/) | 6 color tools | 200+ |
| [Timestamp Converter](https://timestamp-converter-mcp.yagami8095.workers.dev/) | 5 time tools | 400+ |
| [Prompt Enhancer](https://prompt-enhancer-mcp.yagami8095.workers.dev/) | 4 AI prompt tools | 150+ |
| [Fortune Oracle](https://openclaw-fortune-mcp.yagami8095.workers.dev/) | 3 fortune tools | 100+ |
| [AgentForge Compare](https://agentforge-compare-mcp.yagami8095.workers.dev/) | 3 LLM comparison | 80+ |
| [MoltBook Publisher](https://moltbook-publisher-mcp.yagami8095.workers.dev/) | 4 social tools | 50+ |
| [Intel API](https://openclaw-intel-mcp.yagami8095.workers.dev/) | 5 intelligence tools | 200+ |

All built from this same pattern. All running on Cloudflare Workers free tier.

## Monetization Options

Once your MCP server has users, you can monetize:

1. **Rate limit tiers** — Free (10/day) → Pro (1000/day) via API keys
2. **x402 micropayments** — $0.05/call with USDC, no signup needed
3. **Smithery listing** — Get discovered by 7,300+ MCP servers marketplace
4. **MCPize deployment** — Container-based hosting with 85% revenue share

## License

MIT — Use this template for anything.

## Links

- [MCP_HACK//26 Hackathon](https://aihackathon.dev/)
- [MCP Protocol Spec](https://spec.modelcontextprotocol.io/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [OpenClaw MCP Servers](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers)
