# Timestamp Converter MCP Server

[![Smithery](https://smithery.ai/badge/@yagami8095/timestamp-converter-mcp)](https://smithery.ai/server/@yagami8095/timestamp-converter-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--03--26-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-30%2Fday-green)](https://timestamp-converter-mcp.yagami8095.workers.dev/mcp)

> 5 time/date tools — timezone conversion, cron parsing, duration formatting

Convert timestamps between formats, handle timezone math, parse cron expressions, calculate time differences, and format durations. Supports IANA timezones.

## Quick Install

### Cursor (One Click)

[![Install in Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=timestamp-converter&config=e30=)

### Claude Desktop / Any MCP Client

Add to your MCP config:

```json
{
  "mcpServers": {
    "timestamp-converter": {
      "url": "https://timestamp-converter-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

### Smithery

```bash
npx @smithery/cli install @yagami8095/timestamp-converter-mcp
```

## Tools (5)

| Tool | Description |
|------|-------------|
| `convert_timestamp` | Convert between unix epoch, ISO 8601, human-readable, and relative time |
| `timezone_convert` | Convert datetime between timezones with show_all option for 7 common zones |
| `parse_cron` | Parse cron expressions — human-readable description + next 5 run times |
| `time_diff` | Calculate difference between two datetimes in multiple units |
| `format_duration` | Format seconds into human-readable duration strings |

## Example

Call `convert_timestamp`:

```json
{"timestamp": "1714000000", "output_format": "iso"}
```

## Rate Limits

| Tier | Limit | Price |
|------|-------|-------|
| Free | 30/day | $0 |
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

`timestamp`, `timezone`, `cron`, `date`, `time`, `convert`, `UTC`, `epoch`

## License

MIT
