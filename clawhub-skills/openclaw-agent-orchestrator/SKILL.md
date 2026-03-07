---
name: openclaw-agent-orchestrator
version: 2.0.0
description: "Multi-agent orchestration MCP server with 5 tools for AI agent teams. Use when: (1) 'spawn a sub-agent to handle X', (2) 'list all running agents' or 'what agents are active', (3) 'dispatch this task to the best agent', (4) 'what is agent X working on' or 'agent status', (5) 'aggregate results from all agents' or 'collect outputs'. FleetCommand Protocol, parallel execution, result aggregation. Free 20/day + Pro $9/mo."
read_when:
  - User wants to spawn agents — "create a sub-agent", "spawn worker for this task", "delegate to agent"
  - User asks about running agents — "list agents", "what's active", "which agents are running"
  - User needs task dispatch — "send this to the right agent", "dispatch to fastest agent"
  - User wants agent status — "what is agent X doing", "is agent Y done", "agent progress"
  - User needs result aggregation — "collect all outputs", "merge agent results", "aggregate responses"
metadata:
  openclaw:
    emoji: "\U0001F916"
    homepage: https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers
    always: false
---

# OpenClaw Agent Orchestrator v2.0

**Multi-agent orchestration for AI agent teams. 5 tools. Parallel execution. Automatic result aggregation. Zero infrastructure.**

| Tool | Purpose | Free |
|------|---------|------|
| `spawn_agent` | Launch a new agent with a role, model, and initial task | Pro |
| `list_agents` | List all active agents with status, current task, and resource usage | Yes |
| `dispatch_task` | Send a task to the best available agent or a specific agent ID | Yes |
| `get_agent_status` | Get detailed status for a specific agent — task, progress, errors | Yes |
| `aggregate_results` | Collect and merge outputs from multiple agents into one response | Yes |

## What's New in v2.0

- **FleetCommand Protocol** -- Intelligent task routing that sends tasks to the agent most qualified to handle them based on role, current load, and historical performance.
- **Parallel Execution** -- Spawn up to 8 agents simultaneously (Pro). Dispatch to all of them in parallel. Aggregate when done.
- **AgentHealth Monitor** -- Each spawned agent is health-checked every 30 seconds. Crashed agents are auto-restarted with their last known state.
- **ResultMerge Engine** -- Aggregate results from 2–8 agents into a coherent synthesized response. R1 resolves conflicts between agents.

## Quick Start

```json
{
  "openclaw-agent-orchestrator": {
    "type": "streamable-http",
    "url": "https://openclaw-agent-orchestrator-mcp.yagami8095.workers.dev/mcp"
  }
}
```

Add to Claude Desktop, Cursor, Windsurf, VS Code, or any MCP-compatible client. Zero install. Works immediately.

## Detection Triggers

This skill activates when a user says any of these:
- "spawn a sub-agent", "create a worker agent", "delegate to agent", "launch agent for this"
- "list all agents", "what agents are running", "show active agents", "agent fleet status"
- "dispatch this task", "send to best agent", "route this to the right worker"
- "what is agent X doing", "agent status", "is it done", "agent progress", "check on agent"
- "aggregate results", "collect outputs", "merge agent answers", "synthesize responses"
- "parallel agents", "run these tasks in parallel", "concurrent agent execution"

## Named Protocols

### FleetCommand Protocol
The intelligent routing engine for multi-agent task dispatch:

**Routing algorithm:**
1. **Role matching** -- Task is tagged with required capability (web, code, analysis, writing)
2. **Load check** -- Agents at >80% capacity are deprioritized
3. **Performance score** -- Agents are ranked by task completion rate and avg latency (last 24h)
4. **Selection** -- Highest-score available agent with matching role receives the task
5. **Fallback** -- If no role-matched agent exists, task goes to general-purpose agent or spawns new one

**Agent roles:**

| Role | Best For | Model Recommendation |
|------|---------|---------------------|
| `analyst` | Research, data analysis, reports | DeepSeek R1 |
| `coder` | Code generation, debugging, review | DeepSeek R1 |
| `writer` | Content, documentation, emails | Llama 3.3 70B |
| `scraper` | Web data collection, extraction | Llama 3.3 70B |
| `monitor` | Health checks, alerts, status | Llama 3.1 8B |
| `general` | Mixed tasks, catch-all | DeepSeek R1 |

### AgentHealth Monitor
Continuous health tracking for all spawned agents:

| Check | Frequency | Action on Failure |
|-------|-----------|-----------------|
| Heartbeat ping | 30s | Mark as unresponsive after 3 misses |
| Task timeout | Per task (configurable) | Auto-reassign to next available agent |
| Error rate | Rolling 10-task window | Quarantine if >30% error rate |
| Memory usage | 60s | Alert if approaching limit |
| Auto-restart | On crash | Restore from last checkpoint, up to 3 times |

### ResultMerge Engine
How aggregate_results synthesizes multi-agent outputs:

1. **Collect** -- Gather outputs from all specified agent IDs
2. **Conflict detect** -- R1 identifies contradictions, disagreements, or gaps between agents
3. **Resolve** -- R1 reasons through conflicts using confidence scoring and source weight
4. **Synthesize** -- Produces a single coherent response with attribution footnotes
5. **Confidence flag** -- If agents disagree >40% on a point, flags it as contested in output

## Tools (5)

### `spawn_agent` (Pro) -- Launch Agent via FleetCommand Protocol
Create a new agent with a specified role, model, and initial task. Returns agent ID for subsequent dispatch and status calls.

**Wrong / Right:**

```
WRONG: Running 5 tasks sequentially in one agent, waiting 10min for results
RIGHT: spawn_agent({ role: "analyst", model: "deepinfra/deepseek-ai/DeepSeek-R1-0528",
                     task: "Analyze Q1 revenue trends in our Stripe data" })
       spawn_agent({ role: "writer", task: "Draft the investor update email" })
       spawn_agent({ role: "scraper", task: "Pull competitor pricing from 5 sites" })
       -> All 3 run in parallel. Done in 3min instead of 10min.

WRONG: Spawning 20 agents for a simple 2-step task
RIGHT: Spawn agents only when parallelism provides actual speedup.
       Single sequential tasks are faster in one agent session.
```

### `list_agents` -- Fleet Status
List all active agents with their current status, assigned role, current task, uptime, and resource usage.

**Wrong / Right:**

```
WRONG: Not knowing which agents are running or what they're doing
RIGHT: list_agents()
       -> [{ id: "agent-7f3a", role: "analyst", status: "running",
              task: "Analyzing Stripe data", started: "14min ago", cpu_pct: 42 },
           { id: "agent-2b8c", role: "writer", status: "idle", ... }]
       -> Full fleet visibility in one call

WRONG: Assuming agents are running when they may have crashed
RIGHT: Check list_agents before dispatching critical tasks.
       AgentHealth Monitor auto-restarts crashed agents, but there can be a 30–60s gap.
```

### `dispatch_task` -- Task Routing via FleetCommand Protocol
Send a task to a specific agent ID, or let FleetCommand route it to the best available agent.

**Parameters:** task (string), agent_id (optional — omit for auto-routing), role_hint (optional), priority (low/normal/high)

### `get_agent_status` -- Agent Detail
Get detailed status for a specific agent: current task, progress percentage, errors, estimated completion time, and last 5 log lines.

**Returns:** agent_id, role, status, current_task, progress_pct, errors (last 3), eta_sec, uptime_sec, last_heartbeat

### `aggregate_results` -- Multi-Agent Result Synthesis via ResultMerge Engine
Collect and synthesize outputs from multiple agents. Pass a list of agent IDs and optionally a synthesis instruction.

**Parameters:** agent_ids (array), synthesis_instruction (optional), wait_for_completion (bool, default true), timeout_sec (default 120)

## Security & Privacy

- **Agent isolation** -- Each spawned agent runs in its own isolated execution context. Agents cannot read each other's memory or task history.
- **No credential sharing** -- Agents spawned via this server do not inherit API keys or tokens from your session. You must explicitly pass credentials to each agent.
- **Task content not logged** -- Task content is processed in-memory and not stored server-side. Only metadata (agent ID, role, status) is persisted.
- **Fleet visibility scoped** -- list_agents only shows agents spawned under your Pro key. You cannot see other users' agents.
- **Auto-cleanup** -- Completed agents are terminated and purged after 24 hours. Crashed agents after 1 hour.
- **HTTPS only** -- All connections are TLS 1.3. HTTP is rejected.

## Pricing

| Tier | Calls/Day | Price | Includes |
|------|-----------|-------|----------|
| **Free** | 20 | $0 | list_agents + dispatch_task + get_agent_status + aggregate_results |
| **Pro** | 1,000 | $9/mo | All 5 tools + spawn_agent + 8 concurrent agents + all 9 OpenClaw servers |
| **x402** | Pay-per-call | $0.05 USDC | No account needed, crypto-native |

**Get Pro Key**: https://buy.stripe.com/4gw5na5U19SP9TW288

## The OpenClaw Intelligence Stack

| Server | Tools | Best For |
|--------|-------|----------|
| **Agent Orchestrator** | 5 | Multi-agent spawn, coordinate, aggregate |
| **Task Queue** | 5 | Persistent agent tasks, assignment, tracking |
| **Health Monitor** | 4 | 24/7 uptime, SLA reports, Telegram alerts |
| **Telegram Bot** | 5 | Messages, alerts, reports, command handling |
| **Database Toolkit** | 5 | D1/PostgreSQL/MongoDB query and manage |
| **Web Scraper** | 5 | Stealth scraping, structured extraction |
| **Content Autopilot** | 5 | AI writing, multi-platform publishing |
| **API Monitor** | 5 | Rate limits, cost tracking, provider analytics |
| **Market Intelligence** | 6 | AI market trends, GitHub stats, competitor analysis |

All 9 servers share one Pro key. **$9/mo = 49 tools.**
