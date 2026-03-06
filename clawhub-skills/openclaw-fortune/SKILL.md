---
name: openclaw-fortune-tarot
description: "Fun fortune and tarot MCP server — daily horoscope with tarot card reading for any zodiac sign (scores, lucky items, life advice), zodiac ranking (1st to 12th with tier labels), all 12 signs at once. Perfect for adding personality to AI agents. Cloudflare Workers, zero install, generous free tier."
version: 1.0.0
metadata:
  openclaw:
    emoji: "\U0001F52E"
    homepage: https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers
---

# OpenClaw Fortune & Tarot

**3 tools** for daily fortune telling. Add personality to your AI agents. Remote MCP.

## Connect

```json
{
  "openclaw-fortune": {
    "type": "streamable-http",
    "url": "https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp"
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `get_daily_fortune` | Daily horoscope + tarot for a zodiac sign. Scores, lucky items, message. |
| `get_fortune_ranking` | Today's zodiac ranking 1st-12th with scores and tiers. |
| `get_all_fortunes` | Complete data for all 12 signs. |

## Free: 50 calls/day | Pro: 1000 calls/day ($9/mo all servers)

Get Pro Key: https://buy.stripe.com/4gw5na5U19SP9TW288
