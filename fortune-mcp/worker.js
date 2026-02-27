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

const SERVER_INFO = { name: 'openclaw-fortune', version: '2.0.0' };
const CAPABILITIES = { tools: {} };

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

async function handleToolCall(id, params) {
  const { name, arguments: args } = params;
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
  <script src="https://cdn.tailwindcss.com"><\/script>
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
// Main Worker
// ============================================================

export default {
  async fetch(request) {
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

    if ((path === '/' || path === '/index.html') && request.method === 'GET') {
      return new Response(LANDING_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    if (path === '/health') {
      return Response.json({ status: 'ok', server: 'openclaw-fortune-mcp', version: SERVER_INFO.version, date: getTodayJST() }, { headers: cors });
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

        return new Response(JSON.stringify(responseBody), {
          status: 200,
          headers: { ...cors, 'Content-Type': 'application/json' },
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
