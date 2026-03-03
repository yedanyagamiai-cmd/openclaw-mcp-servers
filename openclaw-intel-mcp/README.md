# OpenClaw Intel MCP Server

A Model Context Protocol (MCP) server providing 6 AI market intelligence tools for agents. Get market reports, competitive analysis, GitHub trends, and growth projections for AI coding tools.

**Vendor:** OpenClaw Intelligence
**Protocol:** MCP 2025-03-26 (Streamable HTTP)
**Free tier:** 10 calls/day per IP -- no signup required

---

## Quick Start

### Option 0: One-Click Cursor Install

[![Install in Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=openclaw-intel&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vb3BlbmNsYXctaW50ZWwtbWNwLnlhZ2FtaTgwOTUud29ya2Vycy5kZXYvbWNwIn0=)

### Option 1: Install via Smithery

```bash
npx -y @smithery/cli install @yedanyagamiai-cmd/openclaw-intel-mcp --client claude
```

### Option 2: Manual Configuration

```json
{
  "mcpServers": {
    "openclaw-intel": {
      "url": "https://openclaw-intel-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

---

## Tools Reference

| Tool | Tier | Description | Required Params |
|------|------|-------------|-----------------|
| `get_ai_market_report` | FREE/PRO | Latest AI agent market report | _(optional: api_key)_ |
| `get_report_by_id` | FREE/PRO | Specific report by ID | `id` |
| `list_reports` | FREE | List available reports | _(optional: limit)_ |
| `get_market_stats` | FREE | Real-time ecosystem stats | _(none)_ |
| `purchase_api_key` | FREE | Get Pro key purchase instructions | _(none)_ |
| `validate_api_key` | FREE | Check API key validity and quota | `api_key` |

---

## Usage Examples

### 1. Get AI market report

```bash
curl -X POST https://openclaw-intel-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_ai_market_report","arguments":{}}}'
```

**Response (free tier):**
```json
{
  "report_type": "summary",
  "metrics_count": 3,
  "highlights": [
    "Claude Code: 25K+ GitHub stars, fastest growing",
    "Cursor: 100M+ ARR, dominant IDE market share",
    "Devin: Enterprise adoption accelerating"
  ],
  "full_report_available": true,
  "upgrade": "Pro key ($9) unlocks 15+ metrics, historical data, projections"
}
```

### 2. List available reports

```bash
curl -X POST https://openclaw-intel-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_reports","arguments":{"limit":5}}}'
```

### 3. Get ecosystem stats

```bash
curl -X POST https://openclaw-intel-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_market_stats","arguments":{}}}'
```

---

## Pricing

| Tier | Cost | Daily Limit | Data |
|------|------|-------------|------|
| Free | $0 | 10 calls/day | Summary (3 metrics) |
| Pro | $9 one-time | 1,000 calls/day | Full (15+ metrics, history, projections) |

## Error Handling

| Error Code | Meaning |
|------------|---------|
| -32600 | Invalid JSON-RPC request |
| -32601 | Tool not found |
| -32029 | Rate limit exceeded |

## License

MIT -- Built by [OpenClaw Intelligence](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers)
