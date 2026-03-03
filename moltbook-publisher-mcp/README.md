# MoltBook Publisher MCP Server

A Model Context Protocol (MCP) server providing 8 content publishing tools for AI agents. Convert Markdown to HTML, optimize SEO, translate English to Japanese, generate outlines, and cross-post to note.com, Zenn, and Qiita.

**Vendor:** OpenClaw Intelligence
**Protocol:** MCP 2025-03-26 (Streamable HTTP)
**Free tier:** 5 calls/tool/day per IP -- no signup required

---

## Quick Start

### Option 0: One-Click Cursor Install

[![Install in Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=moltbook-publisher&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vbW9sdGJvb2stcHVibGlzaGVyLW1jcC55YWdhbWk4MDk1LndvcmtlcnMuZGV2L21jcCJ9)

### Option 1: Install via Smithery

```bash
npx -y @smithery/cli install @yedanyagamiai-cmd/moltbook-publisher-mcp --client claude
```

### Option 2: Manual Configuration

```json
{
  "mcpServers": {
    "moltbook-publisher": {
      "url": "https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

---

## Tools Reference

| Tool | Tier | Description | Required Params |
|------|------|-------------|-----------------|
| `convert_markdown_to_html` | FREE | Markdown to platform-compatible HTML | `markdown` |
| `optimize_for_seo` | FREE | SEO analysis for Japanese articles | `title`, `content` |
| `translate_en_to_jp` | FREE | English to natural Japanese translation | `text` |
| `generate_article_outline` | FREE | Structured article outline from topic | `topic` |
| `get_trending_topics` | PRO | Trending topics on note/Zenn/Qiita | _(optional: platform)_ |
| `cross_post_format` | PRO | Format article for all 3 platforms | `markdown`, `title` |
| `analyze_article_performance` | PRO | Predict performance before publishing | `title`, `content` |
| `purchase_pro_key` | FREE | Get Pro key purchase instructions | _(none)_ |

---

## Usage Examples

### 1. Convert Markdown to HTML

```bash
curl -X POST https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"convert_markdown_to_html","arguments":{"markdown":"# Hello World\n\nThis is **bold** text.","platform":"note"}}}'
```

### 2. SEO optimization

```bash
curl -X POST https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"optimize_for_seo","arguments":{"title":"AIエージェントの最新動向","content":"AIエージェント技術は急速に進化しています...","platform":"note"}}}'
```

### 3. Translate English to Japanese

```bash
curl -X POST https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"translate_en_to_jp","arguments":{"text":"AI agents are transforming software development","style":"blog","preserve_terms":["AI","MCP"]}}}'
```

---

## Supported Platforms

- **note.com** -- Japanese blogging platform
- **Zenn** -- Developer-focused technical articles
- **Qiita** -- Japanese developer community

---

## Pricing

| Tier | Cost | Daily Limit | Features |
|------|------|-------------|----------|
| Free | $0 | 5 calls/tool/day | Markdown, SEO, translate, outline |
| Pro | $12/month | 100 calls/day | Trending topics, cross-post, analytics |

## Error Handling

| Error Code | Meaning |
|------------|---------|
| -32600 | Invalid JSON-RPC request |
| -32601 | Tool not found |
| -32029 | Rate limit exceeded |

## License

MIT -- Built by [OpenClaw Intelligence](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers)
