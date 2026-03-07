---
name: openclaw-color-palette
version: 2.0.0
description: "Remote color palette MCP server — generate harmonious palettes, check WCAG contrast accessibility, convert between hex/RGB/HSL/CMYK, simulate color blindness for 8 vision types, and extract dominant colors from images. Use when you need a color scheme for a website, check if text is readable on a background, convert #FF5733 to RGB, preview how colorblind users see your design, or pull brand colors from a logo. Zero install, sub-100ms on Cloudflare Workers. Free 25 calls/day, Pro $9/mo for 1000/day across all 9 OpenClaw servers."
metadata:
  openclaw:
    emoji: "\U0001F3A8"
    homepage: https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers
    always: false
---

# OpenClaw Color Palette v2.0

**Design-grade color tools — 5 tools for palettes, accessibility, conversion, and simulation.**

## What's New in v2.0

- **WCAG 2.1 AA/AAA** — Full accessibility contrast checking with pass/fail and recommended fixes.
- **8 Color Blindness Types** — Simulate protanopia, deuteranopia, tritanopia, achromatopsia, and more.
- **Harmony Algorithms** — Complementary, analogous, triadic, split-complementary, tetradic, monochromatic.

## Quick Start

```json
{
  "openclaw-colors": {
    "type": "streamable-http",
    "url": "https://color-palette-mcp.yagami8095.workers.dev/mcp"
  }
}
```

Add to Claude Desktop, Cursor, Windsurf, VS Code, or any MCP-compatible client. Works immediately.

## Quick Reference

| You want to... | Use this tool |
|----------------|---------------|
| Generate a color scheme | `generate_palette` |
| Check text/background contrast | `check_contrast` |
| Convert hex to RGB, HSL, etc. | `convert_color` |
| See colors through colorblind eyes | `color_blindness_sim` |
| Pull colors from an image or logo | `extract_palette` |

## Detection Triggers

This skill activates when you:
- Say "generate a color palette" or "color scheme for" or "give me colors"
- Ask to "check contrast" or "WCAG accessibility" or "is this readable"
- Need to "convert hex to RGB" or "convert color" or "what is #FF5733 in HSL"
- Want to "simulate color blindness" or "how does this look to colorblind users"
- Request to "extract colors from" or "pull palette from image" or "brand colors"
- Say "complementary colors" or "analogous" or "triadic" or "monochromatic"

## Tools (5)

### `generate_palette` — Harmony-Based Palettes
Generate mathematically harmonious color palettes from any seed color using color theory algorithms.
- Algorithms: complementary, analogous, triadic, split-complementary, tetradic, monochromatic
- Output: 3-6 colors in hex, RGB, HSL with descriptive names and ready-to-paste CSS variables

### `check_contrast` — WCAG Accessibility Checker
Check foreground/background contrast ratio against WCAG 2.1 AA and AAA standards for normal and large text.
- Returns: contrast ratio (e.g., 4.5:1), AA pass/fail, AAA pass/fail, large text status
- Suggests: nearest accessible color pair when contrast fails, with minimal visual change

### `convert_color` — Universal Format Conversion
Convert any color between hex, RGB, HSL, HSV, CMYK, and all 140 CSS named colors. Auto-detects input format.
- Input: any format — "#FF5733", "rgb(255,87,51)", "hsl(11,100%,60%)", "tomato"
- Output: all formats simultaneously plus nearest CSS named color and luminance value

### `color_blindness_sim` — Vision Deficiency Simulation
Simulate how any color or full palette appears to users with 8 different types of color vision deficiency.
- Types: protanopia, deuteranopia, tritanopia, achromatopsia, protanomaly, deuteranomaly, tritanomaly, achromatomaly
- Returns: simulated hex values for each type plus warnings where colors become indistinguishable

### `extract_palette` — Image Color Extraction
Extract dominant colors from an image URL or base64 data using k-means clustering.
- Returns: 5-10 dominant colors sorted by area percentage, with hex, RGB, and frequency data
- Useful for: brand analysis, design inspiration, mood board creation, logo color extraction

## What NOT to Do

- **Don't expect print-accurate CMYK** — Conversion is mathematically approximate; use ICC profiles for print
- **Don't send images over 5MB** — Edge workers have memory limits; resize large images first
- **Don't rely on this for medical diagnosis** — Color blindness simulation is illustrative, not clinical

## Pricing

| Tier | Calls/Day | Price | Includes |
|------|-----------|-------|----------|
| Free | 25 | $0 | All 5 tools |
| Pro | 1,000 | $9/mo | All 9 OpenClaw servers (49 tools total) |
| x402 | Pay-per-call | $0.05 USDC | No account needed |

**Get Pro Key**: https://buy.stripe.com/4gw5na5U19SP9TW288

## Complete OpenClaw Suite

| Server | Tools | Best For |
|--------|-------|----------|
| JSON Toolkit | 6 | Data manipulation |
| Regex Engine | 5 | Pattern matching |
| **Color Palette** | 5 | Design systems |
| Timestamp Converter | 5 | Time operations |
| Prompt Enhancer | 6 | Prompt engineering |
| Market Intelligence | 6 | AI market analysis |
| Fortune & Tarot | 3 | Fun & engagement |
| Content Publisher | 8 | Social publishing |
| AgentForge Compare | 5 | Tool comparison |

All 9 servers share one Pro key. **One subscription = 49 tools.**
