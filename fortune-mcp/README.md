# Fortune & Tarot MCP Server

A Model Context Protocol (MCP) server providing 3 fortune-telling tools for AI agents. Get daily horoscopes with tarot readings, zodiac rankings, and complete fortune data for all 12 signs.

**Vendor:** OpenClaw Intelligence
**Protocol:** MCP 2025-03-26 (Streamable HTTP)
**Free tier:** 50 calls/day per IP -- no signup required

---

## Quick Start

### Option 0: One-Click Cursor Install

[![Install in Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=openclaw-fortune&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vb3BlbmNsYXctZm9ydHVuZS1tY3AueWFnYW1pODA5NS53b3JrZXJzLmRldi9tY3AifQ==)

### Option 1: Install via Smithery

```bash
npx -y @smithery/cli install @yedanyagamiai-cmd/openclaw-fortune-mcp --client claude
```

### Option 2: Manual Configuration

```json
{
  "mcpServers": {
    "openclaw-fortune": {
      "url": "https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

---

## Tools Reference

| Tool | Description | Required Params |
|------|-------------|-----------------|
| `get_daily_fortune` | Daily horoscope + tarot for a zodiac sign | `sign` |
| `get_fortune_ranking` | Today's 1st-12th zodiac ranking | _(none)_ |
| `get_all_fortunes` | Complete data for all 12 signs | _(none)_ |

---

## Usage Examples

### 1. Get daily fortune

```bash
curl -X POST https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_daily_fortune","arguments":{"sign":"leo"}}}'
```

**Response:**
```json
{
  "sign": "leo",
  "date": "2026-03-03",
  "overall_score": 85,
  "tarot_card": "The Sun",
  "scores": { "love": 90, "work": 80, "money": 75, "health": 95 },
  "lucky": { "item": "gold ring", "color": "orange", "number": 3, "direction": "south" },
  "message": "Your natural charisma shines bright today..."
}
```

### 2. Get zodiac ranking

```bash
curl -X POST https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_fortune_ranking","arguments":{}}}'
```

### 3. Get all 12 signs

```bash
curl -X POST https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_all_fortunes","arguments":{}}}'
```

---

## Supported Signs

`aries`, `taurus`, `gemini`, `cancer`, `leo`, `virgo`, `libra`, `scorpio`, `sagittarius`, `capricorn`, `aquarius`, `pisces`

Also accepts Japanese sign names.

---

## Pricing

| Tier | Cost | Daily Limit |
|------|------|-------------|
| Free | $0 | 50 calls/day per IP |
| Pro | $9 one-time | 1,000 calls/day |

## Error Handling

| Error Code | Meaning |
|------------|---------|
| -32600 | Invalid JSON-RPC request |
| -32601 | Tool not found |
| -32029 | Rate limit exceeded |

## License

MIT -- Built by [OpenClaw Intelligence](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers)
