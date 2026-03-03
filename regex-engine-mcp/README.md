# Regex Engine MCP Server

[![Smithery](https://smithery.ai/badge/@yagami8095/regex-engine-mcp)](https://smithery.ai/server/@yagami8095/regex-engine-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--03--26-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-20%2Fday-green)](https://regex-engine-mcp.yagami8095.workers.dev/mcp)

> 5 regex tools + 15 built-in patterns for AI agents

Test, explain, build, replace, and extract with regular expressions. Includes 15 pre-built patterns for emails, URLs, IPs, dates, and more.

## Quick Install

### Cursor (One Click)

[![Install in Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=regex-engine&config=e30=)

### Claude Desktop / Any MCP Client

Add to your MCP config:

```json
{
  "mcpServers": {
    "regex-engine": {
      "url": "https://regex-engine-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

### Smithery

```bash
npx @smithery/cli install @yagami8095/regex-engine-mcp
```

## Tools (5)

| Tool | Description |
|------|-------------|
| `regex_test` | Test a regex against input text — returns matches, groups, indices |
| `regex_explain` | Get a human-readable explanation of what a regex pattern does |
| `regex_build` | Build a regex from a natural language description |
| `regex_replace` | Find and replace using regex patterns with capture groups |
| `regex_extract` | Extract all matches from text using a regex pattern |

## Example

Call `regex_test`:

```json
{"pattern": "\\d{4}-\\d{2}-\\d{2}", "text": "Date: 2026-03-03"}
```

## Rate Limits

| Tier | Limit | Price |
|------|-------|-------|
| Free | 20/day | $0 |
| Pro | 1000/day | $9 one-time |
| x402 | Pay-per-call | $0.05 USDC |

Get a free 7-day Pro trial: [Start Trial](https://product-store.yagami8095.workers.dev/auth/login)

## Part of OpenClaw MCP Ecosystem

This server is one of **9 MCP servers** with **49 tools** total. All run on Cloudflare Workers with Streamable HTTP transport.

| Server | Tools | Description |
|--------|-------|-------------|
| [JSON Toolkit](https://json-toolkit-mcp.yagami8095.workers.dev/mcp) | 6 | Format, validate, diff, query, transform JSON |
| [Regex Engine](https://regex-engine-mcp.yagami8095.workers.dev/mcp) | 5 | Test, explain, build, replace, extract with regex |
| [Color Palette](https://color-palette-mcp.yagami8095.workers.dev/mcp) | 5 | Palettes, WCAG contrast, CSS gradients |
| [Timestamp Converter](https://timestamp-converter-mcp.yagami8095.workers.dev/mcp) | 5 | Timezone math, cron parsing, duration formatting |
| [Prompt Enhancer](https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp) | 6 | Optimize prompts, 30+ templates, quality scoring |
| [Market Intelligence](https://openclaw-intel-mcp.yagami8095.workers.dev/mcp) | 6 | AI market trends, reports, competitor analysis |
| [Fortune & Tarot](https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp) | 3 | Daily zodiac horoscopes + tarot readings |
| [Content Publisher](https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp) | 8 | Japanese content tools, SEO, translation |
| [AI Tool Compare](https://agentforge-compare-mcp.yagami8095.workers.dev/mcp) | 5 | Compare Claude Code, Cursor, Copilot, Devin |

## Keywords

`regex`, `regular expression`, `pattern`, `match`, `replace`, `extract`, `validate`

## License

MIT
