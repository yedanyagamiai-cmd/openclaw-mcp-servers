---
name: openclaw-agentforge-compare
description: "AI coding tool comparison MCP server — compare Claude Code, Cursor, Windsurf, Devin, Copilot and more side-by-side, get detailed tool profiles with pricing and strengths/weaknesses, AI-powered recommendations based on your needs (Pro), complete pricing tables. Cloudflare Workers, zero install."
version: 1.0.0
metadata:
  openclaw:
    emoji: "\u2696\uFE0F"
    homepage: https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers
---

# OpenClaw AgentForge Compare

**5 tools** for AI tool comparison. Side-by-side analysis + AI recommendations. Remote MCP.

## Connect

```json
{
  "openclaw-agentforge": {
    "type": "streamable-http",
    "url": "https://agentforge-compare-mcp.yagami8095.workers.dev/mcp"
  }
}
```

## Tools

| Tool | Tier | Description |
|------|------|-------------|
| `compare_ai_tools` | Free | Side-by-side comparison of 2+ AI tools. |
| `get_tool_profile` | Free | Detailed profile: features, pricing, pros/cons. |
| `recommend_tool` | **Pro** | AI recommendation based on your requirements. |
| `get_pricing_comparison` | Free | Complete pricing table for all tools. |
| `purchase_pro_key` | — | Get Pro key for AI recommendations. |

## Free: 10 calls/day | Pro: 1000 calls/day ($9/mo all servers)

Get Pro Key: https://buy.stripe.com/4gw5na5U19SP9TW288
