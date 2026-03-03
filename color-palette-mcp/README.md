# Color Palette MCP Server

[![Smithery](https://smithery.ai/badge/@yagami8095/color-palette-mcp)](https://smithery.ai/server/@yagami8095/color-palette-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--03--26-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-25%2Fday-green)](https://color-palette-mcp.yagami8095.workers.dev/mcp)

> 5 color & design tools for AI agents — palettes, WCAG, CSS gradients

Generate harmonious color palettes, check WCAG accessibility contrast, convert between color formats, create CSS gradients, and get Tailwind color mappings.

## Quick Install

### Cursor (One Click)

[![Install in Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=color-palette&config=e30=)

### Claude Desktop / Any MCP Client

Add to your MCP config:

```json
{
  "mcpServers": {
    "color-palette": {
      "url": "https://color-palette-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

### Smithery

```bash
npx @smithery/cli install @yagami8095/color-palette-mcp
```

## Tools (5)

| Tool | Description |
|------|-------------|
| `generate_palette` | Generate harmonious palettes using color theory (complementary, triadic, analogous, etc.) |
| `contrast_check` | WCAG 2.1 accessibility contrast ratio checker — AA/AAA pass/fail |
| `color_convert` | Convert colors between hex, RGB, HSL, and CSS named colors |
| `css_gradient` | Generate ready-to-use CSS gradient code (linear, radial, conic) |
| `tailwind_colors` | Map any hex color to the nearest Tailwind CSS color class |

## Example

Call `generate_palette`:

```json
{"base_color": "#3b82f6", "harmony": "complementary", "count": 5}
```

## Rate Limits

| Tier | Limit | Price |
|------|-------|-------|
| Free | 25/day | $0 |
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

`color`, `palette`, `design`, `WCAG`, `accessibility`, `CSS`, `gradient`, `tailwind`

## License

MIT
