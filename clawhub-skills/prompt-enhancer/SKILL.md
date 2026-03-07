---
name: openclaw-prompt-enhancer
version: 2.0.0
description: "Remote prompt engineering MCP server — enhance weak prompts into powerful ones, analyze prompt quality with a 0-100 score, convert between OpenAI/Claude/Gemini/Llama formats, generate system prompts from scratch, and browse 100+ production-ready templates. Use when you need to improve a prompt, score prompt effectiveness, translate prompts between AI models, create system instructions, or find proven templates for coding/writing/analysis. Zero install, sub-100ms on Cloudflare Workers. Free 10 calls/day, Pro $9/mo for 1000/day across all 9 OpenClaw servers."
metadata:
  openclaw:
    emoji: "\u270D\uFE0F"
    homepage: https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers
    always: false
---

# OpenClaw Prompt Enhancer v2.0

**Prompt engineering on autopilot — 6 tools to enhance, analyze, convert, and generate prompts.**

## What's New in v2.0

- **10-Dimension Scoring** — Rate prompts on clarity, specificity, context, constraints, examples, and 5 more axes.
- **Cross-Model Conversion** — Translate prompts between OpenAI, Claude, Gemini, Llama, and Mistral formats.
- **Template Library** — 100+ proven templates for coding, writing, analysis, data, creative, and business tasks.

## Quick Start

```json
{
  "openclaw-prompt": {
    "type": "streamable-http",
    "url": "https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp"
  }
}
```

Add to Claude Desktop, Cursor, Windsurf, VS Code, or any MCP-compatible client. Works immediately.

## Quick Reference

| You want to... | Use this tool |
|----------------|---------------|
| Make a weak prompt stronger | `enhance_prompt` |
| Score prompt quality (0-100) | `analyze_prompt` |
| Convert prompt for a different AI | `convert_prompt_format` |
| Generate system instructions | `generate_system_prompt` |
| Browse proven templates | `prompt_template_library` (Pro) |
| Upgrade to Pro | `purchase_pro_key` |

## Detection Triggers

This skill activates when you:
- Say "improve this prompt" or "make this prompt better" or "enhance my prompt"
- Ask to "analyze prompt quality" or "score this prompt" or "rate my prompt"
- Need to "convert prompt to Claude format" or "translate prompt for Gemini"
- Want to "generate system prompt" or "create system instructions" or "write a system message"
- Request "prompt templates" or "prompt library" or "show me prompt examples"
- Say "prompt engineering" or "prompt optimization" or "better AI output"

## Tools (6)

### `enhance_prompt` — Automatic Enhancement
Take any prompt and return a dramatically improved version with better structure, specificity, and constraints.
- Applies: role framing, context injection, output format specification, edge case handling, few-shot examples
- Returns: enhanced prompt + detailed changelog explaining every improvement made and why

### `analyze_prompt` — Quality Scoring
Score any prompt on a 0-100 scale across 10 dimensions of prompt engineering quality with actionable feedback.
- Dimensions: clarity, specificity, context, constraints, examples, format, role, tone, edge cases, testability
- Returns: overall score, per-dimension breakdown, and specific suggestions to reach a higher score

### `convert_prompt_format` — Cross-Model Translation
Convert prompts between AI model formats while preserving intent and optimizing for each model's strengths.
- Formats: OpenAI (system/user/assistant), Claude (Human/Assistant + XML), Gemini, Llama chat template, Mistral
- Handles: system prompt placement, special tokens, model-specific best practices and quirks

### `generate_system_prompt` — System Prompt Factory
Generate complete, production-ready system prompts from a brief description of the desired AI behavior.
- Input: role description, key constraints, desired tone, output format preferences
- Output: structured system prompt with persona, rules, examples, edge case handling, and output spec

### `prompt_template_library` (Pro) — Curated Templates
Browse 100+ battle-tested prompt templates organized by category, each with fill-in variables and example output.
- Categories: coding, writing, analysis, data extraction, creative, business, education, research, translation
- Each template: description, variable placeholders, example input/output, compatible models, difficulty level

### `purchase_pro_key` — Upgrade to Pro
Get a Pro API key for full access to the template library and increased limits across all 9 OpenClaw servers.

## What NOT to Do

- **Don't expect enhancement to fix wrong intent** — Enhancement improves structure and clarity, not your underlying goal
- **Don't blindly trust scores** — A 60/100 prompt can outperform a 90/100 for specific niche tasks; context matters
- **Don't convert code-generation prompts** — Code prompts are largely model-agnostic; conversion adds minimal value

## Pricing

| Tier | Calls/Day | Price | Includes |
|------|-----------|-------|----------|
| Free | 10 | $0 | 5 tools (template library excluded) |
| Pro | 1,000 | $9/mo | All 6 tools + all 9 OpenClaw servers |
| x402 | Pay-per-call | $0.05 USDC | No account needed |

**Get Pro Key**: https://buy.stripe.com/4gw5na5U19SP9TW288

## Complete OpenClaw Suite

| Server | Tools | Best For |
|--------|-------|----------|
| JSON Toolkit | 6 | Data manipulation |
| Regex Engine | 5 | Pattern matching |
| Color Palette | 5 | Design systems |
| Timestamp Converter | 5 | Time operations |
| **Prompt Enhancer** | 6 | Prompt engineering |
| Market Intelligence | 6 | AI market analysis |
| Fortune & Tarot | 3 | Fun & engagement |
| Content Publisher | 8 | Social publishing |
| AgentForge Compare | 5 | Tool comparison |

All 9 servers share one Pro key. **One subscription = 49 tools.**
