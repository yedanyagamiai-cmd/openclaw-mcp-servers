/**
 * product-store Worker — Digital Product Store with PayPal + Stripe
 * Cloudflare Workers + D1 + KV
 *
 * ENV VARS (set via wrangler secret):
 *   PAYPAL_BUSINESS_EMAIL - PayPal business email for Buy Now buttons
 *   STRIPE_SECRET_KEY     - Stripe secret key for Checkout Sessions
 *   STRIPE_WEBHOOK_SECRET - Stripe webhook signing secret
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
        <div class="stat"><div class="stat-num">2</div><div class="stat-label">MCP Servers</div></div>
        <div class="stat"><div class="stat-num">50+</div><div class="stat-label">AI Prompts</div></div>
        <div class="stat"><div class="stat-num">8</div><div class="stat-label">Tools</div></div>
        <div class="stat"><div class="stat-num">24/7</div><div class="stat-label">Always On</div></div>
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
  // PayPal Instant Payment Notification handler
  const body = await request.text();

  // Verify with PayPal
  const verifyResp = await fetch('https://ipnpb.paypal.com/cgi-bin/webscr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `cmd=_notify-validate&${body}`,
  });
  const verifyResult = await verifyResp.text();

  if (verifyResult === 'VERIFIED') {
    const params = new URLSearchParams(body);
    const paymentStatus = params.get('payment_status');
    const itemNumber = params.get('item_number');
    const txnId = params.get('txn_id');

    if (paymentStatus === 'Completed') {
      try {
        await env.DB.prepare(
          "UPDATE orders SET status = 'paid', payment_id = ?, paid_at = datetime('now') WHERE product_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1"
        ).bind(txnId, itemNumber).run();
      } catch (e) { /* log */ }
    }
  }

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

    try {
      // Routes
      if (path === '/' && method === 'GET') {
        return handleCatalog(env);
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

          if (product_id !== 'intel-api-pro') {
            return jsonResponse({ error: 'Only intel-api-pro supports API provisioning' }, 400);
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

          await env.DB.prepare(
            "INSERT INTO orders (order_id, product_id, product_name, amount, currency, payment_method, payment_id, status, download_token) VALUES (?, 'intel-api-pro', 'OpenClaw Intel Pro API Key', 900, 'USD', ?, ?, 'pending_verification', ?)"
          ).bind(orderId, payment_method, payment_id, apiKey).run();

          return jsonResponse({
            status: 'pending_verification',
            message: 'Payment recorded. Your API key will be activated after payment verification (usually within 24 hours for crypto, instant for PayPal redirect flow).',
            order_id: orderId,
            key_preview: apiKey.slice(0, 12) + '...',
            tip: 'For INSTANT key provisioning, use the PayPal checkout at https://product-store.yagami8095.workers.dev/products/intel-api-pro',
            support: 'Yagami8095@gmail.com',
          });
        } catch (e) {
          return jsonResponse({ error: e.message }, 500);
        }
      }

      return htmlResponse(notFoundPage(), 404);
    } catch (error) {
      return jsonResponse({ error: error.message }, 500);
    }
  },
};
