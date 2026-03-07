---
name: openclaw-content-autopilot
version: 2.0.0
description: "AI content generation and auto-publishing MCP server with 5 tools for social platforms. Use when: (1) 'write a tweet about X' or 'draft LinkedIn post', (2) 'publish this to MoltBook' or 'post to social', (3) 'schedule content for tomorrow 9am', (4) 'how did my last post perform' or 'engagement stats', (5) 'what should I post about' or 'trending topics in AI'. DeepSeek R1 content generation, multi-platform publishing. Free 20/day + Pro $9/mo."
read_when:
  - User asks for content creation — "write a tweet", "draft a post", "create content about"
  - User wants to publish — "post this to Twitter", "publish to MoltBook", "share on LinkedIn"
  - User needs scheduling — "schedule for tomorrow", "queue this for 9am", "content calendar"
  - User wants analytics — "how did my post do", "engagement stats", "reach and impressions"
  - User asks what to post — "trending topics", "what should I write about", "content ideas"
metadata:
  openclaw:
    emoji: "\U0001F4DD"
    homepage: https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers
    always: false
---

# OpenClaw Content Autopilot v2.0

**AI-powered content generation and auto-publishing for solopreneurs and AI agents. 5 tools. DeepSeek R1 writing. Multi-platform.**

| Tool | Purpose | Free |
|------|---------|------|
| `generate_content` | AI-generated posts, threads, articles for any platform and topic | Yes |
| `publish_post` | Publish generated or custom content to connected platforms | Pro |
| `schedule_content` | Queue content for future publishing at optimal times | Pro |
| `get_engagement_stats` | Engagement metrics for published posts across all platforms | Yes |
| `get_trending_topics` | Live trending topics in AI, tech, and your configured niches | Yes |

## What's New in v2.0

- **ContentForge Engine** -- DeepSeek R1 generates platform-native content. Twitter threads sound like Twitter threads. LinkedIn posts sound like LinkedIn posts. Not generic AI output.
- **StyleLock** -- Feed ContentForge 3 examples of your writing and it locks your voice permanently. Every generated post sounds like you.
- **OptimalTime Scheduler** -- Auto-detects peak engagement windows for your audience based on historical performance. No guessing.
- **TrendSync** -- Trending topics in AI/tech pulled every 30 minutes from GitHub, Hacker News, and Product Hunt. ContentForge can generate a post about any trend in one call.

## Quick Start

```json
{
  "openclaw-content-autopilot": {
    "type": "streamable-http",
    "url": "https://openclaw-content-autopilot-mcp.yagami8095.workers.dev/mcp"
  }
}
```

Add to Claude Desktop, Cursor, Windsurf, VS Code, or any MCP-compatible client. Zero install. Works immediately.

## Detection Triggers

This skill activates when a user says any of these:
- "write a tweet", "draft a LinkedIn post", "create content about", "write a thread on"
- "publish this to Twitter", "post to MoltBook", "share on social", "cross-post"
- "schedule for tomorrow", "queue this post", "optimal posting time", "content calendar"
- "how did my post perform", "engagement stats", "reach", "impressions", "likes per post"
- "what's trending", "content ideas", "what should I post about", "AI trending topics"
- "repurpose this", "turn this into a thread", "newsletter from this article"

## Named Protocols

### ContentForge Engine
The AI content generation pipeline powered by DeepSeek R1:

**Generation flow:**
1. **Topic analysis** -- R1 identifies the core insight, audience, and platform context
2. **Format selection** -- Auto-selects optimal format: thread, single post, article, caption
3. **Style injection** -- If StyleLock is configured, your voice is applied at the token level
4. **Platform adaptation** -- Character limits, hashtag strategy, and engagement hooks applied per platform
5. **Hook scoring** -- First line scored for scroll-stopping power. If <7/10, regenerated automatically.

**Supported platforms:**

| Platform | Formats | Char Limit | Auto-hashtags |
|----------|---------|-----------|--------------|
| Twitter/X | Single, thread | 280/tweet | Yes (3 max) |
| LinkedIn | Post, article | 3000 | Yes (5 max) |
| MoltBook | Post, submolt | 500 | No |
| Bluesky | Single, thread | 300 | Yes (3 max) |
| Newsletter | Full article | Unlimited | No |

### StyleLock Protocol
Preserve your writing voice across all AI-generated content:

1. **Calibration** -- Provide 3–5 examples of your best-performing content
2. **Voice extraction** -- R1 analyzes sentence length, vocabulary, tone, and signature phrases
3. **StyleProfile** -- A compact style descriptor is stored with your Pro key
4. **Injection** -- Every generate_content call uses your StyleProfile as a prefix instruction
5. **Override** -- Pass `style: "formal"` or `style: "casual"` to temporarily override

### OptimalTime Scheduler
Schedule content to publish at peak engagement windows:

| Audience | Peak Window |
|----------|------------|
| AI/tech developers | Tue–Thu 9–11am PST |
| Solopreneurs | Mon/Wed 7–9am EST |
| Crypto community | Daily 12–2pm UTC |
| Global default | Tue 10am in largest follower timezone |

Optimal times are recalculated monthly based on your actual engagement data (Pro feature).

## Tools (5)

### `generate_content` -- AI Content Generation via ContentForge Engine
Generate platform-native content on any topic. Pass a topic, platform, and optional tone. Returns ready-to-publish content with hook score and hashtags.

**Wrong / Right:**

```
WRONG: Asking ChatGPT to "write a tweet" and getting something that sounds nothing like you
RIGHT: generate_content({ topic: "why MCP servers are the future of AI agents",
                          platform: "twitter", format: "thread", tone: "opinionated" })
       -> Thread of 8 tweets, each ≤280 chars, hook scored 8.4/10,
          3 hashtags (#MCPServers #AIAgents #BuildInPublic),
          sounds like a developer who ships — not a marketing team

WRONG: Using generate_content without StyleLock and wondering why it sounds generic
RIGHT: Configure StyleLock first with 3 examples of your posts.
       generate_content then sounds like you, not like ChatGPT.
```

### `publish_post` (Pro) -- Publish to Connected Platforms
Publish content directly to one or more connected social accounts.

**Wrong / Right:**

```
WRONG: Copy-pasting generated content into 4 browser tabs manually
RIGHT: publish_post({ content: "...", platforms: ["twitter", "linkedin", "moltbook"] })
       -> Published to all 3 simultaneously. Returns post IDs for tracking.

WRONG: Publishing without previewing the generated content first
RIGHT: Always review generate_content output before calling publish_post.
       ContentForge is good — not infallible. You're the final editor.
```

### `schedule_content` (Pro) -- Content Queue via OptimalTime Scheduler
Queue a post for future publishing. Pass content, platform, and either a specific datetime or `time: "optimal"`.

**Parameters:** content, platform, publish_at (ISO datetime or "optimal"), timezone

### `get_engagement_stats` -- Post Analytics
Get engagement metrics for published posts: likes, shares, replies, reach, click-through rate, and comparison to your average.

**Returns:** post ID, published_at, platform, likes, shares, replies, reach, CTR, vs_your_avg (percentile)

### `get_trending_topics` -- Live Trend Feed via TrendSync
Get trending topics in AI, tech, and your configured niches. Refreshed every 30 minutes.

**Returns:** topic, trend_score, source (GitHub/HN/ProductHunt), first_seen, growth_rate (last 2h), related_keywords

## Security & Privacy

- **OAuth tokens stored encrypted** -- Platform access tokens (Twitter, LinkedIn) are encrypted with AES-256 at rest and never logged.
- **Read before write** -- publish_post requires explicit content string. ContentForge output is never auto-published without a separate explicit publish_post call.
- **No shadow posting** -- We never post on your behalf without an explicit tool call in your session. There are no background auto-posting jobs.
- **Revoke anytime** -- Deleting your Pro key immediately revokes all platform connections. No orphaned OAuth tokens.
- **Content not stored** -- Generated content is returned in the API response and not stored server-side. Your drafts stay in your client.
- **HTTPS only** -- All connections are TLS 1.3. HTTP is rejected.

## Pricing

| Tier | Calls/Day | Price | Includes |
|------|-----------|-------|----------|
| **Free** | 20 | $0 | generate_content + get_engagement_stats + get_trending_topics |
| **Pro** | 1,000 | $9/mo | All 5 tools + publish_post + schedule_content + StyleLock + all 9 OpenClaw servers |
| **x402** | Pay-per-call | $0.05 USDC | No account needed, crypto-native |

**Get Pro Key**: https://buy.stripe.com/4gw5na5U19SP9TW288

## The OpenClaw Intelligence Stack

| Server | Tools | Best For |
|--------|-------|----------|
| **Content Autopilot** | 5 | AI writing, multi-platform publishing, scheduling |
| **Market Intelligence** | 6 | AI trends, GitHub stats, competitor analysis |
| **Revenue Tracker** | 4 | Multi-source revenue aggregation, MRR, alerts |
| **Telegram Bot** | 5 | Messages, alerts, reports, command handling |
| **Health Monitor** | 4 | 24/7 uptime, SLA reports, downtime alerts |
| **Web Scraper** | 5 | Stealth scraping, structured extraction |
| **Agent Orchestrator** | 5 | Multi-agent spawn, coordinate, aggregate |
| **Task Queue** | 5 | Persistent agent tasks, assignment, tracking |
| **Database Toolkit** | 5 | D1/PostgreSQL/MongoDB query and manage |

All 9 servers share one Pro key. **$9/mo = 49 tools.**
