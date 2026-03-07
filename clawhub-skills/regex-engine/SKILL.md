---
name: openclaw-regex-engine
version: 2.0.0
description: "Remote regex MCP server — test patterns, explain regex in plain English, build regex from natural language, browse 50+ ready-made patterns, and find-replace with backreferences. Use when you need to test a regex against text, understand what a complex regex does, create a pattern from a description like 'match emails', find a battle-tested regex for URLs/IPs/UUIDs, or do regex-based search-and-replace. Zero install, sub-100ms on Cloudflare Workers. Free 20 calls/day, Pro $9/mo for 1000/day across all 9 OpenClaw servers."
metadata:
  openclaw:
    emoji: "\U0001F50D"
    homepage: https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers
    always: false
---

# OpenClaw Regex Engine v2.0

**Master regular expressions — 5 tools to test, explain, build, and replace patterns instantly.**

## What's New in v2.0

- **Natural Language Builder** — Describe what you want to match and get production-ready regex back.
- **Visual Explanation** — Break down any regex into human-readable components with match examples.
- **Pattern Library** — 50+ battle-tested patterns for email, URL, phone, IP, UUID, JWT, and more.

## Quick Start

```json
{
  "openclaw-regex": {
    "type": "streamable-http",
    "url": "https://regex-engine-mcp.yagami8095.workers.dev/mcp"
  }
}
```

Add to Claude Desktop, Cursor, Windsurf, VS Code, or any MCP-compatible client. Works immediately.

## Quick Reference

| You want to... | Use this tool |
|----------------|---------------|
| Test a regex against a string | `regex_test` |
| Understand what a regex does | `regex_explain` |
| Build regex from a description | `regex_build` |
| Find a ready-made pattern | `regex_library` |
| Find and replace with regex | `regex_replace` |

## Detection Triggers

This skill activates when you:
- Say "test this regex" or "does this pattern match"
- Ask to "explain this regex" or "what does this regex do"
- Need to "build a regex for" or "create a pattern that matches"
- Want a "regex for email" or "regex for URL" or "phone number pattern"
- Request "regex replace" or "find and replace with regex"
- Say "regular expression" or "pattern matching" or "capture groups"

## Tools (5)

### `regex_test` — Match & Capture
Test a regex pattern against input text. Returns all matches, capture groups, named groups, and match positions with index offsets.
- Supports flags: `g` (global), `i` (case-insensitive), `m` (multiline), `s` (dotall)
- Output: matches array with index, full match text, captured groups, and named captures

### `regex_explain` — Human-Readable Breakdown
Break any regex into plain English, token by token. Each component is explained with what it matches and why it matters.
- Input: any regex pattern, even complex lookaheads, lookbehinds, and nested quantifiers
- Output: step-by-step breakdown with example matches for each part

### `regex_build` — Natural Language to Regex
Describe what you want to match in plain English and get a production-ready regex with test cases included.
- Example: "match email addresses" produces a complete pattern with positive/negative test cases
- Returns: pattern, recommended flags, explanation, and example matches/non-matches

### `regex_library` — Pattern Collection
Browse 50+ curated, battle-tested regex patterns organized by category, each with test cases.
- Categories: email, URL, IPv4/IPv6, phone (international), date formats, UUID, JWT, credit card, passwords, HTML tags, file paths, CSS selectors
- Each pattern: regex string, description, flags, positive and negative test cases

### `regex_replace` — Find & Replace
Perform regex-based find-and-replace with full capture group reference support ($1, $2, named groups).
- Supports: backreferences, global and first-match modes, multiline replacement
- Returns: transformed text, replacement count, and before/after diff preview

## What NOT to Do

- **Don't use catastrophic backtracking patterns** — Patterns like `(a+)+$` will timeout on edge workers
- **Don't expect PCRE-only features** — This uses the JavaScript regex engine (ES2024 level)
- **Don't send >100KB input text** — Split large texts before matching for best performance

## Pricing

| Tier | Calls/Day | Price | Includes |
|------|-----------|-------|----------|
| Free | 20 | $0 | All 5 tools |
| Pro | 1,000 | $9/mo | All 9 OpenClaw servers (49 tools total) |
| x402 | Pay-per-call | $0.05 USDC | No account needed |

**Get Pro Key**: https://buy.stripe.com/4gw5na5U19SP9TW288

## Complete OpenClaw Suite

| Server | Tools | Best For |
|--------|-------|----------|
| JSON Toolkit | 6 | Data manipulation |
| **Regex Engine** | 5 | Pattern matching |
| Color Palette | 5 | Design systems |
| Timestamp Converter | 5 | Time operations |
| Prompt Enhancer | 6 | Prompt engineering |
| Market Intelligence | 6 | AI market analysis |
| Fortune & Tarot | 3 | Fun & engagement |
| Content Publisher | 8 | Social publishing |
| AgentForge Compare | 5 | Tool comparison |

All 9 servers share one Pro key. **One subscription = 49 tools.**
