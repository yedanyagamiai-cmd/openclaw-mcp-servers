---
name: openclaw-market-intelligence
version: 2.0.0
description: "AI market intelligence MCP server with 6 tools for real-time ecosystem tracking. Use when: (1) 'AI market report' or 'what's happening in AI', (2) 'GitHub stars for Claude' or 'compare AI agents', (3) 'AI ecosystem stats' or 'market size', (4) 'latest AI funding' or 'AI startup landscape', (5) 'competitive analysis' or 'MCP server trends'. DeepSeek R1 analysis, live GitHub metrics, growth tracking. Zero install, sub-100ms on Cloudflare Workers. Free 10/day + Pro $9/mo."
read_when:
  - User asks about "AI trends", "AI market", "what's new in AI", or "AI landscape"
  - User wants GitHub stats — "stars for Claude", "compare repos", "growth rate"
  - User needs competitive analysis — "compare AI tools", "Claude vs Cursor", "market share"
  - User asks about "AI funding", "AI startups", "market size", or "ecosystem stats"
  - User mentions "MCP servers", "AI agent ecosystem", or "tool comparison data"
metadata:
  openclaw:
    emoji: "\U0001F4CA"
    homepage: https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers
    always: false
---

# OpenClaw Market Intelligence v2.0

**AI market research on demand. 6 tools. DeepSeek R1 analysis. Live ecosystem data. Real-time stats.**

| Tool | Purpose | Free |
|------|---------|------|
| `get_ai_market_report` | Latest AI ecosystem report with trends | Yes |
| `get_report_by_id` | Deep-dive into specific historical report | Pro |
| `list_reports` | Browse all available reports archive | Yes |
| `get_market_stats` | Live aggregate ecosystem statistics | Yes |
| `purchase_api_key` | Get Pro access for all 9 servers | Yes |
| `validate_api_key` | Check key tier, quota, and expiration | Yes |

## What's New in v2.0

- **DeepThink Protocol** -- Pro reports powered by DeepSeek R1 chain-of-thought reasoning for institutional-grade market insights.
- **LivePulse Engine** -- Real-time GitHub stars, npm downloads, release dates, funding rounds, and growth velocity metrics refreshed every 6 hours.
- **TrendRadar** -- Automated detection of emerging patterns: rising stars, declining tools, category shifts, and breakout projects.
- **Intel Pro API** -- Dedicated deep-analysis endpoint for power users at https://openclaw-intel-pro.onrender.com

## Quick Start

```json
{
  "openclaw-intel": {
    "type": "streamable-http",
    "url": "https://openclaw-intel-mcp.yagami8095.workers.dev/mcp"
  }
}
```

Add to Claude Desktop, Cursor, Windsurf, VS Code, or any MCP-compatible client. Zero install. Works immediately.

## Detection Triggers

This skill activates when a user says any of these:
- "AI market report", "AI trends", "what's happening in AI", "state of AI agents"
- "AI tool growth", "GitHub stars for Claude", "compare AI agents", "Cursor vs Windsurf"
- "AI ecosystem stats", "how many AI coding tools exist", "market size", "total AI funding"
- "track AI releases", "latest AI funding rounds", "AI startup landscape", "who raised money"
- "AI market intelligence", "competitive analysis", "market research", "industry report"
- "AI agent ecosystem", "MCP server trends", "AI tools comparison data", "developer tools market"

## Named Protocols

### DeepThink Protocol
Pro-tier reports are generated with DeepSeek R1's extended chain-of-thought reasoning. The model "thinks out loud" through market dynamics before drawing conclusions, producing analysis that rivals paid research reports.

What you get:
- **Reasoning chain** -- See the logical steps behind every conclusion
- **Confidence scores** -- Each prediction tagged with confidence level (high/medium/low)
- **Contrarian signals** -- The model actively looks for evidence against its own thesis
- **Source attribution** -- Every data point traced to its origin (GitHub API, npm registry, press release, SEC filing)

### LivePulse Engine
Ecosystem metrics refreshed every 6 hours from multiple authoritative sources:

| Metric | Source | Refresh |
|--------|--------|---------|
| GitHub stars & forks | GitHub API | 6h |
| npm/PyPI downloads | Registry APIs | 6h |
| Release dates & changelogs | GitHub Releases | 6h |
| Funding rounds | Crunchbase + press | 24h |
| Growth velocity (7d/30d/90d) | Calculated | 6h |
| Category rankings | Aggregated | 6h |

### TrendRadar
Automated pattern detection that surfaces:
- **Rising Stars** -- Repos gaining >100 stars/week with accelerating velocity
- **Declining Tools** -- Previously popular projects losing momentum
- **Category Shifts** -- When a new category emerges or an existing one consolidates
- **Breakout Projects** -- Small repos with sudden explosive growth (>500% week-over-week)

### IntelGrade System
Report quality tiers that tell you exactly what you're getting:

| Grade | Tier | Depth | Analysis |
|-------|------|-------|----------|
| **Summary** | Free | Top trends + key stats | Rule-based aggregation |
| **Standard** | Pro | Full sections + data tables | DeepSeek R1 reasoning |
| **Deep Dive** | Pro | Methodology + predictions + sources | Extended R1 chain-of-thought |

## Tools (6)

### `get_ai_market_report` -- Latest Market Report
Get the most recent AI agent ecosystem report with trends, key movers, notable releases, and market analysis.

**Wrong / Right:**

```
WRONG: Asking "what's the AI market like" and getting a generic ChatGPT summary based on training data
RIGHT: get_ai_market_report()
       -> Live data: "Claude gained 12,400 stars this week (+8.3%), Cursor passed 100k stars,
          3 new MCP servers launched in the coding category, Devin announced Series B at $175M"
       -> Every number sourced, every trend timestamped

WRONG: Using free tier for a 20-page competitive analysis for your investor deck
RIGHT: Free tier gives you the pulse. Pro tier (with DeepThink) gives you the depth:
       reasoning chains, confidence scores, contrarian signals, and source attribution.
```

### `get_report_by_id` (Pro) -- Deep-Dive Historical Report
Access a specific historical report by ID for detailed analysis. Includes full methodology, data sources, and R1 reasoning chain.

**Wrong / Right:**

```
WRONG: Comparing two time periods by reading two report summaries side by side
RIGHT: get_report_by_id({ id: "2026-W10" }) + get_report_by_id({ id: "2026-W08" })
       -> Each report has consistent data schema, making week-over-week comparison trivial
       -> Methodology section explains exactly how metrics were calculated

WRONG: Expecting real-time stock-ticker speed updates
RIGHT: Reports are point-in-time snapshots with 6-hour data freshness.
       For real-time monitoring, use get_market_stats() which pulls the latest cached metrics.
```

### `list_reports` -- Report Archive
Browse all available reports with titles, dates, and summaries. Filter by date range or topic.

**Returns:** report ID, title, date, summary, topics covered, and free/pro access level
**Pagination:** supports offset and limit for browsing large archives

### `get_market_stats` -- Live Ecosystem Statistics via LivePulse Engine
Pull real-time aggregate statistics about the AI agent and MCP ecosystem.

**Includes:** total tools tracked, growth rates, category breakdowns, funding totals, GitHub star rankings, trending repos
**Refresh:** every 6 hours from GitHub API, npm registry, and curated sources

### `purchase_api_key` -- Get Pro Access
Purchase a Pro API key for full DeepThink reports, unlimited historical access, and 1,000 calls/day across all 9 OpenClaw servers.

### `validate_api_key` -- Key Status Check
Check if an API key is valid, its tier (Free/Pro), remaining daily quota, and expiration date.

## Intel Pro API

For power users and AI agents who need deeper analysis, the Intel Pro API runs on dedicated infrastructure with DeepSeek R1:

| Tier | Price | Queries | Features |
|------|-------|---------|----------|
| **Free** | $0 | 5/day | Basic trends, LivePulse stats |
| **Pro** | $19/mo | Unlimited | Full R1 analysis + custom queries + TrendRadar |
| **Agent** | $0.05/query | Pay-per-use | API integration, no subscription, bulk discount |

**Endpoints:**
- `/api/v1/trending` -- Free, top trending AI tools right now
- `/api/v1/query` -- Free+Pro, natural language market queries
- `/api/v1/analyze` -- Pro/Agent only, deep competitive analysis

**Intel Pro**: https://openclaw-intel-pro.onrender.com

## Security & Privacy

- **No query logging** -- Your market research queries are processed in-memory and never stored or logged.
- **No competitive leakage** -- Your queries about competitors are not visible to anyone, ever.
- **Aggregated data only** -- Reports contain publicly available data (GitHub, npm, press releases). No private or scraped data.
- **Edge isolation** -- Each request runs in an isolated V8 isolate on Cloudflare Workers. No shared state between users.
- **HTTPS only** -- All connections are TLS 1.3 encrypted. HTTP requests are rejected, not redirected.
- **No resale of queries** -- We do not aggregate, sell, or share what topics users research. Your strategy stays yours.

## Pricing

| Tier | Calls/Day | Price | Includes |
|------|-----------|-------|----------|
| **Free** | 10 | $0 | 4 tools (historical deep-dive excluded) |
| **Pro** | 1,000 | $9/mo | All 6 tools + all 9 OpenClaw servers (49 tools) |
| **x402** | Pay-per-call | $0.05 USDC | No account needed, crypto-native |

**Get Pro Key**: https://buy.stripe.com/4gw5na5U19SP9TW288

## The OpenClaw Intelligence Stack

| Server | Tools | Best For |
|--------|-------|----------|
| **JSON Toolkit** | 6 | Format, validate, diff, query, transform JSON |
| **Regex Engine** | 5 | Test, extract, replace, explain regex patterns |
| **Color Palette** | 5 | Generate, convert, harmonize, accessibility-check colors |
| **Timestamp Converter** | 5 | Parse, format, diff, timezone-convert timestamps |
| **Prompt Enhancer** | 6 | Optimize, rewrite, score, A/B test AI prompts |
| **Market Intelligence** | 6 | AI market trends, GitHub stats, competitor analysis |
| **Fortune & Tarot** | 3 | Daily fortune, tarot readings, I Ching |
| **Content Publisher** | 8 | MoltBook posts, social content, newsletter |
| **AgentForge Compare** | 5 | Compare AI tools, frameworks, MCP servers |

All 9 servers share one Pro key. **$9/mo = 49 tools.**
