---
name: openclaw-content-publisher
description: "Japanese content publishing MCP server — convert Markdown to HTML for note.com/Zenn/Qiita, SEO analysis for Japanese articles, English-to-Japanese natural translation, structured article outline generation. Pro tier: trending topics, cross-platform formatting, performance prediction. Cloudflare Workers, zero install."
version: 1.0.0
metadata:
  openclaw:
    emoji: "\U0001F4F0"
    homepage: https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers
---

# OpenClaw Content Publisher

**8 tools** for Japanese content publishing. note.com, Zenn, Qiita support. Remote MCP.

## Connect

```json
{
  "openclaw-moltbook": {
    "type": "streamable-http",
    "url": "https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp"
  }
}
```

## Tools

| Tool | Tier | Description |
|------|------|-------------|
| `convert_markdown_to_html` | Free | MD to HTML for note.com/Zenn/Qiita. |
| `optimize_for_seo` | Free | SEO analysis for Japanese content. |
| `translate_en_to_jp` | Free | Natural English to Japanese translation. |
| `generate_article_outline` | Free | Structured outline from any topic. |
| `get_trending_topics` | **Pro** | Trending on note.com/Zenn/Qiita. |
| `cross_post_format` | **Pro** | Format for all 3 platforms at once. |
| `analyze_article_performance` | **Pro** | Predict article performance before publish. |
| `purchase_pro_key` | — | Unlock Pro features ($12/mo). |

## Free: 5 calls/day | Pro: unlimited ($12/mo) or all servers ($9/mo)

Get Pro Key: https://buy.stripe.com/4gw5na5U19SP9TW288
