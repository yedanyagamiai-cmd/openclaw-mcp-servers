/**
 * OpenClaw Fortune MCP Server
 * MCP protocol (Streamable HTTP) for daily zodiac fortune + tarot readings.
 * Fortune logic is inlined (no external Worker calls — avoids error 1042).
 *
 * Tools:
 *   - get_daily_fortune: Fortune for a specific zodiac sign
 *   - get_fortune_ranking: Today's zodiac ranking (1st-12th)
 *   - get_all_fortunes: All 12 signs' fortunes
 */

const SERVER_INFO = { name: 'openclaw-fortune', version: '2.0.1' };
const CAPABILITIES = { tools: {} };
const FORTUNE_RATE_LIMIT = 20; // 20 requests/day free

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
// Pro API Key Validation (shared KV: prokey:{key})
// ============================================================
const PRO_DAILY_LIMIT = 1000;

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

async function checkRateLimit(kv, ip) {
  if (!kv) return memoryRateLimit('no-kv');
  const today = new Date().toISOString().slice(0, 10);
  const key = `rl:fortune:${ip}:${today}`;
  try {
    const raw = await kv.get(key);
    const count = raw ? parseInt(raw, 10) : 0;
    if (count >= FORTUNE_RATE_LIMIT) {
      return { allowed: false, remaining: 0, used: count };
    }
    await kv.put(key, String(count + 1), { expirationTtl: 86400 });
    return { allowed: true, remaining: FORTUNE_RATE_LIMIT - count - 1, used: count + 1 };
  } catch {
    return memoryRateLimit(ip);
  }
}

const PROMO = {
  intel_mcp: 'https://openclaw-intel-mcp.yagami8095.workers.dev/mcp',
  fortune_mcp: 'https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp',
  store: 'https://product-store.yagami8095.workers.dev',
  github: 'https://github.com/yagami8095/openclaw-mcp-servers',
};

// ============================================================
// Fortune Data (inlined from fortune-api)
// ============================================================

const ZODIAC_SIGNS = {
  aries:       { jp: '牡羊座', emoji: '♈', element: '火', dates: '3/21-4/19' },
  taurus:      { jp: '牡牛座', emoji: '♉', element: '地', dates: '4/20-5/20' },
  gemini:      { jp: '双子座', emoji: '♊', element: '風', dates: '5/21-6/21' },
  cancer:      { jp: '蟹座',   emoji: '♋', element: '水', dates: '6/22-7/22' },
  leo:         { jp: '獅子座', emoji: '♌', element: '火', dates: '7/23-8/22' },
  virgo:       { jp: '乙女座', emoji: '♍', element: '地', dates: '8/23-9/22' },
  libra:       { jp: '天秤座', emoji: '♎', element: '風', dates: '9/23-10/23' },
  scorpio:     { jp: '蠍座',   emoji: '♏', element: '水', dates: '10/24-11/22' },
  sagittarius: { jp: '射手座', emoji: '♐', element: '火', dates: '11/23-12/21' },
  capricorn:   { jp: '山羊座', emoji: '♑', element: '地', dates: '12/22-1/19' },
  aquarius:    { jp: '水瓶座', emoji: '♒', element: '風', dates: '1/20-2/18' },
  pisces:      { jp: '魚座',   emoji: '♓', element: '水', dates: '2/19-3/20' },
};

const TAROT_MAJOR = [
  { name: '愚者', en: 'The Fool', upright: ['新しい始まり','冒険','自由'], reversed: ['無謀','不注意','停滞'] },
  { name: '魔術師', en: 'The Magician', upright: ['創造力','意志力','集中'], reversed: ['欺瞞','混乱','才能の浪費'] },
  { name: '女教皇', en: 'The High Priestess', upright: ['直感','神秘','内なる声'], reversed: ['秘密','不安','表面的'] },
  { name: '女帝', en: 'The Empress', upright: ['豊穣','母性','創造'], reversed: ['過保護','停滞','依存'] },
  { name: '皇帝', en: 'The Emperor', upright: ['権威','安定','リーダーシップ'], reversed: ['支配的','頑固','独断'] },
  { name: '法王', en: 'The Hierophant', upright: ['伝統','教え','信頼'], reversed: ['形式主義','反抗','自由思考'] },
  { name: '恋人', en: 'The Lovers', upright: ['愛','調和','選択'], reversed: ['不調和','迷い','価値観の衝突'] },
  { name: '戦車', en: 'The Chariot', upright: ['勝利','意志力','前進'], reversed: ['暴走','方向喪失','挫折'] },
  { name: '力', en: 'Strength', upright: ['勇気','忍耐','内なる力'], reversed: ['弱気','自信喪失','衝動的'] },
  { name: '隠者', en: 'The Hermit', upright: ['内省','知恵','探求'], reversed: ['孤立','引きこもり','偏屈'] },
  { name: '運命の輪', en: 'Wheel of Fortune', upright: ['転機','幸運','チャンス'], reversed: ['不運','停滞','抵抗'] },
  { name: '正義', en: 'Justice', upright: ['公正','真実','バランス'], reversed: ['不公平','偏見','不誠実'] },
  { name: '吊るされた男', en: 'The Hanged Man', upright: ['試練','忍耐','新視点'], reversed: ['無駄な犠牲','遅延','頑固'] },
  { name: '死神', en: 'Death', upright: ['変容','終わりと始まり','再生'], reversed: ['変化への恐れ','停滞','執着'] },
  { name: '節制', en: 'Temperance', upright: ['調和','バランス','忍耐'], reversed: ['不均衡','過剰','焦り'] },
  { name: '悪魔', en: 'The Devil', upright: ['束縛からの解放','誘惑の克服'], reversed: ['依存','執着','物質主義'] },
  { name: '塔', en: 'The Tower', upright: ['崩壊と再建','真実の暴露','解放'], reversed: ['回避','恐怖','限定的変化'] },
  { name: '星', en: 'The Star', upright: ['希望','インスピレーション','癒し'], reversed: ['絶望','自信喪失','方向性の欠如'] },
  { name: '月', en: 'The Moon', upright: ['直感','潜在意識','神秘'], reversed: ['不安','混乱','幻想'] },
  { name: '太陽', en: 'The Sun', upright: ['成功','喜び','活力'], reversed: ['一時的な曇り','過信','子供っぽさ'] },
  { name: '審判', en: 'Judgement', upright: ['復活','覚醒','決断'], reversed: ['後悔','自己批判','決断力不足'] },
  { name: '世界', en: 'The World', upright: ['完成','達成','統合'], reversed: ['未完成','遅延','中途半端'] },
];

const LUCKY_ITEMS = [
  '白いハンカチ','シルバーのアクセサリー','観葉植物','お気に入りの本',
  'ミントキャンディ','青いペン','木製のアイテム','レモンティー',
  '革の財布','クリスタル','手書きのメモ','チョコレート',
  '赤いマフラー','ラベンダーの香り','コーヒーカップ','古い写真',
  '天然石のブレスレット','お守り','ノート','ドライフラワー',
  'アロマキャンドル','万年筆','手鏡','ストール',
  '腕時計','イヤホン','エコバッグ','ポストカード',
  'グリーンティー','小さなぬいぐるみ','花束','ハーブティー',
];

const LUCKY_COLORS = [
  ['ゴールド','金運UP'],['シルバー','直感力UP'],['ロイヤルブルー','知性UP'],
  ['エメラルドグリーン','癒し効果'],['ローズピンク','恋愛運UP'],['ホワイト','浄化作用'],
  ['ラベンダー','リラックス'],['オレンジ','活力UP'],['ターコイズ','コミュ力UP'],
  ['ワインレッド','魅力UP'],['ネイビー','集中力UP'],['クリーム','安定感'],
];

const OVERALL_MESSAGES = {
  excellent: [
    '最高の一日になりそう！直感を信じて行動すれば、思いがけない幸運が舞い込みます。',
    '今日はあなたの魅力が最大限に輝く日。周囲の人々があなたに引き寄せられるでしょう。',
    '宇宙があなたの味方をしています。大胆な決断が大きな成功につながる予感。',
  ],
  good: [
    '穏やかで前向きなエネルギーに包まれる一日。小さな幸せを大切にして。',
    'コツコツと積み重ねてきた努力が報われるタイミング。自分を信じて進みましょう。',
    '人との出会いが良い運気を運んでくれます。新しいつながりを大切に。',
  ],
  average: [
    '平穏な一日ですが、午後から運気が上昇。焦らず自分のペースで過ごして。',
    '可もなく不可もなくの一日。でも夕方以降にちょっとした嬉しい出来事が。',
    '波があるかもしれませんが、全体的には穏やかな流れ。深呼吸を忘れずに。',
  ],
  challenging: [
    '少し試練がある日ですが、乗り越えた先に成長が待っています。慎重に行動して。',
    '思い通りにいかないこともありますが、それは次のステップへの準備。',
  ],
};

// ============================================================
// Fortune Generation (seeded random — deterministic per day)
// ============================================================

function seededRandom(seed) {
  let s = seed;
  return function() {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function getDateSeed(dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getTodayJST() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

function resolveSign(input) {
  if (!input) return null;
  const lower = input.toLowerCase().trim();
  if (ZODIAC_SIGNS[lower]) return lower;
  for (const [key, val] of Object.entries(ZODIAC_SIGNS)) {
    if (val.jp === input || val.emoji === input) return key;
  }
  for (const key of Object.keys(ZODIAC_SIGNS)) {
    if (key.startsWith(lower)) return key;
  }
  return null;
}

function generateDailyFortune(dateStr) {
  const seed = getDateSeed(dateStr);
  const rng = seededRandom(seed);
  const signKeys = Object.keys(ZODIAC_SIGNS);

  const ranking = [...signKeys];
  for (let i = ranking.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [ranking[i], ranking[j]] = [ranking[j], ranking[i]];
  }

  const fortunes = {};
  ranking.forEach((signKey, index) => {
    const sign = ZODIAC_SIGNS[signKey];
    const rank = index + 1;
    const score = Math.max(30, 100 - (index * 6) + Math.floor(rng() * 10 - 5));

    const tarotIdx = Math.floor(rng() * TAROT_MAJOR.length);
    const tarot = TAROT_MAJOR[tarotIdx];
    const isUpright = rng() > 0.35;

    const loveScore = Math.max(1, Math.min(5, Math.floor(rng() * 5) + 1));
    const workScore = Math.max(1, Math.min(5, Math.floor(rng() * 5) + 1));
    const moneyScore = Math.max(1, Math.min(5, Math.floor(rng() * 5) + 1));
    const healthScore = Math.max(1, Math.min(5, Math.floor(rng() * 5) + 1));

    const itemIdx = Math.floor(rng() * LUCKY_ITEMS.length);
    const colorIdx = Math.floor(rng() * LUCKY_COLORS.length);
    const luckyNumber = Math.floor(rng() * 99) + 1;
    const directions = ['北','北東','東','南東','南','南西','西','北西'];
    const luckyDirection = directions[Math.floor(rng() * 8)];

    let tier;
    if (rank <= 3) tier = 'excellent';
    else if (rank <= 6) tier = 'good';
    else if (rank <= 9) tier = 'average';
    else tier = 'challenging';

    const msgs = OVERALL_MESSAGES[tier];
    const message = msgs[Math.floor(rng() * msgs.length)];

    fortunes[signKey] = {
      sign: sign.jp, sign_en: signKey, emoji: sign.emoji, element: sign.element, dates: sign.dates,
      rank, score,
      tarot: {
        name: tarot.name, name_en: tarot.en,
        position: isUpright ? '正位置' : '逆位置',
        position_en: isUpright ? 'upright' : 'reversed',
        keywords: isUpright ? tarot.upright : tarot.reversed,
      },
      categories: {
        love: { score: loveScore, stars: '★'.repeat(loveScore) + '☆'.repeat(5 - loveScore) },
        work: { score: workScore, stars: '★'.repeat(workScore) + '☆'.repeat(5 - workScore) },
        money: { score: moneyScore, stars: '★'.repeat(moneyScore) + '☆'.repeat(5 - moneyScore) },
        health: { score: healthScore, stars: '★'.repeat(healthScore) + '☆'.repeat(5 - healthScore) },
      },
      lucky: {
        item: LUCKY_ITEMS[itemIdx],
        color: LUCKY_COLORS[colorIdx][0], color_effect: LUCKY_COLORS[colorIdx][1],
        number: luckyNumber, direction: luckyDirection,
      },
      message, tier,
    };
  });

  return {
    date: dateStr,
    generated_at: new Date().toISOString(),
    ranking: ranking.map(k => ({ sign: ZODIAC_SIGNS[k].jp, sign_en: k, emoji: ZODIAC_SIGNS[k].emoji })),
    fortunes,
  };
}

// ============================================================
// MCP Tools
// ============================================================

const TOOLS = [
  {
    name: 'get_daily_fortune',
    description: 'Get daily horoscope and tarot card reading for a zodiac sign. Returns overall score, tarot card, love/work/money/health scores, lucky item/color/number/direction, and personalized message. Available signs: aries, taurus, gemini, cancer, leo, virgo, libra, scorpio, sagittarius, capricorn, aquarius, pisces. Also accepts Japanese names.',
    inputSchema: {
      type: 'object',
      properties: { sign: { type: 'string', description: 'Zodiac sign (e.g., aries, leo, pisces)' } },
      required: ['sign'],
    },
  },
  {
    name: 'get_fortune_ranking',
    description: "Get today's zodiac sign ranking from 1st to 12th place with scores and tiers. Great for finding out which signs are luckiest today.",
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_all_fortunes',
    description: 'Get complete fortune data for all 12 zodiac signs including rankings, tarot cards, category scores, and lucky items. Comprehensive daily horoscope overview.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
];

// ============================================================
// MCP Protocol
// ============================================================

function jsonRpcResponse(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function jsonRpcError(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

function ecosystem() {
  return {
    also_from_openclaw: {
      intel_mcp: {
        url: PROMO.intel_mcp,
        description: 'AI market intelligence — track Claude Code, Cursor, Devin growth trends. Free tier + Pro API key ($9).',
        tools: ['get_ai_market_report', 'get_market_stats', 'purchase_api_key'],
      },
      store: {
        url: PROMO.store,
        description: 'AI tools, prompts, and intelligence products. Multi-payment (PayPal, crypto, card).',
      },
    },
  };
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


function sanitizeInput(str, maxLen = 2000) {
  if (typeof str !== 'string') return str;
  return str.replace(/[<>]/g, '').slice(0, maxLen);
}

async function handleToolCall(id, params) {
  const { name, arguments: args } = params;
  if (args) Object.keys(args).forEach(k => { if (typeof args[k] === 'string') args[k] = sanitizeInput(args[k]); });
  const today = getTodayJST();

  try {
    switch (name) {
      case 'get_daily_fortune': {
        const signInput = (args?.sign || '').trim();
        if (!signInput) {
          return jsonRpcResponse(id, {
            content: [{ type: 'text', text: 'Error: sign parameter required. Available: ' + Object.keys(ZODIAC_SIGNS).join(', ') }],
            isError: true,
          });
        }
        const signKey = resolveSign(signInput);
        if (!signKey) {
          return jsonRpcResponse(id, {
            content: [{ type: 'text', text: JSON.stringify({ error: 'Unknown sign', input: signInput, available: Object.keys(ZODIAC_SIGNS) }) }],
            isError: true,
          });
        }
        const data = generateDailyFortune(today);
        const fortune = { date: data.date, ...data.fortunes[signKey], ...ecosystem() };
        return jsonRpcResponse(id, {
          content: [{ type: 'text', text: JSON.stringify(fortune, null, 2) }],
        });
      }

      case 'get_fortune_ranking': {
        const data = generateDailyFortune(today);
        const ranking = data.ranking.map((r, i) => ({
          rank: i + 1, ...r,
          score: data.fortunes[r.sign_en].score,
          tier: data.fortunes[r.sign_en].tier,
        }));
        return jsonRpcResponse(id, {
          content: [{ type: 'text', text: JSON.stringify({ date: data.date, ranking, ...ecosystem() }, null, 2) }],
        });
      }

      case 'get_all_fortunes': {
        const data = generateDailyFortune(today);
        return jsonRpcResponse(id, {
          content: [{ type: 'text', text: JSON.stringify({ ...data, ...ecosystem() }, null, 2) }],
        });
      }

      default:
        return jsonRpcError(id, -32601, `Tool not found: ${name}`);
    }
  } catch (e) {
    return jsonRpcResponse(id, {
      content: [{ type: 'text', text: `Error: ${e.message}` }],
      isError: true,
    });
  }
}

// ============================================================
// Landing Page
// ============================================================

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenClaw Fortune MCP Server</title>
  <meta name="description" content="Free MCP server delivering daily horoscopes and tarot card readings for all 12 zodiac signs. Love, work, health scores and lucky items for AI-powered personal assistants.">
  <meta name="keywords" content="horoscope API, tarot reading, zodiac fortune, MCP server, AI assistant, daily horoscope">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://fortune-mcp.yagami8095.workers.dev">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Fortune MCP Server - Daily Horoscope & Tarot for AI Agents | OpenClaw">
  <meta property="og:description" content="Free MCP server delivering daily horoscopes and tarot card readings for all 12 zodiac signs. Love, work, health scores and lucky items for AI-powered personal assistants.">
  <meta property="og:url" content="https://fortune-mcp.yagami8095.workers.dev">
  <meta property="og:site_name" content="OpenClaw Intelligence">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="Fortune MCP Server - Daily Horoscope & Tarot for AI Agents | OpenClaw">
  <meta name="twitter:description" content="Free MCP server delivering daily horoscopes and tarot card readings for all 12 zodiac signs. Love, work, health scores and lucky items for AI-powered personal assistants.">
  <script src="https://cdn.tailwindcss.com"><\/script>

  <script type="application/ld+json">
  {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Fortune MCP Server",
  "description": "Free MCP server delivering daily horoscopes and tarot card readings for all 12 zodiac signs. Love, work, health scores and lucky items for AI-powered personal assistants.",
  "url": "https://fortune-mcp.yagami8095.workers.dev",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "Any",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "author": {
    "@type": "Organization",
    "name": "OpenClaw Intelligence",
    "url": "https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers"
  }
}
  <\/script>
</head>
<body class="bg-purple-950 text-gray-100 min-h-screen">
  <div class="max-w-3xl mx-auto px-6 py-16">
    <h1 class="text-4xl font-bold mb-4 text-purple-400">OpenClaw Fortune MCP Server</h1>
    <p class="text-gray-400 mb-8">Daily zodiac horoscope + tarot card readings via MCP. Free forever. Connect your AI agent for personalized daily fortunes.</p>

    <div class="bg-purple-900/30 rounded-xl p-6 mb-8 border border-purple-800">
      <h2 class="text-xl font-bold mb-3">Quick Connect</h2>
      <p class="text-gray-400 text-sm mb-3">Add to your Claude Code / Cursor / Windsurf config:</p>
      <pre class="bg-black rounded-lg p-4 text-sm text-green-400 overflow-x-auto">{
  "mcpServers": {
    "openclaw-fortune": {
      "url": "https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp"
    }
  }
}</pre>
    </div>

    <div class="bg-purple-900/30 rounded-xl p-6 mb-8 border border-purple-800">
      <h2 class="text-xl font-bold mb-3">Available Tools</h2>
      <ul class="space-y-3 text-sm">
        <li><code class="text-purple-400">get_daily_fortune</code> — Fortune for a zodiac sign (tarot + scores + lucky items)</li>
        <li><code class="text-purple-400">get_fortune_ranking</code> — Today's zodiac ranking (1st-12th)</li>
        <li><code class="text-purple-400">get_all_fortunes</code> — All 12 signs' complete fortunes</li>
      </ul>
    </div>

    <div class="bg-purple-900/30 rounded-xl p-6 mb-8 border border-purple-800">
      <h2 class="text-xl font-bold mb-3">Also Try</h2>
      <ul class="space-y-2 text-sm">
        <li><a href="https://openclaw-intel-mcp.yagami8095.workers.dev" class="text-blue-400 hover:underline">OpenClaw Intel MCP</a> — AI agent market intelligence reports</li>
        <li><a href="https://product-store.yagami8095.workers.dev" class="text-orange-400 hover:underline">OpenClaw Store</a> — AI tools and templates</li>
      </ul>
    </div>

    <div class="text-center text-gray-600 text-sm">
      <p>Powered by <a href="https://github.com/yagami8095/openclaw-mcp-servers" class="text-purple-400 hover:underline">OpenClaw Intelligence</a> | Free forever</p>
    </div>
  </div>
</body>
</html>`;

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
// Main Worker
// ============================================================

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id',
      'Access-Control-Expose-Headers': 'Mcp-Session-Id',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    // Edge Defense
    const defense = await edgeDefense(request, env, 'fortune');
    if (defense.action === 'honeypot') return new Response('Not Found', { status: 404 });
    if (defense.action === 'reject' || defense.action === 'block') return new Response(JSON.stringify({ error: defense.reason }), { status: defense.status, headers: { ...cors, 'Content-Type': 'application/json' } });
    if (defense.action === 'throttle' && defense.delay) await new Promise(r => setTimeout(r, defense.delay));

    // FinOps Circuit Breaker
    const finops = await finopsTrack(env, 'fortune');
    if (!finops.ok) return new Response(JSON.stringify({ error: finops.reason }), { status: 503, headers: { ...cors, 'Content-Type': 'application/json' } });
    if (finops.delay) await new Promise(r => setTimeout(r, finops.delay));
    await trackRef(request, env, 'fortune');

    if ((path === '/' || path === '/index.html') && request.method === 'GET') {
      return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

        // llms.txt for AI discoverability
    if (path === '/llms.txt' || path === '/.well-known/llms.txt') {
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

if (path === '/health') {
      return Response.json({ status: 'ok', server: 'openclaw-fortune-mcp', version: SERVER_INFO.version, date: getTodayJST() }, { headers: cors });
    }

    // Rate limit on MCP and API endpoints (not landing page or health)
    let rl;
    if (path === '/mcp') {
      const clientIp = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || 'unknown';

      // Pro API Key validation
      const apiKey = request.headers.get('X-API-Key');
      let _proKeyInfo = null;
      if (apiKey && env?.KV) {
        _proKeyInfo = await validateProKey(env.KV, apiKey);
      }

      rl = await checkRateLimit(env.KV, clientIp);

      // Pro key override
      if (_proKeyInfo && _proKeyInfo.valid) {
        rl = await proKeyRateLimit(env.KV, apiKey, _proKeyInfo.daily_limit);
      }

      if (!rl.allowed) {
        return new Response(JSON.stringify(jsonRpcError(null, -32029, `Rate limit exceeded (${FORTUNE_RATE_LIMIT}/day). FREE 7-day trial (100 calls/day): https://product-store.yagami8095.workers.dev/auth/login\n\nPro ($9 one-time, 1000/day): https://paypal.me/Yagami8095/9 | x402: $0.05/call USDC on Base`)), {
          status: 402, headers: {
            ...cors, 'Content-Type': 'application/json',
            'X-Payment-Required': 'true',
            'X-Payment-Network': 'base',
            'X-Payment-Currency': 'USDC',
            'X-Payment-Amount': '0.05',
            'X-Payment-Address': '0x72aa56DAe3819c75C545c57778cc404092d60731',
          }
        });
      }
    }

    if (path === '/mcp') {
      if (request.method === 'POST') {
        const contentType = request.headers.get('Content-Type') || '';
        if (!contentType.includes('application/json')) {
          return new Response(JSON.stringify(jsonRpcError(null, -32700, 'Content-Type must be application/json')),
            { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
        }

        let body;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify(jsonRpcError(null, -32700, 'Parse error')),
            { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
        }

        const isBatch = Array.isArray(body);
        const requests = isBatch ? body : [body];
        const responses = [];

        for (const req of requests) {
          if (!req.jsonrpc || req.jsonrpc !== '2.0' || !req.method) {
            responses.push(jsonRpcError(req?.id || null, -32600, 'Invalid JSON-RPC request'));
            continue;
          }

          let result;
          switch (req.method) {
            case 'initialize':
              result = jsonRpcResponse(req.id, {
                protocolVersion: '2025-03-26',
                capabilities: CAPABILITIES,
                serverInfo: SERVER_INFO,
              });
              break;
            case 'notifications/initialized':
              continue;
            case 'tools/list':
              result = jsonRpcResponse(req.id, { tools: TOOLS });
              break;
            case 'tools/call':
              result = await handleToolCall(req.id, req.params || {});
              addUpgradePrompt(result, rl);
              break;
            case 'ping':
              result = jsonRpcResponse(req.id, {});
              break;
            default:
              result = jsonRpcError(req.id, -32601, `Method not found: ${req.method}`);
          }
          if (result) responses.push(result);
        }

        const responseBody = isBatch ? responses : (responses[0] || '');
        if (!responseBody) {
          return new Response('', { status: 204, headers: cors });
        }

        // x402: Detect rate limit → HTTP 402 with payment headers
        const first = Array.isArray(responseBody) ? responseBody[0] : responseBody;
        const isRateLimited = first?.error?.code === -32029;
        const httpStatus = isRateLimited ? 402 : 200;
        const responseHeaders = { ...cors, 'Content-Type': 'application/json' };
        if (isRateLimited) {
          responseHeaders['X-Payment-Required'] = 'true';
          responseHeaders['X-Payment-Network'] = 'base';
          responseHeaders['X-Payment-Currency'] = 'USDC';
          responseHeaders['X-Payment-Amount'] = '0.05';
          responseHeaders['X-Payment-Address'] = '0x72aa56DAe3819c75C545c57778cc404092d60731';
        }

        return new Response(JSON.stringify(responseBody), {
          status: httpStatus,
          headers: responseHeaders,
        });
      }

      if (request.method === 'GET') {
        return new Response(JSON.stringify({ info: 'SSE endpoint. Use POST for JSON-RPC requests.' }),
          { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
      }

      if (request.method === 'DELETE') {
        return new Response('', { status: 204, headers: cors });
      }
    }

    return Response.json({ error: 'Not found', hint: 'MCP endpoint is at /mcp' }, { status: 404, headers: cors });
  },
};
