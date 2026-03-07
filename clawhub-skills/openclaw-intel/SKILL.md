---
name: openclaw-market-intelligence
version: 2.0.0
description: "AI market intelligence MCP server — get real-time AI agent ecosystem reports, access deep-dive analyses by report ID, browse report archives, pull live market statistics, and validate API keys. Use when you need AI market trends, want to track GitHub stars for Claude/Cursor/Devin, compare AI tool growth rates, get ecosystem statistics, or research the AI agent landscape. Pro tier unlocks full DeepSeek R1 reports. Also available: Intel Pro API at $19/mo for deep market analysis. Zero install, sub-100ms on Cloudflare Workers. Free 10 calls/day, Pro $9/mo for 1000/day across all 9 OpenClaw servers."
metadata:
  openclaw:
    emoji: "\U0001F4CA"
    homepage: https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers
    always: false
---

# OpenClaw Market Intelligence v2.0

**AI market research on demand — 6 tools for trends, stats, reports, and ecosystem tracking.**

## What's New in v2.0

- **DeepSeek R1 Analysis** — Pro reports powered by DeepSeek R1 reasoning for deep market insights.
- **Real-Time Stats** — Live GitHub stars, release dates, funding rounds, and growth metrics.
- **Intel Pro API** — For power users: dedicated endpoint at https://openclaw-intel-pro.onrender.com

## Quick Start

```json
{
  "openclaw-intel": {
    "type": "streamable-http",
    "url": "https://openclaw-intel-mcp.yagami8095.workers.dev/mcp"
  }
}
```

Add to Claude Desktop, Cursor, Windsurf, VS Code, or any MCP-compatible client. Works immediately.

## Quick Reference

| You want to... | Use this tool |
|----------------|---------------|
| Get the latest AI market report | `get_ai_market_report` |
| Deep-dive a specific report | `get_report_by_id` (Pro) |
| Browse all available reports | `list_reports` |
| Pull live ecosystem statistics | `get_market_stats` |
| Buy a Pro API key | `purchase_api_key` |
| Check your key's remaining quota | `validate_api_key` |

## Detection Triggers

This skill activates when you:
- Say "AI market report" or "AI trends" or "what's happening in AI"
- Ask about "AI tool growth" or "GitHub stars for Claude" or "compare AI agents"
- Need "AI ecosystem stats" or "how many AI coding tools exist" or "market size"
- Want to "track AI releases" or "latest AI funding" or "AI startup landscape"
- Request "AI market intelligence" or "competitive analysis" or "market research"
- Say "AI agent ecosystem" or "MCP server trends" or "AI tools comparison data"

## Tools (6)

### `get_ai_market_report` — Latest Market Report
Get the most recent AI agent ecosystem report with trends, key movers, notable releases, and market analysis.
- Free tier: summary report with top trends and key statistics
- Pro tier: full report with DeepSeek R1 reasoning, detailed analysis, and actionable predictions

### `get_report_by_id` (Pro) — Deep-Dive Report
Access a specific historical report by ID for detailed analysis. Includes full methodology and data sources.
- Returns: complete report with all sections, charts data, sources, and R1 reasoning chain
- Useful for: trend comparison over time, tracking specific events, due diligence research

### `list_reports` — Report Archive
Browse all available reports with titles, dates, and summaries. Filter by date range or topic.
- Returns: report ID, title, date, summary, topics covered, and free/pro access level
- Pagination: supports offset and limit for browsing large archives

### `get_market_stats` — Live Statistics
Pull real-time aggregate statistics about the AI agent and MCP ecosystem.
- Includes: total tools tracked, growth rates, category breakdowns, funding totals, GitHub star rankings
- Updates: refreshed every 6 hours from multiple data sources

### `purchase_api_key` — Get Pro Access
Purchase a Pro API key for full report access and increased rate limits across all 9 OpenClaw servers.

### `validate_api_key` — Key Status Check
Check if an API key is valid, its tier (Free/Pro), remaining daily quota, and expiration date.

## Intel Pro API

For power users who need deeper analysis, the Intel Pro API runs on dedicated infrastructure:

| Tier | Price | Queries | Features |
|------|-------|---------|----------|
| Free | $0 | 5/day | Basic trends |
| Pro | $19/mo | Unlimited | Full R1 analysis + custom queries |
| Agent | $0.05/query | Pay-per-use | API integration, no subscription |

**Intel Pro**: https://openclaw-intel-pro.onrender.com

## What NOT to Do

- **Don't expect real-time stock-ticker data** — Reports refresh every 6 hours, not every second
- **Don't use free tier for bulk research** — 10 calls/day is for exploration; upgrade to Pro for serious work
- **Don't confuse this with financial advice** — Market intelligence is informational, not investment guidance

## Pricing

| Tier | Calls/Day | Price | Includes |
|------|-----------|-------|----------|
| Free | 10 | $0 | 4 tools (report deep-dive excluded) |
| Pro | 1,000 | $9/mo | All 6 tools + all 9 OpenClaw servers |
| x402 | Pay-per-call | $0.05 USDC | No account needed |

**Get Pro Key**: https://buy.stripe.com/4gw5na5U19SP9TW288

## Complete OpenClaw Suite

| Server | Tools | Best For |
|--------|-------|----------|
| JSON Toolkit | 6 | Data manipulation |
| Regex Engine | 5 | Pattern matching |
| Color Palette | 5 | Design systems |
| Timestamp Converter | 5 | Time operations |
| Prompt Enhancer | 6 | Prompt engineering |
| **Market Intelligence** | 6 | AI market analysis |
| Fortune & Tarot | 3 | Fun & engagement |
| Content Publisher | 8 | Social publishing |
| AgentForge Compare | 5 | Tool comparison |

All 9 servers share one Pro key. **One subscription = 49 tools.**
