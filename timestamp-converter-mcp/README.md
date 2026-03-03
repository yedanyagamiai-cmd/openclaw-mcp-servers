# Timestamp Converter MCP Server

A Model Context Protocol (MCP) server providing 5 time/date tools for AI agents. Convert timestamps, switch timezones, parse cron expressions, calculate time differences, and format durations.

**Vendor:** OpenClaw Intelligence
**Protocol:** MCP 2025-03-26 (Streamable HTTP)
**Free tier:** 30 calls/day per IP -- no signup required

---

## Quick Start

### Option 0: One-Click Cursor Install

[![Install in Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=timestamp-converter&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vdGltZXN0YW1wLWNvbnZlcnRlci1tY3AueWFnYW1pODA5NS53b3JrZXJzLmRldi9tY3AifQ==)

### Option 1: Install via Smithery

```bash
npx -y @smithery/cli install @yedanyagamiai-cmd/timestamp-converter-mcp --client claude
```

### Option 2: Manual Configuration

```json
{
  "mcpServers": {
    "timestamp-converter": {
      "url": "https://timestamp-converter-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

---

## Tools Reference

| Tool | Description | Required Params |
|------|-------------|-----------------|
| `convert_timestamp` | Convert unix/ISO/human/relative timestamps | `input` |
| `timezone_convert` | Convert datetime between timezones | `datetime`, `from_tz` |
| `parse_cron` | Parse 5-field cron, next 5 run times | `expression` |
| `time_diff` | Calculate difference between two datetimes | `start` |
| `format_duration` | Convert seconds/human/ISO 8601 durations | `input` |

---

## Usage Examples

### 1. Convert a timestamp

```bash
curl -X POST https://timestamp-converter-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"convert_timestamp","arguments":{"input":1714000000}}}'
```

**Response:**
```json
{
  "unix": 1714000000,
  "unix_ms": 1714000000000,
  "iso8601": "2024-04-25T02:26:40.000Z",
  "human": "April 25, 2024, 2:26:40 AM UTC",
  "relative": "11 months ago"
}
```

### 2. Parse a cron expression

```bash
curl -X POST https://timestamp-converter-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"parse_cron","arguments":{"expression":"*/5 9-17 * * 1-5"}}}'
```

**Response:**
```json
{
  "expression": "*/5 9-17 * * 1-5",
  "description": "Every 5 minutes, from 9:00 AM to 5:59 PM, Monday through Friday",
  "valid": true,
  "next_runs": ["2026-03-03T09:00:00Z", "2026-03-03T09:05:00Z", "..."]
}
```

### 3. Convert timezone

```bash
curl -X POST https://timestamp-converter-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"timezone_convert","arguments":{"datetime":"2024-04-25T10:00:00","from_tz":"America/New_York","show_all":true}}}'
```

---

## Pricing

| Tier | Cost | Daily Limit |
|------|------|-------------|
| Free | $0 | 30 calls/day per IP |
| Pro | $9 one-time | 1,000 calls/day |

## Error Handling

| Error Code | Meaning |
|------------|---------|
| -32600 | Invalid JSON-RPC request |
| -32601 | Tool not found |
| -32029 | Rate limit exceeded |

## License

MIT -- Built by [OpenClaw Intelligence](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers)
