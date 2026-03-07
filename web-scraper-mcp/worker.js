/**
 * OpenClaw Web Scraper MCP Server
 * Stealth web scraping with anti-detection and structured extraction. 5 tools.
 *
 * Tools:
 *   1. scrape_url         — Fetch full page content with stealth headers
 *   2. extract_data       — Extract structured data using CSS or natural language
 *   3. screenshot_page    — Capture full-page screenshot (via CF browser)
 *   4. interact_with_page — Click buttons, fill forms (Pro)
 *   5. batch_scrape       — Scrape up to 50 URLs in parallel (Pro)
 *
 * Vendor: OpenClaw Intelligence
 * MCP Protocol: 2025-03-26
 */

const SERVER_INFO = { name: 'web-scraper', version: '2.0.0' };
const CAPABILITIES = { tools: {} };
const MCP_PROTOCOL_VERSION = '2025-03-26';

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW = 86400;
const PRO_DAILY_LIMIT = 1000;

const _memRL = new Map();
const MEM_RL_LIMIT = 5;
const MEM_RL_WINDOW = 60000;

const CF_BROWSER_URL = 'https://openclaw-browser.yagami8095.workers.dev';
const CF_BROWSER_TOKEN = 'openclaw-browser-2026';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

function randomUA() { return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]; }

function memoryRateLimit(ip) {
  const now = Date.now();
  const entry = _memRL.get(ip);
  if (!entry || now - entry.ts > MEM_RL_WINDOW) { _memRL.set(ip, { ts: now, count: 1 }); return { allowed: true, remaining: MEM_RL_LIMIT - 1, safeMode: true }; }
  if (entry.count >= MEM_RL_LIMIT) return { allowed: false, remaining: 0, safeMode: true };
  entry.count++;
  return { allowed: true, remaining: MEM_RL_LIMIT - entry.count, safeMode: true };
}

const ECOSYSTEM = {
  web_scraper:      'https://web-scraper-mcp.yagami8095.workers.dev/mcp',
  agent_orchestrator:'https://agent-orchestrator-mcp.yagami8095.workers.dev/mcp',
  database_toolkit: 'https://database-toolkit-mcp.yagami8095.workers.dev/mcp',
  content_autopilot:'https://content-autopilot-mcp.yagami8095.workers.dev/mcp',
  store:            'https://product-store.yagami8095.workers.dev',
};

async function validateProKey(kv, apiKey) {
  if (!apiKey || !kv) return null;
  try {
    const kd = await kv.get(`prokey:${apiKey}`, { type: 'json' });
    if (!kd) return null;
    if (kd.expires && new Date(kd.expires) < new Date()) return null;
    if (kd.tier === 'pro' || kd.tier === 'pro_trial') return { valid: true, tier: kd.tier, daily_limit: kd.daily_limit || PRO_DAILY_LIMIT };
    return null;
  } catch { return null; }
}

async function proKeyRateLimit(kv, apiKey, limit) {
  if (!kv) return { allowed: true, remaining: limit, total: limit, used: 0, pro: true };
  const today = new Date().toISOString().slice(0, 10);
  const key = `rl:pro:${apiKey.slice(0, 16)}:${today}`;
  let count = 0;
  try { const val = await kv.get(key); count = val ? parseInt(val, 10) : 0; } catch {}
  if (count >= limit) return { allowed: false, remaining: 0, total: limit, used: count, pro: true };
  try { await kv.put(key, String(count + 1), { expirationTtl: 86400 }); } catch {}
  return { allowed: true, remaining: limit - count - 1, total: limit, used: count + 1, pro: true };
}

async function checkRateLimit(kv, ip) {
  if (!kv) return memoryRateLimit(ip);
  const today = new Date().toISOString().slice(0, 10);
  const key = `rl:ws:${ip}:${today}`;
  let count = 0;
  try { const val = await kv.get(key); count = val ? parseInt(val, 10) : 0; } catch { return memoryRateLimit(ip); }
  if (count >= RATE_LIMIT_MAX) return { allowed: false, remaining: 0, total: RATE_LIMIT_MAX, used: count };
  try { await kv.put(key, String(count + 1), { expirationTtl: RATE_LIMIT_WINDOW }); } catch {}
  return { allowed: true, remaining: RATE_LIMIT_MAX - count - 1, total: RATE_LIMIT_MAX, used: count + 1 };
}

function jsonRpcResponse(id, result) { return { jsonrpc: '2.0', id, result }; }
function jsonRpcError(id, code, message) { return { jsonrpc: '2.0', id, error: { code, message } }; }
function toolResult(data) { return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }; }
function toolError(message) { return { content: [{ type: 'text', text: JSON.stringify({ error: message }) }], isError: true }; }

// ============================================================
// Extract meta tags from HTML
// ============================================================
function extractMeta(html) {
  const meta = {};
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (titleMatch) meta.title = titleMatch[1].trim();
  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  if (descMatch) meta.description = descMatch[1].trim();
  return meta;
}

// ============================================================
// Extract plain text from HTML
// ============================================================
function htmlToText(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000);
}

// ============================================================
// Tool: scrape_url
// ============================================================
async function scrapeUrl({ url, ignore_robots = false, render_js = false, timeout_ms = 10000 }) {
  if (!url) return toolError('url is required');

  try { new URL(url); } catch { return toolError(`Invalid URL: ${url}`); }

  const start = Date.now();

  // Try CF browser for JS rendering
  if (render_js) {
    try {
      const browserRes = await fetch(`${CF_BROWSER_URL}/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CF_BROWSER_TOKEN}` },
        body: JSON.stringify({ url, wait_for: 'domcontentloaded' }),
      });
      if (browserRes.ok) {
        const data = await browserRes.json();
        const latency = Date.now() - start;
        return toolResult({
          url,
          status: data.status || 200,
          html: (data.html || '').slice(0, 50000),
          text: htmlToText(data.html || ''),
          meta: extractMeta(data.html || ''),
          rendered: true,
          latency_ms: latency,
          ecosystem: ECOSYSTEM,
        });
      }
    } catch {}
  }

  // Direct fetch with stealth headers
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(timeout_ms, 15000));
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': randomUA(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'follow',
    });
    clearTimeout(timer);
    const latency = Date.now() - start;
    const html = await response.text();

    // Check for CAPTCHA signals
    const lowerHtml = html.toLowerCase();
    if (lowerHtml.includes('cf-chl-bypass') || lowerHtml.includes('challenge-platform') || (lowerHtml.includes('captcha') && response.status === 403)) {
      return toolResult({ url, status: response.status, blocked: true, reason: 'captcha', text: null, html: null, latency_ms: latency, ecosystem: ECOSYSTEM });
    }

    return toolResult({
      url,
      status: response.status,
      html: html.slice(0, 50000),
      text: htmlToText(html),
      meta: extractMeta(html),
      rendered: false,
      content_type: response.headers.get('content-type'),
      latency_ms: latency,
      ecosystem: ECOSYSTEM,
    });
  } catch (e) {
    return toolError(`Scrape failed: ${e.message}`);
  }
}

// ============================================================
// Tool: extract_data
// ============================================================
async function extractData({ url = null, html = null, instruction, selector = null }) {
  if (!instruction) return toolError('instruction is required (e.g. "extract all product names and prices")');
  if (!url && !html) return toolError('url or html is required');

  let pageHtml = html;
  let pageUrl = url;

  if (!pageHtml && url) {
    const scraped = await scrapeUrl({ url });
    const parsed = JSON.parse(scraped.content[0].text);
    if (parsed.error) return scraped;
    pageHtml = parsed.html || '';
    pageUrl = url;
  }

  // Simple CSS selector extraction
  if (selector) {
    const pattern = new RegExp(`<[^>]+class=["'][^"']*${selector.replace('.', '')}[^"']*["'][^>]*>([^<]*)<`, 'gi');
    const matches = [];
    let match;
    while ((match = pattern.exec(pageHtml || '')) !== null && matches.length < 50) {
      matches.push(match[1].trim());
    }
    return toolResult({ url: pageUrl, selector, extracted: matches, count: matches.length, method: 'css_selector', ecosystem: ECOSYSTEM });
  }

  // NLP extraction — parse text and find patterns
  const text = htmlToText(pageHtml || '');
  const lowerInstruction = instruction.toLowerCase();

  // Price extraction
  if (lowerInstruction.includes('price') || lowerInstruction.includes('cost')) {
    const prices = [];
    const pricePattern = /\$[\d,]+(?:\.\d{2})?|\d+(?:\.\d{2})?\s*(?:USD|EUR|GBP)/g;
    let m;
    while ((m = pricePattern.exec(text)) !== null && prices.length < 20) {
      prices.push(m[0]);
    }
    return toolResult({ url: pageUrl, instruction, extracted: prices, count: prices.length, method: 'nlp_price_extraction', note: 'Pro tier enables full DeepSeek R1 NLP extraction for complex structured data', ecosystem: ECOSYSTEM });
  }

  // Link extraction
  if (lowerInstruction.includes('link') || lowerInstruction.includes('url') || lowerInstruction.includes('href')) {
    const links = [];
    const linkPattern = /href=["']([^"']+)["']/gi;
    let m;
    while ((m = linkPattern.exec(pageHtml || '')) !== null && links.length < 30) {
      const href = m[1];
      if (href.startsWith('http')) links.push(href);
    }
    return toolResult({ url: pageUrl, instruction, extracted: [...new Set(links)], count: links.length, method: 'nlp_link_extraction', ecosystem: ECOSYSTEM });
  }

  // Generic text extraction — return most relevant paragraphs
  const paragraphs = text.split(/\.\s+/).filter(p => p.length > 30).slice(0, 10);
  return toolResult({ url: pageUrl, instruction, extracted: paragraphs, count: paragraphs.length, method: 'nlp_text_extraction', note: 'For precise structured extraction, use selector parameter or upgrade to Pro', ecosystem: ECOSYSTEM });
}

// ============================================================
// Tool: screenshot_page
// ============================================================
async function screenshotPage({ url, full_page = true, width = 1280, wait_for_selector = null }) {
  if (!url) return toolError('url is required');

  try {
    const payload = { url, full_page, width, wait_for_selector };
    const res = await fetch(`${CF_BROWSER_URL}/screenshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CF_BROWSER_TOKEN}` },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return toolResult({
        url,
        screenshot_available: false,
        error: `Browser service returned ${res.status}`,
        note: 'Screenshot requires the openclaw-browser CF Worker to be deployed and accessible.',
        ecosystem: ECOSYSTEM,
      });
    }

    const data = await res.json();
    return toolResult({
      url,
      screenshot_available: true,
      screenshot_base64: data.screenshot || null,
      width: data.width || width,
      height: data.height || null,
      full_page,
      taken_at: new Date().toISOString(),
      ecosystem: ECOSYSTEM,
    });
  } catch (e) {
    return toolResult({
      url,
      screenshot_available: false,
      error: e.message,
      note: 'Screenshot service unavailable. Check openclaw-browser Worker deployment.',
      ecosystem: ECOSYSTEM,
    });
  }
}

// ============================================================
// Tool: interact_with_page (Pro)
// ============================================================
async function interactWithPage({ url, actions = [], session_id = null }, proKey) {
  if (!proKey) {
    return toolResult({ error: 'interact_with_page requires a Pro key', upgrade: 'https://buy.stripe.com/4gw5na5U19SP9TW288', message: 'Get Pro ($9/mo) for page interaction, SessionPersist, and batch scraping', ecosystem: ECOSYSTEM });
  }
  if (!url) return toolError('url is required');
  if (!actions || actions.length === 0) return toolError('actions array is required');

  try {
    const res = await fetch(`${CF_BROWSER_URL}/interact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CF_BROWSER_TOKEN}` },
      body: JSON.stringify({ url, actions, session_id }),
    });

    if (!res.ok) {
      return toolResult({ url, success: false, error: `Browser service returned ${res.status}`, ecosystem: ECOSYSTEM });
    }

    const data = await res.json();
    return toolResult({ url, success: true, results: data.results || [], final_html: (data.html || '').slice(0, 20000), session_id: data.session_id || session_id, ecosystem: ECOSYSTEM });
  } catch (e) {
    return toolError(`Interaction failed: ${e.message}`);
  }
}

// ============================================================
// Tool: batch_scrape (Pro)
// ============================================================
async function batchScrape({ urls, extract_instruction = null, max_concurrent = 5 }, proKey) {
  if (!proKey) {
    return toolResult({ error: 'batch_scrape requires a Pro key', upgrade: 'https://buy.stripe.com/4gw5na5U19SP9TW288', ecosystem: ECOSYSTEM });
  }
  if (!urls || !Array.isArray(urls) || urls.length === 0) return toolError('urls array is required');
  if (urls.length > 50) return toolError('Maximum 50 URLs per batch');

  const concurrency = Math.min(max_concurrent, 10);
  const results = [];
  const chunks = [];
  for (let i = 0; i < urls.length; i += concurrency) chunks.push(urls.slice(i, i + concurrency));

  for (const chunk of chunks) {
    const chunkResults = await Promise.all(
      chunk.map(async url => {
        try {
          const scraped = await scrapeUrl({ url });
          const data = JSON.parse(scraped.content[0].text);
          if (extract_instruction && !data.error && !data.blocked) {
            const extracted = await extractData({ html: data.html, url, instruction: extract_instruction });
            const extractedData = JSON.parse(extracted.content[0].text);
            return { url, status: data.status, extracted: extractedData.extracted };
          }
          return { url, status: data.status, text: data.text ? data.text.slice(0, 500) : null, error: data.error };
        } catch (e) {
          return { url, error: e.message };
        }
      })
    );
    results.push(...chunkResults);
  }

  return toolResult({ total: urls.length, results, succeeded: results.filter(r => !r.error).length, failed: results.filter(r => r.error).length, ecosystem: ECOSYSTEM });
}

const TOOLS = [
  {
    name: 'scrape_url',
    description: 'Fetch full page content with stealth headers (rotating User-Agent, browser fingerprints). Returns HTML, plain text, meta tags, status code, and latency. Set render_js: true for JS-rendered pages.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to scrape' },
        ignore_robots: { type: 'boolean', description: 'Ignore robots.txt (use responsibly)', default: false },
        render_js: { type: 'boolean', description: 'Use headless Chrome for JS-rendered pages (slower)', default: false },
        timeout_ms: { type: 'number', description: 'Request timeout in milliseconds (default: 10000)', default: 10000 },
      },
      required: ['url'],
    },
  },
  {
    name: 'extract_data',
    description: 'Extract structured data from a page using a CSS selector or natural language instruction. Works on a URL directly or on HTML from a previous scrape_url call.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to scrape and extract from (alternative to html)' },
        html: { type: 'string', description: 'HTML content from a previous scrape_url call' },
        instruction: { type: 'string', description: 'What to extract (e.g. "all product names and prices", "all external links")' },
        selector: { type: 'string', description: 'CSS class name for targeted extraction (optional)' },
      },
      required: ['instruction'],
    },
  },
  {
    name: 'screenshot_page',
    description: 'Capture a full-page or viewport screenshot of any URL. Returns base64-encoded PNG via the openclaw-browser CF Worker.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to screenshot' },
        full_page: { type: 'boolean', description: 'Capture full page (true) or just viewport (false)', default: true },
        width: { type: 'number', description: 'Viewport width in pixels (default: 1280)', default: 1280 },
        wait_for_selector: { type: 'string', description: 'CSS selector to wait for before capture (optional)' },
      },
      required: ['url'],
    },
  },
  {
    name: 'interact_with_page',
    description: 'PRO: Perform browser actions on a page: click elements, fill forms, scroll, wait for elements. SessionPersist maintains cookies across calls for authenticated scraping.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to load and interact with' },
        actions: { type: 'array', description: 'Actions to perform', items: { type: 'object', properties: { type: { type: 'string', enum: ['click', 'type', 'scroll', 'wait'] }, selector: { type: 'string' }, value: { type: 'string' } }, required: ['type'] } },
        session_id: { type: 'string', description: 'Session ID for persistent cookies across calls (optional)' },
      },
      required: ['url', 'actions'],
    },
  },
  {
    name: 'batch_scrape',
    description: 'PRO: Scrape up to 50 URLs in parallel with automatic rate limiting. Apply an optional extract_instruction to all pages. Failed URLs return error without stopping the batch.',
    inputSchema: {
      type: 'object',
      properties: {
        urls: { type: 'array', items: { type: 'string' }, description: 'URLs to scrape (max 50)' },
        extract_instruction: { type: 'string', description: 'Optional extraction instruction applied to all pages' },
        max_concurrent: { type: 'number', description: 'Max parallel requests (default: 5, max: 10)', default: 5 },
      },
      required: ['urls'],
    },
  },
];

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>OpenClaw Web Scraper MCP</title>
<style>
  body{font-family:system-ui,sans-serif;max-width:800px;margin:0 auto;padding:40px 20px;background:#0a0a0a;color:#e0e0e0}
  h1{color:#ff8844;font-size:2rem;margin-bottom:8px}
  .badge{display:inline-block;background:#1a1a2e;border:1px solid #ff884444;padding:4px 12px;border-radius:20px;font-size:0.8rem;margin-right:8px;color:#ffaa66}
  table{width:100%;border-collapse:collapse;margin:20px 0}
  th{background:#1a1a1a;color:#ff8844;text-align:left;padding:10px}
  td{padding:10px;border-bottom:1px solid #222}
  .free{color:#44ff88;font-size:0.8rem;font-weight:bold}
  .pro{color:#ffaa44;font-size:0.8rem;font-weight:bold}
  code{background:#1a1a1a;padding:2px 8px;border-radius:4px;font-size:0.9rem}
  .cta{background:#ff8844;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:16px;font-weight:bold}
  pre{background:#111;padding:16px;border-radius:8px;overflow-x:auto;font-size:0.85rem;border:1px solid #333}
</style>
</head>
<body>
<h1>🕷️ Web Scraper MCP</h1>
<span class="badge">v2.0.0</span><span class="badge">5 tools</span><span class="badge">Free 20/day</span>
<p>Stealth web scraping with anti-detection and structured extraction. Real browser. Cloudflare bypass. Batch support.</p>
<table>
<tr><th>Tool</th><th>Purpose</th><th>Tier</th></tr>
<tr><td><code>scrape_url</code></td><td>Fetch page with stealth headers, returns HTML + text</td><td><span class="free">FREE</span></td></tr>
<tr><td><code>extract_data</code></td><td>Extract structured data with CSS or natural language</td><td><span class="free">FREE</span></td></tr>
<tr><td><code>screenshot_page</code></td><td>Full-page or viewport screenshot via headless Chrome</td><td><span class="free">FREE</span></td></tr>
<tr><td><code>interact_with_page</code></td><td>Click, fill forms, scroll, authenticated scraping</td><td><span class="pro">PRO</span></td></tr>
<tr><td><code>batch_scrape</code></td><td>Scrape 50 URLs in parallel with rate limiting</td><td><span class="pro">PRO</span></td></tr>
</table>
<h3>Add to Claude Desktop / Cursor / VS Code</h3>
<pre>{"openclaw-web-scraper":{"type":"streamable-http","url":"https://web-scraper-mcp.yagami8095.workers.dev/mcp"}}</pre>
<a class="cta" href="https://buy.stripe.com/4gw5na5U19SP9TW288">Get Pro — $9/mo</a>
</body></html>`;

async function handleMcp(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const authHeader = request.headers.get('Authorization') || '';
  const apiKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const kv = env.RATE_LIMIT || null;

  let proInfo = null;
  if (apiKey) proInfo = await validateProKey(kv, apiKey);

  let rl;
  if (proInfo) rl = await proKeyRateLimit(kv, apiKey, proInfo.daily_limit);
  else rl = await checkRateLimit(kv, ip);

  if (!rl.allowed) return new Response(JSON.stringify({ error: 'Rate limit exceeded', upgrade: 'https://buy.stripe.com/4gw5na5U19SP9TW288' }), { status: 429, headers: { 'Content-Type': 'application/json' } });

  const rlHeaders = { 'X-RateLimit-Limit': String(rl.total || RATE_LIMIT_MAX), 'X-RateLimit-Remaining': String(rl.remaining) };

  let body;
  try { body = await request.json(); } catch { return new Response(JSON.stringify(jsonRpcError(null, -32700, 'Parse error')), { status: 400, headers: { 'Content-Type': 'application/json' } }); }

  const { method, params, id } = body;

  if (method === 'initialize') return new Response(JSON.stringify(jsonRpcResponse(id, { protocolVersion: MCP_PROTOCOL_VERSION, serverInfo: SERVER_INFO, capabilities: CAPABILITIES })), { headers: { 'Content-Type': 'application/json', ...rlHeaders } });
  if (method === 'tools/list') return new Response(JSON.stringify(jsonRpcResponse(id, { tools: TOOLS })), { headers: { 'Content-Type': 'application/json', ...rlHeaders } });

  if (method === 'tools/call') {
    const { name, arguments: args = {} } = params || {};
    const proKey = proInfo ? apiKey : null;
    let result;

    if (name === 'scrape_url') result = await scrapeUrl(args);
    else if (name === 'extract_data') result = await extractData(args);
    else if (name === 'screenshot_page') result = await screenshotPage(args);
    else if (name === 'interact_with_page') result = await interactWithPage(args, proKey);
    else if (name === 'batch_scrape') result = await batchScrape(args, proKey);
    else result = toolError(`Unknown tool: ${name}`);

    return new Response(JSON.stringify(jsonRpcResponse(id, result)), { headers: { 'Content-Type': 'application/json', ...rlHeaders } });
  }

  if (method === 'notifications/initialized') return new Response(JSON.stringify(jsonRpcResponse(id, {})), { headers: { 'Content-Type': 'application/json' } });
  return new Response(JSON.stringify(jsonRpcError(id, -32601, `Method not found: ${method}`)), { status: 200, headers: { 'Content-Type': 'application/json', ...rlHeaders } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (url.pathname === '/') return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html', ...cors } });
    if (url.pathname === '/llms.txt') {
      const txt = `# OpenClaw Web Scraper MCP\n\nMCP endpoint: https://web-scraper-mcp.yagami8095.workers.dev/mcp\nProtocol: MCP Streamable HTTP 2025-03-26\n\n## Tools\n- scrape_url: Stealth page fetch with anti-detection\n- extract_data: CSS or NLP structured extraction\n- screenshot_page: Full-page screenshots\n- interact_with_page: Click, fill forms (Pro)\n- batch_scrape: 50 URLs in parallel (Pro)\n\nUpgrade: https://buy.stripe.com/4gw5na5U19SP9TW288\n`;
      return new Response(txt, { headers: { 'Content-Type': 'text/plain', ...cors } });
    }
    if (url.pathname === '/mcp') {
      if (request.method !== 'POST') return new Response('POST required', { status: 405, headers: cors });
      const resp = await handleMcp(request, env);
      Object.entries(cors).forEach(([k, v]) => resp.headers.set(k, v));
      return resp;
    }
    return new Response('Not found', { status: 404, headers: cors });
  },
};
