# AgentForge Compare MCP Server

A Model Context Protocol (MCP) server providing 5 AI tool comparison tools for agents. Compare Claude Code, Cursor, Windsurf, Devin, and more side-by-side with pricing, features, and recommendations.

**Vendor:** OpenClaw Intelligence
**Protocol:** MCP 2025-03-26 (Streamable HTTP)
**Free tier:** 10 calls/day per IP -- no signup required

---

## Quick Start

### Option 0: One-Click Cursor Install

[![Install in Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=agentforge-compare&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vYWdlbnRmb3JnZS1jb21wYXJlLW1jcC55YWdhbWk4MDk1LndvcmtlcnMuZGV2L21jcCJ9)

### Option 1: Install via Smithery

```bash
npx -y @smithery/cli install @yedanyagamiai-cmd/agentforge-compare-mcp --client claude
```

### Option 2: Manual Configuration

```json
{
  "mcpServers": {
    "agentforge-compare": {
      "url": "https://agentforge-compare-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

---

## Tools Reference

| Tool | Tier | Description | Required Params |
|------|------|-------------|-----------------|
| `compare_ai_tools` | FREE/PRO | Compare 2+ AI coding tools side-by-side | `tools` |
| `get_tool_profile` | FREE | Detailed profile for a single AI tool | `tool_id` |
| `recommend_tool` | PRO | AI-powered recommendation for your use case | `use_case` |
| `get_pricing_comparison` | FREE | Complete pricing table for all tools | _(none)_ |
| `purchase_pro_key` | FREE | Get Pro key purchase instructions | _(none)_ |

---

## Available Tools to Compare

`claude-code`, `cursor`, `windsurf`, `devin`, `openhands`, `github-copilot`, `aider`, `cline`

---

## Usage Examples

### 1. Compare AI coding tools

```bash
curl -X POST https://agentforge-compare-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"compare_ai_tools","arguments":{"tools":["claude-code","cursor","windsurf"],"aspects":["pricing","features"]}}}'
```

### 2. Get tool profile

```bash
curl -X POST https://agentforge-compare-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_tool_profile","arguments":{"tool_id":"claude-code"}}}'
```

### 3. Get pricing comparison

```bash
curl -X POST https://agentforge-compare-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_pricing_comparison","arguments":{"sort_by":"price_asc"}}}'
```

---

## Pricing

| Tier | Cost | Daily Limit | Features |
|------|------|-------------|----------|
| Free | $0 | 10 calls/day per IP | Summary comparisons, profiles, pricing |
| Pro | $9 one-time | 1,000 calls/day | Full analysis, AI recommendations |

## Error Handling

| Error Code | Meaning |
|------------|---------|
| -32600 | Invalid JSON-RPC request |
| -32601 | Tool not found |
| -32029 | Rate limit exceeded |

## License

MIT -- Built by [OpenClaw Intelligence](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers)
