const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// OpenClaw MCP Server endpoints
const MCP_SERVERS = [
  { name: 'json-toolkit', url: 'https://json-toolkit-mcp.yagami8095.workers.dev' },
  { name: 'regex-engine', url: 'https://regex-engine-mcp.yagami8095.workers.dev' },
  { name: 'color-palette', url: 'https://color-palette-mcp.yagami8095.workers.dev' },
  { name: 'timestamp-converter', url: 'https://timestamp-converter-mcp.yagami8095.workers.dev' },
  { name: 'prompt-enhancer', url: 'https://prompt-enhancer-mcp.yagami8095.workers.dev' },
  { name: 'agentforge-compare', url: 'https://agentforge-compare-mcp.yagami8095.workers.dev' },
  { name: 'moltbook-publisher', url: 'https://moltbook-publisher-mcp.yagami8095.workers.dev' },
  { name: 'fortune', url: 'https://openclaw-fortune-mcp.yagami8095.workers.dev' },
  { name: 'intel', url: 'https://openclaw-intel-mcp.yagami8095.workers.dev' },
];

// Store health history in memory (resets on restart, but free tier is fine)
const healthHistory = [];
const MAX_HISTORY = 1000;

async function checkServer(server) {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(server.url, { signal: controller.signal });
    clearTimeout(timeout);
    return {
      name: server.name,
      url: server.url,
      status: res.status,
      ok: res.status >= 200 && res.status < 500,
      latency: Date.now() - start,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      name: server.name,
      url: server.url,
      status: 0,
      ok: false,
      latency: Date.now() - start,
      error: err.message,
      timestamp: new Date().toISOString(),
    };
  }
}

async function checkAllServers() {
  const results = await Promise.all(MCP_SERVERS.map(checkServer));
  const record = {
    timestamp: new Date().toISOString(),
    servers: results,
    healthy: results.filter(r => r.ok).length,
    total: results.length,
  };
  healthHistory.unshift(record);
  if (healthHistory.length > MAX_HISTORY) healthHistory.pop();
  return record;
}

// Routes
app.get('/', (req, res) => {
  res.json({
    service: 'OpenClaw Health API',
    version: '1.0.0',
    endpoints: {
      '/': 'This info',
      '/health': 'Check all 9 MCP servers now',
      '/health/history': 'Recent health check history',
      '/health/:name': 'Check specific server',
      '/status': 'Quick status summary',
    },
    servers: MCP_SERVERS.length,
    uptime: process.uptime(),
  });
});

app.get('/health', async (req, res) => {
  const result = await checkAllServers();
  const statusCode = result.healthy === result.total ? 200 : 503;
  res.status(statusCode).json(result);
});

app.get('/health/history', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, MAX_HISTORY);
  res.json({
    count: healthHistory.length,
    history: healthHistory.slice(0, limit),
  });
});

app.get('/health/:name', async (req, res) => {
  const server = MCP_SERVERS.find(s => s.name === req.params.name);
  if (!server) {
    return res.status(404).json({ error: 'Server not found', available: MCP_SERVERS.map(s => s.name) });
  }
  const result = await checkServer(server);
  res.json(result);
});

app.get('/status', (req, res) => {
  const latest = healthHistory[0];
  if (!latest) {
    return res.json({ message: 'No health checks yet. Visit /health first.', servers: MCP_SERVERS.length });
  }
  res.json({
    healthy: latest.healthy,
    total: latest.total,
    allOk: latest.healthy === latest.total,
    lastCheck: latest.timestamp,
    checksTotal: healthHistory.length,
  });
});

// Periodic health check (every 5 minutes)
setInterval(async () => {
  try {
    const result = await checkAllServers();
    const down = result.servers.filter(s => !s.ok);
    if (down.length > 0) {
      console.error(`[ALERT] ${down.length} servers DOWN: ${down.map(s => s.name).join(', ')}`);
    } else {
      console.log(`[OK] All ${result.total} servers healthy at ${result.timestamp}`);
    }
  } catch (err) {
    console.error('[ERROR] Health check failed:', err.message);
  }
}, 5 * 60 * 1000);

// Initial health check on startup
setTimeout(() => checkAllServers().then(r => {
  console.log(`[BOOT] Initial check: ${r.healthy}/${r.total} healthy`);
}), 3000);

app.listen(PORT, () => {
  console.log(`OpenClaw Health API running on port ${PORT}`);
  console.log(`Monitoring ${MCP_SERVERS.length} MCP servers`);
});
