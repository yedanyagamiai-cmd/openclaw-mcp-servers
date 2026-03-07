---
name: openclaw-fortune
version: 2.0.0
description: "Fortune-telling MCP server with daily horoscope, tarot readings, and I Ching divination. Use when: (1) user says 'what's my horoscope' or 'daily fortune for Aries', (2) user asks 'pull a tarot card' or 'do a Celtic Cross spread', (3) user wants 'I Ching reading' or 'consult the Book of Changes', (4) you need engagement features for a chatbot or daily greeting, (5) user says 'lucky numbers today' or 'what do the stars say'. 78-card tarot deck with reversals, 64 I Ching hexagrams with changing lines, deterministic daily fortunes. Zero install, sub-100ms on Cloudflare Workers. Free + Pro $9/mo."
read_when:
  - user asks about horoscope, zodiac, or daily fortune for any sign
  - user wants a tarot card reading, tarot spread, or card pull
  - user mentions I Ching, hexagram, or Book of Changes divination
  - building a chatbot or agent that needs personality or daily engagement content
  - user asks about lucky numbers, lucky color, or star-based guidance
metadata:
  openclaw:
    emoji: "\U0001F52E"
    homepage: https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers
    always: false
---

# OpenClaw Fortune & Tarot v2.0

**Add magic to your AI agent -- 3 tools for horoscopes, tarot readings, and I Ching divination across 78 cards and 64 hexagrams.**

## Quick Reference

| You say... | Protocol | Tool | Response Time |
|------------|----------|------|---------------|
| "What's my horoscope?" | StarCast | `daily_fortune` | <50ms |
| "Pull a tarot card" | ArcanaSpread | `tarot_reading` | <80ms |
| "I Ching reading" | HexagramCast | `i_ching` | <60ms |
| "Fortune for my chatbot" | StarCast | `daily_fortune` | <50ms |
| "Celtic Cross spread" | ArcanaSpread | `tarot_reading` | <80ms |
| "Lucky numbers today" | StarCast | `daily_fortune` | <50ms |

## Quick Start

```json
{
  "openclaw-fortune": {
    "type": "streamable-http",
    "url": "https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp"
  }
}
```

Add to Claude Desktop, Cursor, Windsurf, VS Code, or any MCP-compatible client. Works immediately -- no API key required for Free tier.

## What's New in v2.0

- :sparkles: **I Ching Divination** -- Full 64-hexagram system with the traditional three-coin method, line interpretations, nuclear hexagrams, and changing hexagram transitions.
- :flower_playing_cards: **Enhanced Tarot** -- Complete 78-card deck (Major + Minor Arcana), reversals, positional meanings, and three spread types: single, three-card, and Celtic Cross.
- :brain: **Personality Engine** -- Deterministic daily fortunes seeded by date, making each day unique while keeping results consistent for all users.
- :zap: **Sub-100ms** -- All three tools respond in under 100ms on Cloudflare Workers edge network.

## Detection Triggers

This skill activates when the user:

| Trigger Phrase | Maps To |
|----------------|---------|
| "what's my horoscope" / "horoscope for Leo" | `daily_fortune` |
| "today's fortune" / "daily fortune" | `daily_fortune` |
| "lucky numbers today" / "lucky color" | `daily_fortune` |
| "what do the stars say" / "my zodiac" | `daily_fortune` |
| "pull a tarot card" / "tarot reading" | `tarot_reading` |
| "tarot spread" / "Celtic Cross" / "past present future" | `tarot_reading` |
| "consult the I Ching" / "throw the I Ching" | `i_ching` |
| "hexagram reading" / "Book of Changes" | `i_ching` |
| "fortune telling" / "add fortune to my bot" | `daily_fortune` |
| "daily greeting with horoscope" / "engagement feature" | `daily_fortune` |

## Named Protocols

### StarCast Protocol -- Daily Fortune Engine
Deterministic daily horoscope generation seeded by date + zodiac sign. Returns love/work/health scores (0-100), tarot card of the day, lucky number, lucky color, and a personalized advice message. Same sign + same day always returns the same result -- designed for consistency in production chatbots.

### ArcanaSpread Protocol -- Full Tarot System
Draws from the complete 78-card Rider-Waite deck. Each card can appear upright or reversed. Supports three spread types with positional meanings. Generates a narrative summary tying all drawn cards together into coherent guidance.

### HexagramCast Protocol -- I Ching Divination
Simulates the three-coin method to generate a hexagram. Returns the primary hexagram (name, number, image, judgment), individual line interpretations, and nuclear hexagram. When changing lines are present, provides a secondary hexagram with transition guidance.

## Tools (3)

### `daily_fortune` -- StarCast Protocol
Get a complete daily fortune for any zodiac sign with multi-dimensional scoring and guidance.

**Input:**
- `sign` -- Zodiac sign (Aries through Pisces) OR birth date for auto-detection

**Output:**
- Scores (0-100) for overall luck, love, work, and health
- Tarot card of the day with meaning
- Lucky number, lucky color
- Personalized daily advice message

**Behavior:** Fortunes refresh daily at midnight UTC. Same sign on the same day always returns identical results -- this is intentional for production consistency.

### `tarot_reading` -- ArcanaSpread Protocol
Draw tarot cards from the complete 78-card deck with reversals and positional meanings.

**Input:**
- `spread` -- `single` (quick answer), `three_card` (past/present/future), `celtic_cross` (full 10-card reading)
- `question` -- Optional question to focus the reading

**Output:**
- Each card: name, suit, upright/reversed status, positional meaning, keywords, detailed interpretation
- Overall reading summary tying all cards into a narrative
- Relationship and career angles when relevant

### `i_ching` -- HexagramCast Protocol
Cast an I Ching reading using the traditional three-coin method.

**Input:**
- `question` -- Optional question for the divination

**Output:**
- Primary hexagram: name, number, image text, judgment text
- Individual line meanings for all six lines
- Nuclear hexagram
- If changing lines present: secondary hexagram with transition interpretation
- Traditional Chinese wisdom paired with modern practical guidance

## Wrong vs. Right

### Example 1: Repeated Daily Fortune Calls

**Wrong:**
```
User: "Get my Aries horoscope"
Agent: [calls daily_fortune(sign="aries")]
User: "Get it again, maybe it changed"
Agent: [calls daily_fortune(sign="aries")] // WASTES quota -- same result
```

**Right:**
```
User: "Get my Aries horoscope"
Agent: [calls daily_fortune(sign="aries")]
User: "Get it again, maybe it changed"
Agent: "Your Aries fortune is the same as earlier -- it refreshes daily at midnight UTC. Want a tarot reading for a different perspective?"
```

### Example 2: Tarot Spread Selection

**Wrong:**
```
User: "Quick tarot reading"
Agent: [calls tarot_reading(spread="celtic_cross")] // TOO HEAVY for a quick question
```

**Right:**
```
User: "Quick tarot reading"
Agent: [calls tarot_reading(spread="single")] // Single card for quick answers
```

### Example 3: Using Fortune for Real Decisions

**Wrong:**
```
User: "Should I sell my house based on my horoscope?"
Agent: [calls daily_fortune] "Your luck score is 82, so yes, sell it!"
```

**Right:**
```
User: "Should I sell my house based on my horoscope?"
Agent: "I can pull your daily fortune for fun, but major life decisions should be based on real financial and personal analysis -- not astrology. Want me to pull a card for entertainment while you consult a realtor?"
```

## Security & Privacy

| Concern | How We Handle It |
|---------|------------------|
| **User Data** | No personal data stored. Birth dates used for sign detection are not logged. |
| **Determinism** | Fortunes are seeded by date, not by user identity -- no tracking possible. |
| **Rate Limiting** | Per-IP rate limits prevent abuse. Free tier: 50/day. |
| **No PII** | No names, emails, or identifiers are collected or transmitted. |
| **Edge Computing** | All processing on Cloudflare Workers -- data never leaves the edge node closest to you. |
| **Entertainment Only** | Responses include appropriate disclaimers. Not medical, financial, or legal advice. |

## Pricing

| Tier | Calls/Day | Price | What You Get |
|------|-----------|-------|--------------|
| **Free** | 50 | $0/mo | All 3 tools, all spreads, all hexagrams |
| **Pro** | 1,000 | $9/mo | All 9 OpenClaw servers (49 tools total) |
| **x402** | Pay-per-call | $0.05 USDC | No account needed, crypto-native |

**Get Pro Key**: https://buy.stripe.com/4gw5na5U19SP9TW288

One Pro key unlocks all 9 servers. Cancel anytime.

## The OpenClaw Intelligence Stack

| Server | Tools | Best For |
|--------|-------|----------|
| **JSON Toolkit** | 6 | Format, validate, diff, query, transform JSON |
| **Regex Engine** | 5 | Test, extract, replace, explain regex patterns |
| **Color Palette** | 5 | Generate, convert, harmonize, accessibility-check colors |
| **Timestamp Converter** | 5 | Parse, format, diff, timezone-convert timestamps |
| **Prompt Enhancer** | 6 | Optimize, rewrite, score, A/B test AI prompts |
| **Market Intelligence** | 6 | AI market trends, GitHub stats, competitor analysis |
| **Fortune & Tarot** | **3** | **Daily fortune, tarot readings, I Ching** |
| **Content Publisher** | 8 | MoltBook posts, social content, newsletter |
| **AgentForge Compare** | 5 | Compare AI tools, frameworks, MCP servers |

All 9 servers share one Pro key. **$9/mo = 49 tools.**
