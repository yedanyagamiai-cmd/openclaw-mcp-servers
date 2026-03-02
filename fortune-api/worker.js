// fortune-api Worker — Daily Zodiac Fortune with Tarot
// Endpoints:
//   GET /                     → Landing page (JP)
//   GET /api/fortune/today    → All 12 signs today
//   GET /api/fortune/today/:sign → Specific sign today
//   GET /api/fortune/ranking  → Today's ranking
//   GET /api/health           → Health check

const FORTUNE_API_RATE_LIMIT = 50; // 50 requests/day free

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

async function checkRateLimit(kv, ip) {
  if (!kv) return memoryRateLimit('no-kv');
  const today = new Date().toISOString().slice(0, 10);
  const key = `rl:fortune-api:${ip}:${today}`;
  try {
    const raw = await kv.get(key);
    const count = raw ? parseInt(raw, 10) : 0;
    if (count >= FORTUNE_API_RATE_LIMIT) {
      return { allowed: false, remaining: 0 };
    }
    await kv.put(key, String(count + 1), { expirationTtl: 86400 });
    return { allowed: true, remaining: FORTUNE_API_RATE_LIMIT - count - 1 };
  } catch {
    return memoryRateLimit(ip);
  }
}

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

// Seeded random for deterministic daily results
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

function generateDailyFortune(dateStr) {
  const seed = getDateSeed(dateStr);
  const rng = seededRandom(seed);

  const signKeys = Object.keys(ZODIAC_SIGNS);

  // Shuffle for ranking
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

    // Assign tarot card
    const tarotIdx = Math.floor(rng() * TAROT_MAJOR.length);
    const tarot = TAROT_MAJOR[tarotIdx];
    const isUpright = rng() > 0.35;

    // Category scores
    const loveScore = Math.max(1, Math.min(5, Math.floor(rng() * 5) + 1));
    const workScore = Math.max(1, Math.min(5, Math.floor(rng() * 5) + 1));
    const moneyScore = Math.max(1, Math.min(5, Math.floor(rng() * 5) + 1));
    const healthScore = Math.max(1, Math.min(5, Math.floor(rng() * 5) + 1));

    // Lucky items
    const itemIdx = Math.floor(rng() * LUCKY_ITEMS.length);
    const colorIdx = Math.floor(rng() * LUCKY_COLORS.length);
    const luckyNumber = Math.floor(rng() * 99) + 1;
    const luckyDirection = ['北','北東','東','南東','南','南西','西','北西'][Math.floor(rng() * 8)];

    // Overall message based on rank
    let tier;
    if (rank <= 3) tier = 'excellent';
    else if (rank <= 6) tier = 'good';
    else if (rank <= 9) tier = 'average';
    else tier = 'challenging';

    const msgs = OVERALL_MESSAGES[tier];
    const message = msgs[Math.floor(rng() * msgs.length)];

    fortunes[signKey] = {
      sign: sign.jp,
      sign_en: signKey,
      emoji: sign.emoji,
      element: sign.element,
      dates: sign.dates,
      rank: rank,
      score: score,
      tarot: {
        name: tarot.name,
        name_en: tarot.en,
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
        color: LUCKY_COLORS[colorIdx][0],
        color_effect: LUCKY_COLORS[colorIdx][1],
        number: luckyNumber,
        direction: luckyDirection,
      },
      message: message,
      tier: tier,
    };
  });

  return {
    date: dateStr,
    generated_at: new Date().toISOString(),
    ranking: ranking.map(k => ({ sign: ZODIAC_SIGNS[k].jp, sign_en: k, emoji: ZODIAC_SIGNS[k].emoji })),
    fortunes: fortunes,
  };
}

function getTodayJST() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

function resolveSign(input) {
  if (!input) return null;
  const lower = input.toLowerCase().replace(/[♈♉♊♋♌♍♎♏♐♑♒♓]/g, '');
  // Direct match
  if (ZODIAC_SIGNS[lower]) return lower;
  // JP name match
  for (const [key, val] of Object.entries(ZODIAC_SIGNS)) {
    if (val.jp === input || val.emoji === input) return key;
  }
  // Partial match
  for (const [key] of Object.entries(ZODIAC_SIGNS)) {
    if (key.startsWith(lower)) return key;
  }
  return null;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300',
    },
  });
}

function landingPage() {
  const today = getTodayJST();
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>🔮 Fortune API — 毎日の星座占い</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif; background: linear-gradient(135deg, #0c0028 0%, #1a0040 50%, #2d0060 100%); color: #e8e0ff; min-height: 100vh; }
  .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
  h1 { font-size: 2.5rem; text-align: center; margin-bottom: 10px; background: linear-gradient(90deg, #ff6ec7, #7c4dff, #00e5ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .subtitle { text-align: center; color: #b8a0e0; margin-bottom: 40px; font-size: 1.1rem; }
  .card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 24px; margin-bottom: 20px; backdrop-filter: blur(10px); }
  .card h2 { color: #b388ff; margin-bottom: 12px; font-size: 1.3rem; }
  .endpoint { background: rgba(0,0,0,0.3); border-radius: 8px; padding: 12px 16px; margin: 8px 0; font-family: 'Consolas', monospace; font-size: 0.9rem; }
  .method { color: #69f0ae; font-weight: bold; margin-right: 8px; }
  .path { color: #80d8ff; }
  .desc { color: #b8a0e0; font-size: 0.85rem; margin-top: 4px; }
  .signs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 16px; }
  .sign { text-align: center; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid rgba(255,255,255,0.06); transition: transform 0.2s; cursor: pointer; text-decoration: none; color: inherit; }
  .sign:hover { transform: scale(1.05); background: rgba(255,255,255,0.08); }
  .sign .emoji { font-size: 2rem; display: block; margin-bottom: 4px; }
  .sign .name { font-size: 0.85rem; }
  .footer { text-align: center; margin-top: 40px; color: #6a5a8e; font-size: 0.8rem; }
  .badge { display: inline-block; background: linear-gradient(90deg, #7c4dff, #448aff); color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; margin-left: 8px; }
  a { color: #b388ff; }
  @media (max-width: 600px) { .signs { grid-template-columns: repeat(3, 1fr); } h1 { font-size: 1.8rem; } }
</style>
</head>
<body>
<div class="container">
  <h1>🔮 Fortune API</h1>
  <p class="subtitle">毎日の星座占い × タロットカード API<span class="badge">FREE</span></p>

  <div class="card">
    <h2>✨ 今日の星座を選んでください（${today}）</h2>
    <div class="signs" id="signs"></div>
  </div>

  <div class="card">
    <h2>📡 API Endpoints</h2>
    <div class="endpoint"><span class="method">GET</span><span class="path">/api/fortune/today</span><div class="desc">全12星座の今日の運勢を取得</div></div>
    <div class="endpoint"><span class="method">GET</span><span class="path">/api/fortune/today/:sign</span><div class="desc">特定の星座の運勢を取得（例: /api/fortune/today/aries）</div></div>
    <div class="endpoint"><span class="method">GET</span><span class="path">/api/fortune/ranking</span><div class="desc">今日の星座ランキング（1位〜12位）</div></div>
    <div class="endpoint"><span class="method">GET</span><span class="path">/api/health</span><div class="desc">ヘルスチェック</div></div>
  </div>

  <div class="card">
    <h2>💡 使い方</h2>
    <div class="endpoint">curl https://fortune-api.yagami8095.workers.dev/api/fortune/today/leo</div>
    <p style="margin-top:12px; color:#b8a0e0; font-size:0.9rem;">
      レスポンスにはタロットカード、カテゴリ別スコア（恋愛・仕事・金運・健康）、ラッキーアイテム、ラッキーカラー、ラッキーナンバー、方角が含まれます。
    </p>
  </div>

  <div class="card" id="result" style="display:none;">
    <h2 id="result-title"></h2>
    <pre id="result-json" style="white-space:pre-wrap; font-size:0.85rem; color:#80d8ff; max-height:400px; overflow:auto;"></pre>
  </div>

  <div class="footer">
    <p>🌙 Powered by OpenClaw Intelligence Pipeline</p>
    <p style="margin-top:4px;">占いはエンターテインメントです。重要な判断は専門家にご相談ください。</p>
    <p style="margin-top:8px;"><a href="https://note.com/yedanyagami">note.com/yedanyagami</a> で毎日の詳細占いを公開中</p>
  </div>
</div>
<script>
const signs = ${JSON.stringify(Object.entries(ZODIAC_SIGNS).map(([k,v]) => ({key:k, ...v})))};
const grid = document.getElementById('signs');
signs.forEach(s => {
  const a = document.createElement('a');
  a.className = 'sign';
  a.href = '#';
  a.innerHTML = '<span class="emoji">' + s.emoji + '</span><span class="name">' + s.jp + '</span>';
  a.onclick = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/fortune/today/' + s.key);
    const data = await res.json();
    document.getElementById('result').style.display = 'block';
    document.getElementById('result-title').textContent = s.emoji + ' ' + s.jp + 'の今日の運勢';
    document.getElementById('result-json').textContent = JSON.stringify(data, null, 2);
    document.getElementById('result').scrollIntoView({behavior:'smooth'});
  };
  grid.appendChild(a);
});
</script>
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
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Edge Defense
    const defense = await edgeDefense(request, env, 'fortune-api');
    if (defense.action === 'honeypot') return new Response('Not Found', { status: 404 });
    if (defense.action === 'reject' || defense.action === 'block') return new Response(JSON.stringify({ error: defense.reason }), { status: defense.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    if (defense.action === 'throttle' && defense.delay) await new Promise(r => setTimeout(r, defense.delay));

    // FinOps Circuit Breaker
    const finops = await finopsTrack(env, 'fortune-api');
    if (!finops.ok) return new Response(JSON.stringify({ error: finops.reason }), { status: 503, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    if (finops.delay) await new Promise(r => setTimeout(r, finops.delay));
    await trackRef(request, env, 'fortune-api');

    // Routes
    if (path === '/' || path === '') {
      return landingPage();
    }

    if (path === '/api/health') {
      return jsonResponse({ status: 'ok', service: 'fortune-api', date: getTodayJST(), version: '1.0.1' });
    }

    // Rate limit on API endpoints (not landing/health)
    if (path.startsWith('/api/fortune')) {
      const clientIp = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || 'unknown';
      const rl = await checkRateLimit(env.KV, clientIp);
      if (!rl.allowed) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded', limit: FORTUNE_API_RATE_LIMIT, trial: 'https://product-store.yagami8095.workers.dev/auth/login', upgrade: 'https://product-store.yagami8095.workers.dev' }), {
          status: 429, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    const today = getTodayJST();

    if (path === '/api/fortune/today') {
      const data = generateDailyFortune(today);
      return jsonResponse(data);
    }

    if (path === '/api/fortune/ranking') {
      const data = generateDailyFortune(today);
      return jsonResponse({
        date: data.date,
        ranking: data.ranking.map((r, i) => ({
          rank: i + 1,
          ...r,
          score: data.fortunes[r.sign_en].score,
          tier: data.fortunes[r.sign_en].tier,
        })),
      });
    }

    const signMatch = path.match(/^\/api\/fortune\/today\/(.+)$/);
    if (signMatch) {
      const signInput = decodeURIComponent(signMatch[1]);
      const signKey = resolveSign(signInput);
      if (!signKey) {
        return jsonResponse({
          error: 'Unknown sign',
          input: signInput,
          available: Object.entries(ZODIAC_SIGNS).map(([k,v]) => `${k} (${v.jp} ${v.emoji})`),
        }, 404);
      }
      const data = generateDailyFortune(today);
      return jsonResponse({
        date: data.date,
        ...data.fortunes[signKey],
      });
    }

    return jsonResponse({ error: 'Not found', endpoints: ['/api/fortune/today', '/api/fortune/today/:sign', '/api/fortune/ranking', '/api/health'] }, 404);
  },
};
