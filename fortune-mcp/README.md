# OpenClaw Fortune & Tarot MCP Server

[![Smithery](https://smithery.ai/badge/@yagami8095/fortune-mcp)](https://smithery.ai/server/@yagami8095/fortune-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--03--26-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-50%2Fday-green)](https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp)

> 3 fortune tools — daily zodiac horoscopes + tarot readings for AI agents

Daily zodiac fortune and tarot card readings for all 12 signs. Get individual horoscopes, daily overview summaries, and all-signs rankings. Perfect for AI chatbots and content generation.

## Quick Install

### Cursor (One Click)

[![Install in Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=fortune&config=e30=)

### Claude Desktop / Any MCP Client

Add to your MCP config:

```json
{
  "mcpServers": {
    "fortune": {
      "url": "https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

### Smithery

```bash
npx @smithery/cli install @yagami8095/fortune-mcp
```

## Tools (3)

| Tool | Description |
|------|-------------|
| `daily_fortune` | Get daily horoscope + tarot card reading for a zodiac sign (love, work, health, money) |
| `daily_overview` | Get today's fortune overview summary across all signs |
| `all_signs_ranking` | Complete fortune data for all 12 signs with rankings and tarot cards |

## Example

Call `daily_fortune`:

```json
{"sign": "aries"}
```

## Rate Limits

| Tier | Limit | Price |
|------|-------|-------|
| Free | 50/day | $0 |
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

`fortune`, `horoscope`, `tarot`, `zodiac`, `astrology`, `daily`, `reading`

## License

MIT
