---
name: openclaw-telegram-bot
version: 2.0.0
description: "Telegram bot toolkit MCP server with 5 tools for AI agents. Use when: (1) 'send a message to Telegram' or 'notify me on Telegram', (2) 'send an alert' or 'notify on error', (3) 'get latest Telegram messages' or 'check for commands', (4) 'set bot commands menu', (5) 'send daily report to Telegram'. TelegramBridge protocol, rich formatting, instant delivery. Free 20/day + Pro $9/mo."
read_when:
  - User wants to send a Telegram message — "notify me", "send to Telegram", "message my bot"
  - User needs alert delivery — "send alert on error", "Telegram notification", "ping me when done"
  - User wants to read Telegram — "get updates", "check for commands", "latest messages from bot"
  - User needs bot setup — "set Telegram commands", "configure bot menu", "register bot commands"
  - User wants to send a report — "send daily summary to Telegram", "report to chat", "weekly digest"
metadata:
  openclaw:
    emoji: "\U0001F4AC"
    homepage: https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers
    always: false
---

# OpenClaw Telegram Bot v2.0

**Telegram bot toolkit for AI agents. 5 tools. Rich formatting. Instant delivery. Bidirectional command handling.**

| Tool | Purpose | Free |
|------|---------|------|
| `send_message` | Send a text or Markdown message to any Telegram chat | Yes |
| `send_alert` | Send a formatted alert with severity level and action buttons | Yes |
| `get_updates` | Poll for new messages and commands from Telegram users | Yes |
| `set_commands` | Register bot command menu (e.g., /status, /report, /pause) | Pro |
| `send_report` | Send a structured formatted report with sections and tables | Yes |

## What's New in v2.0

- **TelegramBridge** -- Bidirectional communication. Send messages and receive commands in a single unified interface.
- **RichFormat Engine** -- Native Markdown V2 rendering: bold, italic, code blocks, tables, and inline buttons — no raw HTML.
- **AlertStack** -- Severity-tiered alerts (info/warning/error/critical) with configurable escalation and deduplication.
- **CommandRouter** -- get_updates returns parsed commands with arguments, ready for AI agent conditional logic.

## Quick Start

```json
{
  "openclaw-telegram-bot": {
    "type": "streamable-http",
    "url": "https://openclaw-telegram-bot-mcp.yagami8095.workers.dev/mcp"
  }
}
```

Add to Claude Desktop, Cursor, Windsurf, VS Code, or any MCP-compatible client. Zero install. Works immediately.

## Detection Triggers

This skill activates when a user says any of these:
- "send a message to Telegram", "notify me on Telegram", "message my bot", "text me via Telegram"
- "send an alert", "Telegram notification on failure", "ping me when done", "notify on error"
- "check for Telegram commands", "get latest messages", "poll for updates", "what did users send"
- "set bot commands", "configure Telegram menu", "register /status command", "bot command list"
- "send daily report to Telegram", "Telegram summary", "weekly digest", "send formatted report"
- "Telegram bot", "@yedanyagami_moltbot", "bot token", "chat ID"

## Named Protocols

### TelegramBridge
The core bidirectional communication protocol:

**Outbound (agent → user):**

| Message Type | Tool | Best For |
|-------------|------|---------|
| Plain text | send_message | Status updates, simple notifications |
| Formatted alert | send_alert | Errors, warnings, critical events |
| Rich report | send_report | Daily summaries, dashboards, analytics |
| Interactive (buttons) | send_alert with actions | Approval requests, confirm/cancel flows |

**Inbound (user → agent):**

| Input Type | Parsed By | What Agent Receives |
|-----------|----------|-------------------|
| /command | CommandRouter | { command: "status", args: [] } |
| /command arg1 arg2 | CommandRouter | { command: "report", args: ["weekly", "revenue"] } |
| Free text | get_updates | { type: "text", text: "pause all agents", chat_id: ... } |
| Button callback | get_updates | { type: "callback", data: "approve_task_7f3a" } |

**Delivery guarantees:**
- send_message and send_alert: synchronous, confirm delivery before returning
- Messages are delivered in <2 seconds on Cloudflare edge to Telegram API
- If Telegram API is down, TelegramBridge retries 3× with exponential backoff

### AlertStack Protocol
Severity-tiered alerting with escalation:

| Severity | Emoji | When To Use | Auto-Escalate |
|----------|-------|------------|--------------|
| `info` | ℹ️ | Routine status updates | Never |
| `warning` | ⚠️ | Degraded performance, approaching limits | After 3 in 1h |
| `error` | 🔴 | Service failure, task crash | Immediately |
| `critical` | 🚨 | Data loss, security event, revenue impact | Immediately + repeat every 15min |

**Deduplication:** Identical alerts (same message + severity) are suppressed for 5 minutes to prevent spam. A counter is added: "This alert has fired 4 times in the last 5 minutes."

### CommandRouter
How get_updates parses Telegram messages into structured commands for agent logic:

```
Raw Telegram message: "/pause agent-7f3a"
CommandRouter output: {
  type: "command",
  command: "pause",
  args: ["agent-7f3a"],
  chat_id: 7848052227,
  user: "@yagami",
  timestamp: "2026-03-07T09:14:22Z"
}
```

AI agent can then: `if (update.command === "pause") { dispatch_task({ task: "pause", agent_id: update.args[0] }) }`

## Tools (5)

### `send_message` -- Text Message via TelegramBridge
Send a text or Markdown-formatted message to a Telegram chat ID.

**Wrong / Right:**

```
WRONG: Using a Telegram HTTP API call with raw JSON and wrestling with MarkdownV2 escaping
RIGHT: send_message({ chat_id: 7848052227, text: "**Task complete**: Revenue report generated",
                      parse_mode: "markdown" })
       -> Delivered in <2s. Bold formatting applied correctly. No escaping required.

WRONG: Sending a 3000-character wall of text as a single message
RIGHT: Use send_report for structured multi-section content.
       send_message is for short notifications (≤4096 chars).
       send_report handles longer structured content with sections.
```

### `send_alert` -- Severity Alert via AlertStack Protocol
Send a formatted alert with severity level, optional description, and optional action buttons.

**Wrong / Right:**

```
WRONG: Spamming the same "API is down" alert every 30 seconds
RIGHT: send_alert({ chat_id: 7848052227, severity: "error",
                    title: "Stripe API Unresponsive", description: "5 failed calls in 10min",
                    actions: [{ label: "Check Status", url: "https://status.stripe.com" }] })
       -> AlertStack deduplicates. One alert, then silence until it changes.
       -> Action button lets you check Stripe status directly from Telegram.

WRONG: Using "critical" severity for routine errors
RIGHT: info/warning for operational noise. error for real failures. critical only for revenue/data impact.
       Overuse of critical trains you to ignore it — exactly like car alarms.
```

### `get_updates` -- Poll for Messages via CommandRouter
Retrieve new messages, commands, and button callbacks from your Telegram bot since the last poll.

**Returns:** array of update objects with type (command/text/callback), parsed content, chat_id, user, timestamp

**Polling strategy:** Call get_updates on a schedule (e.g., every 30s in agent heartbeat) or after sending an interactive alert with action buttons.

### `set_commands` (Pro) -- Register Bot Command Menu
Register the /command menu that appears when users type "/" in your Telegram bot chat.

**Parameters:** commands (array of { command, description }), scope (all/private/group)

**Example:**
```json
{
  "commands": [
    { "command": "status",  "description": "Fleet status — all agents" },
    { "command": "revenue", "description": "Today's revenue summary" },
    { "command": "pause",   "description": "Pause all agent activity" },
    { "command": "report",  "description": "Generate weekly report" }
  ]
}
```

### `send_report` -- Structured Report
Send a multi-section report to Telegram with automatic table formatting, section headers, and summary stats.

**Parameters:** chat_id, title, sections (array of { heading, content }), footer (optional)

**Renders as:** Telegram message with bold section headers, code-block tables, and a footer timestamp. Auto-splits into multiple messages if >4096 chars.

## Security & Privacy

- **Bot token encrypted** -- Your Telegram bot token is stored encrypted with AES-256. It is never returned in API responses.
- **Chat ID scoped** -- Your Pro key can only send to chat IDs that have previously messaged your bot (prevents spam abuse). First message must come from the recipient.
- **No message logging** -- Message content is passed directly to Telegram API. It is not stored on our servers.
- **Command injection defense** -- CommandRouter strips all HTML and special characters from parsed commands before returning. No XSS/injection via Telegram messages.
- **Rate limiting** -- Telegram imposes 30 messages/second per bot. TelegramBridge enforces this with a built-in queue to prevent bot bans.
- **HTTPS only** -- All connections are TLS 1.3. HTTP is rejected.

## Pricing

| Tier | Calls/Day | Price | Includes |
|------|-----------|-------|----------|
| **Free** | 20 | $0 | send_message + send_alert + get_updates + send_report |
| **Pro** | 1,000 | $9/mo | All 5 tools + set_commands + AlertStack escalation + all 9 OpenClaw servers |
| **x402** | Pay-per-call | $0.05 USDC | No account needed, crypto-native |

**Get Pro Key**: https://buy.stripe.com/4gw5na5U19SP9TW288

## The OpenClaw Intelligence Stack

| Server | Tools | Best For |
|--------|-------|----------|
| **Telegram Bot** | 5 | Messages, alerts, reports, command handling |
| **Health Monitor** | 4 | 24/7 uptime, SLA reports, downtime alerts |
| **Revenue Tracker** | 4 | Multi-source revenue, MRR, milestone alerts |
| **Agent Orchestrator** | 5 | Multi-agent spawn, coordinate, aggregate |
| **Content Autopilot** | 5 | AI writing, multi-platform publishing |
| **Task Queue** | 5 | Persistent agent tasks, assignment, tracking |
| **API Monitor** | 5 | Rate limits, cost tracking, provider analytics |
| **Crypto Payments** | 5 | x402 USDC micropayments, no accounts needed |
| **Market Intelligence** | 6 | AI market trends, GitHub stats, competitor analysis |

All 9 servers share one Pro key. **$9/mo = 49 tools.**
