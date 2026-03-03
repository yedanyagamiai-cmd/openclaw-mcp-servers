# Prompt Enhancer MCP Server

[![Smithery](https://smithery.ai/badge/@yagami8095/prompt-enhancer-mcp)](https://smithery.ai/server/@yagami8095/prompt-enhancer-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--03--26-blue)](https://modelcontextprotocol.io)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com)
[![Free Tier](https://img.shields.io/badge/Free-10%2Fday free, 100 Pro-green)](https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp)

> 6 prompt engineering tools — enhance, analyze, convert, generate, 30+ templates

Optimize prompts for AI models. Enhance basic prompts, analyze quality scores, convert between formats, generate system prompts, and browse 30+ curated templates.

## Quick Install

### Cursor (One Click)

[![Install in Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=prompt-enhancer&config=e30=)

### Claude Desktop / Any MCP Client

Add to your MCP config:

```json
{
  "mcpServers": {
    "prompt-enhancer": {
      "url": "https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

### Smithery

```bash
npx @smithery/cli install @yagami8095/prompt-enhancer-mcp
```

## Tools (6)

| Tool | Description |
|------|-------------|
| `enhance_prompt` | Optimize a basic prompt with clearer instructions and better structure |
| `analyze_prompt` | Score prompt quality (0-100): clarity, specificity, issues, improvements |
| `convert_prompt_format` | Convert prompts between plain, XML, markdown, and JSON formats |
| `generate_system_prompt` | Generate high-quality system prompts for any role and task |
| `prompt_template_library` | Browse 30+ production-ready templates by category |
| `purchase_pro_key` | Get Pro API key for higher rate limits |

## Example

Call `enhance_prompt`:

```json
{"prompt": "Write a blog post about AI", "style": "structured"}
```

## Rate Limits

| Tier | Limit | Price |
|------|-------|-------|
| Free | 10/day free, 100 Pro | $0 |
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

`prompt`, `engineering`, `enhance`, `optimize`, `template`, `system prompt`, `AI`

## License

MIT
