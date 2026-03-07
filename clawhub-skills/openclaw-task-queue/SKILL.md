---
name: openclaw-task-queue
version: 2.0.0
description: "Persistent task queue MCP server with 5 tools for AI agents. Use when: (1) 'create a task for later' or 'add to queue', (2) 'what tasks are pending' or 'show task list', (3) 'assign this task to agent X', (4) 'mark task as complete' or 'finish this task', (5) 'how many tasks are done' or 'queue statistics'. TaskFlow Engine, persistent across sessions, multi-agent assignment. Free 20/day + Pro $9/mo."
read_when:
  - User wants to create a task — "add this to the queue", "create a task", "remember to do X"
  - User asks about pending tasks — "what's in the queue", "pending tasks", "what's next"
  - User needs to assign tasks — "give this to agent X", "assign task", "delegate to worker"
  - User wants to complete a task — "mark as done", "complete task", "finish and close"
  - User wants queue stats — "how many tasks done", "queue statistics", "task completion rate"
metadata:
  openclaw:
    emoji: "\U0001F4CB"
    homepage: https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers
    always: false
---

# OpenClaw Task Queue v2.0

**Persistent task queue for AI agents. 5 tools. Survives restarts. Multi-agent assignment. Priority scheduling.**

| Tool | Purpose | Free |
|------|---------|------|
| `create_task` | Create a new task with title, description, priority, and metadata | Yes |
| `get_tasks` | List tasks filtered by status, agent, priority, or tag | Yes |
| `assign_task` | Assign a task to a specific agent or pull the next unassigned task | Yes |
| `complete_task` | Mark a task as complete with an output summary | Yes |
| `get_task_stats` | Queue statistics: throughput, completion rate, avg duration, backlog | Yes |

## What's New in v2.0

- **TaskFlow Engine** -- Priority queue backed by Cloudflare D1 (SQLite at the edge). Tasks persist across agent restarts, session crashes, and PC reboots.
- **PriorityLane** -- Four priority lanes (critical/high/normal/low) with configurable lane weights. Critical tasks always jump the queue.
- **DependencyGraph** -- Link tasks with `depends_on` to create execution chains. A task only becomes available when all its dependencies are complete.
- **TimeoutGuard** -- Tasks assigned to an agent but not completed within a configurable timeout are automatically returned to the queue for reassignment.

## Quick Start

```json
{
  "openclaw-task-queue": {
    "type": "streamable-http",
    "url": "https://openclaw-task-queue-mcp.yagami8095.workers.dev/mcp"
  }
}
```

Add to Claude Desktop, Cursor, Windsurf, VS Code, or any MCP-compatible client. Zero install. Works immediately.

## Detection Triggers

This skill activates when a user says any of these:
- "add this to the queue", "create a task", "remember to do", "queue this for later"
- "what's in the queue", "pending tasks", "show task list", "what needs to be done"
- "assign this task", "give to agent X", "delegate to worker", "pull next task"
- "mark as done", "complete task", "task finished", "close this task"
- "task stats", "queue statistics", "completion rate", "how many tasks done", "backlog count"
- "task depends on", "chain tasks", "run after X is done", "task dependency"

## Named Protocols

### TaskFlow Engine
The core queue engine built on Cloudflare D1 for persistent, edge-native task management:

**Task lifecycle:**

```
created → queued → assigned → in_progress → completed
                ↓                ↓
             cancelled        failed → retry → queued
```

**Task schema:**

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Auto-generated unique ID |
| title | string | Short task description (≤200 chars) |
| description | text | Full task details, context, instructions |
| priority | enum | critical / high / normal / low |
| status | enum | created / queued / assigned / in_progress / completed / failed / cancelled |
| agent_id | string | Assigned agent (null if unassigned) |
| depends_on | UUID[] | Task IDs that must complete before this one becomes available |
| tags | string[] | Free-form tags for filtering and grouping |
| metadata | JSON | Arbitrary key-value pairs for agent use |
| created_at | timestamp | |
| assigned_at | timestamp | |
| completed_at | timestamp | |
| output | text | Summary written by completing agent |

### PriorityLane Rules
How tasks are ordered when an agent calls assign_task:

| Priority | Lane Weight | Typical Use |
|----------|------------|------------|
| `critical` | 100 | Revenue impact, security events, data loss risk |
| `high` | 10 | User-facing features, bugs, time-sensitive |
| `normal` | 1 | Standard work, improvements, research |
| `low` | 0.1 | Nice-to-have, background maintenance |

Within the same priority, tasks are ordered FIFO (oldest first). An agent requesting the "next task" always gets the highest-priority available unassigned task.

### DependencyGraph Rules
Task chaining with depends_on:

1. Task B with `depends_on: [task_A_id]` stays in `queued` status until task A reaches `completed`
2. If task A fails or is cancelled, task B is set to `blocked` with reason
3. Circular dependencies are rejected at create_task time with an error
4. A task can have multiple dependencies: all must complete before it unlocks
5. Diamond dependencies (A→B, A→C, B→D, C→D) are supported

### TimeoutGuard Settings
Automatic reassignment of stalled tasks:

| Priority | Default Timeout | What Happens |
|----------|----------------|-------------|
| critical | 15 minutes | Returned to queue + alert sent |
| high | 60 minutes | Returned to queue |
| normal | 4 hours | Returned to queue |
| low | 24 hours | Returned to queue |

Timeout starts when task enters `in_progress`. An agent must call `complete_task` before timeout or the task is reassigned.

## Tools (5)

### `create_task` -- Create Task via TaskFlow Engine
Create a new task with all required fields. Returns task ID for subsequent assign/complete calls.

**Wrong / Right:**

```
WRONG: Storing tasks in an AI agent's context window (lost on session end)
RIGHT: create_task({ title: "Analyze Q1 revenue", priority: "high",
                     description: "Pull Stripe data, compare to Q4, write 1-page summary",
                     tags: ["revenue", "reporting"], agent_id: "agent-7f3a" })
       -> Task stored in D1. Survives restarts. Agent 7f3a gets it on next poll.
       -> Returns: { id: "task-9b2f", status: "assigned", created_at: "..." }

WRONG: Creating tasks without descriptions (agents can't act on a title alone)
RIGHT: Always include a detailed description with context, expected output, and any constraints.
       The description is what the agent reads to understand what to do.
```

### `get_tasks` -- Task List with Filters
List tasks filtered by status, agent, priority, or tag. Returns paginated results.

**Wrong / Right:**

```
WRONG: Asking an agent "what are your tasks" when there's no persistent task list
RIGHT: get_tasks({ status: "queued", priority: "high" })
       -> [{ id: "task-9b2f", title: "Analyze Q1 revenue", priority: "high",
              created_at: "2h ago", depends_on: [] },
           { id: "task-4c1a", title: "Draft investor update", ... }]
       -> Filtered, sorted by priority. Ready for agent to pick up.

WRONG: Fetching all tasks with no filters and overwhelming the context window
RIGHT: Always filter by status. get_tasks({ status: "queued" }) for workable tasks.
       Use get_task_stats for aggregate counts.
```

### `assign_task` -- Task Assignment
Assign a specific task to an agent, or pull the highest-priority unassigned task for an agent. Sets status to `in_progress`.

**Parameters:** task_id (optional — if omitted, pulls next by priority), agent_id, role_hint (optional)

### `complete_task` -- Task Completion
Mark a task as complete with an output summary. Sets status to `completed`, records output, unlocks dependent tasks.

**Parameters:** task_id, output (text summary of what was done and the result), duration_sec (optional)

### `get_task_stats` -- Queue Analytics
Get aggregate statistics about the task queue: total tasks by status, throughput, completion rate, average duration, and backlog depth.

**Returns:** counts by status, tasks_completed_today, tasks_created_today, avg_duration_min, completion_rate_pct, backlog_by_priority

## Security & Privacy

- **Queue isolation** -- Your tasks are scoped to your Pro key. No agent or user can access another user's queue.
- **Task content not indexed** -- Task descriptions and metadata are stored in D1 but never indexed for search or analytics by OpenClaw.
- **Soft delete** -- cancelled and completed tasks are retained for 90 days for audit purposes, then purged. There is no permanent deletion before 90 days.
- **Agent ID is user-defined** -- We do not validate agent IDs. You can use any string identifier. No authentication is required between agents and the queue (access control is via your Pro key).
- **Edge isolation** -- Each API call runs in a Cloudflare Workers V8 isolate. No shared state between users.
- **HTTPS only** -- All connections are TLS 1.3. HTTP is rejected.

## Pricing

| Tier | Calls/Day | Price | Includes |
|------|-----------|-------|----------|
| **Free** | 20 | $0 | All 5 tools, up to 100 tasks stored |
| **Pro** | 1,000 | $9/mo | All 5 tools + unlimited tasks + DependencyGraph + TimeoutGuard + all 9 servers |
| **x402** | Pay-per-call | $0.05 USDC | No account needed, crypto-native |

**Get Pro Key**: https://buy.stripe.com/4gw5na5U19SP9TW288

## The OpenClaw Intelligence Stack

| Server | Tools | Best For |
|--------|-------|----------|
| **Task Queue** | 5 | Persistent agent tasks, dependencies, multi-agent assignment |
| **Agent Orchestrator** | 5 | Multi-agent spawn, coordinate, aggregate |
| **Database Toolkit** | 5 | D1/PostgreSQL/MongoDB query and manage |
| **Health Monitor** | 4 | 24/7 uptime, SLA reports, Telegram alerts |
| **Telegram Bot** | 5 | Messages, alerts, reports, command handling |
| **Revenue Tracker** | 4 | Multi-source revenue, MRR, milestone alerts |
| **Web Scraper** | 5 | Stealth scraping, structured extraction |
| **Content Autopilot** | 5 | AI writing, multi-platform publishing |
| **Market Intelligence** | 6 | AI market trends, GitHub stats, competitor analysis |

All 9 servers share one Pro key. **$9/mo = 49 tools.**
