---
name: openclaw-fortune
version: 2.0.0
description: "Fun fortune-telling MCP server — daily horoscope with tarot cards, full tarot readings with Major and Minor Arcana, and I Ching divination with hexagram interpretations. Use when you want today's fortune for any zodiac sign, need a tarot card reading for guidance or fun, want to consult the I Ching, or want to add personality and engagement to your AI agent. Perfect for chatbots, daily greetings, and community engagement. Zero install, sub-100ms on Cloudflare Workers. Free 50 calls/day, Pro $9/mo for 1000/day across all 9 OpenClaw servers."
metadata:
  openclaw:
    emoji: "\U0001F52E"
    homepage: https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers
    always: false
---

# OpenClaw Fortune & Tarot v2.0

**Add magic to your AI — 3 tools for horoscopes, tarot readings, and I Ching divination.**

## What's New in v2.0

- **I Ching Divination** — Full 64-hexagram system with line interpretations and changing hexagrams.
- **Enhanced Tarot** — Major and Minor Arcana, reversals, Celtic Cross spread, and relationship readings.
- **Personality Engine** — Fortune results are unique daily, making your AI agent feel alive and engaging.

## Quick Start

```json
{
  "openclaw-fortune": {
    "type": "streamable-http",
    "url": "https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp"
  }
}
```

Add to Claude Desktop, Cursor, Windsurf, VS Code, or any MCP-compatible client. Works immediately.

## Quick Reference

| You want to... | Use this tool |
|----------------|---------------|
| Get today's horoscope for a sign | `daily_fortune` |
| Do a tarot card reading | `tarot_reading` |
| Consult the I Ching | `i_ching` |

## Detection Triggers

This skill activates when you:
- Say "what's my horoscope" or "today's fortune" or "daily horoscope for Aries"
- Ask for a "tarot reading" or "pull a tarot card" or "tarot spread"
- Want to "consult the I Ching" or "throw the I Ching" or "hexagram reading"
- Say "my zodiac" or "fortune telling" or "what do the stars say"
- Request "lucky numbers" or "lucky color today" or "daily advice"
- Want to "add fortune to my bot" or "daily greeting with horoscope"

## Tools (3)

### `daily_fortune` — Horoscope + Tarot of the Day
Get a complete daily fortune for any zodiac sign: overall luck score, love/work/health ratings, tarot card of the day, lucky number, lucky color, and personalized advice message.
- Input: zodiac sign (Aries through Pisces) or birth date for auto-detection
- Output: scores (0-100) for overall/love/work/health, tarot card with meaning, lucky items, daily message
- Updates: fortunes refresh daily at midnight UTC, consistent for all users on the same day

### `tarot_reading` — Full Tarot Spread
Draw tarot cards from the complete 78-card deck (Major + Minor Arcana) with reversals and positional meanings.
- Spreads: single card (quick answer), three-card (past/present/future), Celtic Cross (full reading)
- Each card: name, upright/reversed status, positional meaning, keywords, and detailed interpretation
- Includes: overall reading summary tying all cards together into a narrative

### `i_ching` — Book of Changes Divination
Cast an I Ching reading using the traditional three-coin method. Returns hexagram, line readings, and changing hexagram.
- Output: primary hexagram (name, number, image, judgment), individual line meanings, nuclear hexagram
- If changing lines are present: secondary hexagram with transition interpretation
- Includes: traditional Chinese wisdom alongside modern practical guidance

## What NOT to Do

- **Don't use for actual life decisions** — This is entertainment; encourage users to think critically
- **Don't call daily_fortune more than once per sign per day** — Results are deterministic per day; repeated calls waste quota
- **Don't expect different results on retry** — Same sign + same day = same fortune (by design, for consistency)

## Pricing

| Tier | Calls/Day | Price | Includes |
|------|-----------|-------|----------|
| Free | 50 | $0 | All 3 tools |
| Pro | 1,000 | $9/mo | All 9 OpenClaw servers (49 tools total) |
| x402 | Pay-per-call | $0.05 USDC | No account needed |

**Get Pro Key**: https://buy.stripe.com/4gw5na5U19SP9TW288

## Complete OpenClaw Suite

| Server | Tools | Best For |
|--------|-------|----------|
| JSON Toolkit | 6 | Data manipulation |
| Regex Engine | 5 | Pattern matching |
| Color Palette | 5 | Design systems |
| Timestamp Converter | 5 | Time operations |
| Prompt Enhancer | 6 | Prompt engineering |
| Market Intelligence | 6 | AI market analysis |
| **Fortune & Tarot** | 3 | Fun & engagement |
| Content Publisher | 8 | Social publishing |
| AgentForge Compare | 5 | Tool comparison |

All 9 servers share one Pro key. **One subscription = 49 tools.**
