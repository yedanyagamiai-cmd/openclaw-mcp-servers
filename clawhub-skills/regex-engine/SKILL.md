---
name: openclaw-regex-engine
description: "Remote regex MCP server on Cloudflare Workers — test patterns, explain regex in plain English, build regex from natural language (25+ built-in patterns: email, URL, IP, phone, UUID, JWT), find-replace with backreferences, extract with named groups. Zero install. Free tier + Pro API ($9/mo)."
version: 1.0.0
metadata:
  openclaw:
    emoji: ".*"
    homepage: https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers
---

# OpenClaw Regex Engine

**5 tools** for regex operations. Build regex from plain English. Remote MCP — no install.

## Connect

```json
{
  "openclaw-regex": {
    "type": "streamable-http",
    "url": "https://regex-engine-mcp.yagami8095.workers.dev/mcp"
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `regex_test` | Test pattern against text. Returns matches, positions, capture groups. |
| `regex_explain` | Explain regex token-by-token in plain English. |
| `regex_build` | Build regex from natural language. 25+ built-in patterns (email, URL, IP, phone, date, UUID, JWT). |
| `regex_replace` | Find-and-replace with regex. Supports backreferences ($1, $2). |
| `regex_extract` | Extract all matches with named capture group support. |

## Free: 20 calls/day | Pro: 1000 calls/day ($9/mo all servers)

Get Pro Key: https://buy.stripe.com/4gw5na5U19SP9TW288
