// KPI Dashboard Worker — OpenClaw Command Center
// Auth: Bearer openclaw-kpi-2026 (API only, HTML is public)

const KPI_TOKEN = 'openclaw-kpi-2026';
const KV_TTL = 300; // 5 minutes

const PRODUCT_STORE_URL = 'https://product-store.yagami8095.workers.dev/api/orders';
const BUNSHIN_URL = 'https://openclaw-mcp-servers.onrender.com/health';

const MCP_SERVERS = [
  'mcp-git', 'mcp-filesystem', 'mcp-memory', 'mcp-fetch',
  'mcp-sqlite', 'mcp-postgres', 'mcp-puppeteer', 'mcp-brave-search', 'mcp-sequentialthinking'
];

const FLEET_WORKERS = [
  'yedan-orchestrator', 'yedan-health-commander', 'yedan-revenue-sentinel',
  'yedan-cloud-executor', 'yedan-content-engine', 'yedan-intel-ops'
];

// ─── Auth helper ────────────────────────────────────────────────────────────

function checkAuth(request) {
  const auth = request.headers.get('Authorization') || '';
  return auth === `Bearer ${KPI_TOKEN}`;
}

function unauthorizedJson() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json', 'WWW-Authenticate': 'Bearer realm="kpi"' }
  });
}

// ─── KV cache helpers ────────────────────────────────────────────────────────

async function kvGet(KV, key) {
  try {
    const val = await KV.get(key, 'json');
    return val;
  } catch {
    return null;
  }
}

async function kvSet(KV, key, value) {
  try {
    await KV.put(key, JSON.stringify(value), { expirationTtl: KV_TTL });
  } catch { /* ignore */ }
}

// ─── Fetch with timeout ──────────────────────────────────────────────────────

async function fetchWithTimeout(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();
  try {
    const res = await fetch(url, { signal: controller.signal });
    const latency = Date.now() - start;
    return { ok: res.ok, status: res.status, latency, data: res.ok ? await res.json().catch(() => null) : null };
  } catch (e) {
    return { ok: false, status: 0, latency: Date.now() - start, data: null, error: e.message };
  } finally {
    clearTimeout(timer);
  }
}

// ─── Data aggregators ────────────────────────────────────────────────────────

async function fetchRevenue(KV) {
  const cacheKey = 'kpi:revenue';
  const cached = await kvGet(KV, cacheKey);
  if (cached) return cached;

  const result = await fetchWithTimeout(PRODUCT_STORE_URL, 8000);

  let orders = [];
  if (result.ok && Array.isArray(result.data)) {
    orders = result.data;
  } else if (result.ok && result.data && Array.isArray(result.data.orders)) {
    orders = result.data.orders;
  }

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const weekAgo = new Date(now - 7 * 86400000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let totalRevenue = 0, todayRevenue = 0, weekRevenue = 0, monthRevenue = 0;
  const byDay = {};

  for (const order of orders) {
    const amount = parseFloat(order.amount || order.price || order.total || 0);
    const dateStr = (order.created_at || order.date || order.timestamp || '').slice(0, 10);
    const orderDate = new Date(dateStr || now);

    totalRevenue += amount;
    if (dateStr === todayStr) todayRevenue += amount;
    if (orderDate >= weekAgo) weekRevenue += amount;
    if (orderDate >= monthStart) monthRevenue += amount;
    byDay[dateStr] = (byDay[dateStr] || 0) + amount;
  }

  // Daily rate: avg over last 7 days with at least 1 order
  const activeDays = Object.values(byDay).filter(v => v > 0).length || 1;
  const dailyRate = weekRevenue / Math.min(7, activeDays);
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

  // Orders per day (last 7 days)
  const recentOrders = orders.filter(o => new Date(o.created_at || o.date || now) >= weekAgo);
  const ordersPerDay = recentOrders.length / 7;

  const revenue = {
    total: totalRevenue,
    today: todayRevenue,
    thisWeek: weekRevenue,
    thisMonth: monthRevenue,
    dailyRate,
    avgOrderValue,
    ordersPerDay,
    totalOrders: orders.length,
    recentOrders: recentOrders.length,
    byDay,
    fetchedAt: now.toISOString(),
    storeReachable: result.ok
  };

  await kvSet(KV, cacheKey, revenue);
  return revenue;
}

async function fetchFleetStatus(KV) {
  const cacheKey = 'kpi:fleet';
  const cached = await kvGet(KV, cacheKey);
  if (cached) return cached;

  const checks = await Promise.all(
    FLEET_WORKERS.map(async (name) => {
      const url = `https://${name}.yagami8095.workers.dev/`;
      const result = await fetchWithTimeout(url, 5000);
      return { name, url, online: result.ok, status: result.status, latency: result.latency };
    })
  );

  const online = checks.filter(c => c.online).length;
  const offline = checks.filter(c => !c.online).length;

  const fleet = {
    workers: checks,
    online,
    offline,
    total: checks.length,
    uptimePct: checks.length > 0 ? Math.round((online / checks.length) * 100) : 0,
    fetchedAt: new Date().toISOString()
  };

  await kvSet(KV, cacheKey, fleet);
  return fleet;
}

async function fetchMcpStatus(KV) {
  const cacheKey = 'kpi:mcp';
  const cached = await kvGet(KV, cacheKey);
  if (cached) return cached;

  const checks = await Promise.all(
    MCP_SERVERS.map(async (name) => {
      const url = `https://${name}.yagami8095.workers.dev/`;
      const result = await fetchWithTimeout(url, 5000);
      return { name, url, online: result.ok, status: result.status, latency: result.latency };
    })
  );

  const online = checks.filter(c => c.online).length;

  const mcp = {
    servers: checks,
    online,
    offline: checks.length - online,
    total: checks.length,
    uptimePct: checks.length > 0 ? Math.round((online / checks.length) * 100) : 0,
    fetchedAt: new Date().toISOString()
  };

  await kvSet(KV, cacheKey, mcp);
  return mcp;
}

async function fetchBunshinHealth(KV) {
  const cacheKey = 'kpi:bunshin';
  const cached = await kvGet(KV, cacheKey);
  if (cached) return cached;

  const result = await fetchWithTimeout(BUNSHIN_URL, 8000);
  const bunshin = {
    reachable: result.ok,
    status: result.status,
    latency: result.latency,
    data: result.data,
    fetchedAt: new Date().toISOString()
  };

  await kvSet(KV, cacheKey, bunshin);
  return bunshin;
}

async function fetchAllMetrics(KV) {
  const [revenue, fleet, mcp, bunshin] = await Promise.all([
    fetchRevenue(KV),
    fetchFleetStatus(KV),
    fetchMcpStatus(KV),
    fetchBunshinHealth(KV)
  ]);

  const dailyTarget = 10000;
  const progressPct = Math.min(100, (revenue.today / dailyTarget) * 100);
  const allServicesOnline = fleet.online + mcp.online;
  const allServicesTotal = fleet.total + mcp.total;
  const overallUptimePct = allServicesTotal > 0
    ? Math.round((allServicesOnline / allServicesTotal) * 100) : 0;

  return {
    generatedAt: new Date().toISOString(),
    revenue,
    fleet,
    mcp,
    bunshin,
    summary: {
      dailyTarget,
      todayRevenue: revenue.today,
      progressPct: Math.round(progressPct * 10) / 10,
      totalRevenue: revenue.total,
      dailyRate: revenue.dailyRate,
      avgOrderValue: revenue.avgOrderValue,
      ordersPerDay: revenue.ordersPerDay,
      fleetOnline: fleet.online,
      fleetTotal: fleet.total,
      mcpOnline: mcp.online,
      mcpTotal: mcp.total,
      overallUptimePct,
      bunshinAlive: bunshin.reachable
    }
  };
}

// ─── HTML Dashboard ──────────────────────────────────────────────────────────

function renderHtml(metrics) {
  const { summary, revenue, fleet, mcp, bunshin } = metrics;
  const { progressPct, dailyTarget, todayRevenue, totalRevenue, dailyRate, avgOrderValue,
          ordersPerDay, overallUptimePct, bunshinAlive } = summary;

  const fmtUSD = (n) => '$' + (n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const fmtPct = (n) => (n || 0).toFixed(1) + '%';
  const statusDot = (online) => online
    ? '<span class="dot dot-green"></span>'
    : '<span class="dot dot-red"></span>';

  const progressColor = progressPct >= 80 ? '#00ff88'
    : progressPct >= 40 ? '#ffbb00' : '#ff4466';

  // Revenue by day chart (last 7 days)
  const now = new Date();
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
    last7.push({ label, amount: revenue.byDay?.[key] || 0, key });
  }
  const maxDay = Math.max(...last7.map(d => d.amount), 1);

  const barChart = last7.map(d => {
    const h = Math.max(4, Math.round((d.amount / maxDay) * 80));
    const color = d.key === now.toISOString().slice(0, 10) ? '#00ff88' : '#4488ff';
    return `
      <div class="bar-col">
        <div class="bar-wrap">
          <div class="bar" style="height:${h}px;background:${color};" title="${fmtUSD(d.amount)}"></div>
        </div>
        <div class="bar-label">${d.label}</div>
        <div class="bar-val">${d.amount > 0 ? fmtUSD(d.amount) : ''}</div>
      </div>`;
  }).join('');

  const fleetRows = fleet.workers.map(w => `
    <div class="service-row">
      ${statusDot(w.online)}
      <span class="svc-name">${w.name}</span>
      <span class="svc-latency">${w.online ? w.latency + 'ms' : 'offline'}</span>
    </div>`).join('');

  const mcpRows = mcp.servers.map(s => `
    <div class="service-row">
      ${statusDot(s.online)}
      <span class="svc-name">${s.name}</span>
      <span class="svc-latency">${s.online ? s.latency + 'ms' : 'offline'}</span>
    </div>`).join('');

  const generatedAt = new Date(metrics.generatedAt).toLocaleString('en-US', {
    timeZone: 'Asia/Tokyo', hour12: false
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>OpenClaw KPI Command Center</title>
<meta http-equiv="refresh" content="60">
<style>
  :root {
    --bg: #080c14;
    --card: #0d1520;
    --card2: #111b2a;
    --border: #1a2840;
    --accent: #00c8ff;
    --green: #00ff88;
    --red: #ff4466;
    --yellow: #ffbb00;
    --text: #c8d8f0;
    --muted: #5a7090;
    --hero: #ffffff;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    min-height: 100vh;
    padding: 0;
  }
  /* Header */
  .header {
    background: linear-gradient(135deg, #050810 0%, #0a1428 50%, #050810 100%);
    border-bottom: 1px solid var(--border);
    padding: 18px 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 100;
    backdrop-filter: blur(12px);
  }
  .logo {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .logo-icon {
    width: 36px; height: 36px;
    background: linear-gradient(135deg, #00c8ff, #0044ff);
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; font-weight: 900; color: #fff;
  }
  .logo-text { font-size: 18px; font-weight: 700; color: #fff; letter-spacing: 0.5px; }
  .logo-sub { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; }
  .header-meta { font-size: 12px; color: var(--muted); text-align: right; line-height: 1.6; }
  .header-meta .live-badge {
    display: inline-block; background: rgba(0,255,136,0.15);
    color: var(--green); border: 1px solid rgba(0,255,136,0.3);
    border-radius: 20px; padding: 2px 10px; font-size: 11px;
    font-weight: 600; margin-bottom: 4px;
    animation: pulse-badge 2s infinite;
  }
  @keyframes pulse-badge {
    0%,100% { opacity: 1; } 50% { opacity: 0.6; }
  }
  /* Main layout */
  .main { padding: 28px 32px; max-width: 1400px; margin: 0 auto; }
  /* Hero section */
  .hero {
    background: linear-gradient(135deg, #0a1428 0%, #0d1f3c 50%, #0a1428 100%);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 40px;
    margin-bottom: 24px;
    position: relative;
    overflow: hidden;
  }
  .hero::before {
    content: '';
    position: absolute; inset: 0;
    background: radial-gradient(ellipse at 20% 50%, rgba(0,200,255,0.07) 0%, transparent 60%),
                radial-gradient(ellipse at 80% 50%, rgba(0,68,255,0.05) 0%, transparent 60%);
    pointer-events: none;
  }
  .hero-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center; }
  .hero-label {
    font-size: 12px; font-weight: 700; letter-spacing: 2px;
    text-transform: uppercase; color: var(--accent); margin-bottom: 8px;
  }
  .hero-amount {
    font-size: clamp(48px, 6vw, 84px);
    font-weight: 900; color: var(--hero);
    line-height: 1; letter-spacing: -2px;
    text-shadow: 0 0 40px rgba(0,200,255,0.3);
  }
  .hero-amount .hero-cents { font-size: 0.45em; opacity: 0.7; }
  .hero-target { font-size: 14px; color: var(--muted); margin-top: 8px; }
  .hero-target strong { color: var(--text); }
  .progress-section { margin-top: 20px; }
  .progress-header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 8px; font-size: 13px;
  }
  .progress-label { color: var(--muted); }
  .progress-pct { font-weight: 700; color: ${progressColor}; font-size: 15px; }
  .progress-bar {
    height: 10px; background: rgba(255,255,255,0.08);
    border-radius: 10px; overflow: hidden;
  }
  .progress-fill {
    height: 100%; width: ${Math.max(2, progressPct)}%;
    background: linear-gradient(90deg, ${progressColor}aa, ${progressColor});
    border-radius: 10px;
    transition: width 1s ease;
    box-shadow: 0 0 12px ${progressColor}66;
  }
  .hero-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .hero-stat {
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16px;
    text-align: center;
  }
  .hero-stat-val { font-size: 22px; font-weight: 800; color: #fff; }
  .hero-stat-label { font-size: 11px; color: var(--muted); margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
  /* Grid */
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
  .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 20px; }
  .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
  /* Card */
  .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 24px;
  }
  .card-title {
    font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
    text-transform: uppercase; color: var(--muted); margin-bottom: 16px;
    display: flex; align-items: center; gap: 8px;
  }
  .card-title .icon { font-size: 14px; }
  /* Stat card */
  .stat-val { font-size: 28px; font-weight: 800; color: #fff; line-height: 1; }
  .stat-sub { font-size: 12px; color: var(--muted); margin-top: 6px; }
  .stat-delta {
    font-size: 12px; font-weight: 600;
    margin-top: 4px;
  }
  .delta-up { color: var(--green); }
  .delta-down { color: var(--red); }
  /* Bar chart */
  .bar-chart {
    display: flex; align-items: flex-end; gap: 8px;
    height: 100px; padding-top: 4px;
  }
  .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .bar-wrap { height: 80px; display: flex; align-items: flex-end; width: 100%; justify-content: center; }
  .bar {
    width: 100%; border-radius: 4px 4px 0 0;
    min-height: 4px;
    transition: height 0.5s ease;
  }
  .bar-label { font-size: 10px; color: var(--muted); }
  .bar-val { font-size: 9px; color: var(--muted); text-align: center; min-height: 12px; }
  /* Service rows */
  .service-row {
    display: flex; align-items: center; gap: 10px;
    padding: 7px 0;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    font-size: 13px;
  }
  .service-row:last-child { border-bottom: none; }
  .svc-name { flex: 1; color: var(--text); }
  .svc-latency { font-size: 11px; color: var(--muted); font-family: monospace; }
  .dot {
    width: 8px; height: 8px; border-radius: 50%;
    flex-shrink: 0;
  }
  .dot-green {
    background: var(--green);
    box-shadow: 0 0 6px var(--green);
  }
  .dot-red {
    background: var(--red);
    box-shadow: 0 0 6px var(--red);
  }
  /* Uptime badge */
  .uptime-badge {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(0,255,136,0.1);
    border: 1px solid rgba(0,255,136,0.25);
    color: var(--green);
    border-radius: 20px; padding: 4px 12px;
    font-size: 13px; font-weight: 700;
  }
  .uptime-badge.warn {
    background: rgba(255,187,0,0.1);
    border-color: rgba(255,187,0,0.3);
    color: var(--yellow);
  }
  .uptime-badge.down {
    background: rgba(255,68,102,0.1);
    border-color: rgba(255,68,102,0.3);
    color: var(--red);
  }
  /* Bunshin status */
  .bunshin-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 0;
  }
  .bunshin-name { font-weight: 600; }
  .bunshin-online { color: var(--green); font-size: 13px; font-weight: 700; }
  .bunshin-offline { color: var(--red); font-size: 13px; font-weight: 700; }
  /* Footer */
  .footer {
    text-align: center; padding: 24px;
    color: var(--muted); font-size: 12px;
    border-top: 1px solid var(--border);
    margin-top: 8px;
  }
  .footer a { color: var(--accent); text-decoration: none; }
  /* Responsive */
  @media (max-width: 900px) {
    .main { padding: 16px; }
    .hero-grid { grid-template-columns: 1fr; gap: 24px; }
    .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; }
    .hero-stats { grid-template-columns: 1fr 1fr; }
  }
  /* Animations */
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .card, .hero { animation: fadeInUp 0.4s ease both; }
  .hero { animation-delay: 0.05s; }
  .grid-4 .card:nth-child(1) { animation-delay: 0.10s; }
  .grid-4 .card:nth-child(2) { animation-delay: 0.15s; }
  .grid-4 .card:nth-child(3) { animation-delay: 0.20s; }
  .grid-4 .card:nth-child(4) { animation-delay: 0.25s; }
  .grid-2 .card:nth-child(1) { animation-delay: 0.30s; }
  .grid-2 .card:nth-child(2) { animation-delay: 0.35s; }
</style>
</head>
<body>

<header class="header">
  <div class="logo">
    <div class="logo-icon">C</div>
    <div>
      <div class="logo-text">OpenClaw KPI</div>
      <div class="logo-sub">Command Center</div>
    </div>
  </div>
  <div class="header-meta">
    <div class="live-badge">● LIVE</div>
    <div>Updated: ${generatedAt} JST</div>
    <div>Auto-refresh: 60s</div>
  </div>
</header>

<main class="main">

  <!-- Hero -->
  <div class="hero">
    <div class="hero-grid">
      <div>
        <div class="hero-label">Today's Revenue</div>
        <div class="hero-amount">${fmtUSD(todayRevenue)}</div>
        <div class="hero-target">Target: <strong>${fmtUSD(dailyTarget)}</strong> / day</div>
        <div class="progress-section">
          <div class="progress-header">
            <span class="progress-label">Daily Goal Progress</span>
            <span class="progress-pct">${fmtPct(progressPct)}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill"></div>
          </div>
        </div>
      </div>
      <div class="hero-stats">
        <div class="hero-stat">
          <div class="hero-stat-val">${fmtUSD(totalRevenue)}</div>
          <div class="hero-stat-label">All Time</div>
        </div>
        <div class="hero-stat">
          <div class="hero-stat-val">${fmtUSD(revenue.thisWeek)}</div>
          <div class="hero-stat-label">This Week</div>
        </div>
        <div class="hero-stat">
          <div class="hero-stat-val">${fmtUSD(revenue.thisMonth)}</div>
          <div class="hero-stat-label">This Month</div>
        </div>
        <div class="hero-stat">
          <div class="hero-stat-val">${fmtUSD(dailyRate)}</div>
          <div class="hero-stat-label">Daily Rate</div>
        </div>
        <div class="hero-stat">
          <div class="hero-stat-val">${fmtUSD(avgOrderValue)}</div>
          <div class="hero-stat-label">Avg Order</div>
        </div>
        <div class="hero-stat">
          <div class="hero-stat-val">${(ordersPerDay || 0).toFixed(1)}</div>
          <div class="hero-stat-label">Orders / Day</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Top stats -->
  <div class="grid-4">
    <div class="card">
      <div class="card-title"><span class="icon">📦</span> Total Orders</div>
      <div class="stat-val">${revenue.totalOrders}</div>
      <div class="stat-sub">${revenue.recentOrders} in last 7 days</div>
    </div>
    <div class="card">
      <div class="card-title"><span class="icon">⚡</span> System Uptime</div>
      <div class="stat-val">${overallUptimePct}%</div>
      <div class="stat-sub">${summary.fleetOnline + summary.mcpOnline}/${summary.fleetTotal + summary.mcpTotal} services online</div>
    </div>
    <div class="card">
      <div class="card-title"><span class="icon">🤖</span> Fleet Workers</div>
      <div class="stat-val">${summary.fleetOnline}/${summary.fleetTotal}</div>
      <div class="stat-sub">${fleet.uptimePct}% uptime</div>
    </div>
    <div class="card">
      <div class="card-title"><span class="icon">🔌</span> MCP Servers</div>
      <div class="stat-val">${summary.mcpOnline}/${summary.mcpTotal}</div>
      <div class="stat-sub">${mcp.uptimePct}% uptime</div>
    </div>
  </div>

  <!-- Revenue chart + Fleet status -->
  <div class="grid-2">
    <div class="card">
      <div class="card-title"><span class="icon">📈</span> Revenue — Last 7 Days</div>
      <div class="bar-chart">${barChart}</div>
    </div>
    <div class="card">
      <div class="card-title"><span class="icon">🛡️</span> Cloud Infrastructure</div>
      <div class="bunshin-row">
        <div>
          <div class="bunshin-name">Bunshin v4.1.2</div>
          <div style="font-size:11px;color:var(--muted)">openclaw-mcp-servers.onrender.com</div>
        </div>
        <div class="${bunshinAlive ? 'bunshin-online' : 'bunshin-offline'}">
          ${bunshinAlive ? '● ONLINE' : '● OFFLINE'}
        </div>
      </div>
      <div style="margin-top:12px;">
        <span class="uptime-badge ${overallUptimePct >= 80 ? '' : overallUptimePct >= 50 ? 'warn' : 'down'}">
          ${overallUptimePct >= 80 ? '●' : '⚠'} ${overallUptimePct}% Overall Uptime
        </span>
      </div>
      <div style="margin-top:16px;font-size:12px;color:var(--muted);line-height:1.8;">
        <div>Product Store: <span style="color:${revenue.storeReachable ? 'var(--green)' : 'var(--red)'}">${revenue.storeReachable ? 'Reachable' : 'Unreachable'}</span></div>
        <div>Fleet Online: <span style="color:var(--text)">${fleet.online}/${fleet.total}</span></div>
        <div>MCP Online: <span style="color:var(--text)">${mcp.online}/${mcp.total}</span></div>
      </div>
    </div>
  </div>

  <!-- Fleet + MCP status -->
  <div class="grid-2">
    <div class="card">
      <div class="card-title"><span class="icon">🚀</span> Fleet Workers</div>
      ${fleetRows}
    </div>
    <div class="card">
      <div class="card-title"><span class="icon">🔗</span> MCP Servers</div>
      ${mcpRows}
    </div>
  </div>

</main>

<footer class="footer">
  OpenClaw KPI Dashboard &mdash; Data cached 5 min &mdash;
  <a href="/api/kpi">JSON API</a> &bull;
  <a href="/api/revenue">Revenue</a> &bull;
  <a href="/api/fleet">Fleet</a> &bull;
  <a href="/api/health">Health</a>
</footer>

</body>
</html>`;
}

// ─── Main handler ────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const KV = env.KV;

    // Public HTML dashboard
    if (path === '/' || path === '') {
      const metrics = await fetchAllMetrics(KV);
      const html = renderHtml(metrics);
      return new Response(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Generated-At': metrics.generatedAt
        }
      });
    }

    // API endpoints — require auth
    if (path.startsWith('/api/')) {
      if (!checkAuth(request)) return unauthorizedJson();

      if (path === '/api/kpi') {
        const metrics = await fetchAllMetrics(KV);
        return new Response(JSON.stringify(metrics, null, 2), {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
        });
      }

      if (path === '/api/revenue') {
        const revenue = await fetchRevenue(KV);
        return new Response(JSON.stringify(revenue, null, 2), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (path === '/api/fleet') {
        const fleet = await fetchFleetStatus(KV);
        return new Response(JSON.stringify(fleet, null, 2), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (path === '/api/health') {
        const [fleet, mcp, bunshin] = await Promise.all([
          fetchFleetStatus(KV),
          fetchMcpStatus(KV),
          fetchBunshinHealth(KV)
        ]);
        const health = {
          fleet,
          mcp,
          bunshin,
          generatedAt: new Date().toISOString()
        };
        return new Response(JSON.stringify(health, null, 2), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not found', { status: 404 });
  }
};
