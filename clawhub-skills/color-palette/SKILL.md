---
name: openclaw-color-palette
description: "Remote color palette MCP server — generate harmonious palettes (complementary, analogous, triadic), WCAG 2.1 contrast checking (AA/AAA), convert between hex/RGB/HSL/CSS named colors, generate CSS gradients (linear/radial/conic), lookup Tailwind v3 colors. Cloudflare Workers, zero install. Free + Pro."
version: 1.0.0
metadata:
  openclaw:
    emoji: "\U0001F3A8"
    homepage: https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers
---

# OpenClaw Color Palette

**5 tools** for color operations. WCAG compliance, Tailwind lookup, CSS gradients. Remote MCP.

## Connect

```json
{
  "openclaw-colors": {
    "type": "streamable-http",
    "url": "https://color-palette-mcp.yagami8095.workers.dev/mcp"
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `generate_palette` | Harmonious palette by color theory (complementary, analogous, triadic, etc). |
| `contrast_check` | WCAG 2.1 contrast ratio — AA/AAA pass/fail for normal and large text. |
| `color_convert` | Convert between hex, RGB, HSL, CSS named colors (140 names). |
| `css_gradient` | Generate CSS gradient code (linear, radial, conic). |
| `tailwind_colors` | Lookup Tailwind v3 colors (50-950 shades) or find nearest match. |

## Free: 25 calls/day | Pro: 1000 calls/day ($9/mo all servers)

Get Pro Key: https://buy.stripe.com/4gw5na5U19SP9TW288
