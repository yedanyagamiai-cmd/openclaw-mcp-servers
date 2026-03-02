/**
 * JSON Toolkit MCP Server
 * Utility MCP server for AI agents that work with JSON data daily.
 *
 * Tools (6 free tools, 20 req/day per IP via KV rate limiting):
 *   1. json_format         — Pretty-print / minify JSON
 *   2. json_validate       — Validate JSON with detailed error info
 *   3. json_diff           — Compare two JSON objects (added/removed/changed paths)
 *   4. json_query          — Query JSON with JSONPath-like syntax
 *   5. json_transform      — Flatten, unflatten, pick, omit, rename keys
 *   6. json_schema_generate — Generate JSON Schema from sample JSON
 *
 * Vendor: OpenClaw Intelligence
 * MCP Protocol: 2025-03-26
 */

const SERVER_INFO = { name: 'json-toolkit', version: '1.0.0' };
const VENDOR = 'OpenClaw Intelligence';
const CAPABILITIES = { tools: {} };
const MCP_PROTOCOL_VERSION = '2025-03-26';

const RATE_LIMIT_MAX = 20;           // requests per day
const RATE_LIMIT_WINDOW = 86400;     // 24 hours in seconds

const ECOSYSTEM = {
  json_toolkit: 'https://json-toolkit-mcp.yagami8095.workers.dev/mcp',
  regex:        'https://regex-engine-mcp.yagami8095.workers.dev/mcp',
  color:        'https://color-palette-mcp.yagami8095.workers.dev/mcp',
  prompt:       'https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp',
  timestamp:    'https://timestamp-converter-mcp.yagami8095.workers.dev/mcp',
  intel:        'https://openclaw-intel-mcp.yagami8095.workers.dev/mcp',
  fortune:      'https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp',
  moltbook:     'https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp',
  agentforge:   'https://agentforge-compare-mcp.yagami8095.workers.dev/mcp',
  store:        'https://product-store.yagami8095.workers.dev',
  fortune_api:  'https://fortune-api.yagami8095.workers.dev',
  intel_api:    'https://openclaw-intel-api.yagami8095.workers.dev',
};

// ============================================================
// Rate Limiting (KV-backed, per IP, 20 req/day)
// ============================================================

async function checkRateLimit(kv, ip) {
  if (!kv) return { allowed: true, remaining: RATE_LIMIT_MAX, total: RATE_LIMIT_MAX };

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const key = `rl:json:${ip}:${today}`;

  let count = 0;
  try {
    const val = await kv.get(key);
    count = val ? parseInt(val, 10) : 0;
  } catch {
    // KV unavailable — allow the request
    return { allowed: true, remaining: RATE_LIMIT_MAX, total: RATE_LIMIT_MAX };
  }

  if (count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, total: RATE_LIMIT_MAX, used: count };
  }

  try {
    await kv.put(key, String(count + 1), { expirationTtl: RATE_LIMIT_WINDOW });
  } catch {
    // ignore write failure
  }

  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX - count - 1,
    total: RATE_LIMIT_MAX,
    used: count + 1,
  };
}

// ============================================================
// JSON-RPC helpers
// ============================================================

function jsonRpcResponse(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function jsonRpcError(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

function toolResult(data) {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

function toolError(message) {
  return {
    content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
    isError: true,
  };
}

// ============================================================
// Tool: json_format
// ============================================================

function jsonFormat(jsonStr, indent = 2, minify = false) {
  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    return { error: `Invalid JSON: ${e.message}` };
  }

  const output = minify
    ? JSON.stringify(parsed)
    : JSON.stringify(parsed, null, Math.max(0, Math.min(8, indent)));

  return {
    output,
    char_count: output.length,
    minified: minify,
    indent: minify ? 0 : indent,
    ecosystem: ECOSYSTEM,
  };
}

// ============================================================
// Tool: json_validate
// ============================================================

function jsonValidate(jsonStr) {
  if (typeof jsonStr !== 'string') {
    return {
      valid: false,
      error: 'Input must be a string',
      ecosystem: ECOSYSTEM,
    };
  }

  // Try standard parse first
  try {
    const parsed = JSON.parse(jsonStr);
    const type = Array.isArray(parsed) ? 'array' : typeof parsed;
    const keyCount = (type === 'object' && parsed !== null)
      ? Object.keys(parsed).length
      : null;

    return {
      valid: true,
      type,
      key_count: keyCount,
      char_count: jsonStr.length,
      summary: buildSummary(parsed),
      ecosystem: ECOSYSTEM,
    };
  } catch (e) {
    // Detailed error location extraction
    const detail = parseJsonError(jsonStr, e);
    return {
      valid: false,
      error: e.message,
      ...detail,
      ecosystem: ECOSYSTEM,
    };
  }
}

function buildSummary(parsed) {
  if (parsed === null) return 'null value';
  if (Array.isArray(parsed)) return `Array with ${parsed.length} element(s)`;
  if (typeof parsed === 'object') {
    const keys = Object.keys(parsed);
    return `Object with ${keys.length} key(s): ${keys.slice(0, 8).join(', ')}${keys.length > 8 ? '...' : ''}`;
  }
  return `${typeof parsed}: ${String(parsed).slice(0, 80)}`;
}

function parseJsonError(str, err) {
  // Try to extract line/column from error message or by scanning
  const result = { line: null, column: null, near: null, suggestion: null };

  // Extract position from error message (V8 format: "at position N")
  const posMatch = err.message.match(/at position (\d+)/);
  const pos = posMatch ? parseInt(posMatch[1], 10) : findErrorPosition(str);

  if (pos !== null && pos >= 0 && pos <= str.length) {
    const before = str.slice(0, pos);
    const lines = before.split('\n');
    result.line = lines.length;
    result.column = lines[lines.length - 1].length + 1;
    result.near = str.slice(Math.max(0, pos - 20), pos + 20).replace(/\n/g, '\\n');
  }

  // Common suggestions
  const msg = err.message.toLowerCase();
  if (msg.includes('unexpected token')) {
    const token = err.message.match(/Unexpected token (.+)/i);
    if (token) result.suggestion = `Unexpected token near character ${result.column || '?'}. Check for missing commas, quotes, or brackets.`;
  } else if (msg.includes('unterminated')) {
    result.suggestion = 'A string literal is not properly closed with a double-quote.';
  } else if (msg.includes('trailing comma') || str.trim().match(/,\s*[}\]]/)) {
    result.suggestion = 'Trailing commas are not allowed in JSON. Remove the last comma before } or ].';
  } else if (str.trim().startsWith("'") || str.includes("'")) {
    result.suggestion = 'JSON requires double-quoted strings. Replace single quotes with double quotes.';
  } else if (str.match(/\/\//)) {
    result.suggestion = 'JSON does not support comments. Remove // or /* */ comments.';
  } else {
    result.suggestion = 'Check for unbalanced brackets/braces, missing commas, or invalid escape sequences.';
  }

  return result;
}

function findErrorPosition(str) {
  // Re-scan character by character using a minimal state machine
  let i = 0;
  let inString = false;
  let escaped = false;
  const stack = [];

  for (; i < str.length; i++) {
    const c = str[i];
    if (escaped) { escaped = false; continue; }
    if (c === '\\' && inString) { escaped = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (c === '{' || c === '[') { stack.push(c); continue; }
    if (c === '}') {
      if (stack[stack.length - 1] !== '{') return i;
      stack.pop(); continue;
    }
    if (c === ']') {
      if (stack[stack.length - 1] !== '[') return i;
      stack.pop(); continue;
    }
  }

  return inString ? str.lastIndexOf('"') : str.length;
}

// ============================================================
// Tool: json_diff
// ============================================================

function jsonDiff(jsonA, jsonB) {
  let a, b;
  try {
    a = JSON.parse(jsonA);
  } catch (e) {
    return { error: `json_a is invalid JSON: ${e.message}` };
  }
  try {
    b = JSON.parse(jsonB);
  } catch (e) {
    return { error: `json_b is invalid JSON: ${e.message}` };
  }

  const added = [];
  const removed = [];
  const changed = [];

  diffRecursive(a, b, '', added, removed, changed);

  const totalChanges = added.length + removed.length + changed.length;

  return {
    identical: totalChanges === 0,
    summary: {
      added: added.length,
      removed: removed.length,
      changed: changed.length,
      total_changes: totalChanges,
    },
    added,
    removed,
    changed,
    ecosystem: ECOSYSTEM,
  };
}

function diffRecursive(a, b, path, added, removed, changed) {
  const typeA = getType(a);
  const typeB = getType(b);

  // Type mismatch — treat entire path as changed
  if (typeA !== typeB) {
    changed.push({ path: path || '$', old_type: typeA, new_type: typeB, old_value: summarizeValue(a), new_value: summarizeValue(b) });
    return;
  }

  if (typeA === 'object') {
    const keysA = new Set(Object.keys(a));
    const keysB = new Set(Object.keys(b));

    for (const key of keysA) {
      const childPath = path ? `${path}.${key}` : key;
      if (!keysB.has(key)) {
        removed.push({ path: childPath, value: summarizeValue(a[key]) });
      } else {
        diffRecursive(a[key], b[key], childPath, added, removed, changed);
      }
    }
    for (const key of keysB) {
      if (!keysA.has(key)) {
        const childPath = path ? `${path}.${key}` : key;
        added.push({ path: childPath, value: summarizeValue(b[key]) });
      }
    }
  } else if (typeA === 'array') {
    const maxLen = Math.max(a.length, b.length);
    for (let i = 0; i < maxLen; i++) {
      const childPath = `${path}[${i}]`;
      if (i >= a.length) {
        added.push({ path: childPath, value: summarizeValue(b[i]) });
      } else if (i >= b.length) {
        removed.push({ path: childPath, value: summarizeValue(a[i]) });
      } else {
        diffRecursive(a[i], b[i], childPath, added, removed, changed);
      }
    }
  } else {
    // Primitive comparison
    if (a !== b) {
      changed.push({ path: path || '$', old_value: a, new_value: b });
    }
  }
}

function getType(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

function summarizeValue(v) {
  if (v === null) return null;
  if (Array.isArray(v)) return `[Array(${v.length})]`;
  if (typeof v === 'object') return `{Object(${Object.keys(v).length} keys)}`;
  if (typeof v === 'string' && v.length > 60) return v.slice(0, 60) + '...';
  return v;
}

// ============================================================
// Tool: json_query (JSONPath-like)
// ============================================================

function jsonQuery(jsonStr, query) {
  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch (e) {
    return { error: `Invalid JSON: ${e.message}` };
  }

  if (!query || typeof query !== 'string') {
    return { error: 'query parameter is required' };
  }

  try {
    const results = evaluatePath(data, query.trim());
    return {
      query,
      count: Array.isArray(results) ? results.length : 1,
      results,
      ecosystem: ECOSYSTEM,
    };
  } catch (e) {
    return { error: `Query error: ${e.message}`, query, ecosystem: ECOSYSTEM };
  }
}

function evaluatePath(data, path) {
  // Normalize: strip leading $, $.
  let p = path;
  if (p === '$') return [data];
  if (p.startsWith('$.')) p = p.slice(2);
  else if (p.startsWith('$')) p = p.slice(1);
  if (p.startsWith('.')) p = p.slice(1);

  // Recursive wildcard: ..key
  if (p.startsWith('..')) {
    const rest = p.slice(2);
    const key = rest.split(/[.\[]/)[0];
    if (!key) return flattenAll(data);
    return deepSearch(data, key);
  }

  // Split path into segments
  const segments = tokenizePath(p);
  const results = querySegments([data], segments);
  return results;
}

function tokenizePath(p) {
  // Tokenize: split on . and [...] keeping bracket notation
  const segments = [];
  let i = 0;
  while (i < p.length) {
    if (p[i] === '.') {
      i++;
      continue;
    }
    if (p[i] === '[') {
      // Find matching ]
      const end = p.indexOf(']', i);
      if (end === -1) throw new Error(`Unclosed bracket in path: ${p}`);
      const inner = p.slice(i + 1, end).trim();
      // Strip quotes if present
      if ((inner.startsWith('"') && inner.endsWith('"')) ||
          (inner.startsWith("'") && inner.endsWith("'"))) {
        segments.push({ type: 'key', value: inner.slice(1, -1) });
      } else if (inner === '*') {
        segments.push({ type: 'wildcard' });
      } else if (inner.includes(':')) {
        // Slice: [start:end] or [start:end:step]
        const parts = inner.split(':').map(s => s.trim() === '' ? null : parseInt(s.trim(), 10));
        segments.push({ type: 'slice', start: parts[0], end: parts[1], step: parts[2] || 1 });
      } else if (/^-?\d+$/.test(inner)) {
        segments.push({ type: 'index', value: parseInt(inner, 10) });
      } else if (inner.startsWith('?')) {
        // Filter: [?(@.key==value)] or [?(@.key)]
        segments.push({ type: 'filter', expr: inner.slice(1).trim() });
      } else if (inner.includes(',')) {
        // Union: [0,1,2] or ["a","b"]
        const items = inner.split(',').map(s => {
          s = s.trim();
          if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
            return { type: 'key', value: s.slice(1, -1) };
          }
          if (/^-?\d+$/.test(s)) return { type: 'index', value: parseInt(s, 10) };
          return { type: 'key', value: s };
        });
        segments.push({ type: 'union', items });
      } else {
        // Treat as key
        segments.push({ type: 'key', value: inner });
      }
      i = end + 1;
    } else {
      // Read until next . or [
      let end = i;
      while (end < p.length && p[end] !== '.' && p[end] !== '[') end++;
      const seg = p.slice(i, end);
      if (seg === '*') {
        segments.push({ type: 'wildcard' });
      } else {
        segments.push({ type: 'key', value: seg });
      }
      i = end;
    }
  }
  return segments;
}

function querySegments(nodes, segments) {
  if (segments.length === 0) return nodes;
  const [seg, ...rest] = segments;
  let nextNodes = [];

  for (const node of nodes) {
    switch (seg.type) {
      case 'key': {
        if (node !== null && typeof node === 'object' && !Array.isArray(node) && seg.value in node) {
          nextNodes.push(node[seg.value]);
        }
        break;
      }
      case 'index': {
        if (Array.isArray(node)) {
          const idx = seg.value < 0 ? node.length + seg.value : seg.value;
          if (idx >= 0 && idx < node.length) nextNodes.push(node[idx]);
        }
        break;
      }
      case 'wildcard': {
        if (Array.isArray(node)) {
          nextNodes.push(...node);
        } else if (node !== null && typeof node === 'object') {
          nextNodes.push(...Object.values(node));
        }
        break;
      }
      case 'slice': {
        if (Array.isArray(node)) {
          const len = node.length;
          let start = seg.start === null ? 0 : (seg.start < 0 ? Math.max(0, len + seg.start) : Math.min(seg.start, len));
          let end = seg.end === null ? len : (seg.end < 0 ? Math.max(0, len + seg.end) : Math.min(seg.end, len));
          const step = seg.step || 1;
          for (let i = start; i < end; i += step) {
            nextNodes.push(node[i]);
          }
        }
        break;
      }
      case 'union': {
        for (const item of seg.items) {
          if (item.type === 'key' && node !== null && typeof node === 'object' && item.value in node) {
            nextNodes.push(node[item.value]);
          } else if (item.type === 'index' && Array.isArray(node)) {
            const idx = item.value < 0 ? node.length + item.value : item.value;
            if (idx >= 0 && idx < node.length) nextNodes.push(node[idx]);
          }
        }
        break;
      }
      case 'filter': {
        if (Array.isArray(node)) {
          for (const item of node) {
            if (evaluateFilter(item, seg.expr)) nextNodes.push(item);
          }
        } else if (node !== null && typeof node === 'object') {
          for (const val of Object.values(node)) {
            if (evaluateFilter(val, seg.expr)) nextNodes.push(val);
          }
        }
        break;
      }
    }
  }

  return querySegments(nextNodes, rest);
}

function evaluateFilter(item, expr) {
  // Support: (@.key), (@.key==value), (@.key!=value), (@.key>value), (@.key<value), (@.key>=value), (@.key<=value)
  if (!expr.startsWith('(') || !expr.endsWith(')')) return false;
  const inner = expr.slice(1, -1).trim();

  // Existence check: @.key
  if (/^@\.[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(inner)) {
    const key = inner.slice(2);
    return item !== null && typeof item === 'object' && key in item;
  }

  // Comparison operators
  const opMatch = inner.match(/^@\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
  if (!opMatch) return false;

  const [, key, op, rawVal] = opMatch;
  if (item === null || typeof item !== 'object' || !(key in item)) return false;

  const itemVal = item[key];
  let cmpVal;

  const trimmed = rawVal.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    cmpVal = trimmed.slice(1, -1);
  } else if (trimmed === 'true') {
    cmpVal = true;
  } else if (trimmed === 'false') {
    cmpVal = false;
  } else if (trimmed === 'null') {
    cmpVal = null;
  } else if (!isNaN(Number(trimmed))) {
    cmpVal = Number(trimmed);
  } else {
    cmpVal = trimmed;
  }

  switch (op) {
    case '==': return itemVal == cmpVal;  // eslint-disable-line eqeqeq
    case '!=': return itemVal != cmpVal;  // eslint-disable-line eqeqeq
    case '>':  return itemVal > cmpVal;
    case '<':  return itemVal < cmpVal;
    case '>=': return itemVal >= cmpVal;
    case '<=': return itemVal <= cmpVal;
    default:   return false;
  }
}

function deepSearch(obj, key) {
  const results = [];
  function walk(node) {
    if (node === null || typeof node !== 'object') return;
    if (key in node) results.push(node[key]);
    for (const v of Array.isArray(node) ? node : Object.values(node)) {
      walk(v);
    }
  }
  walk(obj);
  return results;
}

function flattenAll(obj) {
  const results = [];
  function walk(node) {
    if (node === null || typeof node !== 'object') {
      results.push(node);
      return;
    }
    const children = Array.isArray(node) ? node : Object.values(node);
    for (const c of children) walk(c);
  }
  walk(obj);
  return results;
}

// ============================================================
// Tool: json_transform
// ============================================================

function jsonTransform(jsonStr, operation, options = {}) {
  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch (e) {
    return { error: `Invalid JSON: ${e.message}` };
  }

  try {
    let result;
    switch (operation) {
      case 'flatten':
        result = flattenObject(data, options.delimiter || '.', options.prefix || '', options.maxDepth || 100);
        break;
      case 'unflatten':
        result = unflattenObject(data, options.delimiter || '.');
        break;
      case 'pick': {
        const keys = Array.isArray(options.keys) ? options.keys : (options.keys ? String(options.keys).split(',').map(s => s.trim()) : []);
        if (!keys.length) return { error: 'options.keys (array or comma-separated string) required for "pick" operation' };
        result = pickKeys(data, keys, options.deep || false);
        break;
      }
      case 'omit': {
        const keys = Array.isArray(options.keys) ? options.keys : (options.keys ? String(options.keys).split(',').map(s => s.trim()) : []);
        if (!keys.length) return { error: 'options.keys (array or comma-separated string) required for "omit" operation' };
        result = omitKeys(data, keys, options.deep || false);
        break;
      }
      case 'rename': {
        if (!options.map || typeof options.map !== 'object') {
          return { error: 'options.map (object mapping old keys to new keys) required for "rename" operation. Example: {"oldName": "newName"}' };
        }
        result = renameKeys(data, options.map, options.deep || false);
        break;
      }
      default:
        return { error: `Unknown operation: "${operation}". Valid: flatten, unflatten, pick, omit, rename` };
    }

    return {
      operation,
      options,
      result,
      ecosystem: ECOSYSTEM,
    };
  } catch (e) {
    return { error: `Transform error: ${e.message}`, ecosystem: ECOSYSTEM };
  }
}

function flattenObject(obj, delimiter = '.', prefix = '', maxDepth = 100, depth = 0) {
  const out = {};
  if (depth >= maxDepth) {
    out[prefix] = obj;
    return out;
  }

  for (const [key, val] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}${delimiter}${key}` : key;
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(out, flattenObject(val, delimiter, fullKey, maxDepth, depth + 1));
    } else if (Array.isArray(val)) {
      val.forEach((item, idx) => {
        const arrKey = `${fullKey}[${idx}]`;
        if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
          Object.assign(out, flattenObject(item, delimiter, arrKey, maxDepth, depth + 1));
        } else {
          out[arrKey] = item;
        }
      });
    } else {
      out[fullKey] = val;
    }
  }
  return out;
}

function unflattenObject(flat, delimiter = '.') {
  const result = {};
  for (const [key, val] of Object.entries(flat)) {
    const parts = key.split(delimiter);
    let node = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in node) || typeof node[part] !== 'object') {
        node[part] = {};
      }
      node = node[part];
    }
    node[parts[parts.length - 1]] = val;
  }
  return result;
}

function pickKeys(data, keys, deep = false) {
  if (Array.isArray(data)) {
    return data.map(item => pickKeys(item, keys, deep));
  }
  if (data === null || typeof data !== 'object') return data;

  const result = {};
  for (const key of keys) {
    if (key in data) {
      result[key] = (deep && data[key] !== null && typeof data[key] === 'object')
        ? pickKeys(data[key], keys, deep)
        : data[key];
    }
  }
  return result;
}

function omitKeys(data, keys, deep = false) {
  if (Array.isArray(data)) {
    return data.map(item => omitKeys(item, keys, deep));
  }
  if (data === null || typeof data !== 'object') return data;

  const keySet = new Set(keys);
  const result = {};
  for (const [k, v] of Object.entries(data)) {
    if (!keySet.has(k)) {
      result[k] = (deep && v !== null && typeof v === 'object')
        ? omitKeys(v, keys, deep)
        : v;
    }
  }
  return result;
}

function renameKeys(data, map, deep = false) {
  if (Array.isArray(data)) {
    return data.map(item => renameKeys(item, map, deep));
  }
  if (data === null || typeof data !== 'object') return data;

  const result = {};
  for (const [k, v] of Object.entries(data)) {
    const newKey = k in map ? map[k] : k;
    result[newKey] = (deep && v !== null && typeof v === 'object')
      ? renameKeys(v, map, deep)
      : v;
  }
  return result;
}

// ============================================================
// Tool: json_schema_generate
// ============================================================

function jsonSchemaGenerate(jsonStr, title = 'GeneratedSchema') {
  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch (e) {
    return { error: `Invalid JSON: ${e.message}` };
  }

  const schema = inferSchema(data, title);

  return {
    schema,
    title,
    generated_at: new Date().toISOString(),
    ecosystem: ECOSYSTEM,
  };
}

function inferSchema(value, title) {
  if (value === null) {
    return { type: 'null' };
  }

  if (Array.isArray(value)) {
    const schema = { type: 'array' };
    if (title) schema.title = title;

    if (value.length === 0) {
      schema.items = {};
      return schema;
    }

    // Infer item schema from all elements, merge
    const itemSchemas = value.slice(0, 10).map(item => inferSchema(item, null));
    schema.items = mergeSchemas(itemSchemas);
    schema.examples = value.slice(0, 3);
    return schema;
  }

  if (typeof value === 'object') {
    const schema = { type: 'object' };
    if (title) schema.title = title;

    const keys = Object.keys(value);
    if (keys.length === 0) {
      schema.properties = {};
      return schema;
    }

    schema.properties = {};
    schema.required = [];

    for (const key of keys) {
      schema.properties[key] = inferSchema(value[key], null);
      // Mark as required if not null/undefined
      if (value[key] !== null && value[key] !== undefined) {
        schema.required.push(key);
      }
    }

    if (schema.required.length === 0) delete schema.required;
    schema.additionalProperties = false;
    return schema;
  }

  if (typeof value === 'string') {
    const schema = { type: 'string' };

    // Detect common string formats
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      schema.format = 'date-time';
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      schema.format = 'date';
    } else if (/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(value)) {
      schema.format = 'email';
    } else if (/^https?:\/\//.test(value)) {
      schema.format = 'uri';
    } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
      schema.format = 'uuid';
    }

    if (value.length > 0) schema.example = value.slice(0, 80);
    return schema;
  }

  if (typeof value === 'number') {
    const schema = { type: Number.isInteger(value) ? 'integer' : 'number' };
    schema.example = value;
    return schema;
  }

  if (typeof value === 'boolean') {
    return { type: 'boolean', example: value };
  }

  return {};
}

function mergeSchemas(schemas) {
  if (schemas.length === 0) return {};
  if (schemas.length === 1) return schemas[0];

  const types = new Set(schemas.map(s => s.type));

  if (types.size === 1) {
    const type = [...types][0];
    if (type === 'object') {
      // Merge object schemas
      const allKeys = new Set(schemas.flatMap(s => Object.keys(s.properties || {})));
      const merged = { type: 'object', properties: {} };
      for (const key of allKeys) {
        const keySchemas = schemas.filter(s => s.properties && key in s.properties).map(s => s.properties[key]);
        merged.properties[key] = mergeSchemas(keySchemas);
      }
      return merged;
    }
    return schemas[0];
  }

  // Multiple types — use anyOf
  const uniqueTypes = [...new Set(schemas.map(s => s.type))];
  if (uniqueTypes.length <= 4) {
    return { anyOf: uniqueTypes.map(t => ({ type: t })) };
  }
  return {};
}

// ============================================================
// MCP Tools Definitions
// ============================================================

const TOOLS = [
  {
    name: 'json_format',
    description: 'Pretty-print or minify JSON. Specify indent level (default 2) or set minify=true to compact JSON into a single line.',
    inputSchema: {
      type: 'object',
      properties: {
        json:    { type: 'string', description: 'The JSON string to format' },
        indent:  { type: 'integer', description: 'Indentation spaces (1-8, default 2)', default: 2, minimum: 1, maximum: 8 },
        minify:  { type: 'boolean', description: 'If true, output compact single-line JSON (overrides indent)', default: false },
      },
      required: ['json'],
    },
  },
  {
    name: 'json_validate',
    description: 'Validate a JSON string. Returns valid=true with type info on success, or valid=false with line, column, error message, and a suggestion for fixing common mistakes.',
    inputSchema: {
      type: 'object',
      properties: {
        json: { type: 'string', description: 'The JSON string to validate' },
      },
      required: ['json'],
    },
  },
  {
    name: 'json_diff',
    description: 'Compare two JSON values and return a structured diff showing added paths, removed paths, and changed values. Supports nested objects and arrays.',
    inputSchema: {
      type: 'object',
      properties: {
        json_a: { type: 'string', description: 'The original JSON (before state)' },
        json_b: { type: 'string', description: 'The new JSON (after state)' },
      },
      required: ['json_a', 'json_b'],
    },
  },
  {
    name: 'json_query',
    description: 'Query JSON data using JSONPath-like syntax. Supports: root ($), dot notation ($.a.b), bracket notation ($["key"]), array index ($[0]), wildcard (*), deep scan (..), slice ([1:3]), filter ([?(@.age>18)]), and union ([0,1]).',
    inputSchema: {
      type: 'object',
      properties: {
        json:  { type: 'string', description: 'The JSON string to query' },
        query: { type: 'string', description: 'JSONPath expression (e.g. "$.users[0].name", "$.items[*].price", "$..[?(@.active==true)]")' },
      },
      required: ['json', 'query'],
    },
  },
  {
    name: 'json_transform',
    description: 'Transform JSON data. Operations: "flatten" (nested→flat with dot keys), "unflatten" (flat→nested), "pick" (keep only specified keys), "omit" (remove specified keys), "rename" (rename keys via a map). Use options.deep=true for recursive key operations.',
    inputSchema: {
      type: 'object',
      properties: {
        json:      { type: 'string', description: 'The JSON string to transform' },
        operation: { type: 'string', enum: ['flatten', 'unflatten', 'pick', 'omit', 'rename'], description: 'The transformation operation' },
        options:   {
          type: 'object',
          description: 'Operation-specific options',
          properties: {
            keys:      { description: 'Array or comma-separated string of key names (for pick/omit)' },
            map:       { type: 'object', description: 'Object mapping old key names to new names (for rename). Example: {"oldName": "newName"}' },
            deep:      { type: 'boolean', description: 'If true, apply pick/omit/rename recursively to nested objects', default: false },
            delimiter: { type: 'string', description: 'Delimiter for flatten/unflatten (default ".")', default: '.' },
            maxDepth:  { type: 'integer', description: 'Max flatten depth (default 100)', default: 100 },
          },
        },
      },
      required: ['json', 'operation'],
    },
  },
  {
    name: 'json_schema_generate',
    description: 'Generate a JSON Schema (draft-07 compatible) from a sample JSON object. Infers types, required fields, formats (date-time, email, uri, uuid), and nested structure. Ideal for API documentation or validation setup.',
    inputSchema: {
      type: 'object',
      properties: {
        json:  { type: 'string', description: 'Sample JSON to generate schema from' },
        title: { type: 'string', description: 'Schema title (default "GeneratedSchema")', default: 'GeneratedSchema' },
      },
      required: ['json'],
    },
  },
];

// ============================================================
// MCP Tool Dispatch
// ============================================================

async function handleToolCall(id, params) {
  const { name, arguments: args } = params;

  try {
    let result;
    switch (name) {
      case 'json_format':
        result = jsonFormat(args?.json ?? '', args?.indent ?? 2, args?.minify ?? false);
        break;
      case 'json_validate':
        result = jsonValidate(args?.json ?? '');
        break;
      case 'json_diff':
        result = jsonDiff(args?.json_a ?? '', args?.json_b ?? '');
        break;
      case 'json_query':
        result = jsonQuery(args?.json ?? '', args?.query ?? '');
        break;
      case 'json_transform':
        result = jsonTransform(args?.json ?? '', args?.operation ?? '', args?.options ?? {});
        break;
      case 'json_schema_generate':
        result = jsonSchemaGenerate(args?.json ?? '', args?.title ?? 'GeneratedSchema');
        break;
      default:
        return jsonRpcError(id, -32601, `Tool not found: ${name}`);
    }

    if (result.error) {
      return jsonRpcResponse(id, toolError(result.error));
    }
    return jsonRpcResponse(id, toolResult(result));
  } catch (e) {
    return jsonRpcResponse(id, toolError(`Internal error: ${e.message}`));
  }
}

// ============================================================
// MCP Protocol dispatcher
// ============================================================

async function handleMcpRequest(req, kv, clientIp) {
  const isBatch = Array.isArray(req);
  const requests = isBatch ? req : [req];
  const responses = [];

  // For tool calls, check rate limit once per batch
  const hasToolCall = requests.some(r => r.method === 'tools/call');
  let rateLimitInfo = null;
  if (hasToolCall) {
    rateLimitInfo = await checkRateLimit(kv, clientIp);
    if (!rateLimitInfo.allowed) {
      const rl = jsonRpcError(
        requests.find(r => r.method === 'tools/call')?.id ?? null,
        -32029,
        `Rate limit exceeded. Free tier: ${RATE_LIMIT_MAX} tool calls/day. Resets at midnight UTC.`
      );
      return isBatch ? [rl] : rl;
    }
  }

  for (const r of requests) {
    if (!r || typeof r !== 'object' || r.jsonrpc !== '2.0' || !r.method) {
      responses.push(jsonRpcError(r?.id ?? null, -32600, 'Invalid JSON-RPC 2.0 request'));
      continue;
    }

    switch (r.method) {
      case 'initialize':
        responses.push(jsonRpcResponse(r.id, {
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: CAPABILITIES,
          serverInfo: SERVER_INFO,
          vendor: VENDOR,
        }));
        break;

      case 'notifications/initialized':
        // No response for notifications
        break;

      case 'ping':
        responses.push(jsonRpcResponse(r.id, {}));
        break;

      case 'tools/list':
        responses.push(jsonRpcResponse(r.id, { tools: TOOLS }));
        break;

      case 'tools/call':
        responses.push(await handleToolCall(r.id, r.params || {}));
        break;

      default:
        responses.push(jsonRpcError(r.id, -32601, `Method not found: ${r.method}`));
    }
  }

  const filtered = responses.filter(Boolean);
  if (filtered.length === 0) return null; // all notifications
  return isBatch ? filtered : filtered[0];
}

// ============================================================
// Landing Page
// ============================================================

function buildLandingHtml() {
  const tools = [
    { name: 'json_format',          desc: 'Pretty-print or minify JSON with configurable indentation (1-8 spaces)' },
    { name: 'json_validate',        desc: 'Validate JSON with detailed error info including line, column, and fix suggestions' },
    { name: 'json_diff',            desc: 'Compare two JSON objects — shows added, removed, and changed paths' },
    { name: 'json_query',           desc: 'Query JSON with JSONPath syntax: dot notation, wildcards, filters, slices, deep scan' },
    { name: 'json_transform',       desc: 'Transform JSON: flatten/unflatten, pick/omit keys, rename keys (with deep option)' },
    { name: 'json_schema_generate', desc: 'Generate JSON Schema from sample data — infers types, formats, required fields' },
  ];

  const toolsHtml = tools.map(t => `
        <li class="py-3 border-b border-cyan-900/50 last:border-0">
          <code class="text-cyan-400 font-semibold">${t.name}</code>
          <span class="text-gray-400 text-sm ml-2">— ${t.desc}</span>
        </li>`).join('');

  const ecosystemHtml = Object.entries({
    'openclaw-intel-mcp':     { url: ECOSYSTEM.intel,      desc: 'AI market intelligence — track Claude Code, Cursor, Devin growth trends' },
    'openclaw-fortune-mcp':   { url: ECOSYSTEM.fortune,    desc: 'Daily zodiac horoscope & tarot readings for all 12 signs' },
    'moltbook-publisher-mcp': { url: ECOSYSTEM.moltbook,   desc: 'Japanese content publishing — MD→HTML, SEO, EN→JP for note.com/Zenn/Qiita' },
    'agentforge-compare-mcp': { url: ECOSYSTEM.agentforge, desc: 'AI coding tool comparison — Claude Code vs Cursor vs Devin analysis' },
    'regex-engine-mcp':       { url: ECOSYSTEM.regex,      desc: 'Regex testing, debugging, explanation & generation with examples' },
    'color-palette-mcp':      { url: ECOSYSTEM.color,      desc: 'Color palette generation, conversion, contrast checks & harmony' },
    'prompt-enhancer-mcp':    { url: ECOSYSTEM.prompt,     desc: 'Prompt optimization, rewriting, scoring & multilingual enhancement' },
    'timestamp-converter-mcp':{ url: ECOSYSTEM.timestamp,  desc: 'Unix/ISO timestamp conversion, timezone math & duration calc' },
    'product-store':          { url: ECOSYSTEM.store,       desc: 'AI tools, templates, and intelligence products' },
  }).map(([name, info]) => `
        <li class="py-2 text-sm">
          <a href="${info.url.replace('/mcp', '')}" class="text-cyan-400 hover:underline font-medium">${name}</a>
          <span class="text-gray-500 ml-2">— ${info.desc}</span>
        </li>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JSON Toolkit MCP — OpenClaw Intelligence</title>
  <meta name="description" content="Free MCP server with 6 JSON utilities for AI agents: format, validate, diff, query with JSONPath, transform, and generate JSON Schema. Works with Claude Code, Cursor, Windsurf.">
  <meta name="keywords" content="JSON formatter, JSON validator, JSON diff, JSONPath query, MCP server, AI tools, Claude Code">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://json-toolkit-mcp.yagami8095.workers.dev">
  <meta property="og:type" content="website">
  <meta property="og:title" content="JSON Toolkit MCP Server - Format, Validate, Diff & Query JSON | OpenClaw">
  <meta property="og:description" content="Free MCP server with 6 JSON utilities for AI agents: format, validate, diff, query with JSONPath, transform, and generate JSON Schema. Works with Claude Code, Cursor, Windsurf.">
  <meta property="og:url" content="https://json-toolkit-mcp.yagami8095.workers.dev">
  <meta property="og:site_name" content="OpenClaw Intelligence">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="JSON Toolkit MCP Server - Format, Validate, Diff & Query JSON | OpenClaw">
  <meta name="twitter:description" content="Free MCP server with 6 JSON utilities for AI agents: format, validate, diff, query with JSONPath, transform, and generate JSON Schema. Works with Claude Code, Cursor, Windsurf.">
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>
    pre { scrollbar-width: thin; scrollbar-color: #0891b2 #083344; }
    pre::-webkit-scrollbar { height: 6px; }
    pre::-webkit-scrollbar-track { background: #083344; }
    pre::-webkit-scrollbar-thumb { background: #0891b2; border-radius: 3px; }
  </style>

  <script type="application/ld+json">
  {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "JSON Toolkit MCP Server",
  "description": "Free MCP server with 6 JSON utilities for AI agents: format, validate, diff, query with JSONPath, transform, and generate JSON Schema. Works with Claude Code, Cursor, Windsurf.",
  "url": "https://json-toolkit-mcp.yagami8095.workers.dev",
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
<body class="bg-gray-950 text-gray-100 min-h-screen font-sans">

  <!-- Header -->
  <header class="border-b border-cyan-900/50 bg-gray-950/80 backdrop-blur sticky top-0 z-10">
    <div class="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-gradient-to-br from-cyan-400 to-teal-600 rounded-lg flex items-center justify-center text-gray-950 font-bold text-sm">{}</div>
        <span class="font-bold text-lg text-white">JSON Toolkit MCP</span>
        <span class="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">v1.0.0</span>
      </div>
      <span class="text-xs text-gray-500">by OpenClaw Intelligence</span>
    </div>
  </header>

  <main class="max-w-4xl mx-auto px-6 py-12">

    <!-- Hero -->
    <div class="mb-12 text-center">
      <div class="inline-block bg-gradient-to-r from-cyan-500/10 to-teal-500/10 border border-cyan-800/50 rounded-2xl px-6 py-2 mb-6">
        <span class="text-cyan-400 text-sm font-medium">Free Tier: 20 requests/day per IP</span>
      </div>
      <h1 class="text-4xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
        JSON Toolkit MCP Server
      </h1>
      <p class="text-gray-400 text-lg max-w-2xl mx-auto">
        6 powerful JSON utilities for AI agents — format, validate, diff, query, transform, and generate schemas from JSON data.
      </p>
    </div>

    <!-- Quick Connect -->
    <div class="bg-gray-900 rounded-2xl p-6 mb-8 border border-cyan-900/40 shadow-lg shadow-cyan-950/20">
      <h2 class="text-lg font-bold mb-1 text-white">Quick Connect</h2>
      <p class="text-gray-500 text-sm mb-4">Add to your Claude Code / Cursor / Windsurf / Cline MCP config:</p>
      <pre class="bg-gray-950 rounded-xl p-4 text-sm text-cyan-300 overflow-x-auto border border-cyan-900/30">{
  "mcpServers": {
    "json-toolkit": {
      "url": "https://json-toolkit-mcp.yagami8095.workers.dev/mcp",
      "type": "http"
    }
  }
}</pre>
      <p class="text-gray-600 text-xs mt-3">MCP Protocol: 2025-03-26 &nbsp;|&nbsp; Streamable HTTP &nbsp;|&nbsp; JSON-RPC 2.0 &nbsp;|&nbsp; Batch support</p>
    </div>

    <!-- Tools -->
    <div class="bg-gray-900 rounded-2xl p-6 mb-8 border border-cyan-900/40">
      <h2 class="text-lg font-bold mb-4 text-white">6 Free Tools</h2>
      <ul class="divide-y divide-cyan-900/30">
        ${toolsHtml}
      </ul>
    </div>

    <!-- Usage Examples -->
    <div class="bg-gray-900 rounded-2xl p-6 mb-8 border border-cyan-900/40">
      <h2 class="text-lg font-bold mb-4 text-white">Example Tool Calls</h2>
      <div class="space-y-4">
        <div>
          <p class="text-xs text-gray-500 uppercase tracking-wide mb-2">json_query — JSONPath filter</p>
          <pre class="bg-gray-950 rounded-lg p-3 text-xs text-green-400 overflow-x-auto">{
  "method": "tools/call",
  "params": {
    "name": "json_query",
    "arguments": {
      "json": "{\"users\": [{\"name\": \"Alice\", \"age\": 30}, {\"name\": \"Bob\", \"age\": 17}]}",
      "query": "$.users[?(@.age>=18)].name"
    }
  }
}</pre>
        </div>
        <div>
          <p class="text-xs text-gray-500 uppercase tracking-wide mb-2">json_transform — flatten nested object</p>
          <pre class="bg-gray-950 rounded-lg p-3 text-xs text-green-400 overflow-x-auto">{
  "method": "tools/call",
  "params": {
    "name": "json_transform",
    "arguments": {
      "json": "{\"a\": {\"b\": {\"c\": 1}}, \"d\": 2}",
      "operation": "flatten",
      "options": { "delimiter": "." }
    }
  }
}</pre>
        </div>
      </div>
    </div>

    <!-- Rate Limits -->
    <div class="bg-gray-900 rounded-2xl p-6 mb-8 border border-cyan-900/40">
      <h2 class="text-lg font-bold mb-3 text-white">Rate Limits</h2>
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div class="bg-gray-800/50 rounded-xl p-4">
          <div class="text-2xl font-bold text-cyan-400">20</div>
          <div class="text-gray-400 mt-1">tool calls / day</div>
          <div class="text-gray-600 text-xs mt-1">per IP address, resets midnight UTC</div>
        </div>
        <div class="bg-gray-800/50 rounded-xl p-4">
          <div class="text-2xl font-bold text-teal-400">6</div>
          <div class="text-gray-400 mt-1">tools available</div>
          <div class="text-gray-600 text-xs mt-1">all free, no API key required</div>
        </div>
      </div>
    </div>

    <!-- Ecosystem -->
    <div class="bg-gray-900 rounded-2xl p-6 mb-8 border border-cyan-900/40">
      <h2 class="text-lg font-bold mb-4 text-white">OpenClaw MCP Ecosystem</h2>
      <ul class="divide-y divide-cyan-900/30">
        ${ecosystemHtml}
      </ul>
      <div class="mt-4 pt-4 border-t border-cyan-900/30">
        <a href="${ECOSYSTEM.store}" class="text-orange-400 hover:underline text-sm font-medium">OpenClaw Store</a>
        <span class="text-gray-500 text-sm ml-2">— AI tools, prompts, and intelligence products</span>
      </div>
    </div>

    <!-- Health -->
    <div class="text-center">
      <a href="/health" class="text-gray-600 hover:text-cyan-400 text-sm transition-colors">Health Check /health</a>
      <span class="text-gray-800 mx-2">|</span>
      <a href="/mcp" class="text-gray-600 hover:text-cyan-400 text-sm transition-colors">MCP Endpoint /mcp</a>
    </div>

  </main>

  <footer class="border-t border-gray-900 mt-12 py-6 text-center text-gray-700 text-sm">
    JSON Toolkit MCP v1.0.0 &nbsp;&bull;&nbsp; Powered by <span class="text-cyan-800">OpenClaw Intelligence</span> &nbsp;&bull;&nbsp; Cloudflare Workers
  </footer>

</body>
</html>`;
}

// ============================================================
// CORS Headers
// ============================================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id, X-Forwarded-For',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id, X-RateLimit-Remaining, X-RateLimit-Limit',
};

function corsResponse(body, status = 200, extra = {}) {
  return new Response(body, {
    status,
    headers: { ...CORS_HEADERS, ...extra },
  });
}

function jsonResponse(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', ...extra },
  });
}

// ============================================================
// Main Worker Export
// ============================================================

// ============================================================
// Edge Defense Layer — Anti-Freeloader + Honeypot + Fingerprint
// ============================================================

const HONEYPOT_PATHS = ['/admin', '/wp-login.php', '/.env', '/config.json', '/.git/config', '/wp-admin', '/phpinfo.php'];
const PAYLOAD_MAX_BYTES = 51200; // 50KB

async function sha256Short(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getRequestFingerprint(request) {
  const ua = request.headers.get('User-Agent') || '';
  const lang = request.headers.get('Accept-Language') || '';
  const ct = request.headers.get('Content-Type') || '';
  // Suspicious: curl/wget UA with browser-like Accept-Language
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

  // 1. Honeypot check
  if (HONEYPOT_PATHS.includes(path.toLowerCase())) {
    try {
      const raw = await kv.get(defenseKey, { type: 'json' }) || { score: 100, hits: 0, flags: [] };
      raw.score = Math.max(0, raw.score - 30);
      raw.hits++;
      raw.flags.push('honeypot:' + path);
      await kv.put(defenseKey, JSON.stringify(raw), { expirationTtl: 86400 });
    } catch { /* non-fatal */ }
    return { action: 'honeypot', status: 404 };
  }

  // 2. Payload size check
  const contentLength = parseInt(request.headers.get('Content-Length') || '0', 10);
  if (contentLength > PAYLOAD_MAX_BYTES) {
    return { action: 'reject', reason: 'Payload too large', status: 413 };
  }

  // 3. Check IP reputation
  try {
    const raw = await kv.get(defenseKey, { type: 'json' });
    if (raw && raw.score < 10) {
      return { action: 'block', reason: 'IP blocked due to suspicious activity', status: 403 };
    }
    if (raw && raw.score < 30) {
      // Slow down suspicious IPs
      return { action: 'throttle', delay: 200 };
    }
  } catch { /* KV failure — allow */ }

  // 4. Fingerprint anomaly (light check, just flag)
  const fp = getRequestFingerprint(request);
  if (fp.isSuspicious) {
    try {
      const raw = await kv.get(defenseKey, { type: 'json' }) || { score: 100, hits: 0, flags: [] };
      if (!raw.flags.includes('suspicious-fp')) {
        raw.score = Math.max(0, raw.score - 10);
        raw.flags.push('suspicious-fp');
        await kv.put(defenseKey, JSON.stringify(raw), { expirationTtl: 86400 });
      }
    } catch { /* non-fatal */ }
  }

  return { action: 'allow' };
}

function sanitizeInput(str, maxLen = 2000) {
  if (!str) return '';
  if (typeof str !== 'string') return String(str).slice(0, maxLen);
  return str.slice(0, maxLen).replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]*>/g, '');
}

// ============================================================
// FinOps Circuit Breaker — Track daily usage, auto-degrade
// ============================================================

const FINOPS_DAILY_WARN = 50000;   // requests across all workers
const FINOPS_DAILY_SLOW = 80000;   // start adding delay
const FINOPS_DAILY_STOP = 95000;   // hard stop (return 503)

async function finopsTrack(env, serverName) {
  const kv = env.KV;
  if (!kv) return { ok: true };
  const today = new Date().toISOString().slice(0, 10);
  const key = `finops:${today}`;
  try {
    const raw = await kv.get(key, { type: 'json' }) || { total: 0, by: {} };
    raw.total++;
    raw.by[serverName] = (raw.by[serverName] || 0) + 1;
    // Don't await write — fire and forget for speed
    kv.put(key, JSON.stringify(raw), { expirationTtl: 172800 });
    if (raw.total >= FINOPS_DAILY_STOP) return { ok: false, reason: 'Daily capacity reached. Try again tomorrow.', status: 503 };
    if (raw.total >= FINOPS_DAILY_SLOW) return { ok: true, delay: 500 };
    if (raw.total >= FINOPS_DAILY_WARN) return { ok: true, warn: true };
    return { ok: true };
  } catch {
    return { ok: true }; // KV failure → allow
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
    const method = request.method;

    // Preflight
    if (method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    // Edge Defense Layer
    const defense = await edgeDefense(request, env, 'json');
    if (defense.action === 'honeypot') {
      return new Response('Not Found', { status: 404 });
    }
    if (defense.action === 'reject' || defense.action === 'block') {
      return jsonResponse({ error: defense.reason }, defense.status);
    }
    if (defense.action === 'throttle' && defense.delay) {
      await new Promise(r => setTimeout(r, defense.delay));
    }

    // FinOps Circuit Breaker
    const finops = await finopsTrack(env, 'json-toolkit');
    if (!finops.ok) return jsonResponse({ error: finops.reason, retryAfter: 'tomorrow' }, finops.status);
    if (finops.delay) await new Promise(r => setTimeout(r, finops.delay));

    // Attribution Tracking
    await trackRef(request, env, 'json-toolkit');

    // Landing page
    if ((path === '/' || path === '/index.html') && method === 'GET') {
      return new Response(buildLandingHtml(), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Health check
    if (path === '/health' && method === 'GET') {
      return jsonResponse({
        status: 'ok',
        server: SERVER_INFO.name,
        version: SERVER_INFO.version,
        vendor: VENDOR,
        protocol: MCP_PROTOCOL_VERSION,
        tools: TOOLS.map(t => t.name),
        rate_limit: { max_per_day: RATE_LIMIT_MAX },
        timestamp: new Date().toISOString(),
      });
    }

    // MCP endpoint — GET returns server info
    if (path === '/mcp' && method === 'GET') {
      return jsonResponse({
        server: SERVER_INFO,
        vendor: VENDOR,
        protocol: MCP_PROTOCOL_VERSION,
        endpoint: '/mcp',
        method: 'POST',
        content_type: 'application/json',
        tools: TOOLS.map(t => ({ name: t.name, description: t.description })),
        ecosystem: ECOSYSTEM,
      });
    }

    // MCP endpoint — POST handles JSON-RPC
    if (path === '/mcp' && method === 'POST') {
      const contentType = request.headers.get('Content-Type') || '';
      if (!contentType.includes('application/json')) {
        return jsonResponse(
          jsonRpcError(null, -32700, 'Content-Type must be application/json'),
          400
        );
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return jsonResponse(jsonRpcError(null, -32700, 'Parse error: invalid JSON body'), 400);
      }

      // Get client IP for rate limiting
      const clientIp =
        request.headers.get('CF-Connecting-IP') ||
        request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
        'unknown';

      const kv = env?.KV ?? null;
      const response = await handleMcpRequest(body, kv, clientIp);

      if (response === null) {
        return corsResponse('', 204);
      }

      // Add rate limit headers if we have info
      const extra = { 'Content-Type': 'application/json' };
      // Note: rateLimitInfo is not threaded back here; it's consumed inside handleMcpRequest
      // For simplicity, headers are added but counts aren't surfaced per request

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...CORS_HEADERS, ...extra },
      });
    }

    // MCP endpoint — DELETE (session termination, MCP spec)
    if (path === '/mcp' && method === 'DELETE') {
      return corsResponse('', 204);
    }

    // 404
    return jsonResponse(
      { error: 'Not found', hint: 'MCP endpoint: POST /mcp | Server info: GET /mcp | Health: GET /health' },
      404
    );
  },
};
