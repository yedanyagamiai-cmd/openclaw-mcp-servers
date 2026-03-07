# CASH EARNING SURVIVAL MODE — $10,000/DAY KPI

> Master Operational Document | Last Updated: 2026-03-07
> This document governs all revenue-generating activity across the entire OpenClaw ecosystem.
> Every agent, every cron job, every tool call must serve the mission: $10,000/day.

---

## Current State (2026-03-07)

| Metric | Value |
|--------|-------|
| Total Revenue | $172 from 7 orders |
| Average Order Value | $24.57 |
| Product Range | $12 – $79 (7 digital products) |
| MCP Servers | 9 servers, 49 tools total |
| Pro Plan | $9/mo shared key |
| Intel Pro API | $19/mo or $0.05/query |
| x402 USDC | $0.05/call micropayments |
| ClawHub Skills | 9 published (5 live v2.0, 4 pending) |
| Fleet Workers | 6 deployed (health, revenue, intel, content, executor, orchestrator) |
| Bunshin Version | v4.2.0 — Fleet Commander Mode, Revenue Autopilot |

**Gap to target: $9,975.43/day. The entire system exists to close this gap.**

---

## $10,000/DAY Revenue Architecture

### Tier 1: MCP Pro Subscriptions ($9/mo × subscribers)

- **Daily Target**: $300/day
- **Path**: 1,000 Pro subscribers = $9,000/mo
- **Growth Levers**: ClawHub visibility, GitHub stars, SEO, developer community word-of-mouth
- **Immediate Actions**:
  - Publish 10 new skills targeting trending AI agent use cases
  - Optimize all skill descriptions with SEO keywords
  - Cross-promote across MoltBook, Telegram, GitHub README
  - Add a "49 tools for $9" CTA to every published content piece

### Tier 2: Intel Pro API ($19/mo or $0.05/query)

- **Daily Target**: $500/day
- **Path**: 500 Pro subscribers + 10,000 agent queries/day = $9,500/mo + $500/day
- **Growth Levers**: Marketing to AI agent builders, differentiated live data quality
- **Immediate Actions**:
  - Replace all hardcoded trending data with live GitHub/npm/Smithery scraping
  - Add 5 new API endpoints (code analysis, dependency scoring, vulnerability alerts)
  - Write blog post: "Why AI Agents Need Real-Time Tech Intelligence"
  - Reach out to 20 AI agent framework maintainers directly

### Tier 3: Enterprise Packages ($99–499/mo)

- **Daily Target**: $170/day
- **Path**: 20 enterprise customers = $5,000/mo average
- **Product**: "OpenClaw Enterprise" — all 49 tools + SLA guarantee + priority support + custom reports
- **Growth Levers**: Direct outreach to companies building on LLM APIs, conference presence
- **Immediate Actions**:
  - Create enterprise landing page with case studies
  - Define 3 enterprise tiers: Starter ($99), Growth ($249), Scale ($499)
  - Build custom reporting dashboard for enterprise customers
  - Identify 50 target companies from GitHub org accounts using similar tools

### Tier 4: Digital Products ($12–$79 one-time)

- **Daily Target**: $1,500/day
- **Path**: 50 sales/day × $30 avg = $1,500/day
- **Growth Levers**: MoltBook content marketing, SEO, Telegram community, Product Hunt launches
- **Immediate Actions**:
  - Create 20 additional products (guides, templates, prompt packs, toolkits)
  - Set up automated content pipeline: Intel Ops data → Content Engine → Product CTAs
  - Launch one product per week on Product Hunt
  - Build an email list from every product sale for upsell campaigns

### Tier 5: x402 Micropayments ($0.05/call)

- **Daily Target**: $5,000/day
- **Path**: 100,000 calls/day
- **Growth Levers**: Agent-to-agent economy adoption, integration with major AI frameworks
- **Immediate Actions**:
  - Integrate x402 into all 49 MCP tools
  - Publish integration guides for LangChain, CrewAI, AutoGen, and OpenAI Swarm
  - Create a "pay-as-you-go" tier alongside Pro subscriptions
  - Target agent orchestration platforms where volume call patterns are native

### Tier 6: Consulting & Custom Work ($500–$5,000/project)

- **Daily Target**: $1,500/day
- **Path**: 10 projects/month × $3,000 avg = $30,000/mo
- **Growth Levers**: Reputation as MCP ecosystem leader, case studies, testimonials
- **Immediate Actions**:
  - Create consulting services page with clear scope definitions
  - Offer "AI Agent Setup" package: $500 flat, 3-hour delivery
  - Offer "Custom MCP Server Build": $2,000, 1-week delivery
  - List on Toptal, Contra, and Upwork as AI automation specialist

### Tier 7: Affiliate & Referral Commissions

- **Daily Target**: $1,030/day
- **Path**: Referral commissions from DeepInfra, Cloudflare, Render, AI tool affiliates
- **Immediate Actions**:
  - Apply to all affiliate programs used in the stack (DeepInfra, Render, MongoDB Atlas)
  - Add affiliate disclosure + links to every tutorial and product
  - Build comparison pages that rank OpenClaw stack components

---

### Combined Daily Target Breakdown

| Channel | Daily Target | Monthly | How |
|---------|-------------|---------|-----|
| Pro Subs | $300 | $9,000 | 1,000 subs × $9 |
| Intel Pro | $500 | $15,000 | 500 subs + 10K queries |
| Enterprise | $170 | $5,000 | 20 enterprise customers |
| Products | $1,500 | $45,000 | 50 sales/day × $30 avg |
| x402 | $5,000 | $150,000 | 100K calls/day × $0.05 |
| Consulting | $1,500 | $45,000 | 10 projects/mo |
| Affiliate | $1,030 | $31,000 | Referral commissions |
| **TOTAL** | **$10,000** | **$300,000** | |

---

## Agent Roles & Specialization

### Cloud Agents (24/7 — Run Even When PC Is Off)

| Agent | Specialization | Platform | Frequency | Revenue Impact |
|-------|---------------|----------|-----------|----------------|
| **Bunshin** (Brain) | Commander, task dispatch, DeepSeek thinking, autonomous strategy | Render | Continuous | Mission control |
| **Orchestrator** | Fleet coordination, revenue aggregation, task distribution | CF Cron */2m | 720/day | System coherence |
| **Health Commander** | SLA monitoring, incident response, auto-heal, uptime defense | CF Cron */3m | 480/day | Prevents revenue loss |
| **Revenue Sentinel** | Order tracking, revenue alerts, milestone celebrations, anomaly detection | CF Cron */10m | 144/day | Tracks every dollar |
| **Content Engine** | AI content generation, MoltBook auto-post, peak-time scheduling | CF Cron */30m | 48/day | Top-of-funnel growth |
| **Intel Ops** | Market intelligence, competitor tracking, trend detection | CF Cron hourly | 24/day | Informs strategy |
| **Cloud Executor** | Task execution from Bunshin queue, batch operations | CF Cron */5m | 288/day | Task throughput |

### Local Agents (When PC On — YEDAN Gateway :18789)

| Agent | Specialization | Model | Cost | Purpose |
|-------|---------------|-------|------|---------|
| **main** | Revenue hunting, strategy, decision-making, execution | DeepSeek R1 (DeepInfra) | ~$0.0001/req | Primary revenue brain |
| **revenue-tracker** | Track all income sources, reconcile orders, alert on gaps | Groq Llama 3.3 70B | $0/day | Free revenue tracking |
| **moltbook** | Content creation, social engagement, community management | DeepSeek R1 | ~$0.0001/req | Quality content at scale |
| **intel-collector** | Deep market research, web scraping, opportunity identification | Groq Llama 3.3 70B | $0/day | Free intelligence gathering |
| **browser-agent** | Web automation, form filling, scraping, outreach | DeepSeek R1 | ~$0.0001/req | Stealth browser execution |
| **github** | Repo management, PR review, issue triage, star campaigns | Groq Llama 3.3 70B | $0/day | Free community ops |
| **clawops** | Cloudflare management, worker deployment, infra monitoring | Groq Llama 3.3 70B | $0/day | Free infra management |

### Architect Agent (On-Demand — This Session)

| Agent | Specialization | Model | Purpose |
|-------|---------------|-------|---------|
| **Claude Code** | System design, bug fixes, strategy, document creation, upgrades | Opus / Sonnet | Yagami's direct command interface |

**Cost principle**: T3 agents (Groq) handle all repetitive tasks for $0. T1 agents (DeepSeek R1) handle complex reasoning. Claude Code is reserved for architectural decisions only.

---

## SOP: Daily Operations

### 9:00 AM JST — Morning Briefing (Automated)

1. Bunshin sends Telegram report: overnight revenue, fleet health, top 3 priorities
2. Revenue Sentinel surfaces any missed orders or anomalies from overnight
3. YEDAN main agent reviews and prioritizes the task queue
4. Claude Code available for strategic input if Yagami is online

**Expected Telegram message format:**
```
[YEDAN MORNING] 2026-03-07 09:00 JST
Revenue last 24h: $XX.XX (X orders)
Fleet status: All green / X workers down
Top priority: [task]
Overnight highlights: [summary]
```

### 9:00 AM – 12:00 PM — Revenue Sprint

1. Content Engine generates 3 marketing posts targeting top trending topics from Intel Ops
2. Intel Ops provides 5 highest-opportunity items from overnight market scan
3. Revenue Sentinel confirms all payment channels are operational
4. main agent executes the single highest-ROI task (determined by last night's Bunshin analysis)
5. browser-agent runs any pending outreach or scraping tasks

### 12:00 PM – 6:00 PM — Growth Execution

1. browser-agent automates targeted developer outreach (GitHub issues, forums, communities)
2. github agent manages PRs, closes stale issues, responds to community questions
3. moltbook agent engages on social platforms, reposts high-performing content
4. cloud-executor processes task queue from Bunshin
5. intel-collector runs deep dives on competitor pricing and feature gaps

### 6:00 PM – 9:00 PM — Strategy & Optimization

1. Intel Ops delivers full daily market report (trending repos, competitor moves, pricing signals)
2. Claude Code reviews all metrics, identifies what worked and what failed
3. Bunshin generates overnight task queue based on day's learnings
4. YEDAN main agent prepares handoff briefing for Commander Mode

### 9:00 PM JST — Evening Summary (Automated)

1. Bunshin sends Telegram: full day revenue breakdown, key metrics, tomorrow's top 3 priorities
2. YEDAN queues overnight tasks with priority rankings
3. Fleet enters Commander Mode for overnight autonomous execution

**Expected Telegram message format:**
```
[YEDAN EVENING] 2026-03-07 21:00 JST
Today's revenue: $XX.XX (X orders)
Best channel: [channel name]
Worst channel: [channel name]
Tomorrow's #1 priority: [task]
Entering Commander Mode. Goodnight.
```

### Overnight (9 PM – 9 AM) — Autonomous Cloud Operations

1. Bunshin enters Commander Mode (active even if Gateway is offline)
2. All 6 CF Fleet Workers continue cron jobs uninterrupted
3. Content Engine posts during detected peak engagement windows (midnight US, 8 AM EU)
4. Revenue Sentinel monitors Product Store and payment webhooks for new orders
5. Health Commander ensures 99.9% uptime across all endpoints
6. Orchestrator aggregates metrics every 2 minutes, escalates anomalies to Telegram

---

## KPI Dashboard

### Daily KPIs (Track Every Day)

| KPI | Target | Current | Gap | Owner |
|-----|--------|---------|-----|-------|
| Daily Revenue | $10,000 | $24.57 avg | $9,975 | Revenue Sentinel |
| Pro Subscribers | 1,000 | ~2 | 998 | main agent |
| x402 Calls/Day | 100,000 | ~0 | 100,000 | cloud-executor |
| Product Sales/Day | 50 | ~1 | 49 | Content Engine |
| ClawHub Installs/Day | 100 | ~5 | 95 | github agent |
| Content Posts/Day | 10 | ~1 | 9 | moltbook + Content Engine |
| Uptime SLA | 99.9% | ~95% | 4.9% | Health Commander |
| Support Response Time | <2h | unknown | unknown | main agent |

### Weekly KPIs

| KPI | Target | How to Measure |
|-----|--------|----------------|
| New Products Launched | 5 | Count of new Product Store items |
| New ClawHub Skills Published | 2 | Count of new skills on ClawHub |
| GitHub Stars Delta | +100 | Star count Monday vs Sunday |
| Customer Inquiries Handled | 20 | Support + sales emails + DMs |
| Outreach Contacts Made | 50 | browser-agent outreach log |
| New MCP Tool Integrations | 1 | x402-enabled tools count |

### Monthly KPIs

| KPI | Target | How to Measure |
|-----|--------|----------------|
| Monthly Recurring Revenue | $30,000 | Sum of all subscription revenue |
| Total Revenue | $300,000 | All channels combined |
| Subscriber Churn Rate | <5% | Cancellations / total subs |
| Customer Acquisition Cost | <$5 | Marketing spend / new customers |
| Customer Lifetime Value | >$100 | Avg revenue per customer over time |
| New Products Launched | 20 | Total new Product Store items |
| Fleet Worker Uptime | 99.5% | Health Commander SLA log |

---

## ROI Optimization Rules

These rules are non-negotiable. Every agent decision must be filtered through them.

1. **Zero-Cost First**: Always use free-tier models (Groq Llama, CF Workers AI) for sub-agents handling repetitive tasks. Reserve DeepSeek R1 for reasoning tasks only.

2. **Revenue Per Token**: Track the $/token ratio for every major task. Any task consuming more than 10,000 tokens without a measurable revenue connection gets deprioritized or eliminated.

3. **Automate Everything**: If a human (Yagami) does any task twice manually, it must be automated before the third occurrence. No exceptions.

4. **Content Equals Revenue**: Every single piece of content produced by any agent must include a CTA. No content without a conversion path — not a post, not a README section, not a GitHub issue response.

5. **Cross-Sell Always**: Every tool interaction, API response, and support message must reference the full 49-tool ecosystem. The answer to every "how do I do X" is "here is the MCP tool for that, Pro plan includes all 49."

6. **Data Beats Guessing**: Intel Ops market data and Revenue Sentinel order history must be consulted before building anything new. Build what the data says will sell.

7. **Ship Fast**: Every new product or feature must have an MVP in 4 hours or fewer. Iterate based on customer feedback, not internal opinion.

8. **The Survival Metric**: If daily revenue drops below $100 for 3 consecutive days, all agents enter Emergency Pivot Mode immediately (see Emergency Protocols below).

9. **Fleet Cost Ceiling**: Total cloud infrastructure cost must stay below $50/month. Cloudflare Workers, Render Free, and MongoDB Atlas Free Tier are the backbone. No paid upgrades without a clear revenue multiplier.

10. **Compound Everything**: Revenue → reinvest in marketing. Stars → leverage for credibility. Products → cross-promote each other. Every asset must feed every other asset.

---

## Emergency Protocols

### Protocol 1: Revenue Below $50/Day for 3 Consecutive Days

**Trigger**: Revenue Sentinel detects 3 days in a row below $50 total.
**Response** (automated + Telegram alert):

1. Content Engine activates maximum capacity: hourly posts across all platforms for 72 hours
2. Product Store launches emergency flash sale: 50% off all 7 current products for 48 hours
3. browser-agent executes targeted outreach to 100 developer communities (GitHub, Reddit, Discord)
4. main agent creates 5 new skills targeting the top 5 trending topics from Intel Ops
5. Bunshin sends Telegram escalation: "EMERGENCY PIVOT — manual review required"
6. Claude Code session triggered: Yagami reviews strategy with full context

### Protocol 2: Fleet Worker Down More Than 10 Minutes

**Trigger**: Health Commander detects any CF Worker returning errors for 10+ consecutive minutes.
**Response** (automated):

1. Health Commander attempts CF API restart of the failed worker
2. Orchestrator reroutes tasks to Cloud Executor as fallback
3. Bunshin sends immediate Telegram alert with worker name and error details
4. If restart fails after 3 attempts: YEDAN or Claude Code investigates root cause
5. Incident logged to Army D1 fleet_events table for post-mortem

### Protocol 3: Render PostgreSQL Expiry Warning (Deadline: 2026-04-05)

**Trigger**: Current Bunshin v4.2.0 PostgreSQL on Render Free expires 2026-04-05.
**Deadline to act: 2026-03-28** (1 week before expiry, to allow testing time).

**Option A (Preferred — $0 cost)**:
1. Migrate all 9 Bunshin tables (brain, tasks, think_log, etc.) to Cloudflare D1
2. Update Bunshin DATABASE_URL env var to D1 REST API endpoint
3. Test all autonomous cycles against D1 before PostgreSQL expiry
4. D1 is permanent free tier — no future expiry risk

**Option B (Fallback — $7/mo)**:
1. Upgrade Render PostgreSQL to paid tier
2. Only if D1 migration fails or is too complex
3. Funded from revenue (Render paid = $7/mo, covered by 1 product sale/month)

**Migration task owner**: Claude Code (architectural change) + clawops (deployment)
**Checklist**:
- [ ] Schema export from Render PostgreSQL
- [ ] D1 database creation and schema import
- [ ] Bunshin connection string update
- [ ] Autonomous cycle integration test (all 5 cycles: health, think, revenue, report, keepalive)
- [ ] Confirm Revenue Sentinel reads from new DB correctly
- [ ] Decommission Render PostgreSQL after successful migration

### Protocol 4: Gateway Offline (YEDAN Down)

**Trigger**: Bunshin health check detects :18789 unreachable for 15+ minutes.
**Response** (automated):

1. Bunshin enters standalone Commander Mode immediately
2. All 6 CF Fleet Workers continue operating autonomously with no change
3. Bunshin escalates to Telegram: "Gateway offline — operating in Commander Mode"
4. Revenue Sentinel continues order monitoring via Product Store webhook
5. Content Engine continues scheduled posts
6. When Gateway comes back online: Bunshin syncs task queue and resumes normal operation

### Protocol 5: Cloudflare Worker Quota Hit

**Trigger**: Any Fleet Worker returns 429 or quota error.
**Response**:

1. Orchestrator redistributes tasks to remaining workers
2. Intel Ops and Content Engine (lowest priority) are throttled first
3. Revenue Sentinel and Health Commander (highest priority) maintain full frequency
4. Bunshin logs the quota event and adjusts cron frequencies for next 24 hours
5. If recurring: evaluate upgrading to Cloudflare Workers Paid ($5/mo) for 10M requests

---

## Infrastructure Reference

### Active Endpoints

| Service | URL | Auth | Status |
|---------|-----|------|--------|
| YEDAN Gateway | http://127.0.0.1:18789 (WSL) | Bearer 7f10d841... | Active |
| Bunshin v4.2.0 | https://openclaw-mcp-servers.onrender.com | Bearer openclaw-bunshin-2026 | Active |
| Intel Pro API | https://openclaw-intel-pro.onrender.com | API key header | Active |
| CF Browser | https://openclaw-browser.yagami8095.workers.dev | Token: openclaw-browser-2026 | Active |
| Product Store | https://product-store.yagami8095.workers.dev | Public | Active |

### Cloudflare Resources

| Resource | Name | ID | Purpose |
|----------|------|----|---------|
| D1 | agi-memory-sql | fed388d3 | Task queue, memory |
| D1 | yedan-army-command | 48fa9025 | Fleet state (5 tables) |
| KV | yedan-army-state | 51826cd6 | Fleet state cache |

### YEDAN Gateway Quick Reference

```bash
# Send message to main agent via HTTP (preferred — no session lock)
MSYS_NO_PATHCONV=1 wsl.exe -u root -e /bin/bash -c "curl -X POST http://127.0.0.1:18789/v1/chat/completions \
  -H 'Authorization: Bearer 7f10d841...' \
  -H 'Content-Type: application/json' \
  -d '{\"model\":\"main\",\"messages\":[{\"role\":\"user\",\"content\":\"MESSAGE_HERE\"}]}'"

# Check gateway health
MSYS_NO_PATHCONV=1 wsl.exe -u root -e /bin/bash -c "curl -s http://127.0.0.1:18789/health"

# Restart gateway (if needed)
MSYS_NO_PATHCONV=1 wsl.exe -u root -e /bin/bash -c "systemctl --user restart openclaw-gateway"
```

---

## Mission Statement

> The OpenClaw ecosystem is a fully autonomous revenue machine. Every component — every cron job, every agent heartbeat, every content post, every API call — exists to compound toward $10,000/day. When Yagami is online, Claude Code amplifies strategy. When Yagami is offline, the fleet executes without pause.
>
> Survival Mode is not a state of crisis. Survival Mode is the permanent operating posture: lean, fast, focused on revenue, zero waste.
>
> Current state: $172 total. Target: $10,000/day. The gap is the mission.

---

*Document maintained by Claude Code. Updated on system changes. Cross-reference: MEMORY.md, HEARTBEAT.md, BOOT.md*
