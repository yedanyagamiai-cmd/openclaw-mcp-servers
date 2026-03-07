---
name: openclaw-web-scraper
version: 2.0.0
description: "Stealth web scraping MCP server with 5 tools for structured data extraction. Use when: (1) 'scrape this URL' or 'extract data from this site', (2) 'get all prices from this page' or 'extract structured data', (3) 'take a screenshot of this page', (4) 'click this button and get the result' or 'interact with a page', (5) 'scrape 50 URLs in batch' or 'bulk extract'. StealthCrawl Engine, anti-detection, real browser. Free 20/day + Pro $9/mo."
read_when:
  - User wants to scrape a URL — "scrape this site", "extract data from", "get content from URL"
  - User needs structured extraction — "get all prices", "extract all links", "parse this table"
  - User wants a screenshot — "screenshot this page", "capture this URL", "take a page snapshot"
  - User needs page interaction — "click login button", "fill this form", "interact with the page"
  - User wants bulk scraping — "scrape these 20 URLs", "batch extract", "crawl this site"
metadata:
  openclaw:
    emoji: "\U0001F578\uFE0F"
    homepage: https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers
    always: false
---

# OpenClaw Web Scraper v2.0

**Stealth web scraping with anti-detection and structured extraction. 5 tools. Real browser. Cloudflare bypass. Batch support.**

| Tool | Purpose | Free |
|------|---------|------|
| `scrape_url` | Fetch full page content with stealth headers and JS rendering | Yes |
| `extract_data` | Extract structured data using CSS selectors or natural language | Yes |
| `screenshot_page` | Capture full-page or viewport screenshot of any URL | Yes |
| `interact_with_page` | Click buttons, fill forms, scroll, wait for elements | Pro |
| `batch_scrape` | Scrape up to 50 URLs in parallel with rate limiting | Pro |

## What's New in v2.0

- **StealthCrawl Engine** -- Rotating User-Agents, real browser fingerprints, and Cloudflare bypass using the openclaw-browser CF Worker. Detected <5% of the time on major sites.
- **NLP Extraction** -- Pass a natural language instruction instead of a CSS selector: "extract all product names and prices" → structured JSON. No selector knowledge required.
- **SmartThrottle** -- Automatic rate limiting per domain. Respects robots.txt by default. Never gets your IP banned.
- **SessionPersist** -- Pro users can maintain cookies and session state across multiple interact_with_page calls. Log in once, scrape authenticated pages all session.

## Quick Start

```json
{
  "openclaw-web-scraper": {
    "type": "streamable-http",
    "url": "https://openclaw-web-scraper-mcp.yagami8095.workers.dev/mcp"
  }
}
```

Add to Claude Desktop, Cursor, Windsurf, VS Code, or any MCP-compatible client. Zero install. Works immediately.

## Detection Triggers

This skill activates when a user says any of these:
- "scrape this URL", "extract data from this site", "get the content of", "crawl this page"
- "get all prices", "extract all links", "parse this table", "pull product list from"
- "screenshot this page", "capture this URL", "take a snapshot", "page screenshot"
- "click the login button", "fill out this form", "interact with", "click and get result"
- "scrape 20 URLs", "batch scrape", "bulk extract", "crawl multiple pages"
- "get around Cloudflare", "bypass bot detection", "stealth scrape", "headless browser"

## Named Protocols

### StealthCrawl Engine
Anti-detection pipeline for reliable scraping across protected sites:

**Layer 1 — Identity spoofing:**
- Rotating pool of 200+ real browser User-Agent strings (Chrome 120, Firefox 122, Safari 17)
- Matching Accept-Language, Accept-Encoding, and Sec-Fetch-* headers per browser identity
- TLS fingerprint matching (JA3 hash aligned to browser identity)

**Layer 2 — Behavior simulation:**
- Random delay 500–2500ms between requests (mimics human reading time)
- Mouse movement and scroll simulation for JS-rendered sites
- Cookie handling identical to real browsers

**Layer 3 — Infrastructure:**
- Requests route through openclaw-browser CF Worker (stealth token required for Pro)
- Cloudflare challenge bypass via real headless Chrome at :18791
- IP rotation via Cloudflare's edge network (different egress IPs per request)

**Success rates by site type:**

| Site Type | Success Rate | Notes |
|-----------|-------------|-------|
| Static HTML | 99.9% | Direct fetch, no JS needed |
| JS-rendered (React/Vue) | 97% | Full headless Chrome render |
| Cloudflare-protected | 89% | CF Worker bypass |
| Aggressive bot detection (Akamai/Imperva) | 72% | Best-effort, may require Pro retry |

### SmartThrottle Rules
Automatic rate limiting to protect your IP and respect sites:

| Trigger | Action |
|---------|--------|
| >10 req/min to same domain (free) | Auto-throttle to 10 req/min |
| >60 req/min to same domain (Pro) | Auto-throttle to 60 req/min |
| 429 response received | Exponential backoff: 1s, 2s, 4s, 8s, then fail |
| robots.txt Disallow matched | Skip URL and return `{ skipped: true, reason: "robots.txt" }` |
| CAPTCHA detected | Return `{ blocked: true, reason: "captcha" }` — do not attempt bypass |

### NLP Extraction Protocol
Natural language → structured data without CSS selectors:

```
Input:  scrape_url result + extract_data({ instruction: "get all product names and prices" })
R1 analyzes DOM → identifies repeating product elements → extracts name/price pairs

Output: [
  { name: "MCP Starter Kit", price: "$29" },
  { name: "Automation Guide", price: "$15" },
  ...
]
```

Works for: tables, product grids, news articles, job listings, pricing pages, contact lists

## Tools (5)

### `scrape_url` -- Full Page Fetch via StealthCrawl Engine
Fetch the full rendered content of any URL. Returns HTML, extracted text, meta tags, and status code.

**Wrong / Right:**

```
WRONG: Using fetch() in an AI agent and getting a 403 because the site detects bots
RIGHT: scrape_url({ url: "https://competitor.com/pricing" })
       -> { status: 200, html: "...", text: "Pricing starts at $49/mo...",
            meta: { title: "Competitor Pricing", description: "..." },
            rendered: true, latency_ms: 1240 }
       -> StealthCrawl bypasses bot detection. You get the actual page.

WRONG: Passing a URL that requires login without using interact_with_page first
RIGHT: Use interact_with_page to log in and establish session.
       Then scrape_url will return the authenticated page content.
```

### `extract_data` -- Structured Extraction via NLP Extraction Protocol
Extract structured data from a previously scraped page or directly from a URL. Use CSS selectors or natural language.

**Wrong / Right:**

```
WRONG: Manually parsing HTML to find price elements across 20 different site layouts
RIGHT: extract_data({ url: "https://saassite.com/pricing",
                      instruction: "extract all plan names, prices, and feature lists" })
       -> [{ plan: "Starter", price: "$9/mo", features: ["5 users", "10GB", ...] }, ...]
       -> Works across any layout. No selector knowledge needed.

WRONG: Expecting 100% accuracy on heavily obfuscated or image-based content
RIGHT: Text-based content: >95% accuracy. Image-based prices or captcha-protected: not supported.
       Use screenshot_page for visual content that cannot be extracted as text.
```

### `screenshot_page` -- Full-Page Screenshot
Capture a full-page or viewport screenshot of any URL. Returns base64-encoded PNG.

**Parameters:** url, full_page (bool, default true), width (default 1280), wait_for_selector (optional CSS selector to wait for before capture)

### `interact_with_page` (Pro) -- Browser Interaction via StealthCrawl + SessionPersist
Perform browser actions on a page: click elements, fill forms, scroll, wait for elements, handle dialogs.

**Parameters:** url, actions (array of { type: click/type/scroll/wait, selector, value }), session_id (optional, for persistent cookies)

### `batch_scrape` (Pro) -- Parallel Multi-URL Scraping via SmartThrottle
Scrape up to 50 URLs in parallel with automatic rate limiting per domain.

**Parameters:** urls (array, max 50), extract_instruction (optional, applied to all), max_concurrent (default 5, max 10)

**Returns:** array of results in same order as input urls. Failed URLs return `{ error: "..." }` without stopping the batch.

## Security & Privacy

- **No content stored** -- Scraped HTML and extracted data are returned in the API response and never stored on our servers.
- **Your targets are private** -- We do not log, aggregate, or analyze which URLs you scrape. Your research targets are your own.
- **Robots.txt respected by default** -- SmartThrottle skips URLs disallowed by robots.txt. Pass `ignore_robots: true` to override (use responsibly).
- **CAPTCHA never bypassed** -- We detect CAPTCHAs and return a blocked status rather than attempting to solve them. This is an intentional ethical boundary.
- **Session isolation** -- SessionPersist session IDs are scoped to your Pro key. No session data is shared between users.
- **HTTPS only** -- All MCP connections are TLS 1.3. HTTP is rejected.

## Pricing

| Tier | Calls/Day | Price | Includes |
|------|-----------|-------|----------|
| **Free** | 20 | $0 | scrape_url + extract_data + screenshot_page |
| **Pro** | 1,000 | $9/mo | All 5 tools + interact_with_page + batch_scrape + SessionPersist + all 9 servers |
| **x402** | Pay-per-call | $0.05 USDC | No account needed, crypto-native |

**Get Pro Key**: https://buy.stripe.com/4gw5na5U19SP9TW288

## The OpenClaw Intelligence Stack

| Server | Tools | Best For |
|--------|-------|----------|
| **Web Scraper** | 5 | Stealth scraping, structured extraction, screenshots |
| **Agent Orchestrator** | 5 | Multi-agent spawn, coordinate, aggregate |
| **Database Toolkit** | 5 | D1/PostgreSQL/MongoDB query and manage |
| **Task Queue** | 5 | Persistent agent tasks, assignment, tracking |
| **Content Autopilot** | 5 | AI writing, multi-platform publishing |
| **Health Monitor** | 4 | 24/7 uptime, SLA reports, Telegram alerts |
| **API Monitor** | 5 | Rate limits, cost tracking, provider analytics |
| **Telegram Bot** | 5 | Messages, alerts, reports, command handling |
| **Market Intelligence** | 6 | AI market trends, GitHub stats, competitor analysis |

All 9 servers share one Pro key. **$9/mo = 49 tools.**
