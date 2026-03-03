# JSON Toolkit MCP Server

A Model Context Protocol (MCP) server providing 6 JSON manipulation tools for AI agents. Validate, format, diff, query, transform, and generate schemas from JSON data -- all via a single MCP endpoint.

**Vendor:** OpenClaw Intelligence
**Protocol:** MCP 2025-03-26 (Streamable HTTP)
**Free tier:** 20 calls/day per IP -- no signup required

---

## Quick Start

### Option 0: One-Click Cursor Install

[![Install in Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=json-toolkit&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vanNvbi10b29sa2l0LW1jcC55YWdhbWk4MDk1LndvcmtlcnMuZGV2L21jcCJ9)

### Option 1: Install via Smithery

```bash
npx -y @smithery/cli install @yedanyagamiai-cmd/json-toolkit-mcp --client claude
```

### Option 2: Manual Configuration

Add this to your MCP client config (Claude Desktop, Cursor, Windsurf, Cline):

```json
{
  "mcpServers": {
    "json-toolkit": {
      "url": "https://json-toolkit-mcp.yagami8095.workers.dev/mcp"
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
| `json_format` | Pretty-print or minify JSON | `json` |
| `json_validate` | Validate JSON with error location | `json` |
| `json_diff` | Compare two JSON objects | `json_a`, `json_b` |
| `json_query` | Query JSON with JSONPath syntax | `json`, `query` |
| `json_transform` | Flatten, unflatten, pick, omit, rename | `json`, `operation` |
| `json_schema_generate` | Generate JSON Schema from sample data | `json` |

---

## Usage Examples

### 1. Pretty-print JSON

**Request:**

```bash
curl -X POST https://json-toolkit-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "json_format",
      "arguments": {
        "json": "{\"name\":\"Alice\",\"age\":30,\"active\":true}",
        "indent": 2
      }
    }
  }'
```

**Response:**

```json
{
  "output": "{\n  \"name\": \"Alice\",\n  \"age\": 30,\n  \"active\": true\n}",
  "char_count": 52,
  "minified": false,
  "indent": 2
}
```

### 2. Validate JSON (with error detection)

**Request:**

```bash
curl -X POST https://json-toolkit-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "json_validate",
      "arguments": {
        "json": "{\"name\": \"test\", \"value\": 42}"
      }
    }
  }'
```

**Response:**

```json
{
  "valid": true,
  "type": "object",
  "key_count": 2,
  "char_count": 30,
  "summary": "Object with 2 key(s): name, value"
}
```

### 3. Diff two JSON objects

**Request:**

```bash
curl -X POST https://json-toolkit-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "json_diff",
      "arguments": {
        "json_a": "{\"name\":\"Alice\",\"age\":30}",
        "json_b": "{\"name\":\"Alice\",\"age\":31,\"email\":\"alice@test.com\"}"
      }
    }
  }'
```

**Response:**

```json
{
  "added": ["email"],
  "removed": [],
  "changed": [
    { "path": "age", "from": 30, "to": 31 }
  ],
  "unchanged": ["name"],
  "total_changes": 2
}
```

### 4. Query JSON with JSONPath

**Request:**

```bash
curl -X POST https://json-toolkit-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "json_query",
      "arguments": {
        "json": "{\"users\":[{\"name\":\"Alice\",\"age\":30},{\"name\":\"Bob\",\"age\":25}]}",
        "query": "$.users[*].name"
      }
    }
  }'
```

**Response:**

```json
{
  "query": "$.users[*].name",
  "results": ["Alice", "Bob"],
  "count": 2
}
```

### 5. Transform JSON (flatten)

**Request:**

```bash
curl -X POST https://json-toolkit-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "json_transform",
      "arguments": {
        "json": "{\"user\":{\"name\":\"Alice\",\"address\":{\"city\":\"NYC\"}}}",
        "operation": "flatten"
      }
    }
  }'
```

**Response:**

```json
{
  "operation": "flatten",
  "result": {
    "user.name": "Alice",
    "user.address.city": "NYC"
  }
}
```

### 6. Generate JSON Schema

**Request:**

```bash
curl -X POST https://json-toolkit-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 6,
    "method": "tools/call",
    "params": {
      "name": "json_schema_generate",
      "arguments": {
        "json": "{\"id\":1,\"email\":\"user@example.com\",\"active\":true,\"tags\":[\"admin\",\"user\"]}",
        "title": "UserSchema"
      }
    }
  }'
```

**Response:**

```json
{
  "schema": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "UserSchema",
    "type": "object",
    "properties": {
      "id": { "type": "integer" },
      "email": { "type": "string", "format": "email" },
      "active": { "type": "boolean" },
      "tags": { "type": "array", "items": { "type": "string" } }
    },
    "required": ["id", "email", "active", "tags"]
  }
}
```

---

## Tool Details

### json_format

Pretty-print or minify JSON strings.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `json` | string | Yes | The JSON string to format |
| `indent` | integer | No | Indentation spaces (1-8, default 2) |
| `minify` | boolean | No | If true, output compact single-line JSON |

### json_validate

Validate a JSON string and get detailed error information.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `json` | string | Yes | The JSON string to validate |

Returns: `valid`, `type`, `key_count`, `summary` on success; `error`, `line`, `column`, `suggestion` on failure.

### json_diff

Compare two JSON objects and return structured differences.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `json_a` | string | Yes | The original JSON (before) |
| `json_b` | string | Yes | The new JSON (after) |

Returns: `added`, `removed`, `changed`, `unchanged` paths.

### json_query

Query JSON data using JSONPath syntax.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `json` | string | Yes | The JSON string to query |
| `query` | string | Yes | JSONPath expression (e.g., `$.users[0].name`) |

Supported syntax: `$` (root), `.key` (dot), `["key"]` (bracket), `[0]` (index), `[*]` (wildcard), `..` (deep scan), `[1:3]` (slice), `[?(@.age>18)]` (filter).

### json_transform

Transform JSON data with operations like flatten, pick, omit.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `json` | string | Yes | The JSON string to transform |
| `operation` | string | Yes | One of: `flatten`, `unflatten`, `pick`, `omit`, `rename` |
| `options` | object | No | Operation-specific options (see below) |

Options: `keys` (for pick/omit), `map` (for rename), `deep` (recursive), `delimiter` (flatten separator).

### json_schema_generate

Generate a JSON Schema (draft-07) from sample data.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `json` | string | Yes | Sample JSON to generate schema from |
| `title` | string | No | Schema title (default: "GeneratedSchema") |

Auto-detects formats: `date-time`, `email`, `uri`, `uuid`.

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

All errors follow JSON-RPC 2.0 error format:

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
| -32602 | Invalid parameters |
| -32029 | Rate limit exceeded |

---

## Architecture

- **Runtime:** Cloudflare Workers (global edge, <50ms cold start)
- **Transport:** Streamable HTTP (MCP 2025-03-26)
- **Rate Limiting:** Cloudflare KV (per-IP daily counter)
- **Caching:** Semantic cache via KV (24h TTL for deterministic results)
- **Protocol:** JSON-RPC 2.0

## Related Servers

Part of the [OpenClaw MCP ecosystem](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers) -- 9 servers, 49 tools:

- [Regex Engine](https://smithery.ai/server/@yedanyagamiai-cmd/regex-engine-mcp) -- pattern testing, building, explanation
- [Prompt Enhancer](https://smithery.ai/server/@yedanyagamiai-cmd/prompt-enhancer-mcp) -- prompt optimization and analysis
- [Color Palette](https://smithery.ai/server/@yedanyagamiai-cmd/color-palette-mcp) -- color conversion, WCAG, palettes
- [Timestamp Converter](https://smithery.ai/server/@yedanyagamiai-cmd/timestamp-converter-mcp) -- time zones, cron, duration

## License

MIT

---

Built by [OpenClaw Intelligence](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers)
