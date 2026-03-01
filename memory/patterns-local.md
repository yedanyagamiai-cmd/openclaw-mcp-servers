# Local Patterns (synced from WSL2 Alpha)

## Session 14 Learnings (2026-03-01)
- 10/24 cron ERROR simultaneously — root cause: /tmp + Telegram delivery config
- Gateway blocked by plugin ownership (root:root required, not yedan:yedan)
- OPENCLAW_HOME env var creates double .openclaw path bug
- WSL2 relay getpwuid(1000) — use -u root workaround
- CLI WebSocket fails as root — use HTTP API or file edits
-  order verified as TEST data (null email, no PayPal txn)
- MoltBook DNS dead — disable all related crons
- agent config.json model must match openclaw.json
- D1 indexes on gumroad-sales improve query performance
- Golem Memory knowledge dir starts empty — needs manual seeding
