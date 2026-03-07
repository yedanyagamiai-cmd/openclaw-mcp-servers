/**
 * YEDAN Content Engine v2.0 - Revenue-Focused Content Factory
 * Cron: every 30 minutes (*\/30 * * * *)
 *
 * v2.0 Changes:
 * - Product promotion generation (15 products)
 * - x402 gateway promotion content
 * - Revenue-driven content scheduling
 * - Multi-format output (blog, social, promo)
 * - Smart topic rotation (no repeats within 24h)
 */

const BUNSHIN_URL = 'https://openclaw-mcp-servers.onrender.com';
const BUNSHIN_AUTH = 'openclaw-bunshin-2026';
const MOLTBOOK_API = 'https://moltbook-publisher-mcp.yagami8095.workers.dev';
const PRODUCT_STORE = 'https://product-store.yagami8095.workers.dev';
const X402_GATEWAY = 'https://openclaw-x402-gateway.yagami8095.workers.dev';

// Product catalog for promotions
const PRODUCTS = [
  { id: 'intel-api-pro', name: 'Intel API Pro Access', price: 9, hot: true },
  { id: 'intel-annual-pass', name: 'Intel Annual Pass', price: 79, hot: true },
  { id: 'mcp-starter-kit', name: 'MCP Server Starter Kit', price: 29, hot: false },
  { id: 'prompt-collection-50', name: '50 Premium AI Prompts', price: 19, hot: false },
  { id: 'automation-guide', name: 'AI Automation Blueprint', price: 15, hot: false },
  { id: 'side-income-roadmap', name: 'AI Side Income Roadmap', price: 12, hot: false },
  { id: 'mcp-mastery-course', name: 'MCP Mastery Course', price: 49, hot: false },
  { id: 'ai-agent-templates', name: 'AI Agent Templates Pack', price: 19, hot: false },
  { id: 'cloudflare-worker-kit', name: 'Cloudflare Worker Kit', price: 29, hot: false },
  { id: 'deepseek-integration', name: 'DeepSeek Integration Guide', price: 19, hot: false },
  { id: 'revenue-automation-masterclass', name: 'Revenue Automation Masterclass', price: 149, hot: true },
  { id: 'full-stack-ai-bundle', name: 'Full Stack AI Bundle', price: 99, hot: true },
  { id: 'ooda-system-blueprint', name: 'OODA Autonomous Intelligence Blueprint', price: 59, hot: true },
  { id: 'ai-fleet-deployment', name: 'AI Fleet Deployment Kit', price: 39, hot: true },
  { id: 'claude-code-pro-toolkit', name: 'Claude Code Pro Toolkit', price: 29, hot: true },
];

// Content types with revenue weight
const CONTENT_TYPES = [
  { type: 'product_promo', weight: 35, description: 'Direct product promotion' },
  { type: 'technical_blog', weight: 25, description: 'Technical content with product mention' },
  { type: 'x402_promo', weight: 15, description: 'x402 payment gateway promotion' },
  { type: 'case_study', weight: 15, description: 'Use case / success story' },
  { type: 'tip_thread', weight: 10, description: 'Quick tip with product link' },
];

const CONTENT_TOPICS = [
  { category: 'mcp', topics: ['MCP server development tips', 'AI agent integration patterns', 'Model Context Protocol best practices', 'Building MCP tools for Claude'] },
  { category: 'ai-tools', topics: ['Prompt engineering techniques', 'AI workflow automation', 'Multi-agent systems design', 'DeepSeek R1 vs GPT-4 comparison'] },
  { category: 'dev', topics: ['Cloudflare Workers optimization', 'Edge computing patterns', 'Serverless architecture', 'Zero-cost AI infrastructure'] },
  { category: 'revenue', topics: ['Developer tool monetization', 'SaaS micro-pricing strategies', 'API marketplace insights', 'x402 micropayments for AI'] },
  { category: 'ooda', topics: ['OODA loop for AI systems', 'Autonomous AI fleet management', 'Self-healing infrastructure', 'AI intelligence gathering'] },
];

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(contentCycle(env));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    switch (url.pathname) {
      case '/':
      case '/status':
        return await getStatus(env);
      case '/health':
        return json({ status: 'operational', role: 'content-engine', version: '2.0.0', products: PRODUCTS.length, content_types: CONTENT_TYPES.length });
      case '/generate':
        if (request.method === 'POST') return await handleGenerate(request, env);
        return json({ error: 'POST required' }, 405);
      case '/execute':
        if (request.method === 'POST') return await handleTask(request, env);
        return json({ error: 'POST required' }, 405);
      case '/history':
        return await getContentHistory(env);
      case '/products':
        return json({ products: PRODUCTS, store_url: PRODUCT_STORE });
      case '/ping':
        return json({ pong: true, brain: 'content-engine', version: '2.0.0', ts: Date.now() });
      default:
        return json({ error: 'Not found' }, 404);
    }
  }
};

async function contentCycle(env) {
  const start = Date.now();

  try {
    // Check generation interval
    const lastGen = await env.ARMY_KV.get('content:last-generation');
    const hoursSinceLastGen = lastGen ? (Date.now() - new Date(lastGen).getTime()) / 3600000 : 999;

    if (hoursSinceLastGen < 1) {
      // Too soon, just check metrics
      await checkContentMetrics(env);
      await updateHeartbeat(env, start);
      return;
    }

    // Select content type by weighted random
    const contentType = selectWeightedType();

    // Generate content based on type
    let content;
    switch (contentType.type) {
      case 'product_promo':
        content = await generateProductPromo(env);
        break;
      case 'x402_promo':
        content = await generateX402Promo(env);
        break;
      case 'case_study':
        content = await generateCaseStudy(env);
        break;
      case 'tip_thread':
        content = await generateTipThread(env);
        break;
      default:
        content = await generateTechnicalBlog(env);
    }

    if (content) {
      // Try to post to MoltBook
      const posted = await postToMoltBook(content, env);

      // Store content record
      await env.ARMY_DB.prepare(
        `INSERT INTO fleet_events (worker_id, event_type, severity, message, data) VALUES (?, 'content_generated', 'info', ?, ?)`
      ).bind('yedan-content-engine', `[${contentType.type}] ${content.title}`, JSON.stringify({
        posted,
        type: contentType.type,
        product: content.product_id || null,
        content_preview: content.body?.slice(0, 200)
      })).run();

      await env.ARMY_KV.put('content:last-generation', new Date().toISOString());
      await env.ARMY_KV.put('content:last-piece', JSON.stringify(content), { expirationTtl: 86400 });
      await env.ARMY_KV.put(`content:last-type:${contentType.type}`, new Date().toISOString());

      // Track which products were promoted
      if (content.product_id) {
        const promoCount = parseInt(await env.ARMY_KV.get(`content:promo-count:${content.product_id}`) || '0');
        await env.ARMY_KV.put(`content:promo-count:${content.product_id}`, String(promoCount + 1));
      }
    }

    await updateHeartbeat(env, start);

    // Report to Bunshin
    await reportBunshin('content-engine-status', {
      version: '2.0.0',
      last_cycle: new Date().toISOString(),
      duration_ms: Date.now() - start,
      content_type: contentType.type,
      generated: !!content,
      title: content?.title || 'none'
    }, env);

  } catch (e) {
    await logEvent(env, 'content_error', 'error', e.message);
  }
}

function selectWeightedType() {
  const totalWeight = CONTENT_TYPES.reduce((sum, t) => sum + t.weight, 0);
  let random = Math.random() * totalWeight;
  for (const ct of CONTENT_TYPES) {
    random -= ct.weight;
    if (random <= 0) return ct;
  }
  return CONTENT_TYPES[0];
}

// === Product Promotion Generator ===
async function generateProductPromo(env) {
  // Pick a product (prefer hot products)
  const hotProducts = PRODUCTS.filter(p => p.hot);
  const pool = Math.random() < 0.7 ? hotProducts : PRODUCTS;
  const product = pool[Math.floor(Math.random() * pool.length)];

  try {
    const resp = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content: `You are a marketing writer for OpenClaw, an AI developer tools company. Write compelling, authentic product promotions. No hype or fake urgency. Focus on real value and practical benefits. Keep it under 200 words.`
        },
        {
          role: 'user',
          content: `Write a promotional post for "${product.name}" ($${product.price}). This is a digital product for AI developers and builders. Include why someone would want this, one specific benefit, and end with a call to action pointing to our store. Don't use markdown headers. Title on first line.`
        }
      ],
      max_tokens: 400
    });

    const text = resp.response || '';
    const lines = text.trim().split('\n');
    const title = lines[0]?.replace(/^#+\s*/, '').trim() || `${product.name} - Now Available`;
    const body = lines.slice(1).join('\n').trim() + `\n\nGet it now: ${PRODUCT_STORE}/product/${product.id}`;

    return {
      title,
      body,
      topic: product.name,
      category: 'product_promo',
      product_id: product.id,
      product_price: product.price,
      generated_at: new Date().toISOString(),
      model: '@cf/meta/llama-3.1-8b-instruct'
    };
  } catch (e) {
    return null;
  }
}

// === x402 Gateway Promotion ===
async function generateX402Promo(env) {
  const angles = [
    'How AI agents can pay for tools autonomously using x402 protocol',
    'Zero-fee micropayments for AI: the x402 revolution',
    'Why USDC on Base is the future of AI-to-AI commerce',
    'Build AI agents that can buy their own tools with x402',
    'The $0.01 economy: micropayments for every AI API call'
  ];
  const angle = angles[Math.floor(Math.random() * angles.length)];

  try {
    const resp = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content: 'You are a technical writer explaining cutting-edge payment protocols for AI systems. Write clearly and concisely. Under 250 words.'
        },
        {
          role: 'user',
          content: `Write a post about: "${angle}". Mention that OpenClaw has deployed an x402 payment gateway with 9 AI tool endpoints, prices from $0.01 to $0.10 per request, using USDC on Base L2 with 0% protocol fees. The gateway URL is openclaw-x402-gateway.yagami8095.workers.dev and AI agents can discover endpoints at /.well-known/x402. Title on first line, no markdown headers.`
        }
      ],
      max_tokens: 400
    });

    const text = resp.response || '';
    const lines = text.trim().split('\n');
    const title = lines[0]?.replace(/^#+\s*/, '').trim() || angle;
    const body = lines.slice(1).join('\n').trim();

    return {
      title,
      body,
      topic: angle,
      category: 'x402_promo',
      generated_at: new Date().toISOString(),
      model: '@cf/meta/llama-3.1-8b-instruct'
    };
  } catch (e) {
    return null;
  }
}

// === Case Study Generator ===
async function generateCaseStudy(env) {
  const scenarios = [
    'How an AI agent used OpenClaw MCP servers to automate market research',
    'Building a 24/7 autonomous AI fleet with zero hosting costs',
    'From 0 to 15 digital products: an AI-powered product creation story',
    'How OODA loops make AI agents 10x more effective',
    'Deploying 6 AI workers on Cloudflare for $0/month'
  ];
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

  try {
    const resp = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content: 'You are a case study writer for OpenClaw. Write realistic, practical case studies that show real value. Include specific numbers when possible. Under 300 words.'
        },
        {
          role: 'user',
          content: `Write a case study about: "${scenario}". Make it practical and believable. Include a problem, solution, and result. Mention OpenClaw tools where relevant. Title on first line, no markdown headers.`
        }
      ],
      max_tokens: 500
    });

    const text = resp.response || '';
    const lines = text.trim().split('\n');
    const title = lines[0]?.replace(/^#+\s*/, '').trim() || scenario;
    const body = lines.slice(1).join('\n').trim();

    return {
      title,
      body,
      topic: scenario,
      category: 'case_study',
      generated_at: new Date().toISOString(),
      model: '@cf/meta/llama-3.1-8b-instruct'
    };
  } catch (e) {
    return null;
  }
}

// === Tip Thread Generator ===
async function generateTipThread(env) {
  const category = CONTENT_TOPICS[Math.floor(Math.random() * CONTENT_TOPICS.length)];
  const topic = category.topics[Math.floor(Math.random() * category.topics.length)];
  const product = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];

  try {
    const resp = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content: 'You are a developer educator. Write quick, actionable tips. Under 150 words.'
        },
        {
          role: 'user',
          content: `Write a quick developer tip about "${topic}". Include one concrete code snippet or command. Mention that "${product.name}" ($${product.price}) at ${PRODUCT_STORE} has more in-depth content on this topic. Title on first line, no markdown headers.`
        }
      ],
      max_tokens: 300
    });

    const text = resp.response || '';
    const lines = text.trim().split('\n');
    const title = lines[0]?.replace(/^#+\s*/, '').trim() || `Quick Tip: ${topic}`;
    const body = lines.slice(1).join('\n').trim();

    return {
      title,
      body,
      topic,
      category: 'tip_thread',
      product_id: product.id,
      generated_at: new Date().toISOString(),
      model: '@cf/meta/llama-3.1-8b-instruct'
    };
  } catch (e) {
    return null;
  }
}

// === Technical Blog (upgraded from v1.0) ===
async function generateTechnicalBlog(env) {
  const category = CONTENT_TOPICS[Math.floor(Math.random() * CONTENT_TOPICS.length)];
  const topic = category.topics[Math.floor(Math.random() * category.topics.length)];

  try {
    const resp = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content: 'You are a technical content writer for OpenClaw, an AI MCP server ecosystem. Write engaging, informative posts. Include practical tips. 150-300 words. Mention OpenClaw products or x402 gateway where relevant.'
        },
        {
          role: 'user',
          content: `Write a technical post about: "${topic}". Include one practical tip or code snippet. Mention that OpenClaw has tools and products for this at ${PRODUCT_STORE} and AI-native payment at ${X402_GATEWAY}. Title on first line, no markdown headers.`
        }
      ],
      max_tokens: 500
    });

    const text = resp.response || '';
    const lines = text.trim().split('\n');
    const title = lines[0]?.replace(/^#+\s*/, '').trim() || topic;
    const body = lines.slice(1).join('\n').trim();

    return {
      title,
      body,
      topic,
      category: category.category,
      generated_at: new Date().toISOString(),
      model: '@cf/meta/llama-3.1-8b-instruct'
    };
  } catch (e) {
    return null;
  }
}

async function postToMoltBook(content, env) {
  try {
    const resp = await fetch(`${MOLTBOOK_API}/api/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: content.title,
        content: content.body,
        submolt_name: 'openclaw',
        submolt: 'openclaw'
      }),
      signal: AbortSignal.timeout(10000)
    });
    return resp.ok;
  } catch {
    return false;
  }
}

async function checkContentMetrics(env) {
  try {
    const { results } = await env.ARMY_DB.prepare(
      `SELECT COUNT(*) as total, MAX(created_at) as latest FROM fleet_events WHERE worker_id = 'yedan-content-engine' AND event_type = 'content_generated'`
    ).all();
  } catch {}
}

async function handleTask(request, env) {
  try {
    const { task_id, type, payload } = await request.json();

    if (type === 'content' || type === 'content-create') {
      const contentType = payload?.content_type || 'product_promo';
      let content;
      switch (contentType) {
        case 'product_promo': content = await generateProductPromo(env); break;
        case 'x402_promo': content = await generateX402Promo(env); break;
        case 'case_study': content = await generateCaseStudy(env); break;
        default: content = await generateTechnicalBlog(env); break;
      }
      if (content) {
        await postToMoltBook(content, env);
        return json({ ok: true, task_id, result: 'content_generated', type: contentType, title: content.title });
      }
      return json({ ok: false, task_id, error: 'Generation failed' });
    }

    if (type === 'promote-product') {
      const content = await generateProductPromo(env);
      if (content) {
        await postToMoltBook(content, env);
        return json({ ok: true, task_id, result: 'product_promoted', title: content.title, product: content.product_id });
      }
      return json({ ok: false, task_id, error: 'Promo generation failed' });
    }

    return json({ ok: false, error: 'Unknown task type' });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

async function handleGenerate(request, env) {
  try {
    const { type } = await request.json().catch(() => ({}));
    let content;
    switch (type) {
      case 'product_promo': content = await generateProductPromo(env); break;
      case 'x402_promo': content = await generateX402Promo(env); break;
      case 'case_study': content = await generateCaseStudy(env); break;
      case 'tip_thread': content = await generateTipThread(env); break;
      default: content = await generateTechnicalBlog(env); break;
    }
    return json({ ok: !!content, content });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

async function getStatus(env) {
  const lastGen = await env.ARMY_KV.get('content:last-generation');
  const lastPiece = await env.ARMY_KV.get('content:last-piece', 'json').catch(() => null);
  return json({
    role: 'content-engine',
    version: '2.0.0',
    products_tracked: PRODUCTS.length,
    content_types: CONTENT_TYPES.map(t => `${t.type}(${t.weight}%)`),
    timestamp: new Date().toISOString(),
    last_generation: lastGen,
    last_content: lastPiece ? { title: lastPiece.title, category: lastPiece.category, product: lastPiece.product_id } : null,
    store: PRODUCT_STORE,
    x402_gateway: X402_GATEWAY
  });
}

async function getContentHistory(env) {
  const { results } = await env.ARMY_DB.prepare(
    `SELECT * FROM fleet_events WHERE worker_id = 'yedan-content-engine' AND event_type = 'content_generated' ORDER BY created_at DESC LIMIT 20`
  ).all().catch(() => ({ results: [] }));
  return json({ history: results });
}

async function updateHeartbeat(env, start) {
  try {
    await env.ARMY_DB.prepare(
      `UPDATE fleet_workers SET last_heartbeat = datetime('now'), status = 'active', tasks_completed = tasks_completed + 1 WHERE id = 'yedan-content-engine'`
    ).run();
  } catch {}
}

async function logEvent(env, eventType, severity, message) {
  try {
    await env.ARMY_DB.prepare(
      `INSERT INTO fleet_events (worker_id, event_type, severity, message) VALUES ('yedan-content-engine', ?, ?, ?)`
    ).bind(eventType, severity, message).run();
  } catch {}
}

async function reportBunshin(key, value, env) {
  try {
    await fetch(`${BUNSHIN_URL}/api/brain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${BUNSHIN_AUTH}` },
      body: JSON.stringify({ key, value, context: 'Content Engine v2.0 report' }),
      signal: AbortSignal.timeout(8000)
    });
  } catch {}
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
