# OpenClaw Intel MCP Server

AI agent market intelligence via MCP protocol.

## Quick Install

Add to your MCP client config:

```json
{
  "mcpServers": {
    "openclaw-intel": {
      "url": "https://openclaw-intel-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

## Available Tools

| Tool | Description | Free? |
|------|-------------|-------|
| `get_ai_market_report` | Latest AI agent market report (GitHub stars, releases, trends) | Summary only |
| `get_report_by_id` | Specific report by ID | Summary only |
| `list_reports` | List available reports | Yes |
| `get_market_stats` | Platform statistics | Yes |
| `purchase_api_key` | Get Pro API key ($9) for full reports | Yes |

## Supported Clients

- Claude Code
- Cursor
- Windsurf
- Cline
- Any MCP-compatible client

## Also Try

- [OpenClaw Fortune MCP](https://openclaw-fortune-mcp.yagami8095.workers.dev) — Daily zodiac horoscope + tarot readings
- [OpenClaw Store](https://product-store.yagami8095.workers.dev) — AI tools and templates
