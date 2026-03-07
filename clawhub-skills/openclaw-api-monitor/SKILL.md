---
name: openclaw-api-monitor
version: 2.0.0
description: "API monitoring and cost tracking MCP server with 5 tools for AI providers. Use when: (1) 'is OpenAI API down' or 'check Anthropic status', (2) 'how many tokens have I used today' or 'API usage stats', (3) 'alert me when I spend $50' or 'budget limit notification', (4) 'how much am I spending on each provider' or 'cost breakdown', (5) 'route to cheapest API' or 'optimize provider selection'. APIWatch Engine. Free 20/day + Pro $9/mo."
read_when:
  - User asks about API status — "is OpenAI down", "Anthropic API status", "is Groq working"
  - User wants usage stats — "how many tokens used", "API calls today", "usage this month"
  - User needs budget alerts — "alert at $50", "budget limit", "notify when spend hits target"
  - User wants cost breakdown — "cost per provider", "spending on GPT-4", "API cost analysis"
  - User needs routing optimization — "cheapest model", "fastest API right now", "route to best provider"
metadata:
  openclaw:
    emoji: "\U0001F4F6"
    homepage: https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers
    always: false
---

# OpenClaw API Monitor v2.0

**API monitoring, cost tracking, and intelligent routing for AI providers. 5 tools. Real-time status. Budget alerts.**

| Tool | Purpose | Free |
|------|---------|------|
| `check_api_status` | Real-time status check for 20+ AI API providers | Yes |
| `get_usage_stats` | Token usage, call counts, and costs across all connected providers | Yes |
| `set_budget_alert` | Telegram alert when spending crosses a daily/monthly threshold | Pro |
| `get_cost_breakdown` | Detailed cost analysis by provider, model, and time period | Yes |
| `optimize_routing` | Recommend the best provider for a given task based on cost, speed, and availability | Yes |

## What's New in v2.0

- **APIWatch Engine** -- Real-time status monitoring for 20+ AI providers using official status pages + synthetic probes every 2 minutes.
- **CostLens** -- Unified cost tracking across OpenAI, Anthropic, Groq, DeepInfra, and 16 more providers. See your true total AI spend in one number.
- **SmartRoute** -- Recommends the optimal provider for each task type based on current uptime, latency, rate limit headroom, and cost-per-token.
- **BudgetGuard** -- Hard and soft limits. Soft limit sends Telegram alert. Hard limit automatically routes calls away from the over-budget provider.

## Quick Start

```json
{
  "openclaw-api-monitor": {
    "type": "streamable-http",
    "url": "https://openclaw-api-monitor-mcp.yagami8095.workers.dev/mcp"
  }
}
```

Add to Claude Desktop, Cursor, Windsurf, VS Code, or any MCP-compatible client. Zero install. Works immediately.

## Detection Triggers

This skill activates when a user says any of these:
- "is OpenAI down", "Anthropic API status", "check Groq", "provider status", "API outage"
- "how many tokens used", "API usage stats", "calls today", "usage this month", "token count"
- "alert at $50", "budget limit", "notify when spend hits", "API budget", "spending alert"
- "cost breakdown", "spending per provider", "GPT-4 cost", "API cost analysis", "cost per model"
- "cheapest model for this", "fastest API", "route to best provider", "optimize API selection"
- "rate limit", "rate limit remaining", "quota", "how many calls left today"

## Named Protocols

### APIWatch Engine
Continuous status monitoring across the AI provider ecosystem:

**Monitored providers (20+):**

| Tier | Providers |
|------|----------|
| Frontier | OpenAI (GPT-4o, o1, o3), Anthropic (Claude 3.5/3), Google (Gemini 2.5) |
| Fast/Cheap | Groq (Llama 3.3), DeepInfra (DeepSeek R1), Together AI, Fireworks |
| Specialized | Perplexity (search), Mistral (EU), Cohere (RAG), AI21 |
| Image/Audio | Stability AI, ElevenLabs, Whisper (OpenAI) |
| Infrastructure | Cloudflare Workers AI, Replicate, Modal |

**Status determination:**

| Status | Definition |
|--------|-----------|
| `operational` | <500ms avg response, <1% error rate, no reported incidents |
| `degraded` | 500ms–2s avg response OR 1–10% error rate |
| `partial_outage` | Specific models/regions down, others operational |
| `major_outage` | >10% error rate OR API completely unreachable |
| `maintenance` | Scheduled downtime per official status page |

**Probe method:** Synthetic API call (cheapest model, 1-token completion) every 2 minutes from Cloudflare edge.

### SmartRoute Protocol
Recommendation engine for provider selection:

**Scoring factors:**

| Factor | Weight | How Measured |
|--------|--------|-------------|
| Current status | 40% | APIWatch real-time status |
| Cost efficiency | 25% | $/1M tokens for the task type |
| Latency (p50) | 20% | Last 100 synthetic probes |
| Rate limit headroom | 15% | Your remaining quota vs daily limit |

**Task types and their routing preferences:**

| Task Type | Primary Recommendation | Fallback |
|-----------|----------------------|---------|
| Long reasoning | DeepInfra/DeepSeek-R1 | Anthropic Claude 3.7 |
| Fast chat | Groq/Llama-3.3-70B | Fireworks/Llama-3.1 |
| Code generation | Anthropic Claude 3.5 | OpenAI o1 |
| Structured JSON | OpenAI GPT-4o | Anthropic Claude 3.5 |
| Web search | Perplexity | OpenAI with search |
| Image gen | Stability AI | OpenAI DALL-E 3 |

### BudgetGuard Levels

| Level | Threshold | Action |
|-------|-----------|--------|
| `info` | 50% of budget | Telegram notification only |
| `warning` | 80% of budget | Telegram + suggest switching to cheaper provider |
| `critical` | 95% of budget | Telegram + auto-route new calls to free-tier alternatives |
| `hard_limit` | 100% of budget | Block all calls to that provider until reset period |

## Tools (5)

### `check_api_status` -- Real-Time Provider Status via APIWatch Engine
Check current status of any AI provider or get a full ecosystem status dashboard.

**Wrong / Right:**

```
WRONG: Sending a failing API call to OpenAI 10 times before checking if they're down
RIGHT: check_api_status({ provider: "openai" })
       -> { status: "partial_outage", affected: ["gpt-4o", "o1"],
            operational: ["gpt-4o-mini", "text-embedding-3"],
            incident: "Elevated error rates on flagship models since 14:32 UTC",
            eta_resolved: "~30 minutes (per status page)" }
       -> Know before you retry. Save tokens and sanity.

WRONG: check_api_status({ provider: "openai" }) as a replacement for proper retry logic
RIGHT: APIWatch tells you the current state. Your application should still implement
       exponential backoff and retry for transient errors.
```

### `get_usage_stats` -- Usage Analytics via CostLens
Get token usage, call counts, and costs aggregated across all connected providers.

**Wrong / Right:**

```
WRONG: Checking 5 separate provider dashboards to understand total AI spend
RIGHT: get_usage_stats({ range: "this_month" })
       -> { total_cost_usd: 12.47, total_tokens: 8_420_000, total_calls: 3_214,
            by_provider: [
              { provider: "deepinfra", cost: 7.23, tokens: 6_100_000 },
              { provider: "groq", cost: 0.00, tokens: 1_800_000 },
              { provider: "anthropic", cost: 5.24, tokens: 520_000 }
            ] }
       -> One call. True total. Actionable breakdown.

WRONG: Expecting usage_stats to track calls made outside this toolkit
RIGHT: get_usage_stats only tracks calls made through your connected provider API keys.
       Calls made directly via provider dashboards or other tools are not counted.
```

### `set_budget_alert` (Pro) -- Budget Notification via BudgetGuard
Set a spending threshold that triggers Telegram alerts and optional auto-routing.

**Parameters:** provider (or "all"), budget_usd, period (daily/monthly), telegram_chat_id, hard_limit (bool)

### `get_cost_breakdown` -- Detailed Cost Analysis via CostLens
Get a detailed cost breakdown by provider, model, and time period with efficiency metrics.

**Returns:** cost per model, cost per 1M tokens, trend (up/down/stable vs prior period), most expensive calls, cost optimization suggestions

### `optimize_routing` -- Provider Recommendation via SmartRoute Protocol
Get a recommendation for which provider and model to use for a given task.

**Parameters:** task_type (reasoning/fast-chat/code/json/search/image), budget_constraint (optional $/1M tokens max), latency_requirement (optional ms max)

**Returns:** primary recommendation (provider, model, reason), fallback option, current_cost_per_1m_tokens, current_latency_p50_ms, status

## Security & Privacy

- **API keys encrypted** -- Provider API keys stored with AES-256 encryption. Never returned in API responses, never logged.
- **Usage data stays yours** -- Your usage statistics are scoped to your Pro key and never aggregated with other users' data.
- **Read-only key scopes** -- For usage stats, we only require read-only API access where providers support it (OpenAI usage scope, etc.).
- **No call interception** -- API Monitor tracks via provider APIs, not by proxying your calls. Your API calls go directly to providers, not through our servers.
- **Budget hard limits are local** -- Hard limit enforcement happens at the APIWatch Edge level and does not require any changes to your application code.
- **HTTPS only** -- All connections are TLS 1.3. HTTP is rejected.

## Pricing

| Tier | Calls/Day | Price | Includes |
|------|-----------|-------|----------|
| **Free** | 20 | $0 | check_api_status + get_usage_stats + get_cost_breakdown + optimize_routing |
| **Pro** | 1,000 | $9/mo | All 5 tools + BudgetGuard + hard limits + Telegram alerts + all 9 OpenClaw servers |
| **x402** | Pay-per-call | $0.05 USDC | No account needed, crypto-native |

**Get Pro Key**: https://buy.stripe.com/4gw5na5U19SP9TW288

## The OpenClaw Intelligence Stack

| Server | Tools | Best For |
|--------|-------|----------|
| **API Monitor** | 5 | Provider status, cost tracking, smart routing |
| **Health Monitor** | 4 | 24/7 uptime, SLA reports, Telegram alerts |
| **Revenue Tracker** | 4 | Multi-source revenue, MRR, milestone alerts |
| **Telegram Bot** | 5 | Messages, alerts, reports, command handling |
| **Agent Orchestrator** | 5 | Multi-agent spawn, coordinate, aggregate |
| **Database Toolkit** | 5 | D1/PostgreSQL/MongoDB query and manage |
| **Task Queue** | 5 | Persistent agent tasks, dependencies, assignment |
| **Web Scraper** | 5 | Stealth scraping, structured extraction |
| **Market Intelligence** | 6 | AI market trends, GitHub stats, competitor analysis |

All 9 servers share one Pro key. **$9/mo = 49 tools.**
