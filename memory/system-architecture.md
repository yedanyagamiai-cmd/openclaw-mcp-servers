# OpenClaw System Architecture

## Three-Body Architecture
- **Claude Code (Brain)**: Windows, strategy/deployment/complex dev
- **OpenClaw Alpha (Combat)**: WSL2 :18789, revenue/content/Telegram
- **OpenClaw Beta (Recon)**: WSL2 :18790, intel/security/monitoring

## Config Rules
- NEVER use jq (use Python for JSON)
- openclaw.json: no unknown keys, validate with openclaw doctor
- Plugin extensions: MUST be owned by root:root (uid=0)
- OPENCLAW_HOME: do NOT set explicitly (causes double .openclaw path)
- agent config.json: model must match openclaw.json primary model

## Cloudflare Resources
- Workers: 20 total (9 MCP + 3 production + 8 legacy)
- D1: 11 databases (gumroad-sales=intel-api, yedan-omega-memory=learnings)
- KV: 20 namespaces

## Revenue Channels (as of 2026-03-01)
- Intel API Pro: /bin/bash (order was TEST data)
- MoltBook: DEAD (DNS failure)
- ClawWork: concept only (npm package doesn't exist)
- note.com: needs verification
- Fortune API: free tier only
- 9 MCP Servers: GitHub+Smithery distribution
