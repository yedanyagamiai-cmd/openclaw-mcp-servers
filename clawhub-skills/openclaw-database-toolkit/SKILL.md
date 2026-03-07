---
name: openclaw-database-toolkit
version: 2.0.0
description: "Database operations MCP server with 5 tools for D1, PostgreSQL, and MongoDB. Use when: (1) 'query my D1 database' or 'run this SQL', (2) 'insert these records' or 'add rows to table', (3) 'update records where X' or 'bulk update', (4) 'show me the table schema' or 'what columns exist', (5) 'migrate this schema' or 'add a column'. DataBridge Protocol, multi-database, no driver installs. Free 20/day + Pro $9/mo."
read_when:
  - User wants to query a database — "run this SQL", "query my D1", "SELECT from table"
  - User needs to insert data — "insert these records", "add rows", "bulk insert", "save to DB"
  - User wants to update records — "update where X", "bulk update", "set field to value"
  - User needs schema info — "show table schema", "what columns exist", "describe this table"
  - User wants to migrate — "add a column", "create this table", "migrate schema", "run migration"
metadata:
  openclaw:
    emoji: "\U0001F5C4\uFE0F"
    homepage: https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers
    always: false
---

# OpenClaw Database Toolkit v2.0

**Database operations for AI agents. 5 tools. D1, PostgreSQL, MongoDB. Zero driver installs. Natural language queries.**

| Tool | Purpose | Free |
|------|---------|------|
| `query_database` | Execute SELECT queries or natural language queries against any connected DB | Yes |
| `insert_records` | Insert one or many records into any table with type validation | Yes |
| `update_records` | Update records matching a WHERE clause or natural language condition | Pro |
| `get_schema` | Retrieve full schema for a database or specific table | Yes |
| `migrate_schema` | Run DDL migrations: CREATE TABLE, ADD COLUMN, CREATE INDEX | Pro |

## What's New in v2.0

- **DataBridge Protocol** -- Unified query interface across D1 (Cloudflare SQLite), PostgreSQL (any host), and MongoDB Atlas. One tool, three databases.
- **NLQ Engine** -- Natural Language Query: describe what you want in English, get SQL or MQL back plus results. No SQL knowledge required.
- **SafeWrite Guard** -- Destructive operations (DELETE, DROP, TRUNCATE) require an explicit `confirm: true` flag. No accidental data loss.
- **SchemaCache** -- Table schemas are cached for 5 minutes. get_schema is instant after the first call in a session.

## Quick Start

```json
{
  "openclaw-database-toolkit": {
    "type": "streamable-http",
    "url": "https://openclaw-database-toolkit-mcp.yagami8095.workers.dev/mcp"
  }
}
```

Add to Claude Desktop, Cursor, Windsurf, VS Code, or any MCP-compatible client. Zero install. Works immediately.

## Detection Triggers

This skill activates when a user says any of these:
- "query my database", "run this SQL", "SELECT from", "D1 query", "database query"
- "insert records", "add rows to table", "bulk insert", "save to database", "write to DB"
- "update records", "UPDATE WHERE", "bulk update", "set this field", "update these rows"
- "show table schema", "what columns exist", "describe this table", "database schema"
- "add a column", "create table", "run migration", "schema migration", "ALTER TABLE"
- "D1 database", "PostgreSQL", "MongoDB Atlas", "Cloudflare D1", "SQL query"

## Named Protocols

### DataBridge Protocol
Unified connection interface for three database types:

**Connection configuration (stored in Pro key):**

| Database | Required Config | Connection |
|----------|----------------|-----------|
| Cloudflare D1 | database_id, account_id, api_token | Cloudflare REST API |
| PostgreSQL | host, port, database, user, password | Direct TCP via Hyperdrive |
| MongoDB Atlas | connection_string (SRV format) | Atlas Data API |

**Query routing:**
1. Tool call includes `db_alias` (e.g., "my-d1", "prod-postgres", "atlas")
2. DataBridge looks up connection config for alias
3. Routes query to appropriate driver (SQLite, pg, MongoDB driver)
4. Normalizes result to unified format: `{ rows: [...], count: N, duration_ms: N }`

**Unified result format:**
```json
{
  "rows": [{ "id": 1, "name": "task-1", "status": "done" }],
  "count": 1,
  "duration_ms": 42,
  "db_type": "d1",
  "query_used": "SELECT * FROM tasks WHERE status = 'done'"
}
```

### NLQ Engine
Natural Language Query — describe what you want, get results:

```
Input:  query_database({ db: "my-d1", nlq: "show me all tasks completed in the last 7 days, sorted by most recent" })

NLQ generates: SELECT * FROM tasks WHERE status = 'completed'
               AND completed_at >= datetime('now', '-7 days')
               ORDER BY completed_at DESC

Returns: { rows: [...], generated_sql: "SELECT...", duration_ms: 38 }
```

**NLQ accuracy by complexity:**

| Query Type | Accuracy | Notes |
|-----------|---------|-------|
| Simple SELECT with filter | 98% | Date math, status filters, column selection |
| Aggregations (COUNT, SUM, AVG) | 95% | GROUP BY, HAVING, multi-column aggregates |
| JOINs (2 tables) | 89% | Foreign key relationships must be in schema |
| Complex subqueries | 74% | Use explicit SQL for complex multi-step queries |

### SafeWrite Guard
Protection against destructive operations:

| Operation | Risk Level | Behavior |
|-----------|-----------|---------|
| SELECT | None | Executes immediately |
| INSERT | Low | Executes, returns inserted count |
| UPDATE with WHERE | Medium | Executes, shows preview of affected rows |
| UPDATE without WHERE | High | Blocked unless `confirm: true` + `update_all: true` |
| DELETE with WHERE | High | Requires `confirm: true` |
| DROP TABLE | Critical | Blocked entirely, must use migrate_schema with explicit DDL |
| TRUNCATE | Critical | Blocked entirely |

## Tools (5)

### `query_database` -- Query via DataBridge + NLQ Engine
Execute a SQL/MQL query or natural language query against a connected database.

**Wrong / Right:**

```
WRONG: Writing raw SQL in an AI agent's context, hoping the database driver is available
RIGHT: query_database({ db: "my-d1", sql: "SELECT * FROM tasks WHERE status = 'queued' LIMIT 10" })
       -> { rows: [{...}, {...}], count: 10, duration_ms: 38, db_type: "d1" }
       -> No driver install. No connection string management. Just the query.

WRONG: Writing SELECT * on a large table without LIMIT
RIGHT: Always use LIMIT in query_database. No limit defaults to LIMIT 100 for safety.
       Use get_task_stats or aggregation queries for counts, not raw row dumps.
```

### `insert_records` -- Record Insertion with Type Validation
Insert one or many records into a table. DataBridge validates field types against the schema before inserting.

**Wrong / Right:**

```
WRONG: Inserting records with wrong types and getting cryptic database errors
RIGHT: insert_records({ db: "my-d1", table: "tasks",
                        records: [{ title: "new task", priority: "high", status: "queued" }] })
       -> Type validation runs against cached schema before the INSERT
       -> Returns: { inserted: 1, ids: ["task-9b2f"] }

WRONG: Inserting 10,000 records in one call (max batch size is 500)
RIGHT: Use batch_size parameter (default 100, max 500) for large inserts.
       insert_records auto-batches if records array exceeds batch_size.
```

### `update_records` (Pro) -- Record Update via SafeWrite Guard
Update records matching a WHERE clause or natural language condition. SafeWrite requires confirm: true for updates without WHERE.

**Parameters:** db, table, set (key-value pairs), where (SQL condition or NLQ string), confirm (required for unfiltered updates)

### `get_schema` -- Schema Introspection via SchemaCache
Retrieve full schema for a database or specific table: columns, types, constraints, indexes, and foreign keys.

**Returns:** tables list (if no table specified) or table detail (column name, type, nullable, default, is_primary_key, is_foreign_key, indexes)

### `migrate_schema` (Pro) -- DDL Migration
Execute CREATE TABLE, ADD COLUMN, CREATE INDEX, or other DDL statements. Returns migration result and updated schema.

**Parameters:** db, ddl (SQL DDL string), description (human-readable description of what this migration does)

**Audit log:** All migrations are logged with timestamp, description, and result. Accessible via `get_schema({ include_migrations: true })`.

## Security & Privacy

- **Credentials encrypted at rest** -- Database connection strings, passwords, and API tokens are encrypted with AES-256 and never returned in API responses.
- **Read isolation** -- query_database uses read-only credentials when available. Write operations (insert, update, migrate) use separate write credentials you configure.
- **No data retention** -- Query results are returned in the API response and never stored on our servers. Your data stays in your database.
- **Connection aliases scoped to Pro key** -- Other users cannot access your database aliases even if they know the alias name.
- **SafeWrite is non-bypassable** -- Destructive operations cannot be enabled globally. `confirm: true` must be passed per-call.
- **HTTPS only** -- All connections are TLS 1.3. HTTP is rejected.

## Pricing

| Tier | Calls/Day | Price | Includes |
|------|-----------|-------|----------|
| **Free** | 20 | $0 | query_database + insert_records + get_schema (1 DB connection) |
| **Pro** | 1,000 | $9/mo | All 5 tools + up to 10 DB connections + NLQ + all 9 OpenClaw servers |
| **x402** | Pay-per-call | $0.05 USDC | No account needed, crypto-native |

**Get Pro Key**: https://buy.stripe.com/4gw5na5U19SP9TW288

## The OpenClaw Intelligence Stack

| Server | Tools | Best For |
|--------|-------|----------|
| **Database Toolkit** | 5 | D1/PostgreSQL/MongoDB query, insert, migrate |
| **Task Queue** | 5 | Persistent agent tasks, dependencies, assignment |
| **Agent Orchestrator** | 5 | Multi-agent spawn, coordinate, aggregate |
| **Health Monitor** | 4 | 24/7 uptime, SLA reports, Telegram alerts |
| **Revenue Tracker** | 4 | Multi-source revenue, MRR, milestone alerts |
| **API Monitor** | 5 | Rate limits, cost tracking, provider analytics |
| **Web Scraper** | 5 | Stealth scraping, structured extraction |
| **Telegram Bot** | 5 | Messages, alerts, reports, command handling |
| **Market Intelligence** | 6 | AI market trends, GitHub stats, competitor analysis |

All 9 servers share one Pro key. **$9/mo = 49 tools.**
