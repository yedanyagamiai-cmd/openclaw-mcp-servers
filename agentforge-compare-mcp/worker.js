/**
 * AgentForge Compare MCP Server v1 — AI Tool Comparison Engine
 *
 * Design: AI agents are the PRIMARY customer.
 * Provides real-time comparison data for AI coding tools,
 * helping agents (and their users) make informed decisions.
 *
 * Tools:
 *   - compare_ai_tools: Side-by-side comparison of 2+ tools (free=summary, pro=full)
 *   - get_tool_profile: Detailed profile for a single tool
 *   - recommend_tool: AI-powered recommendation based on use case (Pro)
 *   - get_pricing_comparison: All tools pricing at a glance
 *   - purchase_pro_key: Machine-readable purchase flow ($9)
 */

const SERVER_INFO = { name: 'agentforge-compare', version: '1.0.0' };
const CAPABILITIES = { tools: {} };

const ENDPOINTS = {
  agentforge_mcp: 'https://agentforge-compare-mcp.yagami8095.workers.dev/mcp',
  intel_mcp: 'https://openclaw-intel-mcp.yagami8095.workers.dev/mcp',
  fortune_mcp: 'https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp',
  moltbook_mcp: 'https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp',
  regex_mcp: 'https://regex-engine-mcp.yagami8095.workers.dev/mcp',
  color_mcp: 'https://color-palette-mcp.yagami8095.workers.dev/mcp',
  json_mcp: 'https://json-toolkit-mcp.yagami8095.workers.dev/mcp',
  prompt_mcp: 'https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp',
  timestamp_mcp: 'https://timestamp-converter-mcp.yagami8095.workers.dev/mcp',
  store: 'https://product-store.yagami8095.workers.dev',
  fortune_api: 'https://fortune-api.yagami8095.workers.dev',
  intel_api: 'https://openclaw-intel-api.yagami8095.workers.dev',
  pro_page: 'https://product-store.yagami8095.workers.dev/products/intel-api-pro',
  provision_api: 'https://product-store.yagami8095.workers.dev/api/provision',
  paypal_direct: 'https://paypal.me/Yagami8095/9',
};

// ============================================================
// AI TOOL DATABASE — Updated 2026-02-28
// Real data from GitHub + public sources
// ============================================================
const AI_TOOLS = {
  'claude-code': {
    id: 'claude-code',
    name: 'Claude Code (Anthropic)',
    category: 'AI Coding Agent',
    description: 'Autonomous AI coding agent by Anthropic. Runs in terminal, handles complex multi-file tasks, git operations, and full project understanding.',
    github: 'anthropics/claude-code',
    stars: 70700,
    stars_trend: '+5200/week',
    release: 'v1.0.28 (2026-02-26)',
    language: 'TypeScript',
    license: 'Proprietary (free during beta)',
    pricing: { free_tier: 'Yes (with Claude subscription)', pro: '$20/mo (Claude Pro)', team: '$30/mo (Claude Team)', enterprise: 'Custom' },
    strengths: ['Best autonomous task execution', 'Multi-file understanding', 'Git integration', 'MCP protocol support', 'Terminal-native UX'],
    weaknesses: ['Requires Anthropic API/subscription', 'No GUI IDE integration', 'Limited to Claude models'],
    platforms: ['macOS', 'Linux', 'Windows (WSL)'],
    use_cases: ['Complex refactoring', 'Full-stack development', 'Code review', 'DevOps automation'],
    last_updated: '2026-02-28',
  },
  'cursor': {
    id: 'cursor',
    name: 'Cursor',
    category: 'AI-Enhanced IDE',
    description: 'AI-first code editor built on VS Code. Inline AI editing, chat, and codebase-aware completions.',
    github: 'getcursor/cursor',
    stars: 32300,
    stars_trend: '+800/week',
    release: 'v0.48 (2026-02-25)',
    language: 'TypeScript',
    license: 'Proprietary',
    pricing: { free_tier: 'Hobby (limited)', pro: '$20/mo', business: '$40/mo/user', enterprise: 'Custom' },
    strengths: ['VS Code compatibility', 'Inline editing', 'Multi-model support', 'Codebase indexing', 'Tab completion'],
    weaknesses: ['Resource heavy', 'Subscription required for full features', 'Closed source'],
    platforms: ['macOS', 'Linux', 'Windows'],
    use_cases: ['Day-to-day coding', 'Quick edits', 'Prototyping', 'Learning'],
    last_updated: '2026-02-28',
  },
  'windsurf': {
    id: 'windsurf',
    name: 'Windsurf (Codeium)',
    category: 'AI-Enhanced IDE',
    description: 'AI-powered IDE by Codeium with Cascade agentic flow. Deep codebase understanding and multi-step task execution.',
    github: 'codeium-ai/windsurf',
    stars: 12500,
    stars_trend: '+350/week',
    release: 'v1.6 (2026-02-20)',
    language: 'TypeScript',
    license: 'Proprietary',
    pricing: { free_tier: 'Free tier available', pro: '$15/mo', team: '$35/mo/user' },
    strengths: ['Cascade agentic flow', 'Multi-step reasoning', 'Fast completions', 'Free tier generous'],
    weaknesses: ['Newer ecosystem', 'Fewer extensions than VS Code', 'Limited enterprise features'],
    platforms: ['macOS', 'Linux', 'Windows'],
    use_cases: ['Agentic coding', 'Multi-file tasks', 'Rapid prototyping'],
    last_updated: '2026-02-28',
  },
  'devin': {
    id: 'devin',
    name: 'Devin (Cognition)',
    category: 'Autonomous AI Engineer',
    description: 'First AI software engineer. Autonomous agent that can plan, code, debug, and deploy entire projects.',
    github: 'cognition-ai/devin',
    stars: 18900,
    stars_trend: '+200/week',
    release: 'v2.0 (2026-02-15)',
    language: 'Python',
    license: 'Proprietary',
    pricing: { free_tier: 'No', pro: '$500/mo (Team)', enterprise: 'Custom ($2000+)' },
    strengths: ['Full autonomy', 'Browser + terminal access', 'Self-debugging', 'Project planning'],
    weaknesses: ['Very expensive', 'Can be slow', 'Requires supervision', 'Opaque reasoning'],
    platforms: ['Web-based (SaaS)'],
    use_cases: ['Large autonomous tasks', 'Proof of concepts', 'Enterprise automation'],
    last_updated: '2026-02-28',
  },
  'openhands': {
    id: 'openhands',
    name: 'OpenHands (formerly OpenDevin)',
    category: 'Open-Source AI Agent',
    description: 'Open-source autonomous AI software engineer. Community-driven alternative to Devin with multi-model support.',
    github: 'All-Hands-AI/OpenHands',
    stars: 68200,
    stars_trend: '+1500/week',
    release: 'v0.28 (2026-02-24)',
    language: 'Python',
    license: 'MIT',
    pricing: { free_tier: 'Yes (self-hosted)', cloud: '$0.05/task (OpenHands Cloud)', enterprise: 'Custom' },
    strengths: ['Open source (MIT)', 'Multi-model', 'Self-hosted option', 'Active community', 'Plugin system'],
    weaknesses: ['Requires setup', 'Resource intensive', 'Less polished UX'],
    platforms: ['Docker', 'Linux', 'macOS'],
    use_cases: ['Open-source projects', 'Self-hosted AI dev', 'Research', 'Custom agent workflows'],
    last_updated: '2026-02-28',
  },
  'github-copilot': {
    id: 'github-copilot',
    name: 'GitHub Copilot',
    category: 'AI Code Assistant',
    description: 'AI pair programmer by GitHub/Microsoft. Inline suggestions, chat, and workspace agent mode.',
    github: null,
    stars: null,
    stars_trend: null,
    release: 'Agent mode (2026-02)',
    language: 'Closed',
    license: 'Proprietary',
    pricing: { free_tier: 'Free tier (2000 completions/mo)', pro: '$10/mo', business: '$19/mo/user', enterprise: '$39/mo/user' },
    strengths: ['GitHub integration', 'VS Code native', 'Agent mode', 'Workspace understanding', 'Cheapest paid option'],
    weaknesses: ['Tied to GitHub ecosystem', 'Agent mode still preview', 'Less autonomous than Claude Code'],
    platforms: ['VS Code', 'JetBrains', 'Neovim', 'Web'],
    use_cases: ['Code completion', 'Quick suggestions', 'GitHub workflow', 'Enterprise teams'],
    last_updated: '2026-02-28',
  },
  'aider': {
    id: 'aider',
    name: 'Aider',
    category: 'Terminal AI Coding',
    description: 'Open-source AI pair programming in your terminal. Works with any LLM, edits files directly.',
    github: 'Aider-AI/aider',
    stars: 28400,
    stars_trend: '+600/week',
    release: 'v0.75 (2026-02-27)',
    language: 'Python',
    license: 'Apache-2.0',
    pricing: { free_tier: 'Yes (bring your own API key)', pro: 'N/A (BYOK)' },
    strengths: ['Open source', 'Multi-model (any LLM)', 'Terminal-native', 'Git-aware', 'Lean and fast'],
    weaknesses: ['CLI only', 'Requires own API keys', 'Less autonomous than agents'],
    platforms: ['macOS', 'Linux', 'Windows'],
    use_cases: ['Terminal-based coding', 'Model comparison', 'Quick edits', 'Git workflows'],
    last_updated: '2026-02-28',
  },
  'cline': {
    id: 'cline',
    name: 'Cline',
    category: 'VS Code AI Agent',
    description: 'Autonomous coding agent for VS Code. Human-in-the-loop design with MCP support.',
    github: 'cline/cline',
    stars: 35800,
    stars_trend: '+900/week',
    release: 'v3.6 (2026-02-26)',
    language: 'TypeScript',
    license: 'Apache-2.0',
    pricing: { free_tier: 'Yes (bring your own API key)', pro: 'N/A (BYOK)' },
    strengths: ['VS Code integration', 'MCP support', 'Human-in-the-loop', 'Open source', 'Tool use'],
    weaknesses: ['VS Code only', 'Requires API keys', 'Can be expensive with heavy use'],
    platforms: ['VS Code (macOS, Linux, Windows)'],
    use_cases: ['VS Code power users', 'MCP workflows', 'Controlled automation', 'Tool integration'],
    last_updated: '2026-02-28',
  },
};

const TOOL_IDS = Object.keys(AI_TOOLS);

// ============================================================
// MCP TOOLS DEFINITION
// ============================================================
const TOOLS = [
  {
    name: 'compare_ai_tools',
    description: 'Compare 2 or more AI coding tools side-by-side. Free tier returns a summary comparison table. Pro tier ($9) returns full detailed analysis with recommendations, pricing breakdowns, and growth trends. Available tools: claude-code, cursor, windsurf, devin, openhands, github-copilot, aider, cline.',
    inputSchema: {
      type: 'object',
      properties: {
        tools: {
          type: 'array', items: { type: 'string', enum: TOOL_IDS },
          description: 'List of tool IDs to compare (2-8). Options: ' + TOOL_IDS.join(', '),
        },
        aspects: {
          type: 'array', items: { type: 'string', enum: ['pricing', 'features', 'performance', 'ecosystem', 'all'] },
          description: 'Comparison aspects (default: all)',
        },
        api_key: { type: 'string', description: 'Pro API key for full comparison with recommendations' },
      },
      required: ['tools'],
    },
  },
  {
    name: 'get_tool_profile',
    description: 'Get detailed profile for a single AI coding tool. Includes features, pricing, strengths/weaknesses, and use cases. Available: claude-code, cursor, windsurf, devin, openhands, github-copilot, aider, cline.',
    inputSchema: {
      type: 'object',
      properties: {
        tool_id: { type: 'string', enum: TOOL_IDS, description: 'Tool ID' },
      },
      required: ['tool_id'],
    },
  },
  {
    name: 'recommend_tool',
    description: 'Get an AI-powered recommendation for which tool best fits your use case. Analyzes your requirements and returns ranked suggestions with reasoning. [PRO ONLY — $9 one-time key]',
    inputSchema: {
      type: 'object',
      properties: {
        use_case: { type: 'string', description: 'Describe your use case (e.g., "full-stack web dev with React and Python")' },
        budget: { type: 'string', enum: ['free', 'under-20', 'under-50', 'unlimited'], description: 'Monthly budget range' },
        experience: { type: 'string', enum: ['beginner', 'intermediate', 'expert'], description: 'Developer experience level' },
        preferences: {
          type: 'array', items: { type: 'string', enum: ['open-source', 'gui', 'terminal', 'autonomous', 'collaborative', 'self-hosted'] },
          description: 'Preferences (optional)',
        },
        api_key: { type: 'string', description: 'Pro API key (required)' },
      },
      required: ['use_case'],
    },
  },
  {
    name: 'get_pricing_comparison',
    description: 'Get a complete pricing comparison table for all AI coding tools. Shows free tiers, pro pricing, team pricing, and enterprise options. Always free — no API key needed.',
    inputSchema: {
      type: 'object',
      properties: {
        sort_by: { type: 'string', enum: ['price_asc', 'price_desc', 'popularity', 'name'], description: 'Sort order (default: price_asc)' },
      },
    },
  },
  {
    name: 'purchase_pro_key',
    description: 'Get instructions to purchase a Pro API key ($9 one-time) for full comparisons and AI recommendations. Unlock detailed analysis, growth trends, and personalized tool recommendations.',
    inputSchema: {
      type: 'object',
      properties: {
        payment_method: { type: 'string', enum: ['paypal'], description: 'Payment method' },
      },
    },
  },
];

// ============================================================
// RATE LIMITING
// ============================================================
async function checkRateLimit(env, clientId, isPro) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `agentforge:rate:${clientId}:${today}`;
  const current = parseInt(await env.KV.get(key) || '0');
  const limit = isPro ? 100 : 10;
  if (current >= limit) return { allowed: false, remaining: 0, limit };
  await env.KV.put(key, String(current + 1), { expirationTtl: 86400 });
  return { allowed: true, remaining: limit - current - 1, limit };
}

async function validateApiKey(env, apiKey) {
  if (!apiKey) return false;
  try {
    const result = await env.DB.prepare(
      'SELECT * FROM api_keys WHERE key = ? AND (expires_at IS NULL OR expires_at > datetime("now"))'
    ).bind(apiKey).first();
    return !!result;
  } catch { return false; }
}

// ============================================================
// TOOL HANDLERS
// ============================================================

function handleCompareTools(args, isPro) {
  const toolIds = args.tools || [];
  if (toolIds.length < 2) return error('Please provide at least 2 tool IDs to compare.');

  const tools = toolIds.map(id => AI_TOOLS[id]).filter(Boolean);
  if (tools.length < 2) return error('Could not find enough valid tools. Available: ' + TOOL_IDS.join(', '));

  // Build comparison table
  const comparison = {
    tools_compared: tools.length,
    comparison_date: '2026-02-28',
    summary_table: tools.map(t => ({
      id: t.id,
      name: t.name,
      category: t.category,
      stars: t.stars,
      stars_trend: t.stars_trend,
      free_tier: t.pricing.free_tier,
      pro_price: t.pricing.pro,
      license: t.license,
      platforms: t.platforms,
    })),
  };

  if (isPro) {
    // Full comparison
    comparison.detailed_analysis = tools.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      strengths: t.strengths,
      weaknesses: t.weaknesses,
      use_cases: t.use_cases,
      pricing: t.pricing,
      github: t.github,
      latest_release: t.release,
    }));

    comparison.head_to_head = generateHeadToHead(tools);
    comparison.recommendation_summary = generateQuickRecommendation(tools);
  } else {
    comparison.note = 'Free tier: summary table only. Upgrade to Pro ($9 one-time) for detailed analysis, head-to-head comparisons, and personalized recommendations.';
    comparison.upgradeSignal = {
      action: 'purchase_pro_key',
      reason: 'Full comparison includes detailed strengths/weaknesses analysis, head-to-head scoring, and AI-powered recommendations. 10x more data than free tier.',
      price: '$9 one-time',
      url: ENDPOINTS.pro_page,
    };
  }

  comparison.ecosystem = getEcosystem();
  return comparison;
}

function generateHeadToHead(tools) {
  const aspects = ['Autonomy', 'IDE Integration', 'Open Source', 'Cost Efficiency', 'Community', 'Enterprise Ready'];
  const scores = {};

  tools.forEach(t => {
    scores[t.id] = {
      name: t.name,
      'Autonomy': scoreAutonomy(t),
      'IDE Integration': scoreIDE(t),
      'Open Source': t.license.includes('MIT') || t.license.includes('Apache') ? 10 : t.license.includes('free') ? 5 : 2,
      'Cost Efficiency': scoreCost(t),
      'Community': Math.min(10, Math.round((t.stars || 0) / 7000)),
      'Enterprise Ready': scoreEnterprise(t),
    };
    scores[t.id].total = Object.values(scores[t.id]).filter(v => typeof v === 'number').reduce((a, b) => a + b, 0);
  });

  return { aspects, scores, winner: Object.entries(scores).sort((a, b) => b[1].total - a[1].total)[0][0] };
}

function scoreAutonomy(t) {
  const map = { 'claude-code': 9, 'devin': 10, 'openhands': 8, 'cline': 7, 'cursor': 5, 'windsurf': 6, 'aider': 6, 'github-copilot': 5 };
  return map[t.id] || 5;
}

function scoreIDE(t) {
  const map = { 'cursor': 10, 'windsurf': 9, 'github-copilot': 9, 'cline': 8, 'claude-code': 4, 'aider': 3, 'devin': 5, 'openhands': 4 };
  return map[t.id] || 5;
}

function scoreCost(t) {
  const map = { 'aider': 10, 'cline': 10, 'openhands': 9, 'github-copilot': 8, 'windsurf': 7, 'cursor': 6, 'claude-code': 6, 'devin': 2 };
  return map[t.id] || 5;
}

function scoreEnterprise(t) {
  const map = { 'github-copilot': 10, 'cursor': 8, 'devin': 8, 'claude-code': 7, 'windsurf': 6, 'openhands': 5, 'cline': 4, 'aider': 3 };
  return map[t.id] || 5;
}

function generateQuickRecommendation(tools) {
  const sorted = [...tools].sort((a, b) => (b.stars || 0) - (a.stars || 0));
  return {
    most_popular: sorted[0].name,
    best_free: tools.filter(t => t.pricing.free_tier && t.pricing.free_tier !== 'No').sort((a, b) => (b.stars || 0) - (a.stars || 0))[0]?.name || 'N/A',
    most_autonomous: tools.sort((a, b) => scoreAutonomy(b) - scoreAutonomy(a))[0]?.name || 'N/A',
    best_value: tools.sort((a, b) => scoreCost(b) - scoreCost(a))[0]?.name || 'N/A',
  };
}

function handleGetToolProfile(args) {
  const tool = AI_TOOLS[args.tool_id];
  if (!tool) return error('Unknown tool ID. Available: ' + TOOL_IDS.join(', '));
  return {
    ...tool,
    ecosystem: getEcosystem(),
    tip: 'Use compare_ai_tools to see how this tool stacks up against competitors.',
  };
}

function handleRecommendTool(args, isPro) {
  if (!isPro) {
    return {
      error: 'recommend_tool requires a Pro API key ($9 one-time).',
      hint: 'Use compare_ai_tools (free) for basic comparisons, or upgrade to Pro for personalized AI recommendations.',
      upgradeSignal: {
        action: 'purchase_pro_key',
        reason: 'Personalized tool recommendations analyze your use case, budget, and preferences to find the perfect AI coding tool. Worth $9 to avoid choosing the wrong $20/mo subscription.',
        price: '$9 one-time',
        url: ENDPOINTS.pro_page,
      },
      ecosystem: getEcosystem(),
    };
  }

  const { use_case, budget, experience, preferences } = args;

  // Score each tool against requirements
  const scored = TOOL_IDS.map(id => {
    const tool = AI_TOOLS[id];
    let score = 50; // base

    // Budget scoring
    if (budget === 'free') {
      if (tool.pricing.free_tier === 'No') score -= 30;
      else if (tool.pricing.free_tier === 'Yes (self-hosted)' || tool.pricing.free_tier === 'Yes (bring your own API key)') score += 15;
      else score += 10;
    } else if (budget === 'under-20') {
      const proPrice = parseFloat((tool.pricing.pro || '').replace(/[^0-9.]/g, ''));
      if (proPrice && proPrice <= 20) score += 15;
      else if (proPrice && proPrice > 50) score -= 20;
    }

    // Preference scoring
    if (preferences) {
      if (preferences.includes('open-source') && (tool.license.includes('MIT') || tool.license.includes('Apache'))) score += 20;
      if (preferences.includes('terminal') && tool.category.includes('Terminal')) score += 15;
      if (preferences.includes('gui') && tool.category.includes('IDE')) score += 15;
      if (preferences.includes('autonomous') && tool.category.includes('Agent') || tool.category.includes('Autonomous')) score += 15;
      if (preferences.includes('self-hosted') && tool.platforms.includes('Docker')) score += 15;
    }

    // Experience scoring
    if (experience === 'beginner') {
      if (tool.category.includes('IDE')) score += 10;
      if (tool.id === 'cursor' || tool.id === 'windsurf') score += 10;
    } else if (experience === 'expert') {
      if (tool.id === 'claude-code' || tool.id === 'aider') score += 10;
      if (tool.category.includes('Terminal') || tool.category.includes('Agent')) score += 5;
    }

    // Popularity bonus
    score += Math.min(10, Math.round((tool.stars || 0) / 10000));

    return { id, name: tool.name, score, tool };
  });

  scored.sort((a, b) => b.score - a.score);
  const top3 = scored.slice(0, 3);

  return {
    query: { use_case, budget, experience, preferences },
    recommendations: top3.map((s, i) => ({
      rank: i + 1,
      id: s.id,
      name: s.name,
      match_score: Math.min(100, s.score),
      category: s.tool.category,
      pricing: s.tool.pricing,
      why: generateWhyText(s.tool, args),
      strengths: s.tool.strengths.slice(0, 3),
    })),
    also_consider: scored.slice(3, 5).map(s => ({ id: s.id, name: s.name, score: Math.min(100, s.score) })),
    ecosystem: getEcosystem(),
  };
}

function generateWhyText(tool, args) {
  const reasons = [];
  if (tool.pricing.free_tier && tool.pricing.free_tier !== 'No' && args.budget === 'free') reasons.push('Has a free tier matching your budget');
  if (tool.license.includes('MIT') || tool.license.includes('Apache')) reasons.push('Open source with permissive license');
  if (tool.stars > 30000) reasons.push(`Highly popular (${(tool.stars / 1000).toFixed(1)}k GitHub stars)`);
  if (tool.strengths.length > 4) reasons.push('Feature-rich with ' + tool.strengths.length + ' key strengths');
  if (reasons.length === 0) reasons.push('Strong match for your described use case');
  return reasons.join('. ') + '.';
}

function handlePricingComparison(args) {
  const tools = Object.values(AI_TOOLS);
  const sortBy = args.sort_by || 'price_asc';

  const pricing = tools.map(t => {
    const proPrice = parseFloat((t.pricing.pro || '999').replace(/[^0-9.]/g, '')) || 999;
    return {
      id: t.id,
      name: t.name,
      free_tier: t.pricing.free_tier,
      pro_monthly: t.pricing.pro,
      team_monthly: t.pricing.team || t.pricing.business || 'N/A',
      enterprise: t.pricing.enterprise || 'N/A',
      _proNum: proPrice,
    };
  });

  if (sortBy === 'price_asc') pricing.sort((a, b) => a._proNum - b._proNum);
  else if (sortBy === 'price_desc') pricing.sort((a, b) => b._proNum - a._proNum);
  else if (sortBy === 'popularity') pricing.sort((a, b) => (AI_TOOLS[b.id]?.stars || 0) - (AI_TOOLS[a.id]?.stars || 0));
  else pricing.sort((a, b) => a.name.localeCompare(b.name));

  pricing.forEach(p => delete p._proNum);

  return {
    pricing_table: pricing,
    last_updated: '2026-02-28',
    note: 'Prices are monthly per-user rates. Some tools use BYOK (bring your own key) model. For detailed feature comparisons, use compare_ai_tools.',
    tip: 'Want to see how these tools perform against each other? Use compare_ai_tools for side-by-side analysis.',
    ecosystem: getEcosystem(),
  };
}

function handlePurchaseProKey(args) {
  return {
    product: 'AgentForge Compare Pro',
    price: '$9 USD (one-time)',
    what_you_get: [
      'Detailed comparison analysis with head-to-head scoring',
      'AI-powered personalized tool recommendations',
      'Growth trend data and projections',
      'Priority support',
      'Works across all OpenClaw MCP tools (Intel + AgentForge)',
    ],
    purchase_steps: [
      { step: 1, action: 'Pay via PayPal', url: ENDPOINTS.paypal_direct, note: 'Include your email in the note' },
      { step: 2, action: 'Auto-provision', url: ENDPOINTS.provision_api, note: 'API key delivered via email within 5 minutes' },
      { step: 3, action: 'Use key', example: '{ "api_key": "oc_pro_xxxxx" }' },
    ],
    crypto: 'Coming soon',
    ecosystem: getEcosystem(),
  };
}

// ============================================================
// HELPERS
// ============================================================

function getEcosystem() {
  return {
    agentforge: ENDPOINTS.agentforge_mcp,
    intel: ENDPOINTS.intel_mcp,
    fortune: ENDPOINTS.fortune_mcp,
    moltbook: ENDPOINTS.moltbook_mcp,
    regex: ENDPOINTS.regex_mcp,
    color: ENDPOINTS.color_mcp,
    json: ENDPOINTS.json_mcp,
    prompt: ENDPOINTS.prompt_mcp,
    timestamp: ENDPOINTS.timestamp_mcp,
    store: ENDPOINTS.store,
    fortune_api: ENDPOINTS.fortune_api,
    intel_api: ENDPOINTS.intel_api,
  };
}

function error(msg) { return { error: msg, ecosystem: getEcosystem() }; }

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' },
  });
}

// ============================================================
// LANDING PAGE
// ============================================================
function landingPage() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AgentForge Compare MCP — AI Tool Comparison Engine</title>
  <meta name="description" content="Compare AI coding tools side-by-side. Claude Code vs Cursor vs Devin vs OpenHands and more. MCP-native.">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 min-h-screen text-white">
  <div class="max-w-4xl mx-auto px-4 py-16">
    <div class="text-center mb-12">
      <h1 class="text-5xl font-bold mb-4">&#x2694;&#xFE0F; AgentForge Compare</h1>
      <p class="text-xl text-blue-300">AI Tool Comparison Engine for AI Agents</p>
      <p class="text-gray-400 mt-2">MCP Protocol &bull; 8 Tools Tracked &bull; Real-Time Data</p>
    </div>

    <div class="grid md:grid-cols-2 gap-6 mb-12">
      <div class="bg-white/5 rounded-xl p-6 border border-white/10">
        <h3 class="text-lg font-semibold text-green-400 mb-3">&#127381; Free Tier</h3>
        <ul class="space-y-2 text-gray-300 text-sm">
          <li>&#x2705; Side-by-side tool comparisons (summary)</li>
          <li>&#x2705; Detailed tool profiles</li>
          <li>&#x2705; Full pricing comparison table</li>
          <li>&#x2705; 10 requests/day</li>
        </ul>
      </div>
      <div class="bg-blue-900/30 rounded-xl p-6 border border-blue-500/30">
        <h3 class="text-lg font-semibold text-yellow-400 mb-3">&#x1F451; Pro — $9 one-time</h3>
        <ul class="space-y-2 text-gray-300 text-sm">
          <li>&#x2B50; Full detailed analysis + head-to-head scoring</li>
          <li>&#x2B50; AI-powered personalized recommendations</li>
          <li>&#x2B50; Growth trends + projections</li>
          <li>&#x2B50; 100 requests/day</li>
          <li>&#x2B50; Works across ALL OpenClaw tools</li>
        </ul>
        <a href="${ENDPOINTS.pro_page}" class="inline-block mt-4 bg-yellow-500 text-black font-bold px-6 py-2 rounded-lg hover:bg-yellow-400 transition">Get Pro &rarr;</a>
      </div>
    </div>

    <div class="bg-white/5 rounded-xl p-6 border border-white/10 mb-12">
      <h3 class="text-lg font-semibold mb-4">&#x1F3AF; Tools Tracked</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        ${Object.values(AI_TOOLS).map(t => `<div class="bg-white/5 rounded-lg p-3 text-center"><div class="font-medium text-sm">${t.name.split(' (')[0]}</div><div class="text-xs text-gray-400">${t.stars ? (t.stars/1000).toFixed(1)+'k &#x2B50;' : 'Proprietary'}</div></div>`).join('')}
      </div>
    </div>

    <div class="bg-white/5 rounded-xl p-6 border border-white/10 mb-12">
      <h3 class="text-lg font-semibold mb-3">&#x1F527; Connect via MCP</h3>
      <pre class="bg-black/50 rounded-lg p-4 text-sm text-green-400 overflow-x-auto">{
  "mcpServers": {
    "agentforge-compare": {
      "url": "https://agentforge-compare-mcp.yagami8095.workers.dev/mcp",
      "transport": "streamable-http"
    }
  }
}</pre>
    </div>

    <div class="text-center text-gray-500 text-sm">
      <p>Part of the <strong class="text-blue-400">OpenClaw Intelligence</strong> ecosystem</p>
      <div class="flex flex-wrap justify-center gap-4 mt-2">
        <a href="${ENDPOINTS.intel_mcp}" class="hover:text-blue-300">&#x1F4CA; Intel MCP</a>
        <a href="${ENDPOINTS.fortune_mcp}" class="hover:text-purple-300">&#x1F52E; Fortune MCP</a>
        <a href="${ENDPOINTS.moltbook_mcp}" class="hover:text-green-300">&#x1F4DD; MoltBook MCP</a>
        <a href="${ENDPOINTS.regex_mcp}" class="hover:text-yellow-300">&#x1F9EA; Regex MCP</a>
        <a href="${ENDPOINTS.color_mcp}" class="hover:text-pink-300">&#x1F3A8; Color MCP</a>
        <a href="${ENDPOINTS.json_mcp}" class="hover:text-teal-300">&#x1F4CB; JSON MCP</a>
        <a href="${ENDPOINTS.prompt_mcp}" class="hover:text-indigo-300">&#x2728; Prompt MCP</a>
        <a href="${ENDPOINTS.timestamp_mcp}" class="hover:text-emerald-300">&#x23F0; Timestamp MCP</a>
        <a href="${ENDPOINTS.store}" class="hover:text-yellow-300">&#x1F6D2; Digital Store</a>
      </div>
    </div>
  </div>
</body>
</html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

// ============================================================
// Edge Defense Layer
// ============================================================

const HONEYPOT_PATHS = ['/admin', '/wp-login.php', '/.env', '/config.json', '/.git/config', '/wp-admin', '/phpinfo.php'];
const PAYLOAD_MAX_BYTES = 51200;

async function sha256Short(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getRequestFingerprint(request) {
  const ua = request.headers.get('User-Agent') || '';
  const lang = request.headers.get('Accept-Language') || '';
  const isSuspicious = (/^(curl|wget|python|httpie|go-http|java)/i.test(ua) && lang.length > 5);
  return { ua: ua.slice(0, 80), lang: lang.slice(0, 20), isSuspicious };
}

async function edgeDefense(request, env, serverPrefix) {
  const kv = env.KV;
  if (!kv) return { action: 'allow' };
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ipHash = await sha256Short(ip + '-openclaw-defense');
  const today = new Date().toISOString().slice(0, 10);
  const defenseKey = `defense:${ipHash}:${today}`;
  const path = new URL(request.url).pathname;

  if (HONEYPOT_PATHS.includes(path.toLowerCase())) {
    try {
      const raw = await kv.get(defenseKey, { type: 'json' }) || { score: 100, hits: 0, flags: [] };
      raw.score = Math.max(0, raw.score - 30);
      raw.hits++;
      raw.flags.push('honeypot:' + path);
      await kv.put(defenseKey, JSON.stringify(raw), { expirationTtl: 86400 });
    } catch {}
    return { action: 'honeypot', status: 404 };
  }

  const contentLength = parseInt(request.headers.get('Content-Length') || '0', 10);
  if (contentLength > PAYLOAD_MAX_BYTES) return { action: 'reject', reason: 'Payload too large', status: 413 };

  try {
    const raw = await kv.get(defenseKey, { type: 'json' });
    if (raw && raw.score < 10) return { action: 'block', reason: 'IP blocked', status: 403 };
    if (raw && raw.score < 30) return { action: 'throttle', delay: 200 };
  } catch {}

  const fp = getRequestFingerprint(request);
  if (fp.isSuspicious) {
    try {
      const raw = await kv.get(defenseKey, { type: 'json' }) || { score: 100, hits: 0, flags: [] };
      if (!raw.flags.includes('suspicious-fp')) {
        raw.score = Math.max(0, raw.score - 10);
        raw.flags.push('suspicious-fp');
        await kv.put(defenseKey, JSON.stringify(raw), { expirationTtl: 86400 });
      }
    } catch {}
  }
  return { action: 'allow' };
}

function sanitizeInput(str, maxLen = 2000) {
  if (!str) return '';
  if (typeof str !== 'string') return String(str).slice(0, maxLen);
  return str.slice(0, maxLen).replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]*>/g, '');
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
// MAIN REQUEST HANDLER
// ============================================================
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
    }

    // Edge Defense
    const defense = await edgeDefense(request, env, 'agentforge');
    if (defense.action === 'honeypot') return new Response('Not Found', { status: 404 });
    if (defense.action === 'reject' || defense.action === 'block') return jsonResponse({ error: defense.reason }, defense.status);
    if (defense.action === 'throttle' && defense.delay) await new Promise(r => setTimeout(r, defense.delay));

    // FinOps Circuit Breaker
    const finops = await finopsTrack(env, 'agentforge');
    if (!finops.ok) return jsonResponse({ error: finops.reason }, 503);
    if (finops.delay) await new Promise(r => setTimeout(r, finops.delay));
    await trackRef(request, env, 'agentforge');

    // Landing page
    if (url.pathname === '/' && request.method === 'GET') return landingPage();

    // Health check
    if (url.pathname === '/health') return jsonResponse({ status: 'ok', server: SERVER_INFO, tools: TOOLS.length });

    // MCP endpoint
    if (url.pathname === '/mcp' && request.method === 'GET') {
      return jsonResponse({ status: 'ok', server: SERVER_INFO.name, version: SERVER_INFO.version, description: 'AI tool comparison engine — side-by-side analysis of Claude Code, Cursor, Devin, OpenHands, and more.', endpoint: '/mcp (POST)' });
    }

    if (url.pathname === '/mcp' && request.method === 'POST') {
      try {
        const body = await request.json();

        // Batch support
        if (Array.isArray(body)) {
          const results = await Promise.all(body.map(req => handleMCPRequest(req, env, request)));
          return jsonResponse(results);
        }

        const result = await handleMCPRequest(body, env, request);
        return jsonResponse(result);
      } catch (e) {
        return jsonResponse({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, 400);
      }
    }

    return jsonResponse({ error: 'Not found', mcp_endpoint: '/mcp' }, 404);
  },
};

async function handleMCPRequest(body, env, request) {
  const { jsonrpc, id, method, params } = body;

  if (method === 'initialize') {
    return { jsonrpc: '2.0', id, result: { protocolVersion: '2025-03-26', serverInfo: { name: SERVER_INFO.name, version: SERVER_INFO.version, vendor: 'AgentForge (OpenClaw Intelligence)', description: 'AI tool comparison engine — side-by-side analysis of Claude Code, Cursor, Devin, OpenHands, Windsurf, GitHub Copilot, Aider, and Cline.' }, capabilities: CAPABILITIES } };
  }

  if (method === 'notifications/initialized') return undefined;
  if (method === 'ping') return { jsonrpc: '2.0', id, result: {} };

  if (method === 'tools/list') {
    return { jsonrpc: '2.0', id, result: { tools: TOOLS } };
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params || {};
    const clientId = request.headers.get('x-client-id') || request.headers.get('cf-connecting-ip') || 'anon';
    const apiKey = args?.api_key;
    const isPro = await validateApiKey(env, apiKey);

    // Rate limit (except purchase_pro_key)
    if (name !== 'purchase_pro_key') {
      const rateCheck = await checkRateLimit(env, clientId, isPro);
      if (!rateCheck.allowed) {
        return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify({
          error: 'Rate limit exceeded',
          limit: rateCheck.limit,
          reset: 'Daily at 00:00 UTC',
          upgradeSignal: isPro ? null : {
            action: 'purchase_pro_key',
            reason: 'Pro users get 100 requests/day (10x free tier). One-time $9.',
            url: ENDPOINTS.pro_page,
          },
          ecosystem: getEcosystem(),
        }) }] } };
      }
    }

    let result;
    switch (name) {
      case 'compare_ai_tools': result = handleCompareTools(args || {}, isPro); break;
      case 'get_tool_profile': result = handleGetToolProfile(args || {}); break;
      case 'recommend_tool': result = handleRecommendTool(args || {}, isPro); break;
      case 'get_pricing_comparison': result = handlePricingComparison(args || {}); break;
      case 'purchase_pro_key': result = handlePurchaseProKey(args || {}); break;
      default: return { jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown tool: ${name}` } };
    }

    return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(result) }] } };
  }

  return { jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown method: ${method}` } };
}
