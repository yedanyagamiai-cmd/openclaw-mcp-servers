---
name: openclaw-timestamp-converter
description: "Remote timestamp MCP server — convert between Unix epoch, ISO 8601, human-readable, relative time (auto-detect input), timezone conversion (7 zones at once), parse cron expressions with next 5 run times, calculate time differences, format durations (seconds/human/ISO 8601). Cloudflare Workers, zero install."
version: 1.0.0
metadata:
  openclaw:
    emoji: "\u23F0"
    homepage: https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers
---

# OpenClaw Timestamp Converter

**5 tools** for time operations. Auto-detect format, cron parsing, timezone conversion. Remote MCP.

## Connect

```json
{
  "openclaw-timestamp": {
    "type": "streamable-http",
    "url": "https://timestamp-converter-mcp.yagami8095.workers.dev/mcp"
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `convert_timestamp` | Convert between Unix/ISO/human/relative. Auto-detects input format. |
| `timezone_convert` | Convert datetime between timezones. show_all=true for 7 zones. |
| `parse_cron` | Parse cron expression. Human description + next 5 run times. |
| `time_diff` | Calculate difference in seconds/minutes/hours/days/weeks. |
| `format_duration` | Convert between seconds, human string ("2h 30m"), ISO 8601 duration. |

## Free: 30 calls/day | Pro: 1000 calls/day ($9/mo all servers)

Get Pro Key: https://buy.stripe.com/4gw5na5U19SP9TW288
