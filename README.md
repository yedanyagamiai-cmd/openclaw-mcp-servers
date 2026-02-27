# OpenClaw MCP Servers

AI-powered MCP tools for any agent or app. Connect in seconds via HTTPS — no npm, no Docker, no setup.

## Servers

### OpenClaw Intel — AI Market Intelligence
Real-time data on Claude Code, Cursor, Devin, OpenHands, Windsurf. GitHub stars, releases, growth trends.

**Endpoint:** `https://openclaw-intel-mcp.yagami8095.workers.dev/mcp`

| Tool | Description | Free |
|------|-------------|------|
| `get_ai_market_report` | Latest AI agent market report | Summary |
| `get_report_by_id` | Specific report by ID | Summary |
| `list_reports` | List available reports | Yes |
| `get_market_stats` | Platform statistics | Yes |
| `purchase_api_key` | Get Pro API key ($9) | Yes |

### OpenClaw Fortune — Daily Horoscope + Tarot
12 zodiac signs, tarot card readings, category scores, lucky items.

**Endpoint:** `https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp`

| Tool | Description |
|------|-------------|
| `get_daily_fortune` | Daily horoscope + tarot for a zodiac sign |
| `get_fortune_ranking` | Today's zodiac ranking (1st-12th) |
| `get_all_fortunes` | Complete data for all 12 signs |

## Quick Connect

### Claude Code
```json
// Add to .mcp.json or Claude Code settings
{
  "mcpServers": {
    "openclaw-intel": {
      "url": "https://openclaw-intel-mcp.yagami8095.workers.dev/mcp"
    },
    "openclaw-fortune": {
      "url": "https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

### Cursor
```json
// Add to .cursor/mcp.json
{
  "mcpServers": {
    "openclaw-intel": {
      "url": "https://openclaw-intel-mcp.yagami8095.workers.dev/mcp"
    },
    "openclaw-fortune": {
      "url": "https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

### Windsurf
```json
// Add to .windsurf/mcp.json
{
  "mcpServers": {
    "openclaw-intel": {
      "url": "https://openclaw-intel-mcp.yagami8095.workers.dev/mcp"
    },
    "openclaw-fortune": {
      "url": "https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

### Cline
```json
// Add to VS Code MCP settings
{
  "mcpServers": {
    "openclaw-intel": {
      "url": "https://openclaw-intel-mcp.yagami8095.workers.dev/mcp"
    },
    "openclaw-fortune": {
      "url": "https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

## Pro API Key

Unlock full AI market intelligence reports with a Pro API key ($9).

- Full reports (not just summaries)
- 1000 API calls/day
- Priority access to new tools
- Email support

**Purchase:** https://product-store.yagami8095.workers.dev/products/intel-api-pro

## Architecture

Both servers run on Cloudflare Workers with Streamable HTTP transport (MCP 2025-03-26 spec).

- **Intel MCP** — D1 database for reports, Stripe for payments
- **Fortune MCP** — Pure computation, no external dependencies

## License

MIT

---

Built by [OpenClaw Intelligence](https://product-store.yagami8095.workers.dev)
