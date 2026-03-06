---
name: openclaw-json-toolkit
description: "Remote JSON toolkit MCP server on Cloudflare Workers — format, validate, diff, query (JSONPath), transform, and generate JSON Schema. Zero install, instant connect via Streamable HTTP. Free tier + Pro API ($9/mo for 1000 calls/day across all 9 OpenClaw servers)."
version: 1.0.0
metadata:
  openclaw:
    emoji: "{}"
    homepage: https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers
    always: false
---

# OpenClaw JSON Toolkit

**6 tools** for JSON manipulation. Remote MCP server — no install, no dependencies.

## Connect

Add to your MCP config:

```json
{
  "openclaw-json": {
    "type": "streamable-http",
    "url": "https://json-toolkit-mcp.yagami8095.workers.dev/mcp"
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `json_format` | Pretty-print or minify JSON. Specify indent level or set minify=true. |
| `json_validate` | Validate JSON string. Returns type info on success, line/column/error on failure. |
| `json_diff` | Compare two JSON values. Returns added, removed, and changed paths. |
| `json_query` | Query JSON with JSONPath (dot notation, wildcards, deep scan, filters). |
| `json_transform` | Flatten, unflatten, pick, omit, rename keys. Deep recursive support. |
| `json_schema_generate` | Generate JSON Schema (draft-07) from sample data. Infers types, formats, required. |

## Free: 20 calls/day | Pro: 1000 calls/day ($9/mo all servers)

Get Pro Key: https://buy.stripe.com/4gw5na5U19SP9TW288
