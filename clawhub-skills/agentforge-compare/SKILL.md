---
name: agentforge-compare
version: 2.0.0
description: "AI coding tool comparison MCP server — compare Claude Code vs Cursor vs Windsurf vs Devin vs Copilot side-by-side, get detailed tool profiles with pricing and strengths/weaknesses, browse tool categories, get AI-powered recommendations for your use case, and calculate total cost of ownership. Use when you need to pick the best AI coding tool, compare features between Cursor and Windsurf, check Devin pricing, get a recommendation based on your team size, or calculate monthly costs for your workflow. Zero install, sub-100ms on Cloudflare Workers. Free 10 calls/day, Pro $9/mo for 1000/day across all 9 OpenClaw servers."
metadata:
  openclaw:
    emoji: "\u2694\uFE0F"
    homepage: https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers
    always: false
---

# OpenClaw AgentForge Compare v2.0

**Pick the right AI tool — 5 tools to compare, profile, and calculate costs for AI coding assistants.**

## What's New in v2.0

- **15+ Tools Tracked** — Claude Code, Cursor, Windsurf, Devin, Copilot, Cody, Aider, Continue, and more.
- **AI Recommendations** — Describe your use case and get a ranked recommendation with reasoning (Pro).
- **Pricing Calculator** — Calculate monthly/annual costs factoring in team size, usage patterns, and add-ons.

## Quick Start

```json
{
  "openclaw-agentforge": {
    "type": "streamable-http",
    "url": "https://agentforge-compare-mcp.yagami8095.workers.dev/mcp"
  }
}
```

Add to Claude Desktop, Cursor, Windsurf, VS Code, or any MCP-compatible client. Works immediately.

## Quick Reference

| You want to... | Use this tool |
|----------------|---------------|
| Compare 2+ tools side-by-side | `compare_tools` |
| Get a detailed tool profile | `get_tool_profile` |
| Browse tools by category | `list_categories` |
| Get a personalized recommendation | `get_recommendations` (Pro) |
| Calculate total cost | `pricing_calculator` (Pro) |

## Detection Triggers

This skill activates when you:
- Say "compare Claude Code and Cursor" or "Cursor vs Windsurf" or "which AI tool"
- Ask "what's the best AI coding tool" or "compare AI assistants" or "Devin vs Copilot"
- Need "AI tool profile" or "tell me about Cursor" or "Windsurf features"
- Want to "browse AI coding tools" or "list AI tools by category" or "what tools exist"
- Request "recommend an AI tool for" or "which tool for my team" or "best for startups"
- Say "AI tool pricing" or "how much does Cursor cost" or "calculate AI tool costs"

## Tools (5)

### `compare_tools` — Side-by-Side Comparison
Compare 2 or more AI coding tools across all dimensions: features, pricing, model support, IDE support, strengths, and weaknesses.
- Input: list of tool names (e.g., ["Claude Code", "Cursor", "Windsurf"])
- Output: comparison table with ratings, feature matrix, pricing breakdown, and verdict summary
- Covers: code generation, debugging, refactoring, chat, terminal, multi-file editing, agent mode

### `get_tool_profile` — Detailed Tool Profile
Get a comprehensive profile for any single AI coding tool with pricing tiers, features, pros/cons, and user reviews summary.
- Returns: description, pricing (free/pro/enterprise), supported models, IDE integrations, key features
- Includes: strengths, weaknesses, best-for scenarios, alternatives, and recent changelog highlights

### `list_categories` — Tool Categories
Browse all tracked AI tools organized by category: IDE-integrated, CLI-based, cloud agents, code review, and specialized tools.
- Categories: coding assistants, code review, terminal agents, cloud-based agents, specialized (testing, docs, etc.)
- Each category: tool count, top tools, and brief comparison notes

### `get_recommendations` (Pro) — AI-Powered Recommendation
Describe your use case, team size, budget, and priorities, and get a ranked list of recommendations with detailed reasoning.
- Input: use case description, team size, monthly budget, must-have features, preferred IDE
- Output: top 3 recommendations ranked with match score, reasoning, tradeoffs, and migration tips

### `pricing_calculator` (Pro) — Total Cost Calculator
Calculate the complete monthly and annual cost for any AI tool configuration, including team seats and add-ons.
- Input: tool name, team size, plan tier, usage estimate (requests/day), add-ons needed
- Output: monthly cost, annual cost, per-developer cost, comparison with alternatives at same scale

## What NOT to Do

- **Don't expect real-time pricing** — Tool prices are updated weekly; check official sites for flash sales
- **Don't compare more than 5 tools at once** — Comparisons become unwieldy; narrow down to 2-3 finalists
- **Don't treat recommendations as absolute** — AI recommendations are starting points; always trial tools yourself

## Pricing

| Tier | Calls/Day | Price | Includes |
|------|-----------|-------|----------|
| Free | 10 | $0 | 3 tools (recommendations + calculator excluded) |
| Pro | 1,000 | $9/mo | All 5 tools + all 9 OpenClaw servers |
| x402 | Pay-per-call | $0.05 USDC | No account needed |

**Get Pro Key**: https://buy.stripe.com/4gw5na5U19SP9TW288

## Complete OpenClaw Suite

| Server | Tools | Best For |
|--------|-------|----------|
| JSON Toolkit | 6 | Data manipulation |
| Regex Engine | 5 | Pattern matching |
| Color Palette | 5 | Design systems |
| Timestamp Converter | 5 | Time operations |
| Prompt Enhancer | 6 | Prompt engineering |
| Market Intelligence | 6 | AI market analysis |
| Fortune & Tarot | 3 | Fun & engagement |
| Content Publisher | 8 | Social publishing |
| **AgentForge Compare** | 5 | Tool comparison |

All 9 servers share one Pro key. **One subscription = 49 tools.**
