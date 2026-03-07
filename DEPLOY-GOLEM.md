# Deploy Golem Agent to Render — 2-Minute Guide

**Target URL**: https://openclaw-golem-agent.onrender.com
**Service**: `openclaw-golem-agent` (Docker, Free tier, Oregon)
**GitHub**: https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers

---

## Option A: Blueprint (Recommended — 1 click)

### Step 1 — Open Render Dashboard
Go to: https://dashboard.render.com

### Step 2 — New Blueprint
Click **"New +"** in the top-right → select **"Blueprint"**

### Step 3 — Connect GitHub Repo
- Connect GitHub if not already connected
- Select repo: **`yedanyagamiai-cmd/openclaw-mcp-servers`**
- Render will auto-detect `render.yaml` at the repo root

### Step 4 — Review Services
Render shows one service: **`openclaw-golem-agent`**
- Runtime: Docker
- Plan: Free
- Region: Oregon

### Step 5 — Set Secret Env Vars
Render will prompt for vars marked `sync: false`. Enter these exact values
(get the real values from `/home/yedan/.openclaw/secrets/openclaw.env`):

| Variable | Where to find the value |
|----------|------------------------|
| `TELEGRAM_BOT_TOKEN` | `openclaw.env` → `TELEGRAM_BOT_TOKEN` |
| `DEEPINFRA_API_KEY` | `openclaw.env` → `DEEPINFRA_API_KEY` |
| `GROQ_API_KEY` | `openclaw.env` → `GROQ_API_KEY` |
| `BUNSHIN_TOKEN` | `openclaw-bunshin-2026` (static) |

Quick copy from WSL:
```bash
MSYS_NO_PATHCONV=1 wsl.exe -u root -e /bin/bash -c \
  "grep -E 'TELEGRAM_BOT_TOKEN|DEEPINFRA_API_KEY|GROQ_API_KEY' /home/yedan/.openclaw/secrets/openclaw.env"
```

These are pre-filled (no action needed):

| Variable | Value |
|----------|-------|
| `PORT` | `3000` |
| `NODE_ENV` | `production` |
| `TELEGRAM_CHAT_ID` | `7848052227` |
| `CF_BROWSER_URL` | `https://openclaw-browser.yagami8095.workers.dev` |
| `CF_BROWSER_TOKEN` | `openclaw-browser-2026` |
| `BUNSHIN_URL` | `https://openclaw-mcp-servers.onrender.com` |

### Step 6 — Deploy
Click **"Apply"** → Render builds the Docker image and deploys.

Build time: ~3-5 minutes (downloads node:20-slim + installs deps)

### Step 7 — Verify
Once deploy shows **"Live"**:

```bash
curl https://openclaw-golem-agent.onrender.com/health
```

Expected response:
```json
{"ok":true,"uptime":"0h0m","heartbeats":0,"tasksRun":0,"browserReady":false}
```

Telegram: Golem sends a boot message to @yedanyagami_moltbot automatically.

---

## Option B: Deploy Hook (after first deploy)

Once the service exists, get the deploy hook from:
**Render Dashboard → openclaw-golem-agent → Settings → Deploy Hook**

Copy the URL, then run:

```bash
bash C:\Users\yagam\.openclaw\deploy-golem-render.sh --hook-url "https://api.render.com/deploy/srv-xxxx?key=yyyy"
```

Or store it as GitHub secret `RENDER_DEPLOY_HOOK` — then every push to `golem-agent/` auto-deploys via `.github/workflows/deploy-golem.yml`.

---

## Option C: Render API Key (fully automated)

Get API key from: **Render Dashboard → Account → API Keys → Create API Key**

```bash
bash C:\Users\yagam\.openclaw\deploy-golem-render.sh --api-key rnd_xxxxxxxxxxxx
```

This creates the service if it doesn't exist, or triggers a re-deploy if it does.

---

## After Deploy — Add to Keepalive

The Free tier sleeps after 15min inactivity. Add Golem to the keepalive cron.

In `C:\Users\yagam\openclaw-mcp-servers\yedan-orchestrator\` (or the CF keepalive worker),
add this URL to the ping list:

```
https://openclaw-golem-agent.onrender.com/health
```

---

## Troubleshooting

**Build fails — "Cannot find module"**
- Check `golem-agent/package.json` has all deps listed
- Dockerfile does `npm install --production` — dev deps are excluded

**Health check fails**
- Default timeout is 15s start period; Render waits up to 2min before marking failed
- Logs: Dashboard → openclaw-golem-agent → Logs tab

**Telegram not responding**
- Verify `TELEGRAM_BOT_TOKEN` is set correctly (no trailing spaces)
- Bot must not be blocked — send `/start` to `@yedanyagami_moltbot`

**Service URL is wrong**
- Render slugifies the service name: `openclaw-golem-agent` → `openclaw-golem-agent.onrender.com`
- If name was taken, Render adds a suffix (e.g., `-abc1`)
