---
name: openclaw-timestamp-converter
version: 2.0.0
description: "Remote timestamp MCP server — convert Unix/ISO timestamps, translate between 400+ timezones, calculate durations and time differences, browse the full IANA timezone database, and compute relative 'time ago' strings. Use when you need to convert epoch to human-readable, translate meeting times across timezones, calculate days between two dates, find the UTC offset for Tokyo or any city, or get '3 hours ago' output. Zero install, sub-100ms on Cloudflare Workers. Free 30 calls/day, Pro $9/mo for 1000/day across all 9 OpenClaw servers."
metadata:
  openclaw:
    emoji: "\u23F0"
    homepage: https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers
    always: false
---

# OpenClaw Timestamp Converter v2.0

**Never fight with timezones again — 5 tools for timestamps, zones, and duration math.**

## What's New in v2.0

- **400+ Timezones** — Full IANA timezone database with DST-aware conversions and transition dates.
- **Duration Arithmetic** — Add/subtract durations, calculate business days, handle leap years correctly.
- **Relative Time** — Human-friendly "3 hours ago" / "in 2 days" output with configurable granularity.

## Quick Start

```json
{
  "openclaw-timestamp": {
    "type": "streamable-http",
    "url": "https://timestamp-converter-mcp.yagami8095.workers.dev/mcp"
  }
}
```

Add to Claude Desktop, Cursor, Windsurf, VS Code, or any MCP-compatible client. Works immediately.

## Quick Reference

| You want to... | Use this tool |
|----------------|---------------|
| Convert epoch/Unix to date (or reverse) | `convert_timestamp` |
| Translate time between timezones | `timezone_convert` |
| Calculate time between two dates | `duration_calc` |
| Look up timezone info for a city | `list_timezones` |
| Get "3 hours ago" style output | `relative_time` |

## Detection Triggers

This skill activates when you:
- Say "convert timestamp" or "what time is 1709827200" or "epoch to date"
- Ask "what time is it in Tokyo" or "convert PST to JST" or "timezone convert"
- Need to "calculate duration" or "how many days between" or "time difference"
- Want to "list timezones" or "UTC offset for" or "what timezone is Sydney in"
- Request "time ago" or "relative time" or "how long ago was March 1"
- Say "Unix timestamp" or "ISO 8601" or "milliseconds to date"

## Tools (5)

### `convert_timestamp` — Universal Timestamp Conversion
Convert between Unix epoch (seconds or milliseconds), ISO 8601, RFC 2822, and human-readable formats. Auto-detects input format.
- Input: any timestamp format — `1709827200`, `"2024-03-07T12:00:00Z"`, `"March 7, 2024"`
- Output: all major formats simultaneously — epoch, ISO, RFC, human-readable, day of week, week number

### `timezone_convert` — Cross-Timezone Translation
Convert a specific date-time from one timezone to another. Fully DST-aware with transition handling.
- Input: datetime + source timezone + one or more target timezones (supports batch conversion)
- Output: converted times with UTC offsets, DST status, abbreviations (EST/EDT/JST), and next DST transition

### `duration_calc` — Time Arithmetic
Calculate the exact duration between two dates/times, or add/subtract a duration from a date.
- Returns: breakdown in years, months, days, hours, minutes, seconds — plus total in each unit
- Supports: business days mode (excludes weekends), leap year and leap second awareness

### `list_timezones` — IANA Timezone Database
Browse and search the complete IANA timezone database (400+ entries). Find timezone by city, country, or offset.
- Search: fuzzy match by city name ("Tokyo"), country code ("JP"), or offset ("UTC+9")
- Returns: IANA name, current UTC offset, DST status, next transition date, common abbreviation

### `relative_time` — Human-Friendly Time
Convert any timestamp to natural language relative time expressions like "3 hours ago" or "in 2 days".
- Supports: past and future, configurable granularity (seconds precision vs. "a few minutes ago")
- Auto-detects input format — pass epoch, ISO, or human-readable date strings

## What NOT to Do

- **Don't use deprecated timezone names as input** — Use IANA names ("Asia/Tokyo") not abbreviations ("JST")
- **Don't assume UTC when timezone is ambiguous** — Always specify timezone explicitly for accurate results
- **Don't expect sub-millisecond precision** — Edge workers use JavaScript Date, precise to milliseconds

## Pricing

| Tier | Calls/Day | Price | Includes |
|------|-----------|-------|----------|
| Free | 30 | $0 | All 5 tools |
| Pro | 1,000 | $9/mo | All 9 OpenClaw servers (49 tools total) |
| x402 | Pay-per-call | $0.05 USDC | No account needed |

**Get Pro Key**: https://buy.stripe.com/4gw5na5U19SP9TW288

## Complete OpenClaw Suite

| Server | Tools | Best For |
|--------|-------|----------|
| JSON Toolkit | 6 | Data manipulation |
| Regex Engine | 5 | Pattern matching |
| Color Palette | 5 | Design systems |
| **Timestamp Converter** | 5 | Time operations |
| Prompt Enhancer | 6 | Prompt engineering |
| Market Intelligence | 6 | AI market analysis |
| Fortune & Tarot | 3 | Fun & engagement |
| Content Publisher | 8 | Social publishing |
| AgentForge Compare | 5 | Tool comparison |

All 9 servers share one Pro key. **One subscription = 49 tools.**
