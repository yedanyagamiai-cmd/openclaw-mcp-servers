---
name: openclaw-health-monitor
version: 2.0.0
description: "24/7 uptime monitoring MCP server with 4 tools for any URL or API. Use when: (1) 'is my site down' or 'check if API is online', (2) 'uptime report' or 'SLA percentage this month', (3) 'set alert when site goes down' or 'Telegram notification on failure', (4) 'incident history' or 'how many outages last week'. Cloudflare edge checks, sub-second detection, Telegram alerts. Free 20/day + Pro $9/mo."
read_when:
  - User asks "is my site down", "check uptime", or "is the API responding"
  - User wants an uptime report — "SLA this month", "how many nines", "uptime percentage"
  - User needs alert setup — "notify me when it goes down", "Telegram alert on failure"
  - User asks about incident history — "last outage", "how many failures", "downtime log"
  - User mentions monitoring, uptime, or availability for any URL or endpoint
metadata:
  openclaw:
    emoji: "\U0001F6A8"
    homepage: https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers
    always: false
---

# OpenClaw Health Monitor v2.0

**24/7 uptime monitoring for any URL or API. 4 tools. Telegram alerts. Cloudflare edge checks. Zero config.**

| Tool | Purpose | Free |
|------|---------|------|
| `check_health` | Instant health check for any URL — status, latency, response code | Yes |
| `get_uptime_report` | Uptime percentage, SLA metrics, and incident count over time range | Yes |
| `set_alert_rules` | Configure Telegram alerts for downtime, slow response, or SSL expiry | Pro |
| `get_incident_history` | Full incident log with timestamps, duration, root cause classification | Yes |

## What's New in v2.0

- **HealthPulse Engine** -- Cloudflare Workers edge checking from 300+ global PoPs. Know when your Tokyo users see downtime before you do.
- **SmartAlert Protocol** -- Deduplication prevents alert storms. One alert when it goes down, one when it recovers. No spam.
- **SLA Dashboard** -- Auto-calculated uptime percentages with nines (99.9%, 99.99%, etc.) and business-hours exclusion.
- **Multi-Target Monitoring** -- Check up to 50 endpoints per Pro account with a single `check_health` batch call.

## Quick Start

```json
{
  "openclaw-health-monitor": {
    "type": "streamable-http",
    "url": "https://openclaw-health-monitor-mcp.yagami8095.workers.dev/mcp"
  }
}
```

Add to Claude Desktop, Cursor, Windsurf, VS Code, or any MCP-compatible client. Zero install. Works immediately.

## Detection Triggers

This skill activates when a user says any of these:
- "is my site down", "check if online", "is the API responding", "health check"
- "uptime report", "SLA percentage", "how many nines", "availability this month"
- "set alert when site goes down", "Telegram notification on failure", "ping me on downtime"
- "incident history", "last outage", "downtime log", "how many failures last week"
- "monitor my API", "watch this URL", "uptime monitoring", "availability check"
- "SSL expiry alert", "slow response alert", "latency threshold", "response time monitoring"

## Named Protocols

### HealthPulse Engine
The core monitoring engine running on Cloudflare's global edge network:

- **Edge-first checks** -- Requests originate from the Cloudflare PoP nearest to your users, not a single datacenter in Virginia
- **Multi-layer detection** -- TCP connectivity, HTTP response, SSL validity, and response body checks in one pass
- **Sub-second alerting** -- From failure detection to Telegram notification in under 800ms
- **Retry logic** -- 2 automatic retries with 200ms backoff before declaring an incident, eliminating false positives from transient blips

What gets checked per `check_health` call:

| Check | What It Detects |
|-------|----------------|
| TCP connect | Port closed, firewall blocking, server crash |
| HTTP status | 4xx client errors, 5xx server errors, redirects |
| Response time | Latency spikes, slow database queries, CDN issues |
| SSL certificate | Expiry (warns 30/14/7 days out), invalid cert, chain errors |
| Body pattern | Optional regex match to confirm correct content is served |

### SmartAlert Protocol
Alert management that keeps you informed without flooding your Telegram:

1. **Incident opens** -- Alert sent immediately when 2 consecutive checks fail
2. **Silence window** -- No repeat alerts during ongoing incident (configurable 5–60min)
3. **Escalation** -- If incident persists past threshold, escalates to secondary Telegram chat
4. **Recovery** -- Single "Site is back" message with total downtime duration
5. **Weekly digest** -- Pro users receive Sunday morning summary of all incidents and SLA

### SLA Calculation Rules
How uptime percentages are computed:

| Metric | Formula |
|--------|---------|
| Raw uptime % | (total minutes - downtime minutes) / total minutes × 100 |
| Business-hours uptime | Same, but only counts 09:00–18:00 in your configured timezone |
| Nines classification | 99.9% = 8.7h/yr, 99.99% = 52min/yr, 99.999% = 5.2min/yr |
| Incident MTTR | Average minutes from incident open to recovery across all incidents |

## Tools (4)

### `check_health` -- Instant Health Check via HealthPulse Engine
Run an immediate health check on any URL. Returns status, latency, HTTP code, SSL validity, and optional body match.

**Wrong / Right:**

```
WRONG: Asking "is my site down?" and getting a guess based on training data
RIGHT: check_health({ url: "https://myapi.com/health" })
       -> { status: "down", http_code: 503, latency_ms: null,
            ssl_valid: true, ssl_days_remaining: 42,
            error: "Connection refused after 2 retries",
            checked_from: "Tokyo edge, Singapore edge" }
       -> Actionable. Real. 800ms total.

WRONG: Using check_health as a load testing tool (it's single-check, not burst)
RIGHT: Use check_health for point-in-time diagnosis.
       Use set_alert_rules for continuous monitoring at configurable intervals.
```

### `get_uptime_report` -- SLA Report
Get uptime percentage, incident count, and SLA classification for a monitored endpoint over a time range.

**Wrong / Right:**

```
WRONG: "What's my uptime?" to an AI that has no visibility into your infrastructure
RIGHT: get_uptime_report({ url: "https://myapi.com", range: "30d" })
       -> { uptime_pct: 99.87, nines: "three-nines", incidents: 3,
            total_downtime_min: 55, mttr_min: 18,
            sla_met: true, threshold: 99.5 }

WRONG: Expecting sub-minute granularity on free tier (free tier checks every 5min)
RIGHT: Pro tier checks every 60 seconds. Free tier checks every 5 minutes.
       Both are sufficient for most API monitoring needs.
```

### `set_alert_rules` (Pro) -- Configure Telegram Alerts via SmartAlert Protocol
Set up alert rules for a URL: downtime threshold, latency threshold, SSL expiry warning, and Telegram chat ID.

**Parameters:** url, telegram_chat_id, latency_threshold_ms (optional), ssl_warn_days (default 30), check_interval_sec (60–3600)

### `get_incident_history` -- Incident Log
Retrieve the full incident history for a monitored URL with timestamps, duration, root cause classification, and recovery events.

**Returns:** incident ID, opened_at, resolved_at, duration_min, root_cause (tcp/http/ssl/timeout/body), affected_checks

## Security & Privacy

- **No content storage** -- Health check responses are evaluated in-memory. Response bodies are never stored, only matched against your configured pattern.
- **Credentials never logged** -- If your health check URL contains API keys in query params, they are redacted from all logs and reports.
- **Alert isolation** -- Your Telegram chat ID is stored encrypted. It is never shared, never used for any purpose other than sending your alerts.
- **Edge isolation** -- Each check runs in an isolated Cloudflare Workers V8 isolate. No shared state between users.
- **HTTPS only** -- All MCP connections are TLS 1.3. HTTP is rejected.
- **You own your data** -- All incident history is associated with your Pro key. Downgrading to free does not delete history; it restricts access to the last 30 days.

## Pricing

| Tier | Calls/Day | Price | Includes |
|------|-----------|-------|----------|
| **Free** | 20 | $0 | check_health + get_uptime_report + get_incident_history |
| **Pro** | 1,000 | $9/mo | All 4 tools + set_alert_rules + 60s check interval + all 9 OpenClaw servers |
| **x402** | Pay-per-call | $0.05 USDC | No account needed, crypto-native |

**Get Pro Key**: https://buy.stripe.com/4gw5na5U19SP9TW288

## The OpenClaw Intelligence Stack

| Server | Tools | Best For |
|--------|-------|----------|
| **Health Monitor** | 4 | 24/7 uptime, SLA reports, Telegram alerts |
| **API Monitor** | 5 | Rate limits, cost tracking, provider analytics |
| **Revenue Tracker** | 4 | Stripe/PayPal/Gumroad revenue aggregation |
| **Task Queue** | 5 | Persistent agent tasks, assignment, tracking |
| **Agent Orchestrator** | 5 | Multi-agent spawn, coordinate, aggregate |
| **Telegram Bot** | 5 | Messages, alerts, reports, command handling |
| **Web Scraper** | 5 | Stealth scraping, structured extraction |
| **Database Toolkit** | 5 | D1/PostgreSQL/MongoDB query and manage |
| **Market Intelligence** | 6 | AI market trends, GitHub stats, competitor analysis |

All 9 servers share one Pro key. **$9/mo = 49 tools.**
