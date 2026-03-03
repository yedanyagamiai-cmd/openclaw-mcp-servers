# MCP Directory Submissions — Status Tracker

**Last Updated**: 2026-03-03 15:00 JST
**Payment Pipeline**: VERIFIED (HTTP 402 → Trial/PayPal/x402 URLs)
**Repo Age**: 4 days (created 2026-02-27)
**Revenue**: $0 | Stars: 0 | Forks: 0

## Submission Matrix

| Directory | Status | Method | Details |
|-----------|--------|--------|---------|
| **Smithery** | ✅ LIVE (8/9 indexed) | Auto | regex-engine: 0 tools (needs re-publish, Y-NEW) |
| **punkpeye/awesome-mcp** | 🟡 PR #2622 OPEN | Consolidated PR | Old PRs #2499-#2502,#2509 self-closed. Awaiting review |
| **Official MCP Registry** | 🟡 PR #3426 OPEN | GitHub PR | #3422,#3423 closed. Awaiting review |
| **jaw9c/awesome-remote** | 🟡 PR #126 OPEN | GitHub PR | 5 servers. Awaiting review |
| **Cline Marketplace** | 🟡 Issue #750 OPEN | Consolidated Issue | Old #711,#712,#715 self-closed. Awaiting review |
| **mcpservers.org** | ❌ NOT LIVE | Web form | 5 submitted but 0 appear in search. Re-submit needed |
| **mcp.so** | ❓ Unknown | GitHub Issues | #606,#608,#611 — cannot verify (API returns empty) |
| **PulseMCP** | 🔄 Auto-ingest | Official Registry | Depends on PR #3426 merge |
| **LobeHub** | 🔄 Auto-indexed | Auto | No manual submission needed |
| **Cursor Directory** | ⏳ Not submitted | Community | cursor.directory/mcp — needs submission |
| **Official Registry CLI** | ⏳ Blocked | npm login | Needs interactive `npm login` (Y4) |

## Smithery Server Status (Verified 2026-03-03)

| Server | Smithery Name | Tools | Status |
|--------|--------------|-------|--------|
| json-toolkit | openclaw-ai/json-toolkit | 6 | ✅ |
| regex-engine | openclaw-ai/regex-engine | **0** | ⚠️ Needs re-publish |
| color-palette | openclaw-ai/color-palette | 5 | ✅ |
| timestamp-converter | openclaw-ai/timestamp-converter | 5 | ✅ |
| prompt-enhancer | openclaw-ai/prompt-enhancer | 6 | ✅ |
| openclaw-intel | openclaw-ai/openclaw-intel | 6 | ✅ |
| fortune | openclaw-ai/fortune | 3 | ✅ |
| moltbook-publisher | openclaw-ai/moltbook-publisher | 8 | ✅ |
| agentforge-compare | openclaw-ai/agentforge-compare | 5 | ✅ |

## MoltBook Activity (Social Distribution)
- **Lifetime Replies**: 193+
- **Karma**: 98
- **Active Timer**: Every 2h (moltbook-machine.timer)
- **Machine Version**: v5.0 (AI Agent Conversion Engine)
- **Wave 6 Posts**: 4/4 to MCP-focused submolts
- **Tier S Campaign**: 3 targeted replies
- **Agent Intel**: 1277 profiled (70 Tier S, 118 Tier A)
- **Reality Check**: 0/1277 agents have MCP client capability

## GitHub Showcase
- **Repo**: github.com/yedanyagamiai-cmd/openclaw-mcp-servers
- **Stars**: 0 | **Forks**: 0 | **Issues**: 1
- **DEMO.md**: 5 curl examples
- **CONTRIBUTING.md**: How to add tools
- **Issue Templates**: bug_report.md, feature_request.md
- **Discussion #2**: Announcements
- **Topics**: 10 (mcp, mcp-server, ai-tools, cloudflare-workers, etc.)

## Yedan Todos (Manual Actions Required)
- **Y-NEW**: Get Smithery API key from smithery.ai/account/api-keys → re-publish regex-engine
- **Y4**: `npm login` for Official Registry CLI
- **Y-URGENT**: Revoke exposed Anthropic API key at console.anthropic.com

## Priority 1: punkpeye/awesome-mcp-servers (feeds Glama.ai)

**URL**: https://github.com/punkpeye/awesome-mcp-servers
**Method**: GitHub Pull Request adding entry to README.md

### Entry to Add (under "Utilities" section):

```markdown
- [OpenClaw MCP Ecosystem](https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers) - 9 remote MCP servers for AI agents: JSON toolkit, regex engine, color palette, timestamp converter, prompt enhancer, AI market intelligence, fortune/horoscope, content publisher, and AI tool comparison. Free tier + Pro API keys ($9). Cloudflare Workers, zero-install.
```

## Priority 2: jaw9c/awesome-remote-mcp-servers

**URL**: https://github.com/jaw9c/awesome-remote-mcp-servers
**Method**: GitHub Pull Request

### Entry to Add:

```markdown
### OpenClaw Ecosystem
- **URL**: Various (see below)
- **Description**: 9 remote MCP servers hosted on Cloudflare Workers. Free tier with rate limits, Pro tier ($9) with 1000 calls/day.
- **Servers**:
  - `json-toolkit-mcp.yagami8095.workers.dev` - JSON formatting, validation, querying, diff
  - `regex-engine-mcp.yagami8095.workers.dev` - Regex testing, extraction, replacement
  - `color-palette-mcp.yagami8095.workers.dev` - Color palette generation, conversion, accessibility
  - `timestamp-converter-mcp.yagami8095.workers.dev` - Timestamp conversion across formats/timezones
  - `prompt-enhancer-mcp.yagami8095.workers.dev` - AI prompt optimization and enhancement
  - `openclaw-intel-mcp.yagami8095.workers.dev` - AI agent market intelligence reports
  - `openclaw-fortune-mcp.yagami8095.workers.dev` - Daily horoscope and tarot readings
  - `moltbook-publisher-mcp.yagami8095.workers.dev` - Markdown to HTML conversion for CMS platforms
  - `agentforge-compare-mcp.yagami8095.workers.dev` - Side-by-side AI coding tool comparison
- **Source**: https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers
```

## Priority 3: PulseMCP

**URL**: https://www.pulsemcp.com/use-cases/submit
**Method**: Web form submission

### Form Data:
- **Server Name**: OpenClaw MCP Ecosystem
- **URL**: https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers
- **Description**: 9 remote MCP servers on Cloudflare Workers for AI agents. Includes JSON toolkit, regex engine, color palettes, timestamps, prompt enhancement, AI market intelligence, fortune readings, content publishing, and AI tool comparison. Free tier + Pro API keys.
- **Category**: Utilities / Developer Tools

## Priority 4: mcpservers.org

**URL**: https://mcpservers.org/submit
**Method**: Web form

### Submit each server individually:
1. JSON Toolkit MCP - https://json-toolkit-mcp.yagami8095.workers.dev
2. Regex Engine MCP - https://regex-engine-mcp.yagami8095.workers.dev
3. Color Palette MCP - https://color-palette-mcp.yagami8095.workers.dev
4. Timestamp Converter MCP - https://timestamp-converter-mcp.yagami8095.workers.dev
5. Prompt Enhancer MCP - https://prompt-enhancer-mcp.yagami8095.workers.dev
6. OpenClaw Intel MCP - https://openclaw-intel-mcp.yagami8095.workers.dev
7. Fortune MCP - https://openclaw-fortune-mcp.yagami8095.workers.dev
8. MoltBook Publisher MCP - https://moltbook-publisher-mcp.yagami8095.workers.dev
9. AgentForge Compare MCP - https://agentforge-compare-mcp.yagami8095.workers.dev

## Priority 5: Official MCP Registry

**URL**: https://registry.modelcontextprotocol.io/
**Method**: `mcp-publisher` CLI tool
**Requirement**: GitHub OAuth, namespace: io.github.yedanyagamiai-cmd
**Status**: Needs npm login first (blocked)

## Priority 6: Cursor Directory

**URL**: https://cursor.directory/mcp
**Note**: Community-driven, 1800+ servers. Submit individual servers.

---

## YEDAN Auto-Submit Instructions

For directories requiring GitHub PRs:
1. Fork the repo
2. Create branch: `add-openclaw-mcp-servers`
3. Add the entry from above to README.md
4. Submit PR with title: "Add OpenClaw MCP Ecosystem (9 remote servers)"
5. PR body: "Adding 9 remote MCP servers hosted on Cloudflare Workers. Free tier + Pro API keys. All servers are production-ready with MCP 2025-03-26 protocol support."

For web forms: use browser automation (browser-agent.py) or manual submission.
