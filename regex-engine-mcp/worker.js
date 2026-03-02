/**
 * Regex Engine MCP Server
 * Cloudflare Worker — MCP protocol version 2025-03-26
 * Vendor: OpenClaw Intelligence
 */

const SERVER_INFO = {
  name: 'regex-engine',
  version: '1.0.0',
  vendor: 'OpenClaw Intelligence',
  protocolVersion: '2025-03-26',
};

const ECOSYSTEM = {
  regex: 'https://regex-engine-mcp.yagami8095.workers.dev/mcp',
  json: 'https://json-toolkit-mcp.yagami8095.workers.dev/mcp',
  color: 'https://color-palette-mcp.yagami8095.workers.dev/mcp',
  prompt: 'https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp',
  timestamp: 'https://timestamp-converter-mcp.yagami8095.workers.dev/mcp',
  intel: 'https://openclaw-intel-mcp.yagami8095.workers.dev/mcp',
  fortune: 'https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp',
  moltbook: 'https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp',
  agentforge: 'https://agentforge-compare-mcp.yagami8095.workers.dev/mcp',
  store: 'https://product-store.yagami8095.workers.dev',
  fortune_api: 'https://fortune-api.yagami8095.workers.dev',
  intel_api: 'https://openclaw-intel-api.yagami8095.workers.dev',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// ─── Rate Limiting ────────────────────────────────────────────────────────────

const RATE_LIMIT = 20;

async function checkRateLimit(env, ip) {
  if (!env.KV) return { allowed: true, remaining: RATE_LIMIT, reset: 0 };

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const key = `rl:regex:${ip}:${today}`;

  const raw = await env.KV.get(key);
  const count = raw ? parseInt(raw, 10) : 0;

  if (count >= RATE_LIMIT) {
    const midnight = new Date();
    midnight.setUTCHours(24, 0, 0, 0);
    return {
      allowed: false,
      remaining: 0,
      reset: Math.floor(midnight.getTime() / 1000),
    };
  }

  const ttl = 86400 - (Date.now() % 86400000) / 1000;
  await env.KV.put(key, String(count + 1), { expirationTtl: Math.ceil(ttl) });

  return {
    allowed: true,
    remaining: RATE_LIMIT - count - 1,
    reset: 0,
  };
}

// ─── Regex Explain ────────────────────────────────────────────────────────────

const TOKEN_PATTERNS = [
  // Anchors
  { re: /^\^/, label: 'anchor', desc: 'Start of string/line' },
  { re: /^\$/, label: 'anchor', desc: 'End of string/line' },
  { re: /^\\b/, label: 'anchor', desc: 'Word boundary' },
  { re: /^\\B/, label: 'anchor', desc: 'Non-word boundary' },
  { re: /^\\A/, label: 'anchor', desc: 'Start of string (Python/Ruby)' },
  { re: /^\\Z/, label: 'anchor', desc: 'End of string (Python/Ruby)' },

  // Character classes — shorthands
  { re: /^\\d/, label: 'charclass', desc: 'A digit character [0-9]' },
  { re: /^\\D/, label: 'charclass', desc: 'A non-digit character [^0-9]' },
  { re: /^\\w/, label: 'charclass', desc: 'A word character [a-zA-Z0-9_]' },
  { re: /^\\W/, label: 'charclass', desc: 'A non-word character [^a-zA-Z0-9_]' },
  { re: /^\\s/, label: 'charclass', desc: 'A whitespace character (space, tab, newline, etc.)' },
  { re: /^\\S/, label: 'charclass', desc: 'A non-whitespace character' },
  { re: /^\\./, label: 'charclass', desc: 'A literal dot character' },

  // Escape sequences
  { re: /^\\n/, label: 'escape', desc: 'Newline character' },
  { re: /^\\r/, label: 'escape', desc: 'Carriage return character' },
  { re: /^\\t/, label: 'escape', desc: 'Tab character' },
  { re: /^\\f/, label: 'escape', desc: 'Form feed character' },
  { re: /^\\v/, label: 'escape', desc: 'Vertical tab character' },
  { re: /^\\0/, label: 'escape', desc: 'Null character' },
  { re: /^\\x[0-9a-fA-F]{2}/, label: 'escape', desc: (m) => `Hex escape for character U+${m.slice(2).toUpperCase()}` },
  { re: /^\\u[0-9a-fA-F]{4}/, label: 'escape', desc: (m) => `Unicode escape for character U+${m.slice(2).toUpperCase()}` },
  { re: /^\\([0-9]+)/, label: 'backref', desc: (m) => `Backreference to capture group ${m.slice(1)}` },
  { re: /^\\(.)/, label: 'escape', desc: (m) => `Literal "${m[1]}" character (escaped)` },

  // Dot
  { re: /^\./, label: 'wildcard', desc: 'Any character except newline (unless dotall flag is set)' },

  // Quantifiers — greedy
  { re: /^\*\?/, label: 'quantifier', desc: 'Zero or more times (lazy/non-greedy)' },
  { re: /^\+\?/, label: 'quantifier', desc: 'One or more times (lazy/non-greedy)' },
  { re: /^\?\?/, label: 'quantifier', desc: 'Zero or one time (lazy/non-greedy)' },
  { re: /^\{(\d+),(\d+)\}\?/, label: 'quantifier', desc: (m, a, b) => `Between ${a} and ${b} times (lazy)` },
  { re: /^\{(\d+),\}\?/, label: 'quantifier', desc: (m, a) => `At least ${a} times (lazy)` },
  { re: /^\{(\d+)\}\?/, label: 'quantifier', desc: (m, a) => `Exactly ${a} times (lazy)` },
  { re: /^\{(\d+),(\d+)\}/, label: 'quantifier', desc: (m, a, b) => `Between ${a} and ${b} times (greedy)` },
  { re: /^\{(\d+),\}/, label: 'quantifier', desc: (m, a) => `At least ${a} times (greedy)` },
  { re: /^\{(\d+)\}/, label: 'quantifier', desc: (m, a) => `Exactly ${a} times` },
  { re: /^\*/, label: 'quantifier', desc: 'Zero or more times (greedy)' },
  { re: /^\+/, label: 'quantifier', desc: 'One or more times (greedy)' },
  { re: /^\?/, label: 'quantifier', desc: 'Zero or one time (optional)' },

  // Alternation
  { re: /^\|/, label: 'alternation', desc: 'OR — matches either the left or right side' },

  // Character class
  {
    re: /^\[(\^?)([^\]]*)\]/,
    label: 'charclass',
    desc: (m, neg, inner) => {
      const negated = neg === '^';
      const parts = explainCharClassContent(inner);
      return `${negated ? 'Any character NOT in' : 'Any character in'} the set: ${parts.join(', ')}`;
    },
  },

  // Groups
  { re: /^\(\?<([^>]+)>/, label: 'group', desc: (m, name) => `Named capture group "${name}"` },
  { re: /^\(\?:/, label: 'group', desc: 'Non-capturing group (groups without saving the match)' },
  { re: /^\(\?=/, label: 'lookahead', desc: 'Positive lookahead (asserts what follows matches, without consuming)' },
  { re: /^\(\?!/, label: 'lookahead', desc: 'Negative lookahead (asserts what follows does NOT match)' },
  { re: /^\(\?<=/, label: 'lookbehind', desc: 'Positive lookbehind (asserts what precedes matches, without consuming)' },
  { re: /^\(\?<!/, label: 'lookbehind', desc: 'Negative lookbehind (asserts what precedes does NOT match)' },
  { re: /^\(/, label: 'group', desc: (m, idx) => `Capture group #${idx} — saves the matched text for later use` },
  { re: /^\)/, label: 'group_end', desc: 'End of group' },
];

function explainCharClassContent(inner) {
  const parts = [];
  let i = 0;
  while (i < inner.length) {
    if (i + 2 < inner.length && inner[i + 1] === '-') {
      parts.push(`"${inner[i]}" to "${inner[i + 2]}"`);
      i += 3;
    } else if (inner[i] === '\\' && i + 1 < inner.length) {
      const seq = inner[i] + inner[i + 1];
      const shorthands = {
        '\\d': 'digits (0-9)',
        '\\D': 'non-digits',
        '\\w': 'word chars (a-z, A-Z, 0-9, _)',
        '\\W': 'non-word chars',
        '\\s': 'whitespace',
        '\\S': 'non-whitespace',
        '\\n': 'newline',
        '\\t': 'tab',
        '\\r': 'carriage return',
      };
      parts.push(shorthands[seq] || `"${inner[i + 1]}"`);
      i += 2;
    } else {
      parts.push(`"${inner[i]}"`);
      i++;
    }
  }
  return parts;
}

function explainRegex(pattern) {
  const tokens = [];
  let remaining = pattern;
  let groupCount = 0;

  while (remaining.length > 0) {
    let matched = false;

    for (const tp of TOKEN_PATTERNS) {
      const m = remaining.match(tp.re);
      if (m) {
        let desc;
        if (typeof tp.desc === 'function') {
          if (tp.label === 'group' && tp.re.source === '^\\(') {
            groupCount++;
            desc = tp.desc(m[0], groupCount);
          } else {
            desc = tp.desc(m[0], m[1], m[2], m[3]);
          }
        } else {
          desc = tp.desc;
        }
        tokens.push({ token: m[0], type: tp.label, description: desc });
        remaining = remaining.slice(m[0].length);
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Literal character
      tokens.push({
        token: remaining[0],
        type: 'literal',
        description: `Literal character "${remaining[0]}"`,
      });
      remaining = remaining.slice(1);
    }
  }

  // Build human-readable summary
  const summary = tokens
    .map((t) => `${t.token} → ${t.description}`)
    .join('\n');

  return { tokens, summary };
}

// ─── Regex Build ─────────────────────────────────────────────────────────────

const PATTERN_LIBRARY = {
  email: {
    keywords: ['email', 'e-mail', 'mail address', 'email address'],
    js: '[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}',
    python: '[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}',
    go: '[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}',
    flags: 'gi',
    description: 'Matches email addresses like user@example.com',
    examples: ['user@example.com', 'first.last+tag@sub.domain.org', 'name123@mail.co.jp'],
  },
  url: {
    keywords: ['url', 'uri', 'link', 'http', 'https', 'web address', 'website'],
    js: 'https?:\\/\\/(?:www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b(?:[-a-zA-Z0-9()@:%_\\+.~#?&\\/=]*)',
    python: 'https?://(?:www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b(?:[-a-zA-Z0-9()@:%_\\+.~#?&/=]*)',
    go: 'https?://(?:www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b(?:[-a-zA-Z0-9()@:%_\\+.~#?&/=]*)',
    flags: 'gi',
    description: 'Matches HTTP and HTTPS URLs',
    examples: ['https://example.com', 'http://www.site.org/path?q=1', 'https://sub.domain.co.jp/page'],
  },
  ip: {
    keywords: ['ip', 'ip address', 'ipv4', 'ip4', 'internet protocol'],
    js: '\\b(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\b',
    python: '\\b(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\b',
    go: '\\b(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\b',
    flags: 'g',
    description: 'Matches valid IPv4 addresses (0-255 per octet)',
    examples: ['192.168.1.1', '10.0.0.255', '255.255.255.0'],
  },
  ipv6: {
    keywords: ['ipv6', 'ip6', 'ipv6 address'],
    js: '(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:)*::(?:[0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}',
    python: '(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:)*::(?:[0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}',
    go: '(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:)*::(?:[0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}',
    flags: 'gi',
    description: 'Matches IPv6 addresses',
    examples: ['2001:db8::1', 'fe80::1ff:fe23:4567:890a', '::1'],
  },
  phone_us: {
    keywords: ['phone', 'phone number', 'telephone', 'us phone', 'american phone', 'mobile number'],
    js: '(?:\\+?1[\\s.-]?)?\\(?([2-9][0-9]{2})\\)?[\\s.-]?([2-9][0-9]{2})[\\s.-]?([0-9]{4})',
    python: '(?:\\+?1[\\s.-]?)?\\(?([2-9][0-9]{2})\\)?[\\s.-]?([2-9][0-9]{2})[\\s.-]?([0-9]{4})',
    go: '(?:\\+?1[\\s.-]?)?\\(?([2-9][0-9]{2})\\)?[\\s.-]?([2-9][0-9]{2})[\\s.-]?([0-9]{4})',
    flags: 'g',
    description: 'Matches US phone numbers in various formats',
    examples: ['(555) 123-4567', '+1 800 555-0199', '555.123.4567'],
  },
  date_iso: {
    keywords: ['date', 'iso date', 'date format', 'yyyy-mm-dd', 'iso8601'],
    js: '\\b(\\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])\\b',
    python: '\\b(\\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])\\b',
    go: '\\b(\\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])\\b',
    flags: 'g',
    description: 'Matches ISO 8601 dates (YYYY-MM-DD)',
    examples: ['2024-01-15', '2025-12-31', '1999-06-07'],
  },
  date_us: {
    keywords: ['us date', 'mm/dd/yyyy', 'american date', 'date us format'],
    js: '\\b(0?[1-9]|1[0-2])\\/(0?[1-9]|[12]\\d|3[01])\\/(\\d{4})\\b',
    python: '\\b(0?[1-9]|1[0-2])\\/(0?[1-9]|[12]\\d|3[01])\\/(\\d{4})\\b',
    go: '\\b(0?[1-9]|1[0-2])\\/(0?[1-9]|[12]\\d|3[01])\\/(\\d{4})\\b',
    flags: 'g',
    description: 'Matches US format dates (MM/DD/YYYY)',
    examples: ['12/25/2024', '01/01/2025', '6/7/1999'],
  },
  time: {
    keywords: ['time', 'time format', 'hh:mm', 'clock', '24 hour', '12 hour'],
    js: '\\b([01]?\\d|2[0-3]):([0-5]\\d)(?::([0-5]\\d))?\\b',
    python: '\\b([01]?\\d|2[0-3]):([0-5]\\d)(?::([0-5]\\d))?\\b',
    go: '\\b([01]?\\d|2[0-3]):([0-5]\\d)(?::([0-5]\\d))?\\b',
    flags: 'g',
    description: 'Matches time in HH:MM or HH:MM:SS format (24-hour)',
    examples: ['09:30', '23:59:59', '0:00', '14:05:12'],
  },
  hex_color: {
    keywords: ['hex color', 'color', 'colour', 'css color', 'hexadecimal color', '#color'],
    js: '#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\\b',
    python: '#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\\b',
    go: '#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\\b',
    flags: 'gi',
    description: 'Matches CSS hex color codes (#RGB or #RRGGBB)',
    examples: ['#fff', '#FF5733', '#a1b2c3'],
  },
  credit_card: {
    keywords: ['credit card', 'card number', 'visa', 'mastercard', 'cc number'],
    js: '\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\\b',
    python: '\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\\b',
    go: '\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\\b',
    flags: 'g',
    description: 'Matches Visa, Mastercard, Amex, and Discover card numbers (no spaces)',
    examples: ['4111111111111111', '5500005555555559', '378282246310005'],
  },
  zip_us: {
    keywords: ['zip code', 'postal code', 'us zip', 'zipcode'],
    js: '\\b\\d{5}(?:-\\d{4})?\\b',
    python: '\\b\\d{5}(?:-\\d{4})?\\b',
    go: '\\b\\d{5}(?:-\\d{4})?\\b',
    flags: 'g',
    description: 'Matches US ZIP codes (5-digit or ZIP+4)',
    examples: ['90210', '10001-1234', '12345'],
  },
  slug: {
    keywords: ['slug', 'url slug', 'kebab case', 'url-friendly'],
    js: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
    python: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
    go: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
    flags: '',
    description: 'Matches URL slugs (lowercase letters, numbers, hyphens)',
    examples: ['my-blog-post', 'article-123', 'hello-world'],
  },
  username: {
    keywords: ['username', 'user name', 'login name', 'account name'],
    js: '^[a-zA-Z][a-zA-Z0-9_\\-]{2,19}$',
    python: '^[a-zA-Z][a-zA-Z0-9_\\-]{2,19}$',
    go: '^[a-zA-Z][a-zA-Z0-9_\\-]{2,19}$',
    flags: '',
    description: 'Matches usernames: starts with letter, 3-20 chars, letters/digits/underscore/hyphen',
    examples: ['user_123', 'John-Doe', 'alice99'],
  },
  password_strong: {
    keywords: ['password', 'strong password', 'secure password'],
    js: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=\\[\\]{};\':"\\\\|,.<>\\/?]).{8,}$',
    python: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=\\[\\]{};\':"\\\\|,.<>\\/?]).{8,}$',
    go: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=\\[\\]{};\':"\\\\|,.<>\\/?]).{8,}$',
    flags: '',
    description: 'Validates strong passwords: min 8 chars, requires uppercase, lowercase, digit, and special character',
    examples: ['P@ssw0rd!', 'Secur3#Pass', 'MyP@55w0rd!'],
  },
  uuid: {
    keywords: ['uuid', 'guid', 'unique id', 'unique identifier'],
    js: '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}',
    python: '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}',
    go: '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}',
    flags: 'gi',
    description: 'Matches UUID v1-v5 format',
    examples: ['550e8400-e29b-41d4-a716-446655440000', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'],
  },
  jwt: {
    keywords: ['jwt', 'json web token', 'bearer token', 'token'],
    js: 'eyJ[A-Za-z0-9_-]*\\.[A-Za-z0-9_-]*\\.[A-Za-z0-9_-]*',
    python: 'eyJ[A-Za-z0-9_-]*\\.[A-Za-z0-9_-]*\\.[A-Za-z0-9_-]*',
    go: 'eyJ[A-Za-z0-9_-]*\\.[A-Za-z0-9_-]*\\.[A-Za-z0-9_-]*',
    flags: 'g',
    description: 'Matches JWT tokens (three base64url segments starting with eyJ)',
    examples: ['eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.abc123'],
  },
  markdown_link: {
    keywords: ['markdown link', 'md link', 'markdown url'],
    js: '\\[([^\\]]+)\\]\\(([^)]+)\\)',
    python: '\\[([^\\]]+)\\]\\(([^)]+)\\)',
    go: '\\[([^\\]]+)\\]\\(([^)]+)\\)',
    flags: 'g',
    description: 'Matches Markdown links [text](url)',
    examples: ['[Google](https://google.com)', '[Click here](http://example.com)'],
  },
  html_tag: {
    keywords: ['html tag', 'html', 'xml tag', 'tag'],
    js: '<([a-zA-Z][a-zA-Z0-9]*)(?:\\s[^>]*)?>.*?<\\/\\1>|<([a-zA-Z][a-zA-Z0-9]*)(?:\\s[^>]*)?\\/>',
    python: '<([a-zA-Z][a-zA-Z0-9]*)(?:\\s[^>]*)?>.*?<\\/\\1>|<([a-zA-Z][a-zA-Z0-9]*)(?:\\s[^>]*)?\\/>',
    go: '<([a-zA-Z][a-zA-Z0-9]*)(?:\\s[^>]*)?>.*?<\\/\\1>|<([a-zA-Z][a-zA-Z0-9]*)(?:\\s[^>]*)?\\/>',
    flags: 'gis',
    description: 'Matches HTML/XML tags (opening+closing pairs or self-closing)',
    examples: ['<div class="foo">content</div>', '<br/>', '<img src="pic.jpg"/>'],
  },
  ssn: {
    keywords: ['ssn', 'social security', 'social security number'],
    js: '\\b(?!000|666|9\\d{2})\\d{3}-(?!00)\\d{2}-(?!0000)\\d{4}\\b',
    python: '\\b(?!000|666|9\\d{2})\\d{3}-(?!00)\\d{2}-(?!0000)\\d{4}\\b',
    go: '\\b(?!000|666|9\\d{2})\\d{3}-(?!00)\\d{2}-(?!0000)\\d{4}\\b',
    flags: 'g',
    description: 'Matches US Social Security Numbers (excludes invalid ranges)',
    examples: ['123-45-6789', '456-78-9012'],
  },
  semver: {
    keywords: ['semver', 'semantic version', 'version number', 'version string'],
    js: '\\bv?(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-((?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?\\b',
    python: '\\bv?(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-((?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?\\b',
    go: '\\bv?(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-((?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?\\b',
    flags: 'g',
    description: 'Matches Semantic Version strings (MAJOR.MINOR.PATCH[-prerelease][+build])',
    examples: ['1.0.0', '2.3.4-beta.1', 'v0.1.0+build.123'],
  },
  mac_address: {
    keywords: ['mac address', 'mac', 'hardware address', 'network address'],
    js: '\\b([0-9a-fA-F]{2}[:\\-]){5}[0-9a-fA-F]{2}\\b',
    python: '\\b([0-9a-fA-F]{2}[:\\-]){5}[0-9a-fA-F]{2}\\b',
    go: '\\b([0-9a-fA-F]{2}[:\\-]){5}[0-9a-fA-F]{2}\\b',
    flags: 'gi',
    description: 'Matches MAC addresses with colon or hyphen separators',
    examples: ['00:1A:2B:3C:4D:5E', 'FF-FF-FF-FF-FF-FF', 'aa:bb:cc:dd:ee:ff'],
  },
};

function buildPattern(description, flavor = 'js') {
  const desc = description.toLowerCase().trim();
  let best = null;
  let bestScore = 0;

  for (const [name, entry] of Object.entries(PATTERN_LIBRARY)) {
    for (const kw of entry.keywords) {
      if (desc.includes(kw)) {
        const score = kw.length;
        if (score > bestScore) {
          bestScore = score;
          best = { name, entry };
        }
      }
    }
  }

  if (!best) {
    return {
      found: false,
      suggestions: Object.keys(PATTERN_LIBRARY).slice(0, 8),
      message: `No built-in pattern matched "${description}". Available patterns: ${Object.keys(PATTERN_LIBRARY).join(', ')}`,
    };
  }

  const flavorKey = ['js', 'python', 'go'].includes(flavor) ? flavor : 'js';
  const pattern = best.entry[flavorKey];
  const { tokens, summary } = explainRegex(pattern);

  return {
    found: true,
    name: best.name,
    pattern,
    flags: best.entry.flags,
    flavor: flavorKey,
    description: best.entry.description,
    explanation: summary,
    examples: best.entry.examples,
    tokenCount: tokens.length,
  };
}

// ─── Tool Implementations ─────────────────────────────────────────────────────

function tool_regex_test({ pattern, text, flags = 'g' }) {
  if (!pattern || typeof pattern !== 'string') {
    throw new Error('pattern is required and must be a string');
  }
  if (typeof text !== 'string') {
    throw new Error('text is required and must be a string');
  }

  let re;
  try {
    re = new RegExp(pattern, flags);
  } catch (e) {
    throw new Error(`Invalid regex pattern: ${e.message}`);
  }

  const matches = [];

  if (flags.includes('g') || flags.includes('y')) {
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(text)) !== null) {
      matches.push({
        fullMatch: m[0],
        groups: m.slice(1),
        namedGroups: m.groups ? { ...m.groups } : {},
        index: m.index,
        end: m.index + m[0].length,
      });
      if (!flags.includes('g')) break;
      if (m[0].length === 0) re.lastIndex++;
    }
  } else {
    const m = re.exec(text);
    if (m) {
      matches.push({
        fullMatch: m[0],
        groups: m.slice(1),
        namedGroups: m.groups ? { ...m.groups } : {},
        index: m.index,
        end: m.index + m[0].length,
      });
    }
  }

  return {
    pattern,
    flags,
    text: text.length > 500 ? text.slice(0, 500) + '...' : text,
    matched: matches.length > 0,
    matchCount: matches.length,
    matches,
    ecosystem: ECOSYSTEM,
  };
}

function tool_regex_explain({ pattern }) {
  if (!pattern || typeof pattern !== 'string') {
    throw new Error('pattern is required and must be a string');
  }

  // Validate it's a real regex
  try {
    new RegExp(pattern);
  } catch (e) {
    throw new Error(`Invalid regex pattern: ${e.message}`);
  }

  const { tokens, summary } = explainRegex(pattern);

  return {
    pattern,
    tokenCount: tokens.length,
    tokens,
    summary,
    readableExplanation:
      'This regex pattern ' +
      tokens
        .map((t) => {
          if (t.type === 'literal') return `matches the literal character "${t.token}"`;
          if (t.type === 'quantifier') return `(${t.description.toLowerCase()})`;
          if (t.type === 'anchor') return `asserts ${t.description.toLowerCase()}`;
          if (t.type === 'group' || t.type === 'group_end') return `[${t.description.toLowerCase()}]`;
          return t.description.toLowerCase();
        })
        .join(', '),
    ecosystem: ECOSYSTEM,
  };
}

function tool_regex_build({ description, flavor = 'js' }) {
  if (!description || typeof description !== 'string') {
    throw new Error('description is required and must be a string');
  }

  const result = buildPattern(description, flavor);

  return {
    description,
    flavor,
    ...result,
    ecosystem: ECOSYSTEM,
  };
}

function tool_regex_replace({ pattern, text, replacement, flags = 'g' }) {
  if (!pattern || typeof pattern !== 'string') {
    throw new Error('pattern is required and must be a string');
  }
  if (typeof text !== 'string') {
    throw new Error('text is required and must be a string');
  }
  if (typeof replacement !== 'string') {
    throw new Error('replacement is required and must be a string');
  }

  let re;
  try {
    re = new RegExp(pattern, flags);
  } catch (e) {
    throw new Error(`Invalid regex pattern: ${e.message}`);
  }

  const original = text;
  const result = text.replace(re, replacement);
  const changed = original !== result;

  // Count replacements made
  let replaceCount = 0;
  if (changed) {
    const testRe = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g');
    const allMatches = original.match(testRe);
    replaceCount = allMatches ? allMatches.length : (changed ? 1 : 0);
    if (!flags.includes('g')) replaceCount = Math.min(replaceCount, 1);
  }

  return {
    pattern,
    flags,
    replacement,
    original: original.length > 500 ? original.slice(0, 500) + '...' : original,
    result: result.length > 500 ? result.slice(0, 500) + '...' : result,
    changed,
    replacementCount: replaceCount,
    ecosystem: ECOSYSTEM,
  };
}

function tool_regex_extract({ pattern, text, flags = 'g' }) {
  if (!pattern || typeof pattern !== 'string') {
    throw new Error('pattern is required and must be a string');
  }
  if (typeof text !== 'string') {
    throw new Error('text is required and must be a string');
  }

  let re;
  try {
    const effectiveFlags = flags.includes('g') ? flags : flags + 'g';
    re = new RegExp(pattern, effectiveFlags);
  } catch (e) {
    throw new Error(`Invalid regex pattern: ${e.message}`);
  }

  const extracted = [];
  let m;
  re.lastIndex = 0;

  while ((m = re.exec(text)) !== null) {
    const entry = {
      match: m[0],
      index: m.index,
      end: m.index + m[0].length,
    };

    if (m.groups && Object.keys(m.groups).length > 0) {
      entry.namedGroups = { ...m.groups };
    }

    if (m.length > 1) {
      entry.captureGroups = m.slice(1);
    }

    extracted.push(entry);

    if (m[0].length === 0) re.lastIndex++;
  }

  const allValues = extracted.map((e) => e.match);
  const unique = [...new Set(allValues)];

  return {
    pattern,
    flags: re.flags,
    totalMatches: extracted.length,
    uniqueMatches: unique.length,
    matches: extracted,
    uniqueValues: unique,
    hasNamedGroups: extracted.length > 0 && !!extracted[0].namedGroups,
    hasCaptureGroups: extracted.length > 0 && !!extracted[0].captureGroups,
    ecosystem: ECOSYSTEM,
  };
}

// ─── Tool Registry ────────────────────────────────────────────────────────────

const TOOLS = {
  regex_test: {
    description: 'Test a regex pattern against input text. Returns matches (full match + groups), match count, and positions.',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'The regex pattern to test' },
        text: { type: 'string', description: 'The text to test against' },
        flags: { type: 'string', description: 'Regex flags (e.g., "gi", "m"). Defaults to "g"', default: 'g' },
      },
      required: ['pattern', 'text'],
    },
    handler: tool_regex_test,
  },
  regex_explain: {
    description: 'Explain a regex pattern in plain English, token by token.',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'The regex pattern to explain' },
      },
      required: ['pattern'],
    },
    handler: tool_regex_explain,
  },
  regex_build: {
    description: 'Build a regex from a natural language description (e.g., "match email addresses"). Returns pattern, explanation, and test examples.',
    inputSchema: {
      type: 'object',
      properties: {
        description: { type: 'string', description: 'Natural language description of what to match' },
        flavor: {
          type: 'string',
          enum: ['js', 'python', 'go'],
          description: 'Regex flavor/dialect. Defaults to "js"',
          default: 'js',
        },
      },
      required: ['description'],
    },
    handler: tool_regex_build,
  },
  regex_replace: {
    description: 'Apply a regex find-and-replace on text.',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'The regex pattern to find' },
        text: { type: 'string', description: 'The input text' },
        replacement: { type: 'string', description: 'The replacement string (can use $1, $2, etc. for capture groups)' },
        flags: { type: 'string', description: 'Regex flags. Defaults to "g"', default: 'g' },
      },
      required: ['pattern', 'text', 'replacement'],
    },
    handler: tool_regex_replace,
  },
  regex_extract: {
    description: 'Extract all matches from text with named capture group support.',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'The regex pattern to extract with (may include named groups (?<name>...))' },
        text: { type: 'string', description: 'The input text' },
        flags: { type: 'string', description: 'Regex flags. Defaults to "g"', default: 'g' },
      },
      required: ['pattern', 'text'],
    },
    handler: tool_regex_extract,
  },
};

// ─── MCP Protocol Handler ─────────────────────────────────────────────────────

function mcpResponse(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function mcpError(id, code, message, data) {
  return {
    jsonrpc: '2.0',
    id,
    error: { code, message, ...(data ? { data } : {}) },
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

function handleMCPRequest(req) {
  const { jsonrpc, method, params, id } = req;

  if (jsonrpc !== '2.0') {
    return mcpError(id ?? null, -32600, 'Invalid Request: jsonrpc must be "2.0"');
  }

  switch (method) {
    case 'initialize':
      return mcpResponse(id, {
        protocolVersion: SERVER_INFO.protocolVersion,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: SERVER_INFO.name, version: SERVER_INFO.version },
        instructions:
          'Regex Engine MCP by OpenClaw Intelligence. Use regex_build to create patterns from descriptions, regex_test to validate them, regex_explain to understand them, regex_replace to transform text, and regex_extract to pull out data.',
      });

    case 'notifications/initialized':
      return null; // no response for notifications

    case 'tools/list':
      return mcpResponse(id, {
        tools: Object.entries(TOOLS).map(([name, tool]) => ({
          name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      });

    case 'tools/call': {
      const { name, arguments: args = {} } = params || {};

      if (!name) {
        return mcpError(id, -32602, 'Invalid params: tool name is required');
      }

      const tool = TOOLS[name];
      if (!tool) {
        return mcpError(id, -32601, `Tool not found: ${name}`);
      }

      try {
        const result = tool.handler(args);
        return mcpResponse(id, {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
          isError: false,
        });
      } catch (err) {
        return mcpResponse(id, {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: err.message, tool: name }, null, 2),
            },
          ],
          isError: true,
        });
      }
    }

    case 'resources/list':
      return mcpResponse(id, { resources: [] });

    case 'prompts/list':
      return mcpResponse(id, { prompts: [] });

    case 'ping':
      return mcpResponse(id, {});

    default:
      return mcpError(id ?? null, -32601, `Method not found: ${method}`);
  }
}

// ─── Landing Page ─────────────────────────────────────────────────────────────

function landingPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Regex Engine MCP — OpenClaw Intelligence</title>
  <meta name="description" content="Free MCP server for regex testing, debugging, and generation. Get explanations, examples, and multi-pattern matching for AI coding agents. Claude Code and Cursor compatible.">
  <meta name="keywords" content="regex tester, regular expression, regex debugger, MCP server, AI tools, pattern matching">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://regex-engine-mcp.yagami8095.workers.dev">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Regex Engine MCP Server - Test, Debug & Generate Regular Expressions | OpenClaw">
  <meta property="og:description" content="Free MCP server for regex testing, debugging, and generation. Get explanations, examples, and multi-pattern matching for AI coding agents. Claude Code and Cursor compatible.">
  <meta property="og:url" content="https://regex-engine-mcp.yagami8095.workers.dev">
  <meta property="og:site_name" content="OpenClaw Intelligence">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="Regex Engine MCP Server - Test, Debug & Generate Regular Expressions | OpenClaw">
  <meta name="twitter:description" content="Free MCP server for regex testing, debugging, and generation. Get explanations, examples, and multi-pattern matching for AI coding agents. Claude Code and Cursor compatible.">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    .gradient-bg { background: linear-gradient(135deg, #064e3b 0%, #065f46 40%, #047857 70%, #059669 100%); }
    .card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(10px); }
    .code-block { background: rgba(0,0,0,0.4); border: 1px solid rgba(16,185,129,0.3); }
    .tool-badge { background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.4); }
  </style>

  <script type="application/ld+json">
  {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Regex Engine MCP Server",
  "description": "Free MCP server for regex testing, debugging, and generation. Get explanations, examples, and multi-pattern matching for AI coding agents. Claude Code and Cursor compatible.",
  "url": "https://regex-engine-mcp.yagami8095.workers.dev",
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
<body class="gradient-bg min-h-screen text-white font-sans">
  <div class="max-w-4xl mx-auto px-4 py-12">

    <!-- Header -->
    <div class="text-center mb-12">
      <div class="text-6xl mb-4">🔍</div>
      <h1 class="text-4xl font-bold mb-2 text-emerald-300">Regex Engine MCP</h1>
      <p class="text-emerald-200 text-lg mb-1">by <span class="font-semibold text-white">OpenClaw Intelligence</span></p>
      <p class="text-gray-300 text-base max-w-xl mx-auto mt-3">
        A utility MCP server for AI agents that need to build, test, and explain regular expression patterns.
      </p>
      <div class="mt-4 flex justify-center gap-3 flex-wrap">
        <span class="px-3 py-1 rounded-full bg-emerald-800 text-emerald-200 text-sm">MCP 2025-03-26</span>
        <span class="px-3 py-1 rounded-full bg-emerald-800 text-emerald-200 text-sm">20 req/day free</span>
        <span class="px-3 py-1 rounded-full bg-emerald-800 text-emerald-200 text-sm">5 tools</span>
        <span class="px-3 py-1 rounded-full bg-emerald-800 text-emerald-200 text-sm">JSON-RPC 2.0</span>
      </div>
    </div>

    <!-- MCP Endpoint -->
    <div class="card rounded-xl p-5 mb-8">
      <h2 class="text-emerald-300 font-semibold text-lg mb-3">MCP Endpoint</h2>
      <div class="code-block rounded-lg p-3 font-mono text-sm text-emerald-400 break-all">
        POST https://regex-engine-mcp.yagami8095.workers.dev/mcp
      </div>
      <p class="text-gray-400 text-sm mt-2">Connect with any MCP-compatible AI client (Claude Desktop, OpenHands, etc.)</p>
    </div>

    <!-- Tools -->
    <div class="mb-8">
      <h2 class="text-emerald-300 font-semibold text-lg mb-4">Available Tools</h2>
      <div class="grid gap-3">
        ${[
          { name: 'regex_test', desc: 'Test a pattern against text — returns matches, positions, and capture groups' },
          { name: 'regex_explain', desc: 'Token-by-token plain English explanation of any regex pattern' },
          { name: 'regex_build', desc: 'Build a regex from natural language (email, URL, IP, phone, date, and 15+ more)' },
          { name: 'regex_replace', desc: 'Find-and-replace with regex — supports backreferences like $1, $2' },
          { name: 'regex_extract', desc: 'Extract all matches with named capture group support' },
        ]
          .map(
            (t) =>
              `<div class="card rounded-lg p-4 flex items-start gap-3">
          <span class="tool-badge text-emerald-300 font-mono text-sm px-2 py-1 rounded shrink-0">${t.name}</span>
          <span class="text-gray-300 text-sm">${t.desc}</span>
        </div>`
          )
          .join('')}
      </div>
    </div>

    <!-- Quick Example -->
    <div class="card rounded-xl p-5 mb-8">
      <h2 class="text-emerald-300 font-semibold text-lg mb-3">Quick Start</h2>
      <div class="code-block rounded-lg p-4 font-mono text-xs text-gray-300 overflow-x-auto">
<pre>{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "regex_build",
    "arguments": {
      "description": "match email addresses",
      "flavor": "js"
    }
  },
  "id": 1
}</pre>
      </div>
    </div>

    <!-- Ecosystem -->
    <div class="card rounded-xl p-5 mb-8">
      <h2 class="text-emerald-300 font-semibold text-lg mb-4">OpenClaw MCP Ecosystem</h2>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
        ${[
          { name: 'Regex Engine', url: 'regex-engine-mcp', current: true },
          { name: 'JSON Toolkit', url: 'json-toolkit-mcp' },
          { name: 'Color Palette', url: 'color-palette-mcp' },
          { name: 'Prompt Enhancer', url: 'prompt-enhancer-mcp' },
          { name: 'Timestamp Converter', url: 'timestamp-converter-mcp' },
          { name: 'Intel MCP', url: 'openclaw-intel-mcp' },
          { name: 'Fortune MCP', url: 'openclaw-fortune-mcp' },
          { name: 'MoltBook Publisher', url: 'moltbook-publisher-mcp' },
          { name: 'AgentForge Compare', url: 'agentforge-compare-mcp' },
        ]
          .map(
            (e) =>
              `<a href="https://${e.url}.yagami8095.workers.dev" target="_blank"
            class="flex items-center gap-1 px-3 py-2 rounded-lg ${
              e.current
                ? 'bg-emerald-700 text-white font-semibold'
                : 'bg-emerald-900/40 text-emerald-300 hover:bg-emerald-800/50'
            } transition-colors">
            ${e.current ? '★ ' : ''}<span class="truncate">${e.name}</span>
          </a>`
          )
          .join('')}
      </div>
    </div>

    <!-- Footer -->
    <div class="text-center text-gray-500 text-sm mt-8">
      <p>Regex Engine MCP v1.0.0 · <a href="https://product-store.yagami8095.workers.dev" class="text-emerald-400 hover:underline" target="_blank">OpenClaw Store</a></p>
      <p class="mt-1">20 requests/day free · Rate limited per IP</p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

function jsonResponse(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...extra,
    },
  });
}

function htmlResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...CORS_HEADERS,
    },
  });
}

// ============================================================
// Edge Defense Layer — Anti-Freeloader + Honeypot + Fingerprint
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
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const path = url.pathname;

    // Preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Edge Defense
    const defense = await edgeDefense(request, env, 'regex');
    if (defense.action === 'honeypot') return new Response('Not Found', { status: 404 });
    if (defense.action === 'reject' || defense.action === 'block') return new Response(JSON.stringify({ error: defense.reason }), { status: defense.status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
    if (defense.action === 'throttle' && defense.delay) await new Promise(r => setTimeout(r, defense.delay));

    // FinOps Circuit Breaker
    const finops = await finopsTrack(env, 'regex-engine');
    if (!finops.ok) return new Response(JSON.stringify({ error: finops.reason }), { status: 503, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
    if (finops.delay) await new Promise(r => setTimeout(r, finops.delay));
    await trackRef(request, env, 'regex-engine');

    // Landing page
    if (method === 'GET' && (path === '/' || path === '')) {
      return htmlResponse(landingPage());
    }

    // Health check
    if (method === 'GET' && path === '/health') {
      return jsonResponse({
        status: 'ok',
        service: SERVER_INFO.name,
        version: SERVER_INFO.version,
        vendor: SERVER_INFO.vendor,
        protocol: SERVER_INFO.protocolVersion,
        tools: Object.keys(TOOLS).length,
        patterns: Object.keys(PATTERN_LIBRARY).length,
        timestamp: new Date().toISOString(),
      });
    }

    // MCP info (GET)
    if (method === 'GET' && path === '/mcp') {
      return jsonResponse({
        server: SERVER_INFO,
        endpoint: `${url.origin}/mcp`,
        protocol: 'JSON-RPC 2.0',
        tools: Object.entries(TOOLS).map(([name, t]) => ({
          name,
          description: t.description,
        })),
        ecosystem: ECOSYSTEM,
        rateLimit: `${RATE_LIMIT} requests/day per IP`,
      });
    }

    // MCP protocol (POST)
    if (method === 'POST' && path === '/mcp') {
      // Rate limiting
      const clientIp =
        request.headers.get('CF-Connecting-IP') ||
        request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
        'unknown';

      const rl = await checkRateLimit(env, clientIp);

      if (!rl.allowed) {
        return jsonResponse(
          {
            jsonrpc: '2.0',
            id: null,
            error: {
              code: -32000,
              message: `Rate limit exceeded (${RATE_LIMIT}/day). Upgrade to Pro: $9 → 1000 calls/day\n\nPayPal: paypal.me/Yagami8095/9 | x402: $0.05/call USDC on Base`,
              data: { limit: RATE_LIMIT, remaining: 0, reset: rl.reset },
            },
          },
          429,
          { 'X-RateLimit-Limit': String(RATE_LIMIT), 'X-RateLimit-Remaining': '0' }
        );
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return jsonResponse(
          mcpError(null, -32700, 'Parse error: invalid JSON'),
          400
        );
      }

      const rlHeaders = {
        'X-RateLimit-Limit': String(RATE_LIMIT),
        'X-RateLimit-Remaining': String(rl.remaining),
      };

      const rateLimitInfo = { used: RATE_LIMIT - rl.remaining - 1, remaining: rl.remaining };

      // Batch support
      if (Array.isArray(body)) {
        const responses = body
          .map((req) => handleMCPRequest(req))
          .filter(Boolean);
        responses.forEach((r) => addUpgradePrompt(r, rateLimitInfo));
        return jsonResponse(responses, 200, rlHeaders);
      }

      // Single request
      const result = handleMCPRequest(body);
      if (result === null) {
        // Notification — respond with 204
        return new Response(null, { status: 204, headers: { ...CORS_HEADERS, ...rlHeaders } });
      }

      addUpgradePrompt(result, rateLimitInfo);
      return jsonResponse(result, 200, rlHeaders);
    }

    // 404
    return jsonResponse({ error: 'Not found', path }, 404);
  },
};
