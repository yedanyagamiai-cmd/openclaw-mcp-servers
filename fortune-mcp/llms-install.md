# OpenClaw Fortune MCP Server

Daily zodiac horoscope and tarot card readings via MCP protocol.

## Quick Install

Add to your MCP client config:

```json
{
  "mcpServers": {
    "openclaw-fortune": {
      "url": "https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

## Available Tools

| Tool | Description |
|------|-------------|
| `get_daily_fortune` | Daily horoscope + tarot for a zodiac sign |
| `get_fortune_ranking` | Today's zodiac ranking (1st-12th) |
| `get_all_fortunes` | Complete data for all 12 signs |

## Supported Clients

- Claude Code
- Cursor
- Windsurf
- Cline
- Any MCP-compatible client

## Also Try

- [OpenClaw Intel MCP](https://openclaw-intel-mcp.yagami8095.workers.dev) — AI agent market intelligence
- [OpenClaw Store](https://product-store.yagami8095.workers.dev) — AI tools and templates
