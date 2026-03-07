---
name: openclaw-revenue-tracker
version: 2.0.0
description: "Revenue tracking MCP server with 4 tools for Stripe, PayPal, Gumroad, and crypto sources. Use when: (1) 'how much did I make today' or 'total revenue this month', (2) 'new order came in' or 'log this sale', (3) 'daily revenue report' or 'breakdown by product', (4) 'alert me when I hit $1000' or 'milestone notification'. Multi-source aggregation, real-time dashboards, Telegram reports. Free 20/day + Pro $9/mo."
read_when:
  - User asks "how much did I make", "total revenue", or "revenue this month/week/today"
  - User wants to log a sale — "track this order", "record payment", "new Gumroad sale"
  - User needs a revenue report — "daily breakdown", "revenue by product", "best sellers"
  - User wants milestone alerts — "notify me at $1000", "alert when MRR hits target"
  - User mentions Stripe, PayPal, Gumroad, or crypto payments in a revenue context
metadata:
  openclaw:
    emoji: "\U0001F4B0"
    homepage: https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers
    always: false
---

# OpenClaw Revenue Tracker v2.0

**Multi-source revenue aggregation for solopreneurs and AI agents. 4 tools. Real-time dashboards. Telegram milestone alerts.**

| Tool | Purpose | Free |
|------|---------|------|
| `get_revenue_summary` | Aggregate revenue across all connected sources for any time range | Yes |
| `track_order` | Manually log an order or payment from any source | Yes |
| `get_daily_report` | Formatted daily revenue report with product breakdown and trends | Yes |
| `set_milestone_alert` | Telegram alert when revenue hits a target (daily, weekly, MRR) | Pro |

## What's New in v2.0

- **RevenuePulse Engine** -- Live aggregation from Stripe, PayPal, Gumroad, and x402 USDC. One number. All sources.
- **MRR Tracker** -- Monthly Recurring Revenue calculated automatically from subscription products. See churn, growth, and net new MRR.
- **Product Leaderboard** -- Auto-ranked product list by revenue, units sold, and average order value updated every hour.
- **Telegram Reports** -- Daily 9am revenue briefing sent to your Telegram. Pro users get weekly trend analysis with R1 insights.

## Quick Start

```json
{
  "openclaw-revenue-tracker": {
    "type": "streamable-http",
    "url": "https://openclaw-revenue-tracker-mcp.yagami8095.workers.dev/mcp"
  }
}
```

Add to Claude Desktop, Cursor, Windsurf, VS Code, or any MCP-compatible client. Zero install. Works immediately.

## Detection Triggers

This skill activates when a user says any of these:
- "how much did I make", "total revenue", "revenue this week", "earnings today"
- "new order", "track this sale", "log payment", "Gumroad order came in"
- "daily report", "revenue breakdown", "best-selling product", "revenue by source"
- "hit my goal", "alert at milestone", "notify when MRR reaches", "revenue target"
- "Stripe dashboard", "PayPal sales", "Gumroad revenue", "crypto payment"
- "MRR", "monthly recurring revenue", "churn rate", "net new MRR", "ARR"

## Named Protocols

### RevenuePulse Engine
The core aggregation engine that unifies revenue data across payment processors:

**Supported Sources:**

| Source | Data Pulled | Refresh |
|--------|------------|---------|
| Stripe | Charges, subscriptions, refunds, disputes | Real-time webhook |
| PayPal | Completed payments, invoices, refunds | 15min polling |
| Gumroad | Sales, license key activations, refunds | 15min polling |
| x402 USDC | On-chain payments to your address | Per-block confirmation |
| Manual | Orders logged via track_order tool | Instant |

**Aggregation rules:**
- All amounts normalized to USD at time of transaction (crypto uses CoinGecko spot price)
- Refunds are subtracted from gross, shown separately as refund rate
- Disputes are flagged but not subtracted until resolved
- Currency conversion rates are locked at transaction time, never retroactively adjusted

### MilestoneAlert Protocol
Revenue targets trigger one-time Telegram notifications:

1. **Configure** -- Set target (e.g., $500/day, $5000/month MRR), metric, and Telegram chat ID
2. **Monitor** -- RevenuePulse checks every 15 minutes against your target
3. **Fire once** -- Alert fires exactly once when target is crossed. Not on every subsequent check.
4. **Reset** -- Targets auto-reset at the start of each period (daily targets reset at midnight UTC)
5. **Streak tracking** -- Pro users get "X days in a row above $Y" streak notifications

### Product Leaderboard Rules
How products are ranked and tracked:

| Metric | Calculation |
|--------|------------|
| Revenue rank | Total gross revenue in selected period |
| Unit rank | Total units sold (or activations for license products) |
| AOV | Average order value = gross / units |
| Refund rate | Refunds / gross × 100, flagged if >5% |
| Growth rate | This period vs prior period, same duration |

## Tools (4)

### `get_revenue_summary` -- Aggregate Revenue via RevenuePulse Engine
Pull unified revenue totals across all connected sources for a time range. Returns gross, net, refunds, source breakdown, and product breakdown.

**Wrong / Right:**

```
WRONG: Logging into Stripe, then PayPal, then Gumroad, then adding numbers manually
RIGHT: get_revenue_summary({ range: "today" })
       -> { gross_usd: 284.00, net_usd: 261.28, refunds_usd: 0,
            sources: { stripe: 195.00, gumroad: 89.00 },
            orders: 9, top_product: "MCP Starter Kit ($29)" }
       -> One call. All sources. Under 500ms.

WRONG: Expecting transaction-level detail from get_revenue_summary (it's aggregated)
RIGHT: Use get_daily_report for line-item breakdown.
       Use get_revenue_summary for fast top-level numbers.
```

### `track_order` -- Manual Order Logging
Log a payment or order from any source not yet connected to RevenuePulse.

**Wrong / Right:**

```
WRONG: Keeping a spreadsheet of manual orders that never shows up in your reports
RIGHT: track_order({ source: "paypal", amount: 29.00, product: "mcp-starter-kit",
                     currency: "USD", note: "Order #PP-7821" })
       -> Instantly appears in get_revenue_summary and get_daily_report
       -> Counted toward milestone alerts

WRONG: Logging test orders and wondering why revenue is inflated
RIGHT: Use track_order({ is_test: true }) to flag test entries.
       Test orders are excluded from all reports and milestone calculations.
```

### `get_daily_report` -- Daily Revenue Report
Get a formatted daily revenue report with product breakdown, source breakdown, comparison to yesterday and trailing 7-day average.

**Returns:** formatted Markdown report, gross/net, refund rate, top products, source split, day-over-day delta, 7-day average comparison

### `set_milestone_alert` (Pro) -- Milestone Notification via MilestoneAlert Protocol
Set a revenue target that triggers a Telegram notification when crossed.

**Parameters:** target_amount, metric (daily/weekly/mrr), telegram_chat_id, reset_period (daily/weekly/monthly)

## Security & Privacy

- **Payment credentials never stored** -- API keys for Stripe, PayPal, and Gumroad are stored encrypted at rest with AES-256. They are used only to pull data, never for writes.
- **No transaction data sold** -- Your revenue numbers are never aggregated, anonymized, or sold. We do not know your competitors.
- **Read-only access** -- RevenuePulse uses read-only API scopes. It cannot initiate refunds, move money, or modify orders.
- **Milestone data isolation** -- Your target amounts and Telegram chat ID are tied to your Pro key. Deleting the key purges all data.
- **Edge isolation** -- Each request runs in a Cloudflare Workers V8 isolate. No shared state between users.
- **HTTPS only** -- All connections are TLS 1.3. HTTP is rejected.

## Pricing

| Tier | Calls/Day | Price | Includes |
|------|-----------|-------|----------|
| **Free** | 20 | $0 | get_revenue_summary + track_order + get_daily_report |
| **Pro** | 1,000 | $9/mo | All 4 tools + milestone alerts + MRR tracking + all 9 OpenClaw servers |
| **x402** | Pay-per-call | $0.05 USDC | No account needed, crypto-native |

**Get Pro Key**: https://buy.stripe.com/4gw5na5U19SP9TW288

## The OpenClaw Intelligence Stack

| Server | Tools | Best For |
|--------|-------|----------|
| **Revenue Tracker** | 4 | Multi-source revenue aggregation, MRR, alerts |
| **Health Monitor** | 4 | 24/7 uptime, SLA reports, Telegram alerts |
| **API Monitor** | 5 | Rate limits, cost tracking, provider analytics |
| **Task Queue** | 5 | Persistent agent tasks, assignment, tracking |
| **Telegram Bot** | 5 | Messages, alerts, reports, command handling |
| **Crypto Payments** | 5 | x402 USDC micropayments, no accounts needed |
| **Content Autopilot** | 5 | AI content generation + auto-publishing |
| **Web Scraper** | 5 | Stealth scraping, structured extraction |
| **Market Intelligence** | 6 | AI market trends, GitHub stats, competitor analysis |

All 9 servers share one Pro key. **$9/mo = 49 tools.**
