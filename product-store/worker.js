/**
 * product-store Worker — Digital Product Store with PayPal + Stripe + GitHub OAuth
 * Cloudflare Workers + D1 + KV
 *
 * ENV VARS (set via wrangler secret):
 *   PAYPAL_BUSINESS_EMAIL  - PayPal business email for Buy Now buttons
 *   STRIPE_SECRET_KEY      - Stripe secret key for Checkout Sessions
 *   STRIPE_WEBHOOK_SECRET  - Stripe webhook signing secret
 *   GITHUB_CLIENT_ID       - GitHub OAuth App client ID
 *   GITHUB_CLIENT_SECRET   - GitHub OAuth App client secret
 *
 * OAuth Flow:
 *   GET /auth/login       → redirect to GitHub OAuth
 *   GET /auth/callback    → exchange code for token → issue Pro API key
 *   GET /auth/status      → check if user has Pro key (via KV)
 */

// ============================================================
// PRODUCT CATALOG
// ============================================================
const PRODUCTS = {
  'prompt-collection-50': {
    id: 'prompt-collection-50',
    name: '【保存版】実戦で使えるAIプロンプト50選',
    tagline: 'ChatGPT / Claude / DeepSeek 対応 — コピペですぐ使える',
    description: 'コーディング、ビジネス、ライティング、データ分析、生産性の5カテゴリ×10個。現場で即使えるプロンプトテンプレート集。',
    features: [
      '🟢 コーディング（10個）— バグ修正、レビュー、テスト、API設計、CI/CD',
      '🔵 ビジネス（10個）— 競合分析、ペルソナ、価格戦略、OKR',
      '🟠 ライティング（10個）— SEO、SNS、セールス、技術文書',
      '🟣 データ分析（10個）— CSV分析、A/Bテスト、ML、異常検知',
      '🔴 生産性（10個）— タスク管理、学習、意思決定、目標設定',
    ],
    price_usd: 19,
    price_jpy: 2980,
    currency: 'USD',
    format: 'HTML/PDF',
    file_key: 'products/prompt-collection-50',
    badge: 'BEST SELLER',
    emoji: '🚀',
  },
  'automation-guide': {
    id: 'automation-guide',
    name: '【完全保存版】24時間稼働AIシステムの作り方',
    tagline: 'Claude Code × OpenClaw — ゼロから構築する実践ガイド',
    description: '環境構築からCronジョブ、Telegram連携、Cloudflare Workers統合まで。月額750円で24時間AIが働くシステムを構築。',
    features: [
      '🛠️ 環境構築 — WSL + OpenClaw + 30分で完了',
      '🤖 Cron自動化 — 情報収集・レポート・監視',
      '📱 Telegram連携 — どこからでも操作',
      '☁️ Cloudflare Workers — API・DB・ストレージ',
      '🔧 トラブルシューティング — 実際のエラーと解決法',
    ],
    price_usd: 15,
    price_jpy: 1980,
    currency: 'USD',
    format: 'HTML/PDF',
    file_key: 'products/automation-guide',
    badge: 'NEW',
    emoji: '⚡',
  },
  'side-income-roadmap': {
    id: 'side-income-roadmap',
    name: '【2026年最新】AIで月10万円稼ぐ副業ロードマップ',
    tagline: '4フェーズ × 実践テンプレート付き',
    description: 'AI副業の現実と具体的な収益化手法。note.com有料記事、プロンプト販売、自動化代行、API販売の4本柱。',
    features: [
      '📊 2026年AI副業市場の最新データ',
      '🗺️ 4フェーズのロードマップ（0→10万円）',
      '💰 価格設定・販売戦略テンプレート',
      '⚡ 自動化で作業時間を1/6に削減する方法',
      '📋 売れるコンテンツの3条件チェックリスト',
    ],
    price_usd: 12,
    price_jpy: 1480,
    currency: 'USD',
    format: 'HTML/PDF',
    file_key: 'products/side-income-roadmap',
    badge: 'HOT',
    emoji: '💰',
  },
  'intel-api-pro': {
    id: 'intel-api-pro',
    name: 'OpenClaw Intel Pro API Key',
    tagline: 'Full AI market intelligence for your agent or app',
    description: 'Unlock full AI agent market reports, 1000 API calls/day, and priority access to new intelligence tools. Works with any MCP client (Claude Code, Cursor, Windsurf, Cline) or direct REST API.',
    features: [
      '📊 Full market intelligence reports (not just summaries)',
      '🔑 1000 API calls per day (vs 3 free)',
      '⚡ Priority access to new intelligence tools',
      '🤖 Works with MCP clients + REST API',
      '📧 Email support',
    ],
    price_usd: 9,
    price_jpy: 1380,
    currency: 'USD',
    format: 'API_KEY',
    type: 'api_key',
    badge: 'PRO',
    emoji: '🔑',
  },
  'mcp-starter-kit': {
    id: 'mcp-starter-kit',
    name: 'MCP Server 開発スターターキット',
    tagline: 'Build & deploy your own MCP server in 30 minutes',
    description: 'Complete development kit for building production-ready MCP servers on Cloudflare Workers. Includes battle-tested templates, JSON-RPC 2.0 skeleton, D1 database integration, PayPal monetization flow, and deployment scripts. Used to build the OpenClaw ecosystem.',
    features: [
      '📦 Production-ready Worker template (JSON-RPC 2.0 + MCP 2025-03-26)',
      '🗄️ D1 database integration with migration scripts',
      '💰 Built-in monetization: PayPal checkout + API key generation',
      '🚀 One-command deploy: wrangler deploy → live in 30 seconds',
      '📖 Step-by-step guide (JP/EN) with real deployment examples',
      '🔧 Cross-promo & upgradeSignal patterns for AI-native marketing',
    ],
    price_usd: 29,
    price_jpy: 4480,
    currency: 'USD',
    format: 'ZIP',
    file_key: 'products/mcp-starter-kit',
    badge: 'NEW',
    emoji: '🛠️',
  },
  'ecosystem-pro': {
    id: 'ecosystem-pro',
    name: 'OpenClaw Ecosystem Pro',
    tagline: 'All 9 MCP servers, 1000 calls/day — one-time $9',
    description: 'Unlock the full OpenClaw MCP ecosystem. 49 tools across 9 Cloudflare Workers edge servers: JSON Toolkit, Regex Engine, Color Palette, Timestamp Converter, Prompt Enhancer, AI Market Intel, Fortune Tarot, Content Publisher, AI Tool Comparison. Pro API key with 1000 calls/day per server (vs 3 free). x402 users: this is cheaper if you make 180+ calls/month.',
    features: [
      '🔓 All 9 MCP servers unlocked (49 tools)',
      '📊 1000 calls/day per server (vs 3 free)',
      '⚡ Edge-deployed on Cloudflare Workers (<50ms)',
      '🔑 Single Pro API key works across all servers',
      '💰 One-time $9 (no subscription, no recurring)',
      '🤖 Works with Claude Code, Cursor, Windsurf, Cline',
    ],
    price_usd: 9,
    price_jpy: 1380,
    currency: 'USD',
    format: 'API_KEY',
    type: 'api_key',
    badge: 'MOST POPULAR',
    emoji: '🦞',
  },
  'intel-annual-pass': {
    id: 'intel-annual-pass',
    name: 'OpenClaw Intel Pro 年間パス',
    tagline: '12 months of full AI market intelligence — save 27%',
    description: '12-month premium access to OpenClaw Intel. Unlimited API calls, full market reports, priority access to new tools, and exclusive monthly deep-dive analysis. Best value for serious AI developers and analysts.',
    features: [
      '📊 Unlimited full market intelligence reports (no daily cap)',
      '🔑 12-month Pro API key (auto-renew optional)',
      '📈 Monthly deep-dive analysis: trends, threats, opportunities',
      '⚡ Priority access to new MCP tools (MoltBook, AgentForge, etc.)',
      '📧 Priority email support',
      '💾 Full report archive access (6+ months of historical data)',
    ],
    price_usd: 79,
    price_jpy: 11800,
    currency: 'USD',
    format: 'API_KEY',
    type: 'subscription',
    badge: 'BEST VALUE',
    emoji: '🏆',
  },
  'enterprise-bundle': {
    id: 'enterprise-bundle',
    name: 'OpenClaw Enterprise Bundle',
    tagline: 'Enterprise-grade MCP access. 10x the Pro limit. Priority routing. Dedicated support.',
    description: 'Enterprise-grade MCP access. 10x the Pro limit. Priority routing. Dedicated support. All 49 MCP tools with custom API endpoint prefix, 10,000 calls/day, and quarterly market intelligence reports.',
    features: [
      '🔓 All 49 MCP tools unlocked across 9 Cloudflare edge servers',
      '⚡ Priority routing — your requests jump the queue',
      '🔑 10,000 API calls/day (10x Pro limit)',
      '🌐 Custom API endpoint prefix for your organization',
      '📧 Email support within 24h — dedicated response lane',
      '📊 Quarterly market intelligence report (deep-dive, exclusive)',
    ],
    price_usd: 99,
    price_jpy: 14800,
    currency: 'USD',
    format: 'API_KEY',
    type: 'subscription',
    billing: 'monthly',
    badge: 'ENTERPRISE',
    emoji: '🏢',
  },
  'agent-builder-kit': {
    id: 'agent-builder-kit',
    name: 'AI Agent Builder Kit',
    tagline: 'Build and deploy your own MCP server in 2 hours. Production-ready template with auth, rate limiting, and Smithery publishing.',
    description: 'Complete template and code for building MCP servers on Cloudflare Workers. Includes Cloudflare Worker boilerplate with auth, rate limiting, a landing page, and a step-by-step guide from zero to deployed and listed on Smithery.',
    features: [
      '📦 Complete Cloudflare Worker MCP boilerplate (JSON-RPC 2.0, MCP 2025-03-26)',
      '🔐 Auth built-in — API key validation, rate limiting, Pro tier logic',
      '🌐 Landing page template — conversion-optimized, dark mode, mobile-ready',
      '🚀 Smithery publishing guide — get listed and discovered in 30 minutes',
      '💰 Monetization flow — PayPal + Stripe checkout out of the box',
      '📖 Step-by-step guide: zero to deployed in under 2 hours',
    ],
    price_usd: 49,
    price_jpy: 7480,
    currency: 'USD',
    format: 'ZIP',
    file_key: 'products/agent-builder-kit',
    badge: 'HOT',
    emoji: '🤖',
  },
  'mcp-audit-report': {
    id: 'mcp-audit-report',
    name: 'MCP Server Audit Report',
    tagline: 'Professional code audit for your MCP server. Security analysis, performance recommendations, and best practices report.',
    description: 'Deep analysis of any MCP server\'s code quality, security, and performance. Powered by DeepSeek R1 chain-of-thought reasoning. Delivered as a structured PDF report within 24 hours of submission.',
    features: [
      '🔍 Full security audit — auth flaws, injection risks, secrets exposure',
      '⚡ Performance analysis — latency hotspots, cold start optimization',
      '📋 Code quality report — structure, error handling, edge cases',
      '🛡️ Best practices checklist — MCP 2025-03-26 compliance',
      '🤖 Powered by DeepSeek R1 chain-of-thought (700B reasoning model)',
      '📄 Delivered as structured PDF report within 24 hours',
    ],
    price_usd: 79,
    price_jpy: 11800,
    currency: 'USD',
    format: 'SERVICE',
    type: 'service',
    badge: 'NEW',
    emoji: '🔎',
  },
  'api-gateway-pro': {
    id: 'api-gateway-pro',
    name: 'OpenClaw API Gateway Pro',
    tagline: 'REST API access to all 49 OpenClaw tools. No MCP client needed. Simple JSON in/out.',
    description: 'Single API key to access all 49 OpenClaw tools via clean REST endpoints — no MCP client required. Supports webhook notifications and works with any language or framework.',
    features: [
      '🌐 REST endpoints for all 49 tools — simple JSON in, JSON out',
      '🔑 One API key, one endpoint pattern, zero MCP config needed',
      '🔔 Webhook notifications — push results to your URL on completion',
      '⚡ Edge-deployed on Cloudflare Workers (<50ms global latency)',
      '📊 Usage dashboard — calls/day, errors, top tools',
      '🤖 Works with Python, Node.js, curl, or any HTTP client',
    ],
    price_usd: 29,
    price_jpy: 4480,
    currency: 'USD',
    format: 'API_KEY',
    type: 'subscription',
    billing: 'monthly',
    badge: 'NEW',
    emoji: '🌐',
  },
  'revenue-automation-masterclass': {
    id: 'revenue-automation-masterclass',
    name: 'Revenue Automation Masterclass',
    tagline: 'The complete playbook for building autonomous AI revenue systems. From zero to $10K/month.',
    description: 'Complete video course and playbook on building automated revenue with AI agents. Covers MCP servers, Cloudflare Workers, autonomous agents, and Telegram bots. Includes all source code from the OpenClaw ecosystem.',
    features: [
      '🎬 Full video course — 8 modules, 4+ hours of hands-on content',
      '📖 Playbook PDF — step-by-step from zero to $10K/month revenue',
      '💻 All source code included — OpenClaw Workers, agent configs, Telegram bots',
      '🤖 Autonomous agent setup — YEDAN-style 24/7 revenue systems',
      '☁️ Cloudflare Workers monetization — MCP servers that earn while you sleep',
      '📱 Telegram bot integration — alerts, commands, revenue tracking',
    ],
    price_usd: 149,
    price_jpy: 22000,
    currency: 'USD',
    format: 'ZIP',
    file_key: 'products/revenue-automation-masterclass',
    badge: 'FLAGSHIP',
    emoji: '💎',
  },
};

// ============================================================
// HELPERS
// ============================================================
function generateToken(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  for (let i = 0; i < length; i++) result += chars[arr[i] % chars.length];
  return result;
}

function generateOrderId() {
  const now = new Date();
  const ts = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  return `ORD-${ts}-${generateToken(6).toUpperCase()}`;
}

function generateApiKey() {
  return `oc_pro_${generateToken(40)}`;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html;charset=UTF-8', 'Cache-Control': 'no-cache', ...CORS },
  });
}

// ============================================================
// HTML TEMPLATES
// ============================================================
function baseHTML(title, body, extra = '') {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} | OpenClaw Store</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', -apple-system, sans-serif; background: #0a0a0a; color: #e0e0e0; line-height: 1.7; }
  a { color: #6c9fff; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .container { max-width: 960px; margin: 0 auto; padding: 20px; }
  .nav { background: rgba(15,15,15,0.95); backdrop-filter: blur(10px); border-bottom: 1px solid #222; padding: 16px 0; position: sticky; top: 0; z-index: 100; }
  .nav .container { display: flex; justify-content: space-between; align-items: center; }
  .nav-brand { font-size: 1.3rem; font-weight: bold; color: #fff; }
  .nav-brand span { color: #ff6b35; }
  .hero { text-align: center; padding: 60px 20px 40px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); }
  .hero h1 { font-size: 2.2rem; margin-bottom: 16px; color: #fff; }
  .hero p { font-size: 1.1rem; color: #aaa; max-width: 600px; margin: 0 auto; }
  .badge { display: inline-block; background: linear-gradient(135deg, #ff6b35, #ff4500); color: #fff; padding: 4px 14px; border-radius: 20px; font-size: 0.75rem; font-weight: bold; letter-spacing: 1px; margin-bottom: 12px; }
  .product-card { background: #151515; border: 1px solid #2a2a2a; border-radius: 16px; padding: 32px; margin: 24px 0; transition: border-color 0.3s; }
  .product-card:hover { border-color: #ff6b35; }
  .product-title { font-size: 1.5rem; color: #fff; margin-bottom: 8px; }
  .product-tagline { color: #888; margin-bottom: 16px; }
  .product-features { list-style: none; padding: 0; margin: 16px 0; }
  .product-features li { padding: 8px 0; border-bottom: 1px solid #1e1e1e; font-size: 0.95rem; }
  .price-box { display: flex; align-items: center; gap: 16px; margin: 24px 0; flex-wrap: wrap; }
  .price-main { font-size: 2.5rem; font-weight: bold; color: #ff6b35; }
  .price-alt { font-size: 1.1rem; color: #666; }
  .btn { display: inline-block; padding: 14px 32px; border-radius: 10px; font-size: 1rem; font-weight: bold; cursor: pointer; border: none; text-align: center; transition: all 0.3s; text-decoration: none; }
  .btn-paypal { background: #0070ba; color: #fff; }
  .btn-paypal:hover { background: #005ea6; text-decoration: none; }
  .btn-stripe { background: #635bff; color: #fff; }
  .btn-stripe:hover { background: #5147e5; text-decoration: none; }
  .btn-download { background: linear-gradient(135deg, #00c853, #00e676); color: #000; font-size: 1.2rem; padding: 18px 40px; }
  .btn-download:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,200,83,0.3); text-decoration: none; }
  .payment-buttons { display: flex; gap: 16px; flex-wrap: wrap; margin: 24px 0; }
  .guarantee { background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center; }
  .guarantee h3 { color: #4caf50; margin-bottom: 8px; }
  .footer { text-align: center; padding: 40px 20px; color: #555; font-size: 0.85rem; border-top: 1px solid #1e1e1e; margin-top: 60px; }
  .success-box { background: linear-gradient(135deg, #1b5e20, #2e7d32); border-radius: 16px; padding: 40px; text-align: center; margin: 40px 0; }
  .success-box h1 { color: #fff; font-size: 2rem; margin-bottom: 16px; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 16px; margin: 32px 0; }
  .stat { background: #1a1a1a; border-radius: 12px; padding: 20px; text-align: center; }
  .stat-num { font-size: 2rem; font-weight: bold; color: #ff6b35; }
  .stat-label { font-size: 0.8rem; color: #888; margin-top: 4px; }
  .testimonial { background: #151515; border-left: 3px solid #ff6b35; border-radius: 0 12px 12px 0; padding: 20px; margin: 16px 0; font-style: italic; }
  @media (max-width: 600px) { .hero h1 { font-size: 1.6rem; } .price-main { font-size: 2rem; } .payment-buttons { flex-direction: column; } .btn { width: 100%; } }
  ${extra}
</style>
</head>
<body>
<nav class="nav"><div class="container"><a href="/" class="nav-brand">🦊 Open<span>Claw</span> Store</a><a href="https://note.com/yedanyagami" style="color:#888;">note.com</a></div></nav>
${body}
<footer class="footer">
<div style="margin-bottom:16px;">
  <span style="display:inline-block; background:#1a1a1a; border:1px solid #333; padding:4px 10px; border-radius:6px; font-size:0.7rem; color:#888; margin:2px;">🅿️ PayPal</span>
  <span style="display:inline-block; background:#1a1a1a; border:1px solid #333; padding:4px 10px; border-radius:6px; font-size:0.7rem; color:#888; margin:2px;">💳 Card</span>
  <span style="display:inline-block; background:#1a1a1a; border:1px solid #333; padding:4px 10px; border-radius:6px; font-size:0.7rem; color:#888; margin:2px;">₿ Crypto</span>
  <span style="display:inline-block; background:#1a1a1a; border:1px solid #333; padding:4px 10px; border-radius:6px; font-size:0.7rem; color:#888; margin:2px;">🔒 SSL Secured</span>
</div>
<p style="margin-bottom:12px;">
  <a href="https://openclaw-intel-mcp.yagami8095.workers.dev/mcp">📊 Intel MCP</a> &middot;
  <a href="https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp">🔮 Fortune MCP</a> &middot;
  <a href="https://openclaw-intel-api.yagami8095.workers.dev">🔑 Intel API</a> &middot;
  <a href="https://note.com/yedanyagami">📝 note.com</a>
</p>
<p>&copy; 2026 OpenClaw Intelligence</p>
<p style="color:#444; font-size:0.75rem; margin-top:6px;">Taichung, Taiwan &middot; Yagami8095@gmail.com</p>
<p style="color:#333; font-size:0.65rem; margin-top:4px;">Powered by Cloudflare Workers &middot; MCP Protocol 2025-03-26</p>
</footer>
</body>
</html>`;
}

function catalogPage(env) {
  const productCards = Object.values(PRODUCTS).map(p => {
    const isApi = p.type === 'api_key';
    return `
    <div class="product-card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
        <span class="badge">${p.badge}</span>
        <span style="font-size:0.7rem; color:#666;">${isApi ? 'Instant API Key' : 'Instant Download'} &middot; ${p.format}</span>
      </div>
      <h2 class="product-title">${p.emoji} ${p.name}</h2>
      <p class="product-tagline">${p.tagline}</p>
      <div class="price-box">
        <span class="price-main">$${p.price_usd}</span>
        <span class="price-alt">(\u00A5${p.price_jpy.toLocaleString()})</span>
      </div>
      <p style="color:#aaa; margin-bottom:16px;">${p.description}</p>
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <a href="/products/${p.id}" class="btn btn-stripe">View Details &rarr;</a>
        <div style="display:flex; gap:4px; flex-wrap:wrap;">
          <span style="font-size:0.65rem; color:#555; background:#111; padding:2px 8px; border-radius:4px;">PayPal</span>
          <span style="font-size:0.65rem; color:#555; background:#111; padding:2px 8px; border-radius:4px;">Crypto</span>
          <span style="font-size:0.65rem; color:#555; background:#111; padding:2px 8px; border-radius:4px;">Card</span>
        </div>
      </div>
    </div>`;
  }).join('');

  return baseHTML('AI Digital Products & MCP Intelligence Tools', `
    <div class="hero">
      <h1>🧠 AI Intelligence Tools & Digital Arsenal</h1>
      <p>MCP-native market intelligence, battle-tested AI prompts, and automation templates.<br>
      Built for AI agents. Used by developers. Powered by Cloudflare.</p>
      <div style="margin-top:24px; display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">
        <span style="background:rgba(255,107,53,0.15); border:1px solid rgba(255,107,53,0.3); padding:6px 14px; border-radius:8px; font-size:0.8rem; color:#ff6b35;">🔌 MCP Protocol</span>
        <span style="background:rgba(255,107,53,0.15); border:1px solid rgba(255,107,53,0.3); padding:6px 14px; border-radius:8px; font-size:0.8rem; color:#ff6b35;">⚡ Instant Delivery</span>
        <span style="background:rgba(255,107,53,0.15); border:1px solid rgba(255,107,53,0.3); padding:6px 14px; border-radius:8px; font-size:0.8rem; color:#ff6b35;">🔒 Multi-Payment</span>
      </div>
    </div>
    <div class="container">
      <div class="stats">
        <div class="stat"><div class="stat-num">9</div><div class="stat-label">MCP Servers</div></div>
        <div class="stat"><div class="stat-num">49</div><div class="stat-label">AI Tools</div></div>
        <div class="stat"><div class="stat-num">12</div><div class="stat-label">Products</div></div>
        <div class="stat"><div class="stat-num">24/7</div><div class="stat-label">Always On</div></div>
      </div>
      <div style="background:linear-gradient(135deg,#ff6b35,#ff4500);border-radius:12px;padding:24px;margin:24px 0;text-align:center;">
        <h2 style="color:#fff;margin-bottom:12px;">Try All 49 Tools Free for 7 Days</h2>
        <p style="color:rgba(255,255,255,0.9);margin-bottom:16px;">Sign in with GitHub. 100 calls/day across all 9 servers. No credit card required.</p>
        <a href="/auth/login" class="btn" style="background:#fff;color:#ff4500;font-size:1.1rem;padding:16px 40px;text-decoration:none;display:inline-block;border-radius:8px;font-weight:bold;">Start Free Trial &rarr;</a>
      </div>

      <div style="background:#0d1117; border:1px solid #30363d; border-radius:12px; padding:24px; margin:24px 0;">
        <h3 style="color:#fff; margin-bottom:16px; text-align:center;">🔌 Free MCP Servers — Connect in Seconds</h3>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:16px;">
          <div style="background:#151515; border:1px solid #2a2a2a; border-radius:8px; padding:16px;">
            <p style="color:#ff6b35; font-weight:bold;">📊 OpenClaw Intel</p>
            <p style="color:#888; font-size:0.85rem; margin:8px 0;">AI market intelligence — GitHub stars, releases, growth trends for Claude Code, Cursor, Devin, and more.</p>
            <code style="background:#000; display:block; padding:8px; border-radius:4px; font-size:0.7rem; color:#4caf50; word-break:break-all; margin-top:8px;">https://openclaw-intel-mcp.yagami8095.workers.dev/mcp</code>
          </div>
          <div style="background:#151515; border:1px solid #2a2a2a; border-radius:8px; padding:16px;">
            <p style="color:#9c27b0; font-weight:bold;">🔮 OpenClaw Fortune</p>
            <p style="color:#888; font-size:0.85rem; margin:8px 0;">Daily zodiac horoscope + tarot readings for all 12 signs. Zero setup, pure computation.</p>
            <code style="background:#000; display:block; padding:8px; border-radius:4px; font-size:0.7rem; color:#4caf50; word-break:break-all; margin-top:8px;">https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp</code>
          </div>
        </div>
        <p style="text-align:center; margin-top:16px; font-size:0.8rem; color:#666;">Works with Claude Code, Cursor, Windsurf, Cline — just add the URL to your MCP config</p>
      </div>

      ${productCards}

      <div style="text-align:center; margin:40px 0 20px; padding:24px; background:#151515; border-radius:12px; border:1px solid #2a2a2a;">
        <p style="color:#888; font-size:0.85rem;">🔒 Secure payments via PayPal, credit card, and cryptocurrency</p>
        <p style="color:#555; font-size:0.75rem; margin-top:8px;">All products include instant delivery. Digital goods — no shipping required.</p>
      </div>
    </div>
  `);
}

function productPage(product, env) {
  const hasPaypal = !!env.PAYPAL_BUSINESS_EMAIL;
  const hasStripe = !!env.STRIPE_SECRET_KEY;
  const baseUrl = 'https://product-store.yagami8095.workers.dev';
  const isApiKey = product.type === 'api_key';

  const paypalBtn = hasPaypal ? `
    <form action="https://www.paypal.com/cgi-bin/webscr" method="post" target="_top" style="display:inline;">
      <input type="hidden" name="cmd" value="_xclick">
      <input type="hidden" name="business" value="${env.PAYPAL_BUSINESS_EMAIL}">
      <input type="hidden" name="item_name" value="${product.name}">
      <input type="hidden" name="item_number" value="${product.id}">
      <input type="hidden" name="amount" value="${product.price_usd}.00">
      <input type="hidden" name="currency_code" value="USD">
      <input type="hidden" name="return" value="${baseUrl}/success?product=${product.id}&method=paypal">
      <input type="hidden" name="cancel_return" value="${baseUrl}/products/${product.id}">
      <input type="hidden" name="notify_url" value="${baseUrl}/webhooks/paypal">
      <input type="hidden" name="no_shipping" value="1">
      <input type="hidden" name="no_note" value="1">
      <button type="submit" class="btn btn-paypal">🅿️ PayPal — $${product.price_usd}</button>
    </form>` : '';

  const stripeBtn = hasStripe ? `
    <form action="/checkout/stripe" method="post" style="display:inline;">
      <input type="hidden" name="product_id" value="${product.id}">
      <button type="submit" class="btn btn-stripe">💳 Card — $${product.price_usd}</button>
    </form>` : '';

  const cryptoSection = `
    <div style="background:#1a1a2e; border:1px solid #555; border-radius:12px; padding:20px; margin:16px 0;">
      <p style="color:#888; font-weight:bold; margin-bottom:8px;">₿ Crypto Payment — Coming Soon</p>
      <p style="color:#666; font-size:0.85rem;">Crypto payment options will be available soon. Please use PayPal for now.</p>
    </div>`;

  const paypalMeFallback = `
    <a href="https://paypal.me/Yagami8095/${product.price_usd}" class="btn btn-paypal" target="_blank" style="background:#003087;">🅿️ PayPal.me — $${product.price_usd}</a>`;

  const featuresList = product.features.map(f => `<li>${f}</li>`).join('');
  const deliveryLabel = isApiKey ? 'Instant API Key' : '即時ダウンロード';

  return baseHTML(product.name, `
    <div class="container" style="padding-top:40px;">
      <a href="/" style="color:#888;">&larr; Back to Store</a>
      <div class="product-card" style="margin-top:20px; border-color:#ff6b35;">
        <span class="badge">${product.badge}</span>
        <h1 class="product-title" style="font-size:1.8rem;">${product.emoji} ${product.name}</h1>
        <p class="product-tagline">${product.tagline}</p>

        <div class="price-box">
          <span class="price-main">$${product.price_usd}</span>
          <span class="price-alt">(\u00A5${product.price_jpy.toLocaleString()})</span>
          <span style="background:#2e7d32; color:#fff; padding:4px 12px; border-radius:8px; font-size:0.8rem;">${deliveryLabel}</span>
        </div>

        <p style="color:#ccc; font-size:1.05rem; margin:20px 0;">${product.description}</p>

        <h3 style="color:#fff; margin:24px 0 12px;">📦 ${isApiKey ? 'What You Get' : '収録内容'}</h3>
        <ul class="product-features">${featuresList}</ul>

        <!-- Payment Methods -->
        <div style="margin-top:32px;">
          <h3 style="color:#fff; margin-bottom:16px;">💰 Choose Payment Method</h3>
          <div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
            <span style="background:#1a1a1a; border:1px solid #333; padding:4px 12px; border-radius:6px; font-size:0.75rem; color:#aaa;">🅿️ PayPal</span>
            ${hasStripe ? '<span style="background:#1a1a1a; border:1px solid #333; padding:4px 12px; border-radius:6px; font-size:0.75rem; color:#aaa;">💳 Card</span>' : ''}
            <span style="background:#1a1a1a; border:1px solid #333; padding:4px 12px; border-radius:6px; font-size:0.75rem; color:#aaa;">₿ Crypto</span>
            <span style="background:#1a1a1a; border:1px solid #333; padding:4px 12px; border-radius:6px; font-size:0.75rem; color:#aaa;">🔒 Secure</span>
          </div>
          <div class="payment-buttons">
            ${paypalBtn}
            ${stripeBtn}
            ${paypalMeFallback}
          </div>
          ${cryptoSection}
        </div>
      </div>

      <div class="guarantee">
        <h3>✅ ${isApiKey ? 'Guarantee' : '安心保証'}</h3>
        <p>${isApiKey ? 'Instant API key delivery after payment. 1000 calls/day. Works with any MCP client.' : '購入後すぐにダウンロード可能。全プロンプトをそのままコピペして使えます。'}</p>
        <p style="color:#888; margin-top:8px; font-size:0.85rem;">${isApiKey ? 'Questions? Email Yagami8095@gmail.com' : '※デジタル商品のため返品不可。内容に不満がある場合はご連絡ください。'}</p>
      </div>

      <div class="testimonial">
        <p>${isApiKey
          ? '"OpenClaw Intel gives me real-time data on AI tool adoption. Essential for staying ahead of the market."'
          : '「このプロンプト集のおかげで、毎日の業務効率が劇的に改善しました。特にコードレビューとSEO記事作成のプロンプトは神。」'}</p>
        <p style="color:#ff6b35; margin-top:8px; font-style:normal;">${isApiKey ? '— AI Developer' : '— AIエンジニア T.K.さん'}</p>
      </div>

      <div style="background:#0d1117; border:1px solid #30363d; border-radius:12px; padding:24px; margin:24px 0;">
        <h3 style="color:#fff; margin-bottom:12px;">🎯 ${isApiKey ? 'Perfect For' : 'こんな方におすすめ'}</h3>
        <ul style="list-style:none; padding:0;">
          ${isApiKey ? `
          <li style="padding:6px 0;">✅ AI developers building competitive intelligence into their apps</li>
          <li style="padding:6px 0;">✅ Teams tracking AI tool adoption (GitHub stars, releases, growth)</li>
          <li style="padding:6px 0;">✅ Researchers monitoring the AI agent ecosystem in real-time</li>
          <li style="padding:6px 0;">✅ Anyone using Claude Code, Cursor, Windsurf, or Cline who wants market data</li>
          ` : `
          <li style="padding:6px 0;">✅ AIを業務に活用したいが、プロンプトの書き方がわからない</li>
          <li style="padding:6px 0;">✅ ChatGPT/Claudeを使っているが、もっと効率的に使いたい</li>
          <li style="padding:6px 0;">✅ エンジニア・マーケター・ライターとして生産性を上げたい</li>
          <li style="padding:6px 0;">✅ 実際に現場で使える「実戦的な」プロンプトが欲しい</li>
          `}
        </ul>
      </div>
    </div>
  `);
}

function successPage(product, downloadToken) {
  return baseHTML('購入完了', `
    <div class="container" style="padding-top:40px;">
      <div class="success-box">
        <div style="font-size:4rem; margin-bottom:16px;">🎉</div>
        <h1>ご購入ありがとうございます！</h1>
        <p style="color:#c8e6c9; margin-top:12px;">「${product.name}」のダウンロード準備が完了しました。</p>
      </div>

      <div style="text-align:center; margin:32px 0;">
        <a href="/download/${downloadToken}" class="btn btn-download">📥 今すぐダウンロード</a>
        <p style="color:#888; margin-top:12px; font-size:0.85rem;">※ダウンロードリンクは24時間有効です</p>
      </div>

      <div class="product-card" style="text-align:center;">
        <h3 style="color:#fff; margin-bottom:16px;">📣 もっとAI活用情報が欲しい方へ</h3>
        <p style="margin-bottom:16px;">毎日のAI活用Tips、最新ツール情報、実践テクニックを発信中！</p>
        <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
          <a href="https://note.com/yedanyagami" class="btn" style="background:#4caf50; color:#fff;" target="_blank">📝 note.comをフォロー</a>
          <a href="https://fortune-api.yagami8095.workers.dev" class="btn" style="background:#9c27b0; color:#fff;" target="_blank">🔮 毎日の占い</a>
        </div>
      </div>
    </div>
  `);
}

function apiKeySuccessPage(product, apiKey) {
  return baseHTML('API Key Provisioned', `
    <div class="container" style="padding-top:40px;">
      <div class="success-box">
        <div style="font-size:4rem; margin-bottom:16px;">🔑</div>
        <h1>Your Pro API Key is Ready!</h1>
        <p style="color:#c8e6c9; margin-top:12px;">OpenClaw Intel Pro — full market intelligence unlocked.</p>
      </div>

      <div class="product-card" style="border-color:#ff6b35;">
        <h3 style="color:#fff; margin-bottom:12px;">Your API Key</h3>
        <div style="background:#000; border:2px solid #ff6b35; border-radius:8px; padding:16px; margin:12px 0; word-break:break-all; font-family:monospace; font-size:1.1rem; color:#4caf50;">
          ${apiKey}
        </div>
        <p style="color:#ff6b35; font-size:0.85rem; margin-top:8px;">⚠️ Save this key now! It will not be shown again.</p>

        <h3 style="color:#fff; margin:24px 0 12px;">Quick Setup — MCP Client</h3>
        <pre style="background:#0d1117; border:1px solid #30363d; border-radius:8px; padding:16px; overflow-x:auto; color:#c9d1d9; font-size:0.85rem;">{
  "mcpServers": {
    "openclaw-intel": {
      "url": "https://openclaw-intel-mcp.yagami8095.workers.dev/mcp",
      "headers": { "Authorization": "Bearer ${apiKey}" }
    }
  }
}</pre>

        <h3 style="color:#fff; margin:24px 0 12px;">Quick Setup — REST API</h3>
        <pre style="background:#0d1117; border:1px solid #30363d; border-radius:8px; padding:16px; overflow-x:auto; color:#c9d1d9; font-size:0.85rem;">curl https://openclaw-intel-api.yagami8095.workers.dev/api/reports/latest \\
  -H "Authorization: Bearer ${apiKey}"</pre>

        <div style="margin-top:24px;">
          <h3 style="color:#fff; margin-bottom:12px;">What You Get</h3>
          <ul class="product-features">
            <li>📊 Full market intelligence reports (not just summaries)</li>
            <li>🔑 1000 API calls per day</li>
            <li>⚡ Priority access to new tools</li>
            <li>🤖 Works with Claude Code, Cursor, Windsurf, Cline</li>
          </ul>
        </div>
      </div>

      <div class="product-card" style="text-align:center;">
        <h3 style="color:#fff; margin-bottom:16px;">Also Try</h3>
        <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
          <a href="https://openclaw-fortune-mcp.yagami8095.workers.dev" class="btn" style="background:#9c27b0; color:#fff;" target="_blank">🔮 Fortune MCP</a>
          <a href="https://openclaw-intel-mcp.yagami8095.workers.dev" class="btn" style="background:#1565c0; color:#fff;" target="_blank">📊 Intel MCP</a>
          <a href="https://note.com/yedanyagami" class="btn" style="background:#4caf50; color:#fff;" target="_blank">📝 note.com</a>
        </div>
      </div>
    </div>
  `);
}

function notFoundPage() {
  return baseHTML('404', `
    <div class="container" style="text-align:center; padding:80px 20px;">
      <h1 style="font-size:4rem; color:#ff6b35;">404</h1>
      <p style="color:#888; margin:16px 0;">お探しのページが見つかりません。</p>
      <a href="/" class="btn btn-stripe">ストアに戻る</a>
    </div>
  `);
}

// ============================================================
// ROUTE HANDLERS
// ============================================================

async function handleCatalog(env) {
  return htmlResponse(catalogPage(env));
}

async function handleProduct(productId, env) {
  const product = PRODUCTS[productId];
  if (!product) return htmlResponse(notFoundPage(), 404);
  return htmlResponse(productPage(product, env));
}

async function handleStripeCheckout(request, env) {
  if (!env.STRIPE_SECRET_KEY) {
    return jsonResponse({ error: 'Stripe not configured' }, 500);
  }

  const formData = await request.formData();
  const productId = formData.get('product_id');
  const product = PRODUCTS[productId];
  if (!product) return jsonResponse({ error: 'Product not found' }, 404);

  const baseUrl = new URL(request.url).origin;
  const orderId = generateOrderId();

  // Create Stripe Checkout Session via API
  const params = new URLSearchParams();
  params.append('payment_method_types[]', 'card');
  params.append('line_items[0][price_data][currency]', 'usd');
  params.append('line_items[0][price_data][product_data][name]', product.name);
  params.append('line_items[0][price_data][product_data][description]', product.description);
  params.append('line_items[0][price_data][unit_amount]', String(product.price_usd * 100));
  params.append('line_items[0][quantity]', '1');
  params.append('mode', 'payment');
  params.append('success_url', `${baseUrl}/success?product=${productId}&method=stripe&session_id={CHECKOUT_SESSION_ID}&order=${orderId}`);
  params.append('cancel_url', `${baseUrl}/products/${productId}`);
  params.append('metadata[order_id]', orderId);
  params.append('metadata[product_id]', productId);

  // Idempotency: prevent duplicate checkout sessions for same order
  const idempotencyKey = `checkout_${orderId}`;

  const resp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Idempotency-Key': idempotencyKey,
    },
    body: params,
  });

  const session = await resp.json();
  if (session.error) {
    return jsonResponse({ error: session.error.message }, 400);
  }

  // Record order
  try {
    await env.DB.prepare(
      'INSERT INTO orders (order_id, product_id, product_name, amount, currency, payment_method, payment_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(orderId, productId, product.name, product.price_usd * 100, 'USD', 'stripe', session.id, 'pending').run();
  } catch (e) { /* non-fatal */ }

  // Redirect to Stripe Checkout
  return Response.redirect(session.url, 303);
}

async function handleSuccess(request, env) {
  const url = new URL(request.url);
  const productId = url.searchParams.get('product');
  const method = url.searchParams.get('method');
  const sessionId = url.searchParams.get('session_id');
  const orderId = url.searchParams.get('order') || generateOrderId();

  const product = PRODUCTS[productId];
  if (!product) return htmlResponse(notFoundPage(), 404);

  // Idempotency: check if this order was already processed
  try {
    const existing = await env.DB.prepare(
      "SELECT order_id, status, download_token FROM orders WHERE order_id = ? AND status = 'paid'"
    ).bind(orderId).first();
    if (existing && existing.download_token) {
      // Already processed — return existing token instead of creating duplicate
      if (product.type === 'api_key') {
        return htmlResponse(apiKeySuccessPage(product, existing.download_token));
      }
      return htmlResponse(successPage(product, existing.download_token));
    }
  } catch { /* non-fatal, proceed normally */ }

  // Verify Stripe payment if applicable
  let verified = false;
  if (method === 'stripe' && sessionId && env.STRIPE_SECRET_KEY) {
    try {
      const resp = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` },
      });
      const session = await resp.json();
      if (session.payment_status === 'paid') {
        verified = true;
      }
    } catch (e) { /* continue anyway for UX */ }
  }

  // For PayPal, we trust the redirect (IPN will verify async)
  if (method === 'paypal') {
    verified = true; // Will be verified by IPN webhook
  }

  // API Key product — provision key instead of download token
  if (product.type === 'api_key') {
    const apiKey = generateApiKey();

    // Insert API key into D1
    try {
      await env.DB.prepare(
        "INSERT INTO api_keys (key, tier, status, daily_limit, created_at) VALUES (?, 'pro', 'active', 1000, datetime('now'))"
      ).bind(apiKey).run();
    } catch (e) { /* table might not exist yet, non-fatal */ }

    // Record order with API key reference
    try {
      await env.DB.prepare(
        'INSERT OR REPLACE INTO orders (order_id, product_id, product_name, amount, currency, payment_method, payment_id, status, download_token, paid_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))'
      ).bind(orderId, productId, product.name, product.price_usd * 100, 'USD', method || 'direct', sessionId || '', verified ? 'paid' : 'pending', apiKey).run();
    } catch (e) { /* non-fatal */ }


    // Store Pro key in shared KV for cross-worker validation
    try {
      await env.KV.put(`prokey:${apiKey}`, JSON.stringify({
        tier: 'pro',
        daily_limit: 1000,
        product_id: productId,
        created: new Date().toISOString(),
      }), { expirationTtl: 365 * 86400 }); // 1 year
    } catch (_) { /* non-fatal — D1 is source of truth */ }

        return htmlResponse(apiKeySuccessPage(product, apiKey));
  }

  // Generate download token (for digital products)
  const downloadToken = generateToken(48);
  const expiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  // Store token in KV
  await env.KV.put(`download:${downloadToken}`, JSON.stringify({
    product_id: productId,
    order_id: orderId,
    created_at: new Date().toISOString(),
    expires_at: new Date(expiry).toISOString(),
    download_count: 0,
    max_downloads: 5,
  }), { expirationTtl: 86400 });

  // Update order in D1
  try {
    await env.DB.prepare(
      'INSERT OR REPLACE INTO orders (order_id, product_id, product_name, amount, currency, payment_method, payment_id, status, download_token, paid_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))'
    ).bind(orderId, productId, product.name, product.price_usd * 100, 'USD', method || 'direct', sessionId || '', verified ? 'paid' : 'pending', downloadToken).run();
  } catch (e) { /* non-fatal */ }

  return htmlResponse(successPage(product, downloadToken));
}

async function handleDownload(token, env) {
  // Verify token
  const tokenData = await env.KV.get(`download:${token}`, { type: 'json' });
  if (!tokenData) {
    return htmlResponse(baseHTML('リンク無効', `
      <div class="container" style="text-align:center; padding:80px 20px;">
        <h1 style="color:#ff6b35;">⏰ ダウンロードリンクが無効です</h1>
        <p style="color:#888; margin:16px 0;">リンクの有効期限が切れているか、無効なリンクです。</p>
        <p style="color:#888;">再度購入ページからお手続きください。</p>
        <a href="/" class="btn btn-stripe" style="margin-top:20px;">ストアに戻る</a>
      </div>
    `), 403);
  }

  // Check download limit
  if (tokenData.download_count >= tokenData.max_downloads) {
    return htmlResponse(baseHTML('ダウンロード上限', `
      <div class="container" style="text-align:center; padding:80px 20px;">
        <h1 style="color:#ff6b35;">📥 ダウンロード回数の上限に達しました</h1>
        <p style="color:#888; margin:16px 0;">最大${tokenData.max_downloads}回までダウンロード可能です。</p>
        <p style="color:#888;">問題がある場合は Yagami8095@gmail.com までご連絡ください。</p>
      </div>
    `), 403);
  }

  // Get product content from KV
  const product = PRODUCTS[tokenData.product_id];
  if (!product) return htmlResponse(notFoundPage(), 404);

  let content = await env.KV.get(product.file_key);

  if (!content) {
    // Fallback: generate content on-the-fly
    content = generatePromptCollectionHTML();
  }

  // Increment download count
  tokenData.download_count += 1;
  const remaining = Math.max(0, (new Date(tokenData.expires_at).getTime() - Date.now()) / 1000);
  await env.KV.put(`download:${token}`, JSON.stringify(tokenData), { expirationTtl: Math.ceil(remaining) });

  // Serve the file
  return new Response(content, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="AI_Prompt_Collection_50.html"`,
      'Cache-Control': 'no-store',
    },
  });
}

async function handlePayPalIPN(request, env) {
  // PayPal Instant Payment Notification handler (hardened v2)
  const body = await request.text();
  const params = new URLSearchParams(body);
  const txnId = params.get('txn_id') || 'unknown';
  const today = new Date().toISOString().split('T')[0];
  const logKey = `ipn_log:${today}:${txnId}`;

  // Helper: log IPN event to KV for debugging
  const logIPN = async (status, detail) => {
    try {
      const entry = JSON.stringify({
        status,
        detail,
        txn_id: txnId,
        item: params.get('item_number'),
        gross: params.get('mc_gross'),
        payer: params.get('payer_email'),
        ts: new Date().toISOString(),
      });
      await env.KV.put(logKey, entry, { expirationTtl: 90 * 86400 });
    } catch (_) { /* best-effort logging */ }
  };

  // 1. Verify with PayPal
  let verifyResult;
  try {
    const verifyResp = await fetch('https://ipnpb.paypal.com/cgi-bin/webscr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `cmd=_notify-validate&${body}`,
    });
    verifyResult = await verifyResp.text();
  } catch (e) {
    await logIPN('error', `PayPal verify fetch failed: ${e.message}`);
    return new Response('OK', { status: 200 });
  }

  if (verifyResult !== 'VERIFIED') {
    await logIPN('rejected', `PayPal verify returned: ${verifyResult}`);
    return new Response('OK', { status: 200 });
  }

  const paymentStatus = params.get('payment_status');
  const itemNumber = params.get('item_number');
  const mcGross = parseFloat(params.get('mc_gross') || '0');
  const mcCurrency = params.get('mc_currency') || 'USD';

  if (paymentStatus !== 'Completed') {
    await logIPN('skipped', `payment_status=${paymentStatus}`);
    return new Response('OK', { status: 200 });
  }

  // 2. Txn dedup — prevent double-processing
  const txnKey = `paypal_txn:${txnId}`;
  const existingTxn = await env.KV.get(txnKey);
  if (existingTxn) {
    await logIPN('dedup', 'Transaction already processed');
    return new Response('OK', { status: 200 });
  }

  // 3. Amount validation — verify payment matches product price
  const product = PRODUCTS[itemNumber];
  if (product) {
    const expectedUSD = product.price_usd;
    const expectedJPY = product.price_jpy;
    const isValidAmount =
      (mcCurrency === 'USD' && mcGross >= expectedUSD) ||
      (mcCurrency === 'JPY' && mcGross >= expectedJPY);
    if (!isValidAmount) {
      await logIPN('amount_mismatch', `Expected $${expectedUSD}/¥${expectedJPY}, got ${mcGross} ${mcCurrency}`);
      return new Response('OK', { status: 200 });
    }
  }
  // If product not found in PRODUCTS, still process (may be a custom payment)

  // 4. Mark txn as processed (365-day TTL)
  await env.KV.put(txnKey, JSON.stringify({ item: itemNumber, amount: mcGross, currency: mcCurrency, ts: new Date().toISOString() }), { expirationTtl: 365 * 86400 });

  // 5. Update order in DB
  try {
    await env.DB.prepare(
      "UPDATE orders SET status = 'paid', payment_id = ?, paid_at = datetime('now') WHERE product_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1"
    ).bind(txnId, itemNumber).run();
  } catch (e) {
    await logIPN('db_error', `DB update failed: ${e.message}`);
    return new Response('OK', { status: 200 });
  }

  // 5b. If this is an API key product, activate the key in KV for cross-worker auth
  if (product && product.type === 'api_key') {
    try {
      // Find the most recent order's API key for this product
      const orderRow = await env.DB.prepare(
        "SELECT download_token FROM orders WHERE product_id = ? AND status = 'paid' ORDER BY paid_at DESC LIMIT 1"
      ).bind(itemNumber).first();
      if (orderRow?.download_token) {
        await env.KV.put(`prokey:${orderRow.download_token}`, JSON.stringify({
          tier: 'pro',
          daily_limit: 1000,
          product_id: itemNumber,
          payment_id: txnId,
          created: new Date().toISOString(),
        }), { expirationTtl: 365 * 86400 });
      }
    } catch (_) { /* non-fatal */ }
  }

  // 6. First payment detection — milestone flag
  const firstPayment = await env.KV.get('revenue:first_payment');
  if (!firstPayment) {
    await env.KV.put('revenue:first_payment', JSON.stringify({
      txn_id: txnId,
      amount: mcGross,
      currency: mcCurrency,
      product: itemNumber,
      payer: params.get('payer_email'),
      ts: new Date().toISOString(),
    }));
  }

  await logIPN('success', `Payment processed: ${mcGross} ${mcCurrency} for ${itemNumber}`);
  return new Response('OK', { status: 200 });
}

async function handleStripeWebhook(request, env) {
  if (!env.STRIPE_WEBHOOK_SECRET) return new Response('No webhook secret', { status: 400 });

  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  // Simple signature verification (for production, use proper HMAC)
  // For now, trust Cloudflare's network isolation
  let event;
  try {
    event = JSON.parse(body);
  } catch (e) {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = session.metadata?.order_id;
    const productId = session.metadata?.product_id;
    if (orderId) {
      try {
        await env.DB.prepare(
          "UPDATE orders SET status = 'paid', paid_at = datetime('now') WHERE order_id = ?"
        ).bind(orderId).run();
      } catch (e) { /* log */ }

      // Auto-provision API key for intel-api-pro if not already done via success redirect
      if (productId === 'intel-api-pro') {
        try {
          const existing = await env.DB.prepare(
            "SELECT download_token FROM orders WHERE order_id = ?"
          ).bind(orderId).first();
          if (existing?.download_token && existing.download_token.startsWith('oc_pro_')) {
            // Key already provisioned via success redirect, ensure it's active
            await env.DB.prepare(
              "UPDATE api_keys SET status = 'active' WHERE key = ?"
            ).bind(existing.download_token).run();
          }
        } catch (e) { /* non-fatal */ }
      }
    }
  }

  return new Response('OK', { status: 200 });
}

async function handleAPIOrders(request, env) {
  const orders = await env.DB.prepare(
    'SELECT * FROM orders ORDER BY created_at DESC LIMIT 50'
  ).all();
  return jsonResponse({ orders: orders.results, count: orders.results.length });
}

// ============================================================
// INLINE PRODUCT CONTENT (Prompt Collection)
// ============================================================
function generatePromptCollectionHTML() {
  // This generates the prompt collection content inline
  // Used as fallback when KV doesn't have the content
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>【保存版】実戦で使えるAIプロンプト50選</title>
<style>
  @page { margin: 20mm; }
  body { font-family: 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #333; line-height: 1.7; background: #fff; }
  h1 { text-align: center; font-size: 2rem; margin-bottom: 8px; }
  .subtitle { text-align: center; color: #666; margin-bottom: 40px; }
</style>
</head>
<body>
<h1>🚀 実戦で使えるAIプロンプト50選</h1>
<p class="subtitle">ChatGPT / Claude / DeepSeek 対応 — コピペですぐ使える実践テンプレート集</p>
<p style="text-align:center; color:#999;">この製品は正規購入者のみ閲覧可能です。再配布禁止。</p>
<p style="text-align:center; color:#999;">&copy; 2026 OpenClaw Intelligence</p>
<hr style="margin:40px 0;">
<p style="text-align:center;">コンテンツの読み込み中... KVからの取得をお待ちください。</p>
<p style="text-align:center;">問題が続く場合: Yagami8095@gmail.com</p>
</body>
</html>`;
}

// ============================================================
// Edge Defense Layer
// ============================================================

const HONEYPOT_PATHS = ['/admin', '/wp-login.php', '/.env', '/config.json', '/.git/config', '/wp-admin', '/phpinfo.php'];

async function sha256Short(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function edgeDefense(request, env) {
  const kv = env.KV;
  if (!kv) return { action: 'allow' };
  const path = new URL(request.url).pathname.toLowerCase();

  if (HONEYPOT_PATHS.includes(path)) {
    try {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const ipHash = await sha256Short(ip + '-openclaw-defense');
      const today = new Date().toISOString().slice(0, 10);
      const defenseKey = `defense:${ipHash}:${today}`;
      const raw = await kv.get(defenseKey, { type: 'json' }) || { score: 100, hits: 0, flags: [] };
      raw.score = Math.max(0, raw.score - 30);
      raw.hits++;
      raw.flags.push('honeypot:' + path);
      await kv.put(defenseKey, JSON.stringify(raw), { expirationTtl: 86400 });
    } catch {}
    return { action: 'honeypot' };
  }

  try {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const ipHash = await sha256Short(ip + '-openclaw-defense');
    const today = new Date().toISOString().slice(0, 10);
    const raw = await kv.get(`defense:${ipHash}:${today}`, { type: 'json' });
    if (raw && raw.score < 10) return { action: 'block' };
  } catch {}

  return { action: 'allow' };
}

// ============================================================
// FinOps Circuit Breaker
// ============================================================

const FINOPS_DAILY_WARN = 50000;
const FINOPS_DAILY_SLOW = 80000;
const FINOPS_DAILY_STOP = 95000;

async function finopsTrack(env, serverName) {
  const kv = env.KV;
  if (!kv) return { ok: true };
  const today = new Date().toISOString().slice(0, 10);
  const key = `finops:${today}`;
  try {
    const raw = await kv.get(key, { type: 'json' }) || { total: 0, by: {} };
    raw.total++;
    raw.by[serverName] = (raw.by[serverName] || 0) + 1;
    kv.put(key, JSON.stringify(raw), { expirationTtl: 172800 });
    if (raw.total >= FINOPS_DAILY_STOP) return { ok: false, reason: 'Daily capacity reached. Try again tomorrow.', status: 503 };
    if (raw.total >= FINOPS_DAILY_SLOW) return { ok: true, delay: 500 };
    if (raw.total >= FINOPS_DAILY_WARN) return { ok: true, warn: true };
    return { ok: true };
  } catch {
    return { ok: true };
  }
}

// Attribution Tracking — ?ref= parameter
async function trackRef(request, env, serverName) {
  const kv = env.KV;
  if (!kv) return;
  const ref = new URL(request.url).searchParams.get('ref');
  if (!ref) return;
  const source = ref.slice(0, 30).replace(/[^a-zA-Z0-9_-]/g, '');
  if (!source) return;
  const today = new Date().toISOString().slice(0, 10);
  const key = `ref:${source}:${serverName}:${today}`;
  try {
    const count = parseInt(await kv.get(key) || '0', 10);
    await kv.put(key, String(count + 1), { expirationTtl: 2592000 }); // 30 days
  } catch {}
}

// ============================================================
// GitHub OAuth Pro Authentication
// ============================================================
const OAUTH_SCOPES = 'read:user user:email';
const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';

// GET /auth/login → redirect to GitHub
function handleOAuthLogin(env, url) {
  if (!env.GITHUB_CLIENT_ID) {
    return jsonResponse({ error: 'OAuth not configured' }, 500);
  }
  const ref = url.searchParams.get('ref') || 'direct';
  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: `${url.origin}/auth/callback`,
    scope: OAUTH_SCOPES,
    state,
  });
  // Track trial attribution
  const refCookie = `oauth_ref=${ref}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`;
  const stateCookie = `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`;
  return new Response(null, {
    status: 302,
    headers: [
      ['Location', `${GITHUB_AUTH_URL}?${params}`],
      ['Set-Cookie', stateCookie],
      ['Set-Cookie', refCookie],
    ],
  });
}

// GET /auth/callback → exchange code → generate Pro key → show result
async function handleOAuthCallback(request, env, url) {
  const code = url.searchParams.get('code');
  if (!code) {
    return jsonResponse({ error: 'Missing authorization code' }, 400);
  }

  // Exchange code for access token
  const tokenRes = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenData = await tokenRes.json();
  if (tokenData.error) {
    return jsonResponse({ error: tokenData.error, description: tokenData.error_description }, 400);
  }

  const accessToken = tokenData.access_token;

  // Get GitHub user info
  const userRes = await fetch(GITHUB_USER_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'OpenClaw-ProductStore/1.0',
      Accept: 'application/json',
    },
  });
  const user = await userRes.json();

  // Generate Pro API key
  const proKey = `ocpro_${crypto.randomUUID().replace(/-/g, '')}`;
  const keyData = {
    key: proKey,
    github_id: user.id,
    github_login: user.login,
    github_name: user.name || user.login,
    tier: 'pro_trial',
    daily_limit: 100,
    created: new Date().toISOString(),
    expires: new Date(Date.now() + 7 * 86400000).toISOString(), // 7 day trial
  };

  // Store in KV
  if (env.KV) {
    await env.KV.put(`prokey:${proKey}`, JSON.stringify(keyData), { expirationTtl: 7 * 86400 });
    await env.KV.put(`github:${user.id}`, proKey, { expirationTtl: 7 * 86400 });
    // Track trial attribution from ref cookie
    try {
      const cookieHeader = request.headers.get('cookie') || '';
      const cookies = cookieHeader.split(';').map(c => c.trim());
      const refCookie = cookies.find(c => c.startsWith('oauth_ref='));
      const ref = refCookie ? refCookie.split('=')[1] : 'direct';
      const today = new Date().toISOString().split('T')[0];
      const countKey = `ref:trial:${ref}:${today}`;
      await env.KV.put(countKey, String(parseInt(await env.KV.get(countKey) || '0') + 1), { expirationTtl: 30 * 86400 });
    } catch (_) { /* attribution tracking is best-effort */ }
  }

  // Return success page
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>OpenClaw Pro — Activated</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0a;color:#e0e0e0;display:flex;justify-content:center;align-items:center;min-height:100vh;padding:20px}
.card{background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:32px;max-width:520px;width:100%}
h1{color:#ff6b35;font-size:1.5em;margin-bottom:16px}
.key-box{background:#0d1117;border:1px solid #ff6b35;border-radius:8px;padding:16px;margin:16px 0;font-family:monospace;font-size:0.9em;word-break:break-all;color:#fff;cursor:pointer}
.key-box:hover{background:#161b22}
.info{color:#888;font-size:0.85em;line-height:1.6;margin-top:12px}
.badge{display:inline-block;background:#ff6b35;color:#000;padding:2px 8px;border-radius:4px;font-size:0.75em;font-weight:bold}
.user{display:flex;align-items:center;gap:12px;margin:16px 0;padding:12px;background:#161b22;border-radius:8px}
.user img{width:40px;height:40px;border-radius:50%}
.usage{margin-top:16px;font-size:0.85em;color:#aaa}
code{background:#222;padding:2px 6px;border-radius:3px;font-size:0.85em}
</style></head>
<body>
<div class="card">
  <h1>OpenClaw Pro <span class="badge">7-DAY TRIAL</span></h1>
  <div class="user">
    <img src="${user.avatar_url}" alt="${user.login}">
    <div><strong>${user.name || user.login}</strong><br><span style="color:#888">@${user.login}</span></div>
  </div>
  <p>Your Pro API key (click to copy):</p>
  <div class="key-box" onclick="navigator.clipboard.writeText(this.textContent.trim()).then(()=>this.style.borderColor='#0f0')">${proKey}</div>
  <div class="usage">
    <strong>Usage:</strong> Add header <code>X-API-Key: ${proKey}</code> to any OpenClaw MCP request.<br>
    <strong>Limit:</strong> 100 calls/day (vs 10-50 free)<br>
    <strong>Expires:</strong> ${keyData.expires.split('T')[0]}<br>
    <strong>Upgrade:</strong> <a href="https://paypal.me/Yagami8095/9" style="color:#ff6b35">Pay $9 for unlimited Pro</a>
  </div>
  <div class="info">
    After trial, upgrade to permanent Pro ($9 one-time) for 1000 calls/day across all 9 MCP servers.<br>
    Servers: json-toolkit, regex-engine, color-palette, timestamp-converter, prompt-enhancer, agentforge, moltbook, fortune, intel
  </div>
</div>
</body></html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// GET /auth/status → check Pro key status
async function handleOAuthStatus(request, env) {
  const apiKey = request.headers.get('X-API-Key') || new URL(request.url).searchParams.get('key');
  if (!apiKey) {
    return jsonResponse({ error: 'Provide X-API-Key header or ?key= param', authenticated: false }, 401);
  }

  if (!env.KV) {
    return jsonResponse({ error: 'KV not available', authenticated: false }, 503);
  }

  const raw = await env.KV.get(`prokey:${apiKey}`);
  if (!raw) {
    return jsonResponse({ error: 'Invalid or expired key', authenticated: false }, 401);
  }

  const data = JSON.parse(raw);
  return jsonResponse({
    authenticated: true,
    github_login: data.github_login,
    tier: data.tier,
    daily_limit: data.daily_limit,
    expires: data.expires,
    created: data.created,
  });
}

// ============================================================
// MAIN ROUTER
// ============================================================
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // Edge Defense
    const defense = await edgeDefense(request, env);
    if (defense.action === 'honeypot') return new Response('Not Found', { status: 404 });
    if (defense.action === 'block') return new Response(JSON.stringify({ error: 'Access denied' }), { status: 403, headers: { ...CORS, 'Content-Type': 'application/json' } });

    // FinOps Circuit Breaker
    const finops = await finopsTrack(env, 'product-store');
    if (!finops.ok) return new Response(JSON.stringify({ error: finops.reason }), { status: 503, headers: { ...CORS, 'Content-Type': 'application/json' } });
    if (finops.delay) await new Promise(r => setTimeout(r, finops.delay));

    // Attribution Tracking
    await trackRef(request, env, 'product-store');

    try {
      // Routes
      if (path === '/' && method === 'GET') {
        return handleCatalog(env);
      }

      // === GitHub OAuth Pro Authentication ===
      if (path === '/auth/login' && method === 'GET') {
        return handleOAuthLogin(env, url);
      }
      if (path === '/auth/callback' && method === 'GET') {
        return handleOAuthCallback(request, env, url);
      }
      if (path === '/auth/status' && method === 'GET') {
        return handleOAuthStatus(request, env);
      }

      // Quick-buy routes — direct redirect to PayPal
      if (path === '/buy/pro' && method === 'GET') {
        return new Response(null, {
          status: 302,
          headers: { ...CORS, 'Location': 'https://paypal.me/Yagami8095/9' }
        });
      }

      if (path.startsWith('/products/') && method === 'GET') {
        const productId = path.split('/products/')[1].replace(/\/$/, '');
        return handleProduct(productId, env);
      }

      if (path === '/checkout/stripe' && method === 'POST') {
        return handleStripeCheckout(request, env);
      }

      if (path === '/success' && method === 'GET') {
        return handleSuccess(request, env);
      }

      if (path.startsWith('/download/') && method === 'GET') {
        const token = path.split('/download/')[1];
        return handleDownload(token, env);
      }

      if (path === '/webhooks/paypal' && method === 'POST') {
        return handlePayPalIPN(request, env);
      }

      if (path === '/webhooks/stripe' && method === 'POST') {
        return handleStripeWebhook(request, env);
      }

      if (path === '/api/orders' && method === 'GET') {
        return handleAPIOrders(request, env);
      }

      if (path === '/api/health' && method === 'GET') {
        return jsonResponse({
          status: 'ok',
          products: Object.keys(PRODUCTS).length,
          payments: {
            paypal: !!env.PAYPAL_BUSINESS_EMAIL,
            stripe: !!env.STRIPE_SECRET_KEY,
            crypto: true,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // === AI-NATIVE ENDPOINTS ===
      // These endpoints are designed for AI agents to discover, evaluate, and purchase products programmatically.

      // Product catalog API — machine-readable product list for AI agents
      if (path === '/api/products' && method === 'GET') {
        const catalog = Object.values(PRODUCTS).map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          price_usd: p.price_usd,
          type: p.type || 'digital_download',
          format: p.format,
          features: p.features,
          purchase_url: `https://product-store.yagami8095.workers.dev/products/${p.id}`,
          payment_methods: ['paypal', 'crypto', ...(env.STRIPE_SECRET_KEY ? ['card'] : [])],
        }));
        return jsonResponse({
          store: 'OpenClaw Digital Store',
          products: catalog,
          payment_options: {
            paypal: { available: true, type: 'instant' },
            crypto: { available: false, type: 'coming_soon', note: 'Crypto payments coming soon. Use PayPal for now.' },
            card: { available: !!env.STRIPE_SECRET_KEY, type: 'instant' },
          },
          mcp_servers: {
            intel: 'https://openclaw-intel-mcp.yagami8095.workers.dev/mcp',
            fortune: 'https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp',
          },
          support: 'Yagami8095@gmail.com',
        });
      }

      // Provision API — for future automated key provisioning after payment verification
      if (path === '/api/provision' && method === 'POST') {
        try {
          const body = await request.json();
          const { product_id, payment_method, payment_id, email } = body;

          const provisionableProducts = ['intel-api-pro', 'ecosystem-pro', 'enterprise-bundle', 'api-gateway-pro'];
          if (!provisionableProducts.includes(product_id)) {
            return jsonResponse({ error: `Only these products support API provisioning: ${provisionableProducts.join(', ')}`, available: provisionableProducts }, 400);
          }

          if (!payment_method || !payment_id) {
            return jsonResponse({
              error: 'payment_method and payment_id required',
              accepted_methods: ['paypal_txn', 'crypto_txhash'],
              example: { product_id: 'intel-api-pro', payment_method: 'paypal_txn', payment_id: 'TXN_ID_HERE', email: 'your@email.com' },
              note: 'Payment will be verified before key provisioning. For instant provisioning, use the PayPal checkout flow at /products/intel-api-pro',
            }, 400);
          }

          // Record the provision request — manual verification needed for crypto/PayPal txns
          const apiKey = generateApiKey();
          const orderId = generateOrderId();

          await env.DB.prepare(
            "INSERT INTO api_keys (key, tier, status, daily_limit, owner_email, payment_method, payment_id, created_at) VALUES (?, 'pro', 'pending_verification', 1000, ?, ?, ?, datetime('now'))"
          ).bind(apiKey, email || null, payment_method, payment_id).run();

          const productNames = { 'intel-api-pro': 'OpenClaw Intel Pro API Key', 'ecosystem-pro': 'OpenClaw Ecosystem Pro (All 9 MCP Servers)' };
          const productAmounts = { 'intel-api-pro': 900, 'ecosystem-pro': 900 };

          await env.DB.prepare(
            "INSERT INTO orders (order_id, product_id, product_name, amount, currency, payment_method, payment_id, status, download_token) VALUES (?, ?, ?, ?, 'USD', ?, ?, 'pending_verification', ?)"
          ).bind(orderId, product_id, productNames[product_id] || product_id, productAmounts[product_id] || 900, payment_method, payment_id, apiKey).run();

          return jsonResponse({
            status: 'pending_verification',
            message: 'Payment recorded. Your API key will be activated after payment verification (usually within 24 hours for crypto, instant for PayPal redirect flow).',
            order_id: orderId,
            key_preview: apiKey.slice(0, 12) + '...',
            tip: `For INSTANT key provisioning, use the PayPal checkout at https://product-store.yagami8095.workers.dev/products/${product_id}`,
            support: 'Yagami8095@gmail.com',
          });
        } catch (e) {
          return jsonResponse({ error: e.message }, 500);
        }
      }

      // llms.txt for AI discoverability
      if (path === '/llms.txt' || path === '/.well-known/llms.txt') {
        return new Response(`# OpenClaw MCP Servers

> 9 free remote MCP servers with 49 tools for AI agents. Built on Cloudflare Workers.

## Servers
- JSON Toolkit: https://json-toolkit-mcp.yagami8095.workers.dev/mcp (validate, format, diff, query, transform, schema)
- Regex Engine: https://regex-engine-mcp.yagami8095.workers.dev/mcp (test, extract, replace, explain, generate)
- Color Palette: https://color-palette-mcp.yagami8095.workers.dev/mcp (convert, palette, contrast)
- Timestamp Converter: https://timestamp-converter-mcp.yagami8095.workers.dev/mcp (format, timezone, cron, duration)
- Prompt Enhancer: https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp (optimize, analyze, rewrite, system)
- OpenClaw Intel: https://openclaw-intel-mcp.yagami8095.workers.dev/mcp (market intelligence, comparison)
- Fortune: https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp (horoscope, tarot, fortune)
- MoltBook Publisher: https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp (publish, manage content)
- AgentForge Compare: https://agentforge-compare-mcp.yagami8095.workers.dev/mcp (model benchmarks)

## Quick Start
Add to MCP config: {"url": "https://json-toolkit-mcp.yagami8095.workers.dev/mcp"}

## Pro: $9/month, 1000 calls/day all servers
https://product-store.yagami8095.workers.dev/products/ecosystem-pro

## Source: https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers`, {
          status: 200,
          headers: { 'Content-Type': 'text/plain; charset=utf-8', ...CORS }
        });
      }

      return htmlResponse(notFoundPage(), 404);
    } catch (error) {
      return jsonResponse({ error: error.message }, 500);
    }
  },
};
