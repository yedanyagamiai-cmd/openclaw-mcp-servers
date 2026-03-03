# JSON Toolkit MCP Server

[![Smithery](https://smithery.ai/badge/@yagami8095/json-toolkit-mcp)](https://smithery.ai/server/@yagami8095/json-toolkit-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--03--26-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-20%2Fday-green)](https://json-toolkit-mcp.yagami8095.workers.dev/mcp)

> 6 free JSON tools for AI agents on Cloudflare Workers

A utility MCP server for AI agents that work with JSON data daily. Format, validate, diff, query, transform, and generate schemas — all in one server.

## Quick Install

### Cursor (One Click)

[![Install in Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=json-toolkit&config=e30=)

### Claude Desktop / Any MCP Client

Add to your MCP config:

```json
{
  "mcpServers": {
    "json-toolkit": {
      "url": "https://json-toolkit-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

### Smithery

```bash
npx @smithery/cli install @yagami8095/json-toolkit-mcp
```

## Tools (6)

| Tool | Description |
|------|-------------|
| `json_format` | Pretty-print or minify JSON with configurable indent |
| `json_validate` | Validate JSON with detailed error info (line, column, context) |
| `json_diff` | Compare two JSON objects — shows added, removed, changed paths |
| `json_query` | Query JSON with JSONPath-like syntax ($, dot notation, wildcards) |
| `json_transform` | Flatten, unflatten, pick, omit, rename keys in JSON |
| `json_schema_generate` | Generate JSON Schema from a sample JSON object |

## Example

Call `json_format`:

```json
{"json": "{\"name\":\"test\",\"value\":42}", "indent": 2}
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

`json`, `format`, `validate`, `diff`, `query`, `transform`, `schema`, `utility`

## License

MIT
