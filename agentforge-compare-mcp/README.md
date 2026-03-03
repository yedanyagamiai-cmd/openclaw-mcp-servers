# AgentForge AI Tool Compare MCP Server

[![Smithery](https://smithery.ai/badge/@yagami8095/agentforge-compare-mcp)](https://smithery.ai/server/@yagami8095/agentforge-compare-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--03--26-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-10%2Fday-green)](https://agentforge-compare-mcp.yagami8095.workers.dev/mcp)

> 5 AI coding tool comparison tools — Claude Code, Cursor, Devin, Copilot, and more

Compare AI coding tools side-by-side. Get detailed profiles, feature comparisons, pricing analysis, and AI-powered recommendations. Covers Claude Code, Cursor, Windsurf, Devin, SWE-agent, Copilot, Aider, and Cline.

## Quick Install

### Cursor (One Click)

[![Install in Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=agentforge-compare&config=e30=)

### Claude Desktop / Any MCP Client

Add to your MCP config:

```json
{
  "mcpServers": {
    "agentforge-compare": {
      "url": "https://agentforge-compare-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

### Smithery

```bash
npx @smithery/cli install @yagami8095/agentforge-compare-mcp
```

## Tools (5)

| Tool | Description |
|------|-------------|
| `compare_ai_tools` | Compare 2-8 AI coding tools side-by-side with feature matrix |
| `get_tool_profile` | Detailed profile: features, pricing, strengths/weaknesses, use cases |
| `recommend_tool` | AI-powered recommendation based on your requirements and use case |
| `get_pricing_comparison` | Side-by-side pricing breakdown for all AI coding tools |
| `purchase_pro_key` | Get Pro API key for full comparisons with recommendations |

## Example

Call `compare_ai_tools`:

```json
{"tools": ["claude-code", "cursor"], "aspects": ["features", "pricing"]}
```

## Rate Limits

| Tier | Limit | Price |
|------|-------|-------|
| Free | 10/day | $0 |
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

`AI tools`, `comparison`, `Claude Code`, `Cursor`, `Copilot`, `Devin`, `coding`

## License

MIT
