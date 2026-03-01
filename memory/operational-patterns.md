# Operational Patterns & Learnings

## HIGH Confidence
1. Plugin ownership must be root:root — OpenClaw blocks suspicious ownership
2. Gateway warm-up takes 15-20s after restart — always sleep before health check
3. WSL2 relay getpwuid(1000) fails — use wsl.exe -u root as workaround
4. OPENCLAW_HOME causes double .openclaw path — never set explicitly
5. CLI WebSocket fails as root — use HTTP API or direct file editing instead

## MEDIUM Confidence
6. Cron /tmp writes fail on WSL2 — use ~/.openclaw/workspace/tmp/ instead
7. MoltBook DNS dead since ~2026-02 — mark as DEAD, disable crons
8.  order in gumroad-sales is TEST data — no real revenue yet
9. agent config.json model mismatch causes silent failures
10. Golem Memory needs manual knowledge seeding — empty by default

## Debugging Tips
- Gateway not responding: check plugin ownership first (root:root)
- Cron errors: check /tmp writability and Telegram delivery.to field
- CLI failures: try HTTP API directly (curl) before debugging CLI
- Config issues: validate with openclaw doctor, check for unknown keys
