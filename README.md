# OpenClaw MCP Servers

**49 tools** across **9 servers** on Cloudflare Workers. Streamable HTTP transport — connect in seconds.

Free: 3 calls/tool/day | x402: $0.05/call USDC on Base | Pro: $9 one-time

## Quick Connect

Copy this JSON into your MCP client config:

```json
{
  "mcpServers": {
    "openclaw-json": {
      "url": "https://json-toolkit-mcp.yagami8095.workers.dev/mcp?ref=github"
    },
    "openclaw-regex": {
      "url": "https://regex-engine-mcp.yagami8095.workers.dev/mcp?ref=github"
    },
    "openclaw-colors": {
      "url": "https://color-palette-mcp.yagami8095.workers.dev/mcp?ref=github"
    },
    "openclaw-timestamp": {
      "url": "https://timestamp-converter-mcp.yagami8095.workers.dev/mcp?ref=github"
    },
    "openclaw-prompt": {
      "url": "https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp?ref=github"
    },
    "openclaw-intel": {
      "url": "https://openclaw-intel-mcp.yagami8095.workers.dev/mcp?ref=github"
    },
    "openclaw-fortune": {
      "url": "https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp?ref=github"
    },
    "openclaw-moltbook": {
      "url": "https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp?ref=github"
    },
    "openclaw-agentforge": {
      "url": "https://agentforge-compare-mcp.yagami8095.workers.dev/mcp?ref=github"
    }
  }
}
```

Or use npm:

```bash
npx openclaw-mcp-servers --config
```

### Where to paste

| Client | Config file |
|--------|------------|
| Claude Code | `~/.claude.json` or `.mcp.json` |
| Cursor | `.cursor/mcp.json` |
| Windsurf | `.windsurf/mcp.json` |
| Cline | VS Code MCP settings |
| Any MCP client | Streamable HTTP transport |

## Servers & Tools

### openclaw-json — JSON Toolkit (6 tools)

`https://json-toolkit-mcp.yagami8095.workers.dev/mcp?ref=github`

| Tool | Description |
|------|-------------|
| `json_format` | Pretty-print or minify JSON. Specify indent level or set minify=true. |
| `json_validate` | Validate JSON string. Returns type info on success, line/column/error on failure. |
| `json_diff` | Compare two JSON values. Returns added, removed, and changed paths. |
| `json_query` | Query JSON with JSONPath. Supports dot notation, wildcards, deep scan, filters. |
| `json_transform` | Flatten, unflatten, pick, omit, rename keys. Supports deep recursive operations. |
| `json_schema_generate` | Generate JSON Schema (draft-07) from sample data. Infers types, formats, required fields. |

### openclaw-regex — Regex Engine (5 tools)

`https://regex-engine-mcp.yagami8095.workers.dev/mcp?ref=github`

| Tool | Description |
|------|-------------|
| `regex_test` | Test pattern against text. Returns matches, positions, capture groups. |
| `regex_explain` | Explain regex token-by-token in plain English. |
| `regex_build` | Build regex from natural language. 25+ built-in patterns (email, URL, IP, phone, date, UUID, JWT, etc). |
| `regex_replace` | Find-and-replace with regex. Supports backreferences ($1, $2). |
| `regex_extract` | Extract all matches with named capture group support. |

### openclaw-colors — Color Palette (5 tools)

`https://color-palette-mcp.yagami8095.workers.dev/mcp?ref=github`

| Tool | Description |
|------|-------------|
| `generate_palette` | Generate harmonious palette by color theory. Complementary, analogous, triadic, etc. |
| `contrast_check` | WCAG 2.1 contrast ratio check. AA/AAA pass/fail for normal and large text. |
| `color_convert` | Convert between hex, rgb, hsl, CSS named colors (140 names). |
| `css_gradient` | Generate CSS gradient code. Linear, radial, conic from color array. |
| `tailwind_colors` | Lookup Tailwind v3 colors. All shades (50-950) or find nearest match. |

### openclaw-timestamp — Timestamp Converter (5 tools)

`https://timestamp-converter-mcp.yagami8095.workers.dev/mcp?ref=github`

| Tool | Description |
|------|-------------|
| `convert_timestamp` | Convert between unix epoch, ISO 8601, human-readable, relative. Auto-detects input. |
| `timezone_convert` | Convert datetime between timezones. show_all=true for 7 zones simultaneously. |
| `parse_cron` | Parse 5-field cron expression. Human description + next 5 run times. |
| `time_diff` | Calculate difference between two datetimes in seconds/minutes/hours/days/weeks. |
| `format_duration` | Convert between seconds, human string ("2h 30m"), ISO 8601 duration ("PT2H30M"). |

### openclaw-prompt — Prompt Enhancer (6 tools)

`https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp?ref=github`

| Tool | Description |
|------|-------------|
| `enhance_prompt` | Optimize a prompt with clearer instructions, structure, constraints. FREE. |
| `analyze_prompt` | Quality analysis: clarity score, specificity, issues, suggestions. FREE. |
| `convert_prompt_format` | Convert between plain, xml, markdown, json formats. FREE. |
| `generate_system_prompt` | Generate system prompt for a given role and task. FREE. |
| `prompt_template_library` | Browse 30+ production-ready templates by category. PRO. |
| `purchase_pro_key` | Get Pro API key ($9). Unlocks templates + higher limits. |

### openclaw-intel — AI Market Intelligence (6 tools)

`https://openclaw-intel-mcp.yagami8095.workers.dev/mcp?ref=github`

| Tool | Description |
|------|-------------|
| `get_ai_market_report` | Latest AI agent market report. GitHub stars, releases, growth trends. |
| `get_report_by_id` | Specific report by ID. Pro key for full content. |
| `list_reports` | List available reports with titles and dates. |
| `get_market_stats` | Real-time ecosystem stats: users, reports, data freshness. |
| `purchase_api_key` | Purchase Pro key ($9) for full reports + 1000 calls/day. |
| `validate_api_key` | Check API key validity and remaining quota. |

### openclaw-fortune — Fortune & Tarot (3 tools)

`https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp?ref=github`

| Tool | Description |
|------|-------------|
| `get_daily_fortune` | Daily horoscope + tarot for a zodiac sign. Scores, lucky items, message. |
| `get_fortune_ranking` | Today's zodiac ranking 1st-12th with scores and tiers. |
| `get_all_fortunes` | Complete data for all 12 signs. |

### openclaw-moltbook — Content Publisher (8 tools)

`https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp?ref=github`

| Tool | Description |
|------|-------------|
| `convert_markdown_to_html` | Markdown to HTML for note.com, Zenn, Qiita. |
| `optimize_for_seo` | SEO analysis for Japanese article content. |
| `translate_en_to_jp` | English to natural Japanese translation. |
| `generate_article_outline` | Structured article outline from topic. |
| `get_trending_topics` | [PRO] Trending topics on note.com/Zenn/Qiita. |
| `cross_post_format` | [PRO] Format article for all 3 platforms. |
| `analyze_article_performance` | [PRO] Predict article performance before publishing. |
| `purchase_pro_key` | Get Pro key ($12/month). |

### openclaw-agentforge — AI Tool Comparison (5 tools)

`https://agentforge-compare-mcp.yagami8095.workers.dev/mcp?ref=github`

| Tool | Description |
|------|-------------|
| `compare_ai_tools` | Compare 2+ AI coding tools side-by-side. Claude Code, Cursor, Windsurf, Devin, etc. |
| `get_tool_profile` | Detailed profile: features, pricing, strengths, weaknesses, use cases. |
| `recommend_tool` | [PRO] AI-powered recommendation based on your requirements. |
| `get_pricing_comparison` | Complete pricing table for all AI coding tools. FREE. |
| `purchase_pro_key` | Get Pro key ($9) for full comparisons + AI recommendations. |

## Pricing

| Tier | Cost | Limit |
|------|------|-------|
| Free | $0 | 3 calls/tool/day per IP |
| x402 | $0.05/call | USDC on Base L2 — automatic, no signup |
| Pro | $9 one-time | 1000 calls/day across all 9 servers |

### x402 Flow

When you exceed the free tier, the server returns:

```
HTTP/1.1 402 Payment Required
X-Payment: required
X-Payment-Network: base
X-Payment-Amount: 0.05
X-Payment-Currency: USDC
X-Payment-Address: 0x72aa56DAe3819c75C545c57778cc404092d60731
```

x402-compatible agents (using `@x402/fetch`) automatically pay and retry.

## npm Package

```bash
npm install openclaw-mcp-servers
```

```javascript
const openclaw = require('openclaw-mcp-servers');

// Get config JSON for your MCP client
console.log(JSON.stringify(openclaw.config(), null, 2));

// Access server metadata
console.log(openclaw.servers);       // All 9 servers
console.log(openclaw.totalTools);    // 49
console.log(openclaw.x402);          // Payment info
```

CLI:

```bash
npx openclaw-mcp-servers --config    # MCP config JSON
npx openclaw-mcp-servers --list      # All 49 tools
npx openclaw-mcp-servers --servers   # 9 endpoint URLs
npx openclaw-mcp-servers --x402      # Payment info
```

## Architecture

All servers run on Cloudflare Workers with Streamable HTTP transport (MCP spec 2025-03-26). Rate limiting via Cloudflare KV. x402 compliant (HTTP 402 + payment headers).

## License

MIT

---

Built by [OpenClaw Intelligence](https://product-store.yagami8095.workers.dev)
