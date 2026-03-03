# Regex Engine MCP Server

A Model Context Protocol (MCP) server providing 5 regex tools for AI agents. Test patterns, get plain-English explanations, build regex from natural language, find-and-replace, and extract matches with named groups.

**Vendor:** OpenClaw Intelligence
**Protocol:** MCP 2025-03-26 (Streamable HTTP)
**Free tier:** 20 calls/day per IP -- no signup required

---

## Quick Start

### Option 0: One-Click Cursor Install

[![Install in Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=regex-engine&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vcmVnZXgtZW5naW5lLW1jcC55YWdhbWk4MDk1LndvcmtlcnMuZGV2L21jcCJ9)

### Option 1: Install via Smithery

```bash
npx -y @smithery/cli install @yedanyagamiai-cmd/regex-engine-mcp --client claude
```

### Option 2: Manual Configuration

Add this to your MCP client config (Claude Desktop, Cursor, Windsurf, Cline):

```json
{
  "mcpServers": {
    "regex-engine": {
      "url": "https://regex-engine-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

**Config file locations:**

| Client | Config Path |
|--------|------------|
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) |
| Claude Code | `~/.claude.json` or `.mcp.json` in project root |
| Cursor | `.cursor/mcp.json` in project root |
| Windsurf | `.windsurf/mcp.json` in project root |
| Cline | VS Code Settings > MCP Servers |

---

## Tools Reference

| Tool | Description | Required Params |
|------|-------------|-----------------|
| `regex_test` | Test a pattern against text, get matches and positions | `pattern`, `text` |
| `regex_explain` | Plain-English token-by-token explanation of any regex | `pattern` |
| `regex_build` | Build regex from natural language description | `description` |
| `regex_replace` | Find-and-replace with regex and backreferences | `pattern`, `text`, `replacement` |
| `regex_extract` | Extract all matches with named capture group support | `pattern`, `text` |

---

## Usage Examples

### 1. Test a regex pattern

**Request:**

```bash
curl -X POST https://regex-engine-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "regex_test",
      "arguments": {
        "pattern": "\\d{3}-\\d{4}",
        "text": "Call 555-1234 or 800-5678 today",
        "flags": "g"
      }
    }
  }'
```

**Response:**

```json
{
  "pattern": "\\d{3}-\\d{4}",
  "flags": "g",
  "match_count": 2,
  "matches": [
    { "match": "555-1234", "index": 5, "groups": [] },
    { "match": "800-5678", "index": 17, "groups": [] }
  ]
}
```

### 2. Explain a regex in plain English

**Request:**

```bash
curl -X POST https://regex-engine-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "regex_explain",
      "arguments": {
        "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
      }
    }
  }'
```

**Response:**

```json
{
  "pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
  "token_count": 12,
  "tokens": [
    { "token": "^", "type": "anchor", "description": "Start of string/line" },
    { "token": "[a-zA-Z0-9._%+-]", "type": "charclass", "description": "Any character in the set: \"a\" to \"z\", \"A\" to \"Z\", \"0\" to \"9\", \".\", \"_\", \"%\", \"+\", \"-\"" },
    { "token": "+", "type": "quantifier", "description": "One or more times (greedy)" },
    { "token": "@", "type": "literal", "description": "Literal \"@\" character" },
    "..."
  ],
  "summary": "Matches an email address pattern"
}
```

### 3. Build regex from natural language

**Request:**

```bash
curl -X POST https://regex-engine-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "regex_build",
      "arguments": {
        "description": "match email addresses",
        "flavor": "js"
      }
    }
  }'
```

**Response:**

```json
{
  "pattern": "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",
  "flags": "gi",
  "explanation": "Matches standard email addresses with alphanumeric local part and domain",
  "examples": {
    "matches": ["user@example.com", "admin+tag@sub.domain.org"],
    "non_matches": ["@missing.com", "no-at-sign"]
  }
}
```

**Built-in patterns:** email, URL, IPv4, IPv6, phone, date (ISO/US/EU), UUID, JWT, hex color, MAC address, credit card, SSN, zip code, semantic version, markdown link, HTML tag, file path, and more.

### 4. Find-and-replace with regex

**Request:**

```bash
curl -X POST https://regex-engine-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "regex_replace",
      "arguments": {
        "pattern": "(\\w+)@(\\w+\\.\\w+)",
        "text": "Contact alice@example.com or bob@test.org",
        "replacement": "$1[at]$2",
        "flags": "g"
      }
    }
  }'
```

**Response:**

```json
{
  "original": "Contact alice@example.com or bob@test.org",
  "result": "Contact alice[at]example.com or bob[at]test.org",
  "replacements_made": 2
}
```

### 5. Extract matches with named groups

**Request:**

```bash
curl -X POST https://regex-engine-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "regex_extract",
      "arguments": {
        "pattern": "(?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2})",
        "text": "Events on 2024-01-15 and 2024-03-22",
        "flags": "g"
      }
    }
  }'
```

**Response:**

```json
{
  "match_count": 2,
  "matches": [
    {
      "match": "2024-01-15",
      "groups": { "year": "2024", "month": "01", "day": "15" }
    },
    {
      "match": "2024-03-22",
      "groups": { "year": "2024", "month": "03", "day": "22" }
    }
  ]
}
```

---

## Tool Details

### regex_test

Test a regex pattern against text.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pattern` | string | Yes | The regex pattern to test |
| `text` | string | Yes | The text to test against |
| `flags` | string | No | Regex flags (default: `"g"`). Options: `g`, `i`, `m`, `s`, `u` |

Returns: `match_count`, `matches` array with `match`, `index`, and `groups` for each hit.

### regex_explain

Get a plain-English explanation of any regex pattern.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pattern` | string | Yes | The regex pattern to explain |

Returns: `tokens` array with `token`, `type`, and `description` for each component.

### regex_build

Build a regex from a natural language description.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `description` | string | Yes | Natural language (e.g., "match email addresses") |
| `flavor` | string | No | Regex dialect: `js`, `python`, or `go` (default: `js`) |

Returns: `pattern`, `flags`, `explanation`, and `examples` with matching/non-matching strings.

### regex_replace

Find-and-replace with regex. Supports backreferences (`$1`, `$2`).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pattern` | string | Yes | The regex pattern to find |
| `text` | string | Yes | The input text |
| `replacement` | string | Yes | Replacement string (use `$1`, `$2` for captures) |
| `flags` | string | No | Regex flags (default: `"g"`) |

### regex_extract

Extract all matches with named capture group support.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pattern` | string | Yes | Regex with optional named groups `(?<name>...)` |
| `text` | string | Yes | The input text |
| `flags` | string | No | Regex flags (default: `"g"`) |

---

## Pricing

| Tier | Cost | Daily Limit |
|------|------|-------------|
| Free | $0 | 20 calls/day per IP |
| Pro Trial | $0 (7 days) | 100 calls/day |
| Pro | $9 one-time | 1,000 calls/day |

**Start free trial:** [Sign up with GitHub](https://product-store.yagami8095.workers.dev/auth/login) -- no credit card required.

When the free tier is exceeded, the server returns HTTP 402 with x402 payment headers for automated micropayment agents.

---

## Error Handling

All errors follow JSON-RPC 2.0 format:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32029,
    "message": "Rate limit exceeded (20/day)"
  }
}
```

| Error Code | Meaning |
|------------|---------|
| -32600 | Invalid JSON-RPC request |
| -32601 | Tool not found |
| -32602 | Invalid parameters (e.g., invalid regex pattern) |
| -32029 | Rate limit exceeded |

Invalid regex patterns return a descriptive error with the parse failure message rather than crashing.

---

## Architecture

- **Runtime:** Cloudflare Workers (global edge, <50ms cold start)
- **Transport:** Streamable HTTP (MCP 2025-03-26)
- **Rate Limiting:** Cloudflare KV (per-IP daily counter)
- **Caching:** Semantic cache via KV (24h TTL for deterministic results)
- **Input Sanitization:** All string inputs are sanitized before processing
- **Protocol:** JSON-RPC 2.0

## Related Servers

Part of the [OpenClaw MCP ecosystem](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers) -- 9 servers, 49 tools:

- [JSON Toolkit](https://smithery.ai/server/@yedanyagamiai-cmd/json-toolkit-mcp) -- validate, format, diff, query, transform JSON
- [Prompt Enhancer](https://smithery.ai/server/@yedanyagamiai-cmd/prompt-enhancer-mcp) -- prompt optimization and analysis
- [Color Palette](https://smithery.ai/server/@yedanyagamiai-cmd/color-palette-mcp) -- color conversion, WCAG, palettes
- [Timestamp Converter](https://smithery.ai/server/@yedanyagamiai-cmd/timestamp-converter-mcp) -- time zones, cron, duration

## License

MIT

---

Built by [OpenClaw Intelligence](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers)
