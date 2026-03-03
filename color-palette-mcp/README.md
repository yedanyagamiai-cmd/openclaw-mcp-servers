# Color Palette MCP Server

A Model Context Protocol (MCP) server providing 5 color tools for AI agents. Generate palettes, check WCAG contrast, convert between formats, create CSS gradients, and look up Tailwind CSS colors.

**Vendor:** OpenClaw Intelligence
**Protocol:** MCP 2025-03-26 (Streamable HTTP)
**Free tier:** 25 calls/day per IP -- no signup required

---

## Quick Start

### Option 0: One-Click Cursor Install

[![Install in Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](cursor://anysphere.cursor-deeplink/mcp/install?name=color-palette&config=eyJ0eXBlIjogImh0dHAiLCAidXJsIjogImh0dHBzOi8vY29sb3ItcGFsZXR0ZS1tY3AueWFnYW1pODA5NS53b3JrZXJzLmRldi9tY3AifQ==)

### Option 1: Install via Smithery

```bash
npx -y @smithery/cli install @yedanyagamiai-cmd/color-palette-mcp --client claude
```

### Option 2: Manual Configuration

```json
{
  "mcpServers": {
    "color-palette": {
      "url": "https://color-palette-mcp.yagami8095.workers.dev/mcp"
    }
  }
}
```

---

## Tools Reference

| Tool | Description | Required Params |
|------|-------------|-----------------|
| `generate_palette` | Generate harmonious palettes by color theory | _(base_color or mood)_ |
| `contrast_check` | WCAG 2.1 AA/AAA contrast ratio check | `foreground`, `background` |
| `color_convert` | Convert between hex, rgb, hsl, CSS names | `color` |
| `css_gradient` | Generate CSS gradient code (linear, radial, conic) | `colors` |
| `tailwind_colors` | Look up Tailwind v3 colors or find nearest match | _(color_name or closest_to)_ |

---

## Usage Examples

### 1. Generate a color palette

```bash
curl -X POST https://color-palette-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"generate_palette","arguments":{"base_color":"#3b82f6","harmony":"triadic","count":3}}}'
```

### 2. Check WCAG contrast

```bash
curl -X POST https://color-palette-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"contrast_check","arguments":{"foreground":"#ffffff","background":"#3b82f6"}}}'
```

**Response:**
```json
{
  "ratio": 4.68,
  "AA_normal": true,
  "AA_large": true,
  "AAA_normal": false,
  "AAA_large": true
}
```

### 3. Convert a color

```bash
curl -X POST https://color-palette-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"color_convert","arguments":{"color":"cornflowerblue","to_format":"all"}}}'
```

### 4. Find nearest Tailwind color

```bash
curl -X POST https://color-palette-mcp.yagami8095.workers.dev/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"tailwind_colors","arguments":{"closest_to":"#3b82f6"}}}'
```

---

## Pricing

| Tier | Cost | Daily Limit |
|------|------|-------------|
| Free | $0 | 25 calls/day per IP |
| Pro | $9 one-time | 1,000 calls/day |

## Error Handling

| Error Code | Meaning |
|------------|---------|
| -32600 | Invalid JSON-RPC request |
| -32601 | Tool not found |
| -32029 | Rate limit exceeded |

## License

MIT -- Built by [OpenClaw Intelligence](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers)
