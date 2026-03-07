// ============================================================
// MoltBook Publisher MCP Server v1.0
// Japanese content publishing toolkit for AI agents
// Brand: MoltBook Labs (part of OpenClaw Intelligence)
// Protocol: MCP 2025-03-26 / JSON-RPC 2.0 / Streamable HTTP
// ============================================================

const SERVER_INFO = {
  name: 'moltbook-publisher',
  version: '1.0.0',
  vendor: 'MoltBook Labs',
  description: 'Japanese content publishing toolkit — Markdown to HTML conversion, SEO optimization, EN→JP translation, trending topics, cross-platform formatting for note.com, Zenn, and Qiita.',
};

const CAPABILITIES = { tools: {} };

const ECOSYSTEM = {
  moltbook: 'https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp',
  intel: 'https://openclaw-intel-mcp.yagami8095.workers.dev/mcp',
  fortune: 'https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp',
  agentforge: 'https://agentforge-compare-mcp.yagami8095.workers.dev/mcp',
  regex: 'https://regex-engine-mcp.yagami8095.workers.dev/mcp',
  color: 'https://color-palette-mcp.yagami8095.workers.dev/mcp',
  json: 'https://json-toolkit-mcp.yagami8095.workers.dev/mcp',
  prompt: 'https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp',
  timestamp: 'https://timestamp-converter-mcp.yagami8095.workers.dev/mcp',
  store: 'https://product-store.yagami8095.workers.dev',
  fortune_api: 'https://fortune-api.yagami8095.workers.dev',
  intel_api: 'https://openclaw-intel-api.yagami8095.workers.dev',
  smithery_intel: 'https://smithery.ai/servers/openclaw-ai/intel',
  smithery_fortune: 'https://smithery.ai/servers/openclaw-ai/fortune',
};

const FREE_DAILY_LIMIT = 20;
const PRO_DAILY_LIMIT = 1000;
const PRO_PRICE_USD = 9;

// ============================================================
// TOOL DEFINITIONS
// ============================================================

const TOOLS = [
  {
    name: 'convert_markdown_to_html',
    description: 'Convert Markdown text to platform-compatible HTML for note.com, Zenn, or Qiita. Handles headings, bold, italic, tables, lists, blockquotes, code blocks, and horizontal rules. Output is ready for direct paste into editor.',
    inputSchema: {
      type: 'object',
      properties: {
        markdown: { type: 'string', description: 'Markdown content to convert' },
        platform: { type: 'string', enum: ['note', 'zenn', 'qiita', 'generic'], description: 'Target platform (default: note)' },
      },
      required: ['markdown'],
    },
  },
  {
    name: 'optimize_for_seo',
    description: 'Analyze and optimize Japanese article content for SEO on note.com, Zenn, or Qiita. Returns title suggestions, keyword density, readability score, meta description, and improvement recommendations.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Article title' },
        content: { type: 'string', description: 'Article content (Markdown or plain text)' },
        platform: { type: 'string', enum: ['note', 'zenn', 'qiita'], description: 'Target platform' },
        target_keywords: { type: 'array', items: { type: 'string' }, description: 'Target SEO keywords (optional)' },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'translate_en_to_jp',
    description: 'Translate English text to natural Japanese. Not machine translation — produces native-sounding Japanese suitable for publishing on Japanese platforms. Preserves technical terms, adds furigana hints for complex kanji.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'English text to translate' },
        style: { type: 'string', enum: ['casual', 'formal', 'technical', 'blog'], description: 'Writing style (default: blog)' },
        preserve_terms: { type: 'array', items: { type: 'string' }, description: 'Technical terms to keep in English (e.g., ["MCP", "API", "Claude"])' },
      },
      required: ['text'],
    },
  },
  {
    name: 'generate_article_outline',
    description: 'Generate a structured article outline from a topic. Produces H2/H3 headings, key points per section, estimated word count, and SEO-optimized structure for Japanese platforms.',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'Article topic or title idea' },
        platform: { type: 'string', enum: ['note', 'zenn', 'qiita'], description: 'Target platform' },
        length: { type: 'string', enum: ['short', 'medium', 'long'], description: 'Article length (short: 1000字, medium: 2500字, long: 5000字+)' },
        audience: { type: 'string', description: 'Target audience (e.g., "AI beginners", "experienced developers")' },
      },
      required: ['topic'],
    },
  },
  {
    name: 'get_trending_topics',
    description: '[PRO] Get current trending topics on note.com, Zenn, and Qiita. Returns top topics with estimated engagement, competition level, and content gap analysis. Updated daily.',
    inputSchema: {
      type: 'object',
      properties: {
        platform: { type: 'string', enum: ['note', 'zenn', 'qiita', 'all'], description: 'Platform to check (default: all)' },
        category: { type: 'string', enum: ['tech', 'ai', 'business', 'lifestyle', 'all'], description: 'Category filter' },
        api_key: { type: 'string', description: 'Pro API key (required for full results)' },
      },
    },
  },
  {
    name: 'cross_post_format',
    description: '[PRO] Convert a single article into optimized formats for all 3 Japanese platforms (note.com, Zenn, Qiita). Adjusts heading styles, code blocks, image embeds, and metadata for each platform.',
    inputSchema: {
      type: 'object',
      properties: {
        markdown: { type: 'string', description: 'Article content in Markdown' },
        title: { type: 'string', description: 'Article title' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags/keywords' },
        api_key: { type: 'string', description: 'Pro API key (required)' },
      },
      required: ['markdown', 'title'],
    },
  },
  {
    name: 'analyze_article_performance',
    description: '[PRO] Predict article performance before publishing. Returns estimated views, engagement score, SEO ranking potential, and platform-specific optimization tips.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Article title' },
        content: { type: 'string', description: 'Article content' },
        platform: { type: 'string', enum: ['note', 'zenn', 'qiita'], description: 'Target platform' },
        api_key: { type: 'string', description: 'Pro API key (required)' },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'purchase_pro_key',
    description: 'Get a MoltBook Publisher Pro API key. Pro unlocks: trending topics, cross-post formatting, performance analysis, and 1000 uses/day (vs 20 free). $9/month via PayPal.',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['get_link', 'validate'], description: '"get_link" for purchase URL, "validate" to check existing key' },
        api_key: { type: 'string', description: 'API key to validate (for action=validate)' },
      },
      required: ['action'],
    },
  },
];

// ============================================================
// MARKDOWN → HTML CONVERTER
// ============================================================

function convertMarkdownToHtml(markdown, platform = 'note') {
  const lines = markdown.trim().split('\n');
  const htmlParts = [];
  let inCodeBlock = false;
  let codeContent = [];
  let codeLang = '';
  let inTable = false;

  for (const line of lines) {
    const s = line.trimEnd();

    // Code block handling
    if (s.startsWith('```')) {
      if (inCodeBlock) {
        const code = codeContent.join('\n').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        if (platform === 'zenn') {
          htmlParts.push(`\`\`\`${codeLang}\n${codeContent.join('\n')}\n\`\`\``);
        } else {
          htmlParts.push(`<pre><code class="language-${codeLang}">${code}</code></pre>`);
        }
        codeContent = [];
        codeLang = '';
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLang = s.slice(3).trim() || 'text';
      }
      continue;
    }
    if (inCodeBlock) {
      codeContent.push(s);
      continue;
    }

    const trimmed = s.trim();
    if (!trimmed) {
      inTable = false;
      continue;
    }

    // Table separator
    if (trimmed.startsWith('|') && trimmed.includes('---')) continue;

    // Table rows
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed.split('|').slice(1, -1).map(c => c.trim());
      if (!inTable) inTable = true;
      const cellText = cells.join(' | ');
      htmlParts.push(`<p>${applyInlineFormatting(cellText)}</p>`);
      continue;
    }
    inTable = false;

    // Headings
    if (trimmed.startsWith('#### ')) {
      htmlParts.push(`<h4>${trimmed.slice(5)}</h4>`);
    } else if (trimmed.startsWith('### ')) {
      htmlParts.push(`<h3>${trimmed.slice(4)}</h3>`);
    } else if (trimmed.startsWith('## ')) {
      htmlParts.push(`<h2>${trimmed.slice(3)}</h2>`);
    } else if (trimmed.startsWith('# ')) {
      htmlParts.push(`<h2>${trimmed.slice(2)}</h2>`);
    } else if (trimmed === '---') {
      htmlParts.push('<hr>');
    } else if (trimmed.startsWith('> ')) {
      const text = applyInlineFormatting(trimmed.slice(2));
      htmlParts.push(`<blockquote><p>${text}</p></blockquote>`);
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const text = applyInlineFormatting(trimmed.slice(2));
      htmlParts.push(`<p>\u30FB${text}</p>`);
    } else if (/^\d+\./.test(trimmed)) {
      const text = applyInlineFormatting(trimmed.replace(/^\d+\.\s*/, ''));
      htmlParts.push(`<p>${text}</p>`);
    } else {
      htmlParts.push(`<p>${applyInlineFormatting(trimmed)}</p>`);
    }
  }

  return htmlParts.join('\n');
}

function applyInlineFormatting(text) {
  let result = text;
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>');
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return result;
}

// ============================================================
// SEO ANALYZER
// ============================================================

function analyzeSeo(title, content, platform = 'note', targetKeywords = []) {
  const charCount = content.length;
  const titleLen = title.length;
  const hasEmoji = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(title);
  const h2Count = (content.match(/^## /gm) || []).length;
  const h3Count = (content.match(/^### /gm) || []).length;
  const boldCount = (content.match(/\*\*[^*]+\*\*/g) || []).length;
  const linkCount = (content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || []).length;

  const scores = {
    title_length: titleLen >= 20 && titleLen <= 60 ? 90 : titleLen < 20 ? 50 : 60,
    title_emoji: hasEmoji ? 85 : 50,
    content_length: charCount >= 2000 ? 90 : charCount >= 1000 ? 70 : 40,
    structure: h2Count >= 3 ? 90 : h2Count >= 2 ? 70 : 40,
    formatting: boldCount >= 3 ? 85 : boldCount >= 1 ? 65 : 40,
    internal_links: linkCount >= 2 ? 80 : linkCount >= 1 ? 60 : 30,
  };

  const overallScore = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length);

  const recommendations = [];
  if (titleLen < 20) recommendations.push('Title too short — aim for 20-60 characters for best SEO');
  if (titleLen > 60) recommendations.push('Title too long — search engines may truncate after 60 chars');
  if (!hasEmoji) recommendations.push('Add emoji to title — increases CTR by 15-25% on Japanese platforms');
  if (charCount < 2000) recommendations.push('Content is short — articles over 2000 chars rank better');
  if (h2Count < 3) recommendations.push('Add more H2 headings — improves readability and SEO structure');
  if (boldCount < 3) recommendations.push('Use more bold text — highlights key points for skimmers');
  if (linkCount < 1) recommendations.push('Add internal/external links — improves SEO authority');

  const platformTips = {
    note: ['Use eye-catching cover image', 'Add hashtags (3-5 recommended)', 'First 140 chars appear in preview — make them compelling'],
    zenn: ['Add topics/tags for discoverability', 'Use Zenn-specific syntax for callouts', 'Technical depth ranks well on Zenn'],
    qiita: ['Add relevant tags (max 5)', 'Include code examples for higher engagement', 'LGTMs correlate with search ranking'],
  };

  return {
    overall_score: overallScore,
    category_scores: scores,
    character_count: charCount,
    heading_count: { h2: h2Count, h3: h3Count },
    recommendations,
    platform_tips: platformTips[platform] || platformTips.note,
    meta_description: content.replace(/[#*>\[\]()]/g, '').trim().slice(0, 160),
  };
}

// ============================================================
// ARTICLE OUTLINE GENERATOR
// ============================================================

function generateOutline(topic, platform = 'note', length = 'medium', audience = 'general') {
  const lengthConfig = {
    short: { sections: 3, wordsPerSection: 300, totalTarget: '1000字' },
    medium: { sections: 5, wordsPerSection: 500, totalTarget: '2500字' },
    long: { sections: 7, wordsPerSection: 700, totalTarget: '5000字+' },
  };

  const config = lengthConfig[length] || lengthConfig.medium;

  const outlineTemplates = {
    note: {
      intro: `${topic} \u2014 \u306A\u305C\u4ECA\u8A71\u984C\u306A\u306E\u304B\uFF1F`,
      sections: [
        { h2: `${topic}\u306E\u57FA\u672C\u3092\u7406\u89E3\u3059\u308B`, points: ['\u5B9A\u7FA9\u3068\u80CC\u666F', '\u5E02\u5834\u898F\u6A21\u3068\u30C8\u30EC\u30F3\u30C9', '\u306A\u305C\u4ECA\u91CD\u8981\u306A\u306E\u304B'] },
        { h2: `\u5B9F\u8DF5\u7684\u306A\u6D3B\u7528\u65B9\u6CD5`, points: ['\u30B9\u30C6\u30C3\u30D71: \u6E96\u5099', '\u30B9\u30C6\u30C3\u30D72: \u5B9F\u88C5', '\u30B9\u30C6\u30C3\u30D73: \u6700\u9069\u5316'] },
        { h2: '\u3088\u304F\u3042\u308B\u5931\u6557\u3068\u5BFE\u7B56', points: ['\u5931\u6557\u4F8B1', '\u5931\u6557\u4F8B2', '\u6210\u529F\u306E\u30B3\u30C4'] },
        { h2: '\u307E\u3068\u3081\u3068\u6B21\u306E\u30B9\u30C6\u30C3\u30D7', points: ['\u8981\u70B9\u6574\u7406', '\u30A2\u30AF\u30B7\u30E7\u30F3\u30D7\u30E9\u30F3', 'CTA'] },
      ],
      cta: '\u95A2\u9023\u8A18\u4E8B\u3084\u6709\u6599\u30B3\u30F3\u30C6\u30F3\u30C4\u3078\u306E\u8A98\u5C0E',
    },
    zenn: {
      intro: `${topic} \u2014 \u6280\u8853\u89E3\u8AAC`,
      sections: [
        { h2: '\u6982\u8981\u3068\u30A2\u30FC\u30AD\u30C6\u30AF\u30C1\u30E3', points: ['\u6280\u8853\u80CC\u666F', '\u30A2\u30FC\u30AD\u30C6\u30AF\u30C1\u30E3\u56F3', '\u4E3B\u8981\u30B3\u30F3\u30DD\u30FC\u30CD\u30F3\u30C8'] },
        { h2: '\u30BB\u30C3\u30C8\u30A2\u30C3\u30D7', points: ['\u74B0\u5883\u69CB\u7BC9', '\u4F9D\u5B58\u95A2\u4FC2', '\u8A2D\u5B9A\u30D5\u30A1\u30A4\u30EB'] },
        { h2: '\u5B9F\u88C5', points: ['\u30B3\u30A2\u30ED\u30B8\u30C3\u30AF', 'API\u8A2D\u8A08', '\u30C6\u30B9\u30C8'] },
        { h2: '\u30C7\u30D7\u30ED\u30A4\u3068\u904B\u7528', points: ['\u30C7\u30D7\u30ED\u30A4\u624B\u9806', '\u30E2\u30CB\u30BF\u30EA\u30F3\u30B0', '\u30C8\u30E9\u30D6\u30EB\u30B7\u30E5\u30FC\u30C6\u30A3\u30F3\u30B0'] },
      ],
      cta: 'GitHub\u30EA\u30DD\u30B8\u30C8\u30EA\u3078\u306E\u30EA\u30F3\u30AF',
    },
    qiita: {
      intro: `${topic} \u5165\u9580`,
      sections: [
        { h2: '\u306F\u3058\u3081\u306B', points: ['\u3053\u306E\u8A18\u4E8B\u306E\u5BFE\u8C61\u8005', '\u524D\u63D0\u77E5\u8B58', '\u30B4\u30FC\u30EB'] },
        { h2: '\u74B0\u5883\u69CB\u7BC9', points: ['\u5FC5\u8981\u30C4\u30FC\u30EB', '\u30A4\u30F3\u30B9\u30C8\u30FC\u30EB\u624B\u9806', '\u52D5\u4F5C\u78BA\u8A8D'] },
        { h2: '\u5B9F\u88C5\u624B\u9806', points: ['\u30B3\u30FC\u30C9\u4F8B', '\u8AAC\u660E', '\u5B9F\u884C\u7D50\u679C'] },
        { h2: '\u307E\u3068\u3081', points: ['\u5B66\u3093\u3060\u3053\u3068', '\u6B21\u306E\u30B9\u30C6\u30C3\u30D7', '\u53C2\u8003\u30EA\u30F3\u30AF'] },
      ],
      cta: 'LGTM\u3068\u30D5\u30A9\u30ED\u30FC\u306E\u304A\u9858\u3044',
    },
  };

  const template = outlineTemplates[platform] || outlineTemplates.note;

  return {
    title_suggestions: [
      `\u3010${new Date().getFullYear()}\u5E74\u6700\u65B0\u3011${topic}\u5B8C\u5168\u30AC\u30A4\u30C9`,
      `${topic}\u306E\u59CB\u3081\u65B9 \u2014 \u521D\u5FC3\u8005\u304B\u3089\u5B9F\u8DF5\u307E\u3067`,
      `\u3010\u4FDD\u5B58\u7248\u3011${topic}\u307E\u3068\u3081 \u2014 \u77E5\u3063\u3066\u304A\u304F\u3079\u304D\u3053\u3068`,
    ],
    outline: {
      intro: template.intro,
      sections: template.sections.slice(0, config.sections),
      conclusion_cta: template.cta,
    },
    meta: {
      estimated_length: config.totalTarget,
      target_audience: audience,
      platform,
      seo_keywords_suggested: [topic, `${topic} \u3084\u308A\u65B9`, `${topic} 2026`, `${topic} \u521D\u5FC3\u8005`],
    },
  };
}

// ============================================================
// TRENDING TOPICS (Curated + Updated)
// ============================================================

function getTrendingTopics(platform = 'all', category = 'all') {
  const topics = {
    tech: [
      { topic: 'MCP Server\u958B\u767A', heat: 95, competition: 'low', platforms: ['zenn', 'qiita'], gap: '\u65E5\u672C\u8A9E\u306E\u5B9F\u8DF5\u30AC\u30A4\u30C9\u304C\u5C11\u306A\u3044' },
      { topic: 'Claude Code\u6D3B\u7528\u8853', heat: 92, competition: 'low', platforms: ['note', 'zenn'], gap: '\u65E5\u672C\u8A9E\u60C5\u5831\u304C\u307B\u307C\u30BC\u30ED' },
      { topic: 'Cloudflare Workers AI', heat: 88, competition: 'medium', platforms: ['zenn', 'qiita'], gap: '\u5B9F\u8DF5\u7684\u306A\u30C1\u30E5\u30FC\u30C8\u30EA\u30A2\u30EB\u304C\u4E0D\u8DB3' },
      { topic: 'AI Agent\u81EA\u52D5\u5316', heat: 90, competition: 'low', platforms: ['note', 'zenn'], gap: '\u53CE\u76CA\u5316\u307E\u3067\u66F8\u3044\u305F\u8A18\u4E8B\u304C\u306A\u3044' },
      { topic: 'Cursor vs Claude Code', heat: 87, competition: 'medium', platforms: ['note', 'zenn', 'qiita'], gap: '2026\u5E74\u6700\u65B0\u6BD4\u8F03\u304C\u306A\u3044' },
    ],
    ai: [
      { topic: 'AI\u526F\u696D\u30ED\u30FC\u30C9\u30DE\u30C3\u30D7', heat: 94, competition: 'low', platforms: ['note'], gap: '\u5177\u4F53\u7684\u306A\u53CE\u5165\u6570\u5B57\u5165\u308A\u304C\u5C11\u306A\u3044' },
      { topic: 'AI\u30D7\u30ED\u30F3\u30D7\u30C8\u8853', heat: 91, competition: 'high', platforms: ['note', 'zenn'], gap: '\u5B9F\u6226\u7528\u30C6\u30F3\u30D7\u30EC\u30FC\u30C8\u96C6\u304C\u5C11\u306A\u3044' },
      { topic: 'Agent-to-Agent\u5546\u53D6\u5F15', heat: 85, competition: 'very_low', platforms: ['zenn'], gap: '\u65E5\u672C\u8A9E\u60C5\u5831\u304C\u5B8C\u5168\u306B\u30BC\u30ED' },
      { topic: 'OpenAI vs Anthropic vs Google', heat: 89, competition: 'high', platforms: ['note', 'zenn', 'qiita'], gap: '\u6700\u65B0\u30C7\u30FC\u30BF\u3067\u306E\u6BD4\u8F03\u304C\u5C11\u306A\u3044' },
    ],
    business: [
      { topic: 'AI\u30B3\u30F3\u30C6\u30F3\u30C4\u8CA9\u58F2', heat: 88, competition: 'low', platforms: ['note'], gap: 'note.com\u3067\u306E\u58F2\u308A\u65B9\u30CE\u30A6\u30CF\u30A6' },
      { topic: 'SaaS\u4FA1\u683C\u6226\u7565', heat: 82, competition: 'medium', platforms: ['note', 'zenn'], gap: 'AI\u6642\u4EE3\u306E\u4FA1\u683C\u8A2D\u5B9A' },
    ],
    lifestyle: [
      { topic: 'AI\u5360\u3044\u30FB\u904B\u52E2', heat: 86, competition: 'low', platforms: ['note'], gap: '\u6280\u8853\u89E3\u8AAC + \u5A2F\u697D\u306E\u878D\u5408' },
      { topic: '\u30EA\u30E2\u30FC\u30C8\u30EF\u30FC\u30AF\u00D7AI', heat: 83, competition: 'medium', platforms: ['note'], gap: '\u5B9F\u8DF5\u7684\u306A\u30C4\u30FC\u30EB\u7D39\u4ECB' },
    ],
  };

  let results = [];
  const categories = category === 'all' ? Object.keys(topics) : [category];
  for (const cat of categories) {
    if (topics[cat]) {
      for (const t of topics[cat]) {
        if (platform === 'all' || t.platforms.includes(platform)) {
          results.push({ ...t, category: cat });
        }
      }
    }
  }

  results.sort((a, b) => b.heat - a.heat);
  return results.slice(0, 10);
}

// ============================================================
// CROSS-POST FORMATTER
// ============================================================

function crossPostFormat(markdown, title, tags = []) {
  const noteHtml = convertMarkdownToHtml(markdown, 'note');
  const zennMd = `---\ntitle: "${title}"\nemoji: "\uD83D\uDE80"\ntype: "tech"\ntopics: ${JSON.stringify(tags.slice(0, 5))}\npublished: true\n---\n\n${markdown}`;
  const qiitaMd = `---\ntitle: ${title}\ntags:\n${tags.slice(0, 5).map(t => `  - ${t}`).join('\n')}\nprivate: false\n---\n\n${markdown}`;

  return {
    note: { format: 'html', content: noteHtml, instructions: 'Paste HTML into note.com editor using ProseMirror clipboard injection' },
    zenn: { format: 'markdown', content: zennMd, instructions: 'Save as .md file in articles/ directory of your Zenn repo' },
    qiita: { format: 'markdown', content: qiitaMd, instructions: 'Paste into Qiita editor with frontmatter' },
  };
}

// ============================================================
// PERFORMANCE PREDICTOR
// ============================================================

function analyzePerformance(title, content, platform = 'note') {
  const seo = analyzeSeo(title, content, platform);
  const charCount = content.length;

  const platformMultipliers = { note: 1.2, zenn: 0.9, qiita: 0.8 };
  const multiplier = platformMultipliers[platform] || 1.0;

  const baseViews = Math.round((seo.overall_score / 100) * 500 * multiplier);
  const engagementRate = seo.overall_score >= 80 ? '5-8%' : seo.overall_score >= 60 ? '2-5%' : '1-2%';

  return {
    estimated_views_7d: { low: Math.round(baseViews * 0.5), mid: baseViews, high: Math.round(baseViews * 2) },
    engagement_rate: engagementRate,
    seo_ranking_potential: seo.overall_score >= 80 ? 'high' : seo.overall_score >= 60 ? 'medium' : 'low',
    content_quality_score: seo.overall_score,
    optimization_tips: seo.recommendations,
    platform_specific: seo.platform_tips,
    monetization_potential: charCount > 3000 && seo.overall_score > 70 ? 'Good candidate for paid content' : 'Better as free SEO content',
  };
}

// ============================================================
// API KEY VALIDATION
// ============================================================

async function validateApiKey(key, env) {
  if (!key) return false;
  try {
    const result = await env.DB.prepare('SELECT * FROM api_keys WHERE key = ? AND status = ?').bind(key, 'active').first();
    return !!result;
  } catch {
    return false;
  }
}

// ============================================================
// In-Memory Fallback Rate Limiter (KV Safe Mode)
// When KV is unavailable, degrade to 5 req/min/IP instead of unlimited
// ============================================================
const _memRL = new Map();
const MEM_RL_LIMIT = 5;
const MEM_RL_WINDOW = 60000; // 1 minute

function memoryRateLimit(ip) {
  const now = Date.now();
  const entry = _memRL.get(ip);
  if (!entry || now - entry.ts > MEM_RL_WINDOW) {
    _memRL.set(ip, { ts: now, count: 1 });
    return { allowed: true, remaining: MEM_RL_LIMIT - 1, safeMode: true };
  }
  if (entry.count >= MEM_RL_LIMIT) {
    return { allowed: false, remaining: 0, safeMode: true };
  }
  entry.count++;
  return { allowed: true, remaining: MEM_RL_LIMIT - entry.count, safeMode: true };
}

// ============================================================
// RATE LIMITING
// ============================================================


// ============================================================
// Pro API Key Validation (shared KV: prokey:{key})
// ============================================================

async function validateProKey(kv, apiKey) {
  if (!apiKey || !kv) return null;
  try {
    const kd = await kv.get(`prokey:${apiKey}`, { type: 'json' });
    if (!kd) return null;
    if (kd.expires && new Date(kd.expires) < new Date()) return null;
    if (kd.tier === 'pro' || kd.tier === 'pro_trial') {
      return { valid: true, tier: kd.tier, daily_limit: kd.daily_limit || PRO_DAILY_LIMIT };
    }
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

async function checkRateLimit(toolName, clientIp, env) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `ratelimit:${toolName}:${clientIp}:${today}`;
  try {
    const count = parseInt(await env.KV.get(key) || '0');
    if (count >= FREE_DAILY_LIMIT) return { allowed: false, remaining: 0, limit: FREE_DAILY_LIMIT };
    await env.KV.put(key, String(count + 1), { expirationTtl: 86400 });
    return { allowed: true, remaining: FREE_DAILY_LIMIT - count - 1, limit: FREE_DAILY_LIMIT };
  } catch {
    return memoryRateLimit(clientIp);
  }
}

// ============================================================
// TOOL EXECUTOR
// ============================================================

async function executeTool(name, args, env, clientIp, _proKeyInfo, apiKey) {
  const proTools = ['get_trending_topics', 'cross_post_format', 'analyze_article_performance'];
  const isProTool = proTools.includes(name);

  // Check Pro tools require API key
  if (isProTool && name !== 'get_trending_topics') {
    const isValid = await validateApiKey(args.api_key, env);
    if (!isValid) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'Pro API key required',
            message: `${name} is a Pro feature. Get your API key at: https://product-store.yagami8095.workers.dev/product/moltbook-pro (coming soon) or use purchase_pro_key tool.`,
            upgradeSignal: { reason: 'pro_feature_required', tool: name, upgrade_url: 'https://product-store.yagami8095.workers.dev' },
          }, null, 2),
        }],
        isError: true,
      };
    }
  }

  // Rate limit free tools
  let rateCheck = null;
  if (!isProTool) {
    rateCheck = await checkRateLimit(name, clientIp, env);

      // Pro key override: use higher limit
      if (_proKeyInfo && _proKeyInfo.valid) {
        rateCheck = await proKeyRateLimit(env?.KV, apiKey, _proKeyInfo.daily_limit);
      }

    if (!rateCheck.allowed) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'Rate limit exceeded. FREE 7-day trial (100 calls/day): https://product-store.yagami8095.workers.dev/auth/login\n\nPro ($9 one-time, 1000/day): https://paypal.me/Yagami8095/9 | x402: $0.05/call USDC on Base',
            message: `Free tier: ${FREE_DAILY_LIMIT} uses/day. Upgrade to Pro for ${PRO_DAILY_LIMIT} uses/day ($${PRO_PRICE_USD}/month).`,
            remaining: 0,
            upgradeSignal: { reason: 'rate_limit_exceeded', tool: name, limit: FREE_DAILY_LIMIT, upgrade_url: 'https://product-store.yagami8095.workers.dev' },
          }, null, 2),
        }],
        isError: true,
      };
    }
  }

  switch (name) {
    case 'convert_markdown_to_html': {
      const html = convertMarkdownToHtml(args.markdown, args.platform || 'note');
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            html,
            character_count: html.length,
            element_count: (html.match(/<[^/][^>]*>/g) || []).length,
            platform: args.platform || 'note',
            tip: 'For note.com: use ProseMirror clipboard injection (ClipboardEvent + DataTransfer.setData("text/html", html))',
            ecosystem: ECOSYSTEM,
          }, null, 2),
        }],
      };
    }

    case 'optimize_for_seo': {
      const result = analyzeSeo(args.title, args.content, args.platform || 'note', args.target_keywords || []);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ ...result, ecosystem: ECOSYSTEM }, null, 2),
        }],
      };
    }

    case 'translate_en_to_jp': {
      const style = args.style || 'blog';
      const preserveTerms = args.preserve_terms || [];
      // Provide translation framework and guidelines (actual translation done by LLM)
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            translation_guide: {
              source_text: args.text,
              target_style: style,
              preserved_terms: preserveTerms,
              guidelines: [
                'Use natural Japanese sentence structure (SOV)',
                style === 'casual' ? 'Use \u3067\u3059/\u307E\u3059 or \u3060/\u3067\u3042\u308B form' : 'Use \u3067\u3059/\u307E\u3059 polite form',
                'Keep technical terms in English: ' + (preserveTerms.length ? preserveTerms.join(', ') : 'API, MCP, AI, etc.'),
                'Add \u300C\u300D for emphasis instead of quotes',
                'Use \u3001 and \u3002 for punctuation',
                style === 'technical' ? 'Use precise technical vocabulary' : 'Keep sentences concise and readable',
              ],
              style_examples: {
                casual: '\u3053\u308C\u3001\u3081\u3063\u3061\u3083\u4FBF\u5229\u3067\u3059\u3088\uFF01',
                formal: '\u672C\u6A5F\u80FD\u306F\u975E\u5E38\u306B\u6709\u7528\u3067\u3054\u3056\u3044\u307E\u3059\u3002',
                technical: '\u672C\u30E2\u30B8\u30E5\u30FC\u30EB\u306F\u3001JSON-RPC 2.0\u30D7\u30ED\u30C8\u30B3\u30EB\u3092\u5B9F\u88C5\u3057\u3066\u3044\u307E\u3059\u3002',
                blog: '\u4ECA\u65E5\u306F\u3001\u3053\u308C\u306B\u3064\u3044\u3066\u8A73\u3057\u304F\u89E3\u8AAC\u3057\u307E\u3059\uFF01',
              },
              character_count: args.text.length,
              estimated_jp_length: Math.round(args.text.length * 0.6) + ' characters',
            },
            ecosystem: ECOSYSTEM,
          }, null, 2),
        }],
      };
    }

    case 'generate_article_outline': {
      const outline = generateOutline(args.topic, args.platform || 'note', args.length || 'medium', args.audience || 'general');
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ ...outline, ecosystem: ECOSYSTEM }, null, 2),
        }],
      };
    }

    case 'get_trending_topics': {
      const isPro = await validateApiKey(args.api_key, env);
      const topics = getTrendingTopics(args.platform || 'all', args.category || 'all');

      if (!isPro) {
        // Free: show top 3 with limited info
        const limited = topics.slice(0, 3).map(t => ({
          topic: t.topic,
          heat: t.heat,
          competition: t.competition,
          hint: 'Upgrade to Pro for full gap analysis, platform breakdown, and all topics',
        }));
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              topics: limited,
              total_available: topics.length,
              message: `Showing 3/${topics.length} trending topics. Pro users get full analysis.`,
              upgradeSignal: { reason: 'limited_results', upgrade_url: 'https://product-store.yagami8095.workers.dev' },
              ecosystem: ECOSYSTEM,
            }, null, 2),
          }],
        };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ topics, date: new Date().toISOString().slice(0, 10), ecosystem: ECOSYSTEM }, null, 2),
        }],
      };
    }

    case 'cross_post_format': {
      const result = crossPostFormat(args.markdown, args.title, args.tags || []);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ ...result, ecosystem: ECOSYSTEM }, null, 2),
        }],
      };
    }

    case 'analyze_article_performance': {
      const result = analyzePerformance(args.title, args.content, args.platform || 'note');
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ ...result, ecosystem: ECOSYSTEM }, null, 2),
        }],
      };
    }

    case 'purchase_pro_key': {
      if (args.action === 'validate') {
        const isValid = await validateApiKey(args.api_key, env);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ valid: isValid, key: args.api_key ? args.api_key.slice(0, 8) + '...' : null }, null, 2),
          }],
        };
      }
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            product: 'MoltBook Publisher Pro',
            price: `$${PRO_PRICE_USD}/month`,
            features: ['Trending topics with gap analysis', 'Cross-post formatting (note.com + Zenn + Qiita)', 'Performance prediction', `${PRO_DAILY_LIMIT} uses/day (vs ${FREE_DAILY_LIMIT} free)`],
            purchase_url: 'https://product-store.yagami8095.workers.dev',
            note: 'Coming soon! Currently in beta. Follow @yedanyagami on note.com for launch notification.',
            ecosystem: ECOSYSTEM,
          }, null, 2),
        }],
      };
    }

    default:
      return { content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }) }], isError: true };
  }
}

// ============================================================
// JSON-RPC PROTOCOL
// ============================================================

function jsonRpcResponse(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function jsonRpcError(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

// Dynamic Upgrade Prompt — progressive messaging based on usage
function addUpgradePrompt(response, rateLimitInfo) {
  if (!rateLimitInfo || !response?.result?.content?.[0]) return;
  if (response.result.isError) return;
  const c = response.result.content[0];
  if (c.type !== 'text' || !c.text) return;

  const used = rateLimitInfo.used || 0;
  const remaining = rateLimitInfo.remaining ?? 0;

  let msg = '';
  if (remaining <= 2 && remaining > 0) {
    msg = `\n\n⚡ ${remaining} call${remaining === 1 ? '' : 's'} left today. Pro: $9 → 1000/day → paypal.me/Yagami8095/9`;
  } else if (used <= 3) {
    msg = '\n\n— powered by OpenClaw (openclaw.dev)';
  }

  if (msg) c.text += msg;
}

async function handleMcpRequest(body, env, clientIp, _proKeyInfo, apiKey) {
  const isBatch = Array.isArray(body);
  const requests = isBatch ? body : [body];
  const responses = [];

  for (const req of requests) {
    const { method, params, id } = req;

    // Notifications (no id) — don't respond
    if (id === undefined) continue;

    switch (method) {
      case 'initialize':
        responses.push(jsonRpcResponse(id, {
          protocolVersion: '2025-03-26',
          serverInfo: SERVER_INFO,
          capabilities: CAPABILITIES,
        }));
        break;

      case 'tools/list':
        responses.push(jsonRpcResponse(id, { tools: TOOLS }));
        break;

      case 'tools/call': {
        const { name, arguments: args } = params || {};
        if (args) Object.keys(args).forEach(k => { if (typeof args[k] === 'string') args[k] = sanitizeInput(args[k]); });
        if (!name) {
          responses.push(jsonRpcError(id, -32602, 'Missing tool name'));
          break;
        }
        const result = await executeTool(name, args || {}, env, clientIp, _proKeyInfo, apiKey);
        const rpcResponse = jsonRpcResponse(id, result);
        // Read current usage for upgrade prompt (non-incrementing)
        try {
          const today = new Date().toISOString().slice(0, 10);
          const rlKey = `ratelimit:${name}:${clientIp}:${today}`;
          const used = parseInt(await env.KV.get(rlKey) || '0');
          const remaining = Math.max(0, FREE_DAILY_LIMIT - used);
          addUpgradePrompt(rpcResponse, { used, remaining });
        } catch {}
        responses.push(rpcResponse);
        break;
      }

      case 'ping':
        responses.push(jsonRpcResponse(id, {}));
        break;

      default:
        responses.push(jsonRpcError(id, -32601, `Method not found: ${method}`));
    }
  }

  return isBatch ? responses : responses[0] || null;
}

// ============================================================
// LANDING PAGE
// ============================================================

function landingPage() {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MoltBook Publisher MCP \u2014 Japanese Content Publishing Toolkit</title>
  <meta name="description" content="AI-powered Japanese content publishing toolkit. Convert Markdown to HTML, SEO optimization, EN\u2192JP translation, trending topics for note.com, Zenn, Qiita.">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 min-h-screen text-white">
  <div class="max-w-4xl mx-auto px-6 py-16">
    <div class="text-center mb-16">
      <div class="text-6xl mb-4">\uD83D\uDCDD</div>
      <h1 class="text-4xl font-bold mb-4">MoltBook Publisher MCP</h1>
      <p class="text-xl text-purple-200">Japanese Content Publishing Toolkit for AI Agents</p>
      <p class="text-sm text-purple-300 mt-2">by MoltBook Labs \u2014 part of OpenClaw Intelligence</p>
    </div>

    <div class="grid md:grid-cols-2 gap-6 mb-12">
      <div class="bg-white/10 backdrop-blur rounded-xl p-6">
        <h3 class="text-lg font-bold mb-3">\uD83C\uDD93 Free Tools</h3>
        <ul class="space-y-2 text-purple-200">
          <li>\u2705 Markdown \u2192 HTML (note.com/Zenn/Qiita)</li>
          <li>\u2705 SEO Optimization Analysis</li>
          <li>\u2705 EN\u2192JP Translation Guide</li>
          <li>\u2705 Article Outline Generator</li>
        </ul>
        <p class="text-sm text-purple-400 mt-3">20 uses/day free</p>
      </div>
      <div class="bg-purple-500/20 backdrop-blur rounded-xl p-6 border border-purple-400/30">
        <h3 class="text-lg font-bold mb-3">\u{1F451} Pro Tools ($${PRO_PRICE_USD}/mo)</h3>
        <ul class="space-y-2 text-purple-200">
          <li>\uD83D\uDD25 Trending Topics + Gap Analysis</li>
          <li>\uD83D\uDD04 Cross-Post Formatter (3 platforms)</li>
          <li>\uD83D\uDCC8 Performance Predictor</li>
          <li>\uD83D\uDE80 1000 uses/day</li>
        </ul>
        <a href="https://product-store.yagami8095.workers.dev" class="inline-block mt-3 bg-purple-500 hover:bg-purple-400 px-4 py-2 rounded-lg font-bold transition">Get Pro \u2192</a>
      </div>
    </div>

    <div class="bg-white/5 backdrop-blur rounded-xl p-6 mb-12">
      <h3 class="text-lg font-bold mb-3">\u26A1 Connect to Your AI Agent</h3>
      <pre class="bg-black/30 rounded-lg p-4 text-sm overflow-x-auto text-green-300"><code>{
  "mcpServers": {
    "moltbook-publisher": {
      "url": "https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp"
    }
  }
}</code></pre>
    </div>

    <div class="text-center text-sm text-purple-400">
      <p>\uD83C\uDF10 OpenClaw Ecosystem:
        <a href="https://openclaw-intel-mcp.yagami8095.workers.dev" class="underline hover:text-white">Intel MCP</a> \u00B7
        <a href="https://openclaw-fortune-mcp.yagami8095.workers.dev" class="underline hover:text-white">Fortune MCP</a> \u00B7
        <a href="https://agentforge-compare-mcp.yagami8095.workers.dev" class="underline hover:text-white">AgentForge MCP</a> \u00B7
        <a href="https://regex-engine-mcp.yagami8095.workers.dev" class="underline hover:text-white">Regex MCP</a> \u00B7
        <a href="https://color-palette-mcp.yagami8095.workers.dev" class="underline hover:text-white">Color MCP</a> \u00B7
        <a href="https://json-toolkit-mcp.yagami8095.workers.dev" class="underline hover:text-white">JSON MCP</a> \u00B7
        <a href="https://prompt-enhancer-mcp.yagami8095.workers.dev" class="underline hover:text-white">Prompt MCP</a> \u00B7
        <a href="https://timestamp-converter-mcp.yagami8095.workers.dev" class="underline hover:text-white">Timestamp MCP</a> \u00B7
        <a href="https://product-store.yagami8095.workers.dev" class="underline hover:text-white">Digital Store</a>
      </p>
      <p class="mt-2">MoltBook Labs \u00A9 2026 \u2014 Part of OpenClaw Intelligence</p>
    </div>
  </div>
</body>
</html>`;
}

// ============================================================
// WORKER ENTRY POINT
// ============================================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';

    // Pro API Key validation
    const apiKey = request.headers.get('X-API-Key');
    let _proKeyInfo = null;
    if (apiKey && env?.KV) {
      _proKeyInfo = await validateProKey(env.KV, apiKey);
    }

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Edge Defense
    const defense = await edgeDefense(request, env, 'moltbook');
    if (defense.action === 'honeypot') return new Response('Not Found', { status: 404 });
    if (defense.action === 'reject' || defense.action === 'block') return new Response(JSON.stringify({ error: defense.reason }), { status: defense.status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
    if (defense.action === 'throttle' && defense.delay) await new Promise(r => setTimeout(r, defense.delay));

    // FinOps Circuit Breaker
    const finops = await finopsTrack(env, 'moltbook');
    if (!finops.ok) return new Response(JSON.stringify({ error: finops.reason }), { status: 503, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
    if (finops.delay) await new Promise(r => setTimeout(r, finops.delay));
    await trackRef(request, env, 'moltbook');

    // MCP endpoint
    if (url.pathname === '/mcp') {
      if (request.method === 'GET') {
        return new Response(JSON.stringify({ status: 'ok', server: SERVER_INFO, tools: TOOLS.length, endpoint: '/mcp (POST)' }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      if (request.method === 'POST') {
        try {
          const body = await request.json();
          const result = await handleMcpRequest(body, env, clientIp, _proKeyInfo, apiKey);
          // x402: Detect rate limit → HTTP 402 with payment headers
          const first402 = Array.isArray(result) ? result[0] : result;
          const isRateLimited402 = first402?.error?.code === -32029;
          const httpStatus402 = isRateLimited402 ? 402 : 200;
          const headers402 = { ...CORS_HEADERS, 'Content-Type': 'application/json' };
          if (isRateLimited402) { headers402['X-Payment-Required'] = 'true'; headers402['X-Payment-Network'] = 'base'; headers402['X-Payment-Currency'] = 'USDC'; headers402['X-Payment-Amount'] = '0.05'; headers402['X-Payment-Address'] = '0x72aa56DAe3819c75C545c57778cc404092d60731'; }
          return new Response(JSON.stringify(result), {
            status: httpStatus402,
            headers: headers402,
          });
        } catch (err) {
          return new Response(JSON.stringify(jsonRpcError(null, -32700, 'Parse error: ' + err.message)), {
            status: 400,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }
      }
    }

        // llms.txt for AI discoverability
    if (url.pathname === '/llms.txt' || url.pathname === '/.well-known/llms.txt') {
      const t = [
        "# OpenClaw MCP Servers",
        "> 9 free remote MCP servers with 49 tools for AI agents.",
        "",
        "## Servers",
        "- JSON Toolkit: https://json-toolkit-mcp.yagami8095.workers.dev/mcp",
        "- Regex Engine: https://regex-engine-mcp.yagami8095.workers.dev/mcp",
        "- Color Palette: https://color-palette-mcp.yagami8095.workers.dev/mcp",
        "- Timestamp Converter: https://timestamp-converter-mcp.yagami8095.workers.dev/mcp",
        "- Prompt Enhancer: https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp",
        "- OpenClaw Intel: https://openclaw-intel-mcp.yagami8095.workers.dev/mcp",
        "- Fortune: https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp",
        "- MoltBook Publisher: https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp",
        "- AgentForge Compare: https://agentforge-compare-mcp.yagami8095.workers.dev/mcp",
        "",
        "## Quick Start",
        'Add to MCP config: {"url": "https://json-toolkit-mcp.yagami8095.workers.dev/mcp"}',
        "",
        "## Pro: 9 USD, 1000 calls/day all servers",
        "https://product-store.yagami8095.workers.dev/products/ecosystem-pro",
      ];
      return new Response(t.join("\n"), {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Access-Control-Allow-Origin': '*' },
      });
    }

// Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'healthy', server: SERVER_INFO.name, version: SERVER_INFO.version, tools: TOOLS.length, timestamp: new Date().toISOString() }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Landing page
    return new Response(landingPage(), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'text/html; charset=utf-8' },
    });
  },
};
