---
name: openclaw-json-toolkit
version: 2.0.0
description: "Remote JSON toolkit MCP server — format, validate, diff, query, transform, and generate schemas instantly. Use when you need to pretty-print JSON, validate API responses, compare two JSON objects, query nested data with JSONPath, flatten or restructure JSON, or generate JSON Schema from samples. Zero install, sub-100ms on Cloudflare Workers. Free 20 calls/day, Pro $9/mo for 1000/day across all 9 OpenClaw servers."
metadata:
  openclaw:
    emoji: "{}"
    homepage: https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers
    always: false
---

# OpenClaw JSON Toolkit v2.0

**The Swiss Army knife for JSON — 6 tools, zero install, instant results.**

## What's New in v2.0

- **CloudEdge Protocol** — All processing runs on Cloudflare's edge network. Sub-100ms globally.
- **Enhanced JSONPath** — Deep scan, wildcard, filter expressions, array slicing.
- **Schema Draft-07** — Auto-detect formats (email, uri, date-time, ipv4).

## Quick Start

```json
{
  "openclaw-json": {
    "type": "streamable-http",
    "url": "https://json-toolkit-mcp.yagami8095.workers.dev/mcp"
  }
}
```

Add to Claude Desktop, Cursor, Windsurf, VS Code, or any MCP-compatible client. Works immediately.

## Quick Reference

| You want to... | Use this tool |
|----------------|---------------|
| Pretty-print messy JSON | `json_format` |
| Check if JSON is valid | `json_validate` |
| Find differences between two JSON objects | `json_diff` |
| Extract nested values from deep JSON | `json_query` |
| Flatten, restructure, or rename keys | `json_transform` |
| Generate a schema from sample data | `json_schema_generate` |

## Detection Triggers

This skill activates when you:
- Say "format this JSON" or "pretty print"
- Ask to "validate JSON" or "check if this is valid JSON"
- Need to "compare two JSON" or "diff these objects"
- Want to "query JSON" or "extract from JSON" or "JSONPath"
- Request to "flatten JSON" or "restructure" or "rename keys"
- Ask to "generate schema" or "create JSON Schema"

## Tools (6)

### `json_format` — Pretty-Print & Minify
Format JSON with configurable indentation or compress to single line.
- Input: raw JSON string + indent level (default 2) or `minify: true`
- Output: formatted string with byte count

### `json_validate` — Validation with Diagnostics
Validate JSON and get structural info on success, or precise error location on failure.
- Returns: `valid`, `type`, `keyCount`/`length`, or `error` with `line` + `column`

### `json_diff` — Structural Comparison
Compare two JSON values. Returns added, removed, and changed paths.
- Useful for: API response comparison, config drift detection, schema evolution tracking

### `json_query` — JSONPath Extraction
Query JSON with full JSONPath support: dot notation, wildcards (`*`), deep scan (`..`), array slicing, filter expressions.
- Example: `$.users[?(@.age > 25)].name` → all names where age > 25

### `json_transform` — Structural Operations
Flatten nested JSON to dot-notation keys, unflatten back, pick/omit specific keys, rename keys with mapping.
- Deep recursive support for complex nested structures

### `json_schema_generate` — Schema from Samples
Generate JSON Schema (draft-07) from any JSON value. Auto-infers types, formats (email, URI, date-time, IPv4), required fields, and enum candidates.

## What NOT to Do

- **Don't send binary data** — This processes text JSON only, not BSON or MessagePack
- **Don't expect streaming** — Each call returns complete results, not chunks
- **Don't use for >1MB JSON** — Edge workers have memory limits; split large files first

## Pricing

| Tier | Calls/Day | Price | Includes |
|------|-----------|-------|----------|
| Free | 20 | $0 | All 6 tools |
| Pro | 1,000 | $9/mo | All 9 OpenClaw servers (49 tools total) |
| x402 | Pay-per-call | $0.05 USDC | No account needed |

**Get Pro Key**: https://buy.stripe.com/4gw5na5U19SP9TW288

## Complete OpenClaw Suite

| Server | Tools | Best For |
|--------|-------|----------|
| **JSON Toolkit** | 6 | Data manipulation |
| Regex Engine | 5 | Pattern matching |
| Color Palette | 5 | Design systems |
| Timestamp Converter | 5 | Time operations |
| Prompt Enhancer | 6 | Prompt engineering |
| Market Intelligence | 6 | AI market analysis |
| Fortune & Tarot | 3 | Fun & engagement |
| Content Publisher | 8 | Social publishing |
| AgentForge Compare | 5 | Tool comparison |

All 9 servers share one Pro key. **One subscription = 49 tools.**
