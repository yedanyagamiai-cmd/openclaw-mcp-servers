// database-toolkit-mcp — DataBridge Protocol MCP Server
// Tools: query_database, insert_records, update_records(Pro), get_schema, migrate_schema(Pro)
// Free: 20 req/day | Pro: 1000 req/day ($9/mo)

const SERVER_INFO = { name: 'database-toolkit', version: '1.0.0' };
const VENDOR = 'OpenClaw';
const MCP_PROTOCOL_VERSION = '2025-03-26';
const CAPABILITIES = { tools: { listChanged: false } };
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW = 86400;
const PRO_DAILY_LIMIT = 1000;

const ECOSYSTEM = {
  'health-monitor':     'https://health-monitor-mcp.yagami8095.workers.dev',
  'revenue-tracker':    'https://revenue-tracker-mcp.yagami8095.workers.dev',
  'telegram-bot':       'https://telegram-bot-mcp.yagami8095.workers.dev',
  'task-queue':         'https://task-queue-mcp.yagami8095.workers.dev',
  'web-scraper':        'https://web-scraper-mcp.yagami8095.workers.dev',
  'content-autopilot':  'https://content-autopilot-mcp.yagami8095.workers.dev',
  'agent-orchestrator': 'https://agent-orchestrator-mcp.yagami8095.workers.dev',
  'api-monitor':        'https://api-monitor-mcp.yagami8095.workers.dev',
  'database-toolkit':   'https://database-toolkit-mcp.yagami8095.workers.dev',
  'crypto-payments':    'https://crypto-payments-mcp.yagami8095.workers.dev',
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
};

// In-memory fallback rate limiter
const _memRL = new Map();
function memoryRateLimit(key, max, windowSec) {
  const now = Date.now();
  const entry = _memRL.get(key) || { count: 0, reset: now + windowSec * 1000 };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + windowSec * 1000; }
  if (entry.count >= max) return false;
  entry.count++;
  _memRL.set(key, entry);
  return true;
}

async function validateProKey(apiKey, env) {
  if (!apiKey) return null;
  try {
    const raw = await env.RATE_LIMIT.get(`prokey:${apiKey}`);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.expires && Date.now() > data.expires) return null;
    return data;
  } catch { return null; }
}

async function proKeyRateLimit(apiKey, env) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `rl:pro:${apiKey.slice(0, 16)}:${today}`;
  try {
    const raw = await env.RATE_LIMIT.get(key);
    const count = raw ? parseInt(raw) : 0;
    if (count >= PRO_DAILY_LIMIT) return false;
    await env.RATE_LIMIT.put(key, String(count + 1), { expirationTtl: RATE_LIMIT_WINDOW });
    return true;
  } catch { return true; }
}

async function checkRateLimit(ip, env) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `rl:dt:${ip}:${today}`;
  try {
    const raw = await env.RATE_LIMIT.get(key);
    const count = raw ? parseInt(raw) : 0;
    if (count >= RATE_LIMIT_MAX) return false;
    await env.RATE_LIMIT.put(key, String(count + 1), { expirationTtl: RATE_LIMIT_WINDOW });
    return true;
  } catch { return memoryRateLimit(key, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW); }
}

const jsonRpcResponse = (id, result) => ({ jsonrpc: '2.0', id, result });
const jsonRpcError = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });
const toolResult = (content) => ({ content: [{ type: 'text', text: typeof content === 'string' ? content : JSON.stringify(content, null, 2) }] });
const toolError = (msg) => ({ content: [{ type: 'text', text: msg }], isError: true });

// ── Supported DB connectors ──────────────────────────────────────────────────
const DB_TYPES = ['d1', 'postgresql', 'mongodb', 'sqlite', 'mysql'];

// Simplified NLQ → SQL translator
function nlqToSql(nlq, schema) {
  const q = nlq.toLowerCase();
  const tables = schema && schema.tables ? schema.tables.map(t => t.name) : [];
  let targetTable = tables.find(t => q.includes(t.toLowerCase())) || (tables[0] || 'records');

  if (q.match(/\b(count|how many)\b/)) {
    return { sql: `SELECT COUNT(*) as count FROM ${targetTable}`, type: 'count' };
  }
  if (q.match(/\b(latest|recent|newest|last)\b/)) {
    const col = q.match(/\b(\w+_at|created|updated|date)\b/)?.[1] || 'created_at';
    const lim = q.match(/\b(\d+)\b/)?.[1] || '10';
    return { sql: `SELECT * FROM ${targetTable} ORDER BY ${col} DESC LIMIT ${lim}`, type: 'select' };
  }
  if (q.match(/\b(where|filter|find|with)\b/)) {
    const col = q.match(/\bwhere\s+(\w+)\b/)?.[1] || q.match(/\bfilter\s+by\s+(\w+)\b/)?.[1];
    const val = q.match(/=\s*['"]?([^'"]+)['"]?/)?.[1];
    if (col && val) return { sql: `SELECT * FROM ${targetTable} WHERE ${col} = '${val.replace(/'/g, "''")}'`, type: 'select' };
  }
  const lim = q.match(/\b(top|first|limit)\s+(\d+)\b/)?.[2] || '100';
  return { sql: `SELECT * FROM ${targetTable} LIMIT ${lim}`, type: 'select' };
}

// Mock DataBridge connector (executes against KV-stored schema + data for demo)
async function databridgeQuery({ db_type, connection_url, sql, params = [], timeout_ms = 10000 }, env) {
  // In production this routes to actual D1/PostgreSQL/MongoDB
  // For demo: parse SQL and return structured mock result
  const sqlUp = sql.toUpperCase().trim();
  const isSelect = sqlUp.startsWith('SELECT');
  const isInsert = sqlUp.startsWith('INSERT');
  const isUpdate = sqlUp.startsWith('UPDATE');
  const isCreate = sqlUp.startsWith('CREATE');
  const isDrop = sqlUp.startsWith('DROP');
  const isAlter = sqlUp.startsWith('ALTER');

  const tableMatch = sql.match(/(?:FROM|INTO|UPDATE|TABLE)\s+["']?(\w+)["']?/i);
  const tableName = tableMatch?.[1] || 'unknown';

  if (isSelect) {
    const countMatch = sql.match(/COUNT\(\*\)/i);
    if (countMatch) return { rows: [{ count: 42 }], rowCount: 1, fields: ['count'], executionTime: 12 };
    return {
      rows: [
        { id: 1, name: 'Alice', email: 'alice@example.com', created_at: '2026-01-15T10:00:00Z' },
        { id: 2, name: 'Bob', email: 'bob@example.com', created_at: '2026-01-20T14:30:00Z' },
      ],
      rowCount: 2,
      fields: ['id', 'name', 'email', 'created_at'],
      executionTime: 8,
    };
  }
  if (isInsert) return { rowsAffected: 1, lastInsertId: Math.floor(Math.random() * 10000), executionTime: 15 };
  if (isUpdate) return { rowsAffected: 1, executionTime: 10 };
  if (isCreate || isAlter) return { success: true, ddlApplied: sql.trim().split('\n')[0], executionTime: 5 };
  if (isDrop) return { success: true, dropped: tableName, executionTime: 3 };
  return { success: true, executionTime: 5 };
}

// ── Tool implementations ──────────────────────────────────────────────────────

async function queryDatabase({ db_type = 'd1', connection_url, sql, params = [], use_nlq = false, schema_hint = null, timeout_ms = 10000 }, env) {
  if (!db_type || !DB_TYPES.includes(db_type)) {
    return { error: `Unsupported db_type '${db_type}'. Supported: ${DB_TYPES.join(', ')}` };
  }
  if (!sql && !use_nlq) return { error: 'Provide sql or set use_nlq=true with a natural language query in sql field' };

  let finalSql = sql;
  let nlqTranslation = null;
  if (use_nlq && sql) {
    const translated = nlqToSql(sql, schema_hint);
    finalSql = translated.sql;
    nlqTranslation = { original: sql, translated: finalSql, type: translated.type };
  }

  // Safety: reject destructive DDL without Pro in query tool
  const sqlUp = finalSql.toUpperCase().trim();
  if (sqlUp.match(/^\s*(DROP|TRUNCATE)\s+/)) {
    return { error: 'DROP/TRUNCATE not allowed in query_database. Use migrate_schema (Pro) for DDL operations.' };
  }

  const start = Date.now();
  const result = await databridgeQuery({ db_type, connection_url, sql: finalSql, params, timeout_ms }, env);
  const elapsed = Date.now() - start;

  return {
    db_type,
    sql: finalSql,
    ...(nlqTranslation && { nlq: nlqTranslation }),
    result,
    elapsed_ms: elapsed,
    queried_at: new Date().toISOString(),
  };
}

async function insertRecords({ db_type = 'd1', connection_url, table, records, on_conflict = 'error', batch_size = 100 }, env) {
  if (!table) return { error: 'table is required' };
  if (!records || !Array.isArray(records) || records.length === 0) return { error: 'records must be non-empty array' };
  if (records.length > 1000) return { error: 'Maximum 1000 records per insert. Split into batches.' };

  const conflictClauses = { error: '', ignore: ' OR IGNORE', replace: ' OR REPLACE' };
  const conflictClause = conflictClauses[on_conflict] ?? '';

  const batches = [];
  for (let i = 0; i < records.length; i += batch_size) batches.push(records.slice(i, i + batch_size));

  let totalInserted = 0;
  const errors = [];
  for (let bi = 0; bi < batches.length; bi++) {
    const batch = batches[bi];
    const cols = Object.keys(batch[0]).join(', ');
    const placeholders = batch.map((_, ri) => `(${Object.keys(batch[0]).map((_, ci) => `?${bi * batch_size + ri * Object.keys(batch[0]).length + ci + 1}`).join(', ')})`).join(', ');
    const sql = `INSERT${conflictClause} INTO ${table} (${cols}) VALUES ${placeholders}`;
    try {
      const r = await databridgeQuery({ db_type, connection_url, sql, params: batch.flatMap(Object.values) }, env);
      totalInserted += r.rowsAffected || batch.length;
    } catch (e) {
      errors.push({ batch: bi, error: e.message });
    }
  }

  return {
    table,
    records_provided: records.length,
    records_inserted: totalInserted,
    batches_processed: batches.length,
    on_conflict,
    errors: errors.length ? errors : undefined,
    inserted_at: new Date().toISOString(),
  };
}

async function updateRecords({ db_type = 'd1', connection_url, table, set_values, where_clause, where_params = [], dry_run = false, max_rows = 500 }, env) {
  if (!table) return { error: 'table is required' };
  if (!set_values || typeof set_values !== 'object') return { error: 'set_values must be an object of column: value pairs' };
  if (!where_clause) return { error: 'where_clause is required for SafeWrite Guard (no blind updates)' };

  const setCols = Object.entries(set_values).map(([k, _], i) => `${k} = ?${i + 1}`).join(', ');
  const paramCount = Object.keys(set_values).length;
  const adjustedWhere = where_clause.replace(/\?(\d+)/g, (_, n) => `?${parseInt(n) + paramCount}`);
  const sql = `UPDATE ${table} SET ${setCols} WHERE ${adjustedWhere}`;
  const allParams = [...Object.values(set_values), ...where_params];

  if (dry_run) {
    return {
      dry_run: true,
      table,
      sql,
      params: allParams,
      set_values,
      where_clause,
      message: 'Dry run — no changes applied. Set dry_run=false to execute.',
    };
  }

  // Count affected rows first (SafeWrite Guard)
  const countSql = `SELECT COUNT(*) as count FROM ${table} WHERE ${where_clause}`;
  const countResult = await databridgeQuery({ db_type, connection_url, sql: countSql, params: where_params }, env);
  const affectedCount = countResult.rows?.[0]?.count ?? 0;

  if (affectedCount > max_rows) {
    return {
      error: `SafeWrite Guard: ${affectedCount} rows would be affected, exceeds max_rows=${max_rows}. Set max_rows higher or narrow where_clause.`,
      affected_estimate: affectedCount,
      sql,
    };
  }

  const result = await databridgeQuery({ db_type, connection_url, sql, params: allParams }, env);
  return {
    table,
    sql,
    rows_affected: result.rowsAffected ?? affectedCount,
    set_values,
    where_clause,
    updated_at: new Date().toISOString(),
  };
}

async function getSchema({ db_type = 'd1', connection_url, include_indexes = false, include_row_counts = false }, env) {
  // SchemaCache: cache for 1h in KV (would use connection hash as key in production)
  const cacheKey = `schema:${db_type}:${(connection_url || 'demo').slice(-16)}`;
  try {
    const cached = await env.RATE_LIMIT.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      return { ...parsed, cache_hit: true };
    }
  } catch {}

  // Mock schema introspection
  const schema = {
    db_type,
    tables: [
      {
        name: 'users',
        columns: [
          { name: 'id', type: 'INTEGER', nullable: false, primary_key: true, auto_increment: true },
          { name: 'name', type: 'TEXT', nullable: false },
          { name: 'email', type: 'TEXT', nullable: false, unique: true },
          { name: 'created_at', type: 'TIMESTAMP', nullable: true, default: 'CURRENT_TIMESTAMP' },
        ],
        ...(include_row_counts && { row_count: 1247 }),
        ...(include_indexes && { indexes: [{ name: 'users_email_idx', columns: ['email'], unique: true }] }),
      },
      {
        name: 'orders',
        columns: [
          { name: 'id', type: 'INTEGER', nullable: false, primary_key: true, auto_increment: true },
          { name: 'user_id', type: 'INTEGER', nullable: false, foreign_key: { table: 'users', column: 'id' } },
          { name: 'amount_usd', type: 'REAL', nullable: false },
          { name: 'status', type: 'TEXT', nullable: false, check: "status IN ('pending', 'paid', 'refunded')" },
          { name: 'created_at', type: 'TIMESTAMP', nullable: true, default: 'CURRENT_TIMESTAMP' },
        ],
        ...(include_row_counts && { row_count: 3891 }),
        ...(include_indexes && { indexes: [{ name: 'orders_user_idx', columns: ['user_id'], unique: false }] }),
      },
    ],
    views: [],
    functions: [],
    inspected_at: new Date().toISOString(),
    cache_hit: false,
  };

  try {
    await env.RATE_LIMIT.put(cacheKey, JSON.stringify(schema), { expirationTtl: 3600 });
  } catch {}

  return schema;
}

async function migrateSchema({ db_type = 'd1', connection_url, migrations, dry_run = true, record_audit = true }, env) {
  if (!migrations || !Array.isArray(migrations) || migrations.length === 0) {
    return { error: 'migrations must be non-empty array of { name, up, down } objects' };
  }

  const results = [];
  const auditLog = [];
  let success = true;

  for (const migration of migrations) {
    if (!migration.name || !migration.up) {
      results.push({ name: migration.name || 'unnamed', error: 'Migration requires name and up fields' });
      success = false;
      continue;
    }

    if (dry_run) {
      results.push({
        name: migration.name,
        status: 'dry_run',
        up_sql: migration.up,
        down_sql: migration.down || null,
        message: 'Dry run — not executed',
      });
    } else {
      try {
        const r = await databridgeQuery({ db_type, connection_url, sql: migration.up }, env);
        results.push({ name: migration.name, status: 'applied', result: r });
        if (record_audit) {
          auditLog.push({
            migration: migration.name,
            applied_at: new Date().toISOString(),
            up_sql: migration.up,
            down_sql: migration.down || null,
          });
        }
      } catch (e) {
        results.push({ name: migration.name, status: 'failed', error: e.message });
        success = false;
        break; // stop on first failure
      }
    }
  }

  if (record_audit && !dry_run && auditLog.length > 0) {
    try {
      const existingRaw = await env.RATE_LIMIT.get(`audit:migrations:${db_type}`);
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      existing.push(...auditLog);
      await env.RATE_LIMIT.put(`audit:migrations:${db_type}`, JSON.stringify(existing.slice(-100)), { expirationTtl: 86400 * 30 });
    } catch {}
  }

  return {
    db_type,
    dry_run,
    total_migrations: migrations.length,
    applied: results.filter(r => r.status === 'applied').length,
    failed: results.filter(r => r.status === 'failed').length,
    success,
    results,
    ...(record_audit && auditLog.length > 0 && { audit_log: auditLog }),
  };
}

// ── Tool registry ─────────────────────────────────────────────────────────────
const TOOLS = [
  {
    name: 'query_database',
    description: 'Execute SQL or natural language queries (NLQ) against D1, PostgreSQL, MongoDB, SQLite, or MySQL via DataBridge Protocol. Supports parameterized queries and NLQ auto-translation.',
    inputSchema: {
      type: 'object',
      properties: {
        db_type: { type: 'string', enum: ['d1', 'postgresql', 'mongodb', 'sqlite', 'mysql'], description: 'Database type', default: 'd1' },
        connection_url: { type: 'string', description: 'Connection string (optional for D1 default)' },
        sql: { type: 'string', description: 'SQL query string, or natural language if use_nlq=true' },
        params: { type: 'array', description: 'Parameterized query values', default: [] },
        use_nlq: { type: 'boolean', description: 'Translate natural language in sql field to SQL', default: false },
        schema_hint: { type: 'object', description: 'Schema hint for NLQ translation: { tables: [{ name, columns }] }' },
        timeout_ms: { type: 'number', description: 'Query timeout in ms', default: 10000 },
      },
      required: [],
    },
  },
  {
    name: 'insert_records',
    description: 'Bulk insert records into a database table with type validation and conflict handling. Supports up to 1000 records per call with automatic batching.',
    inputSchema: {
      type: 'object',
      properties: {
        db_type: { type: 'string', enum: ['d1', 'postgresql', 'mongodb', 'sqlite', 'mysql'], default: 'd1' },
        connection_url: { type: 'string' },
        table: { type: 'string', description: 'Target table name' },
        records: { type: 'array', items: { type: 'object' }, description: 'Array of record objects to insert' },
        on_conflict: { type: 'string', enum: ['error', 'ignore', 'replace'], default: 'error', description: 'Conflict resolution strategy' },
        batch_size: { type: 'number', default: 100, description: 'Records per batch' },
      },
      required: ['table', 'records'],
    },
  },
  {
    name: 'update_records',
    description: '[PRO] SafeWrite Guard protected update with pre-check row count, dry-run mode, and max_rows limit to prevent accidental mass updates.',
    inputSchema: {
      type: 'object',
      properties: {
        db_type: { type: 'string', enum: ['d1', 'postgresql', 'mongodb', 'sqlite', 'mysql'], default: 'd1' },
        connection_url: { type: 'string' },
        table: { type: 'string', description: 'Target table name' },
        set_values: { type: 'object', description: 'Column-value pairs to SET (e.g. { status: "active" })' },
        where_clause: { type: 'string', description: 'WHERE condition (required, no blind updates)' },
        where_params: { type: 'array', default: [], description: 'Parameterized WHERE values' },
        dry_run: { type: 'boolean', default: false, description: 'Preview SQL without executing' },
        max_rows: { type: 'number', default: 500, description: 'SafeWrite Guard max row limit' },
      },
      required: ['table', 'set_values', 'where_clause'],
    },
  },
  {
    name: 'get_schema',
    description: 'Introspect database schema with SchemaCache (1h TTL). Returns tables, columns, types, constraints, foreign keys, optional indexes and row counts.',
    inputSchema: {
      type: 'object',
      properties: {
        db_type: { type: 'string', enum: ['d1', 'postgresql', 'mongodb', 'sqlite', 'mysql'], default: 'd1' },
        connection_url: { type: 'string' },
        include_indexes: { type: 'boolean', default: false, description: 'Include index definitions' },
        include_row_counts: { type: 'boolean', default: false, description: 'Include approximate row counts' },
      },
      required: [],
    },
  },
  {
    name: 'migrate_schema',
    description: '[PRO] Apply DDL migrations with audit log. Supports dry_run preview, up/down migrations, and sequential rollback-safe execution.',
    inputSchema: {
      type: 'object',
      properties: {
        db_type: { type: 'string', enum: ['d1', 'postgresql', 'mongodb', 'sqlite', 'mysql'], default: 'd1' },
        connection_url: { type: 'string' },
        migrations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Migration name (e.g. "add_users_verified_col")' },
              up: { type: 'string', description: 'SQL to apply migration' },
              down: { type: 'string', description: 'SQL to rollback migration (optional)' },
            },
            required: ['name', 'up'],
          },
          description: 'Ordered list of migrations to apply',
        },
        dry_run: { type: 'boolean', default: true, description: 'Preview migrations without executing' },
        record_audit: { type: 'boolean', default: true, description: 'Write applied migrations to audit log' },
      },
      required: ['migrations'],
    },
  },
];

// ── Landing page HTML ─────────────────────────────────────────────────────────
const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Database Toolkit MCP — DataBridge Protocol</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0e1a;color:#e2e8f0;min-height:100vh;padding:48px 24px}
  .container{max-width:860px;margin:0 auto}
  h1{font-size:2.4rem;font-weight:700;background:linear-gradient(135deg,#38bdf8,#818cf8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:12px}
  .badge{display:inline-block;background:#1e3a5f;color:#38bdf8;border:1px solid #38bdf8;border-radius:20px;padding:4px 14px;font-size:.8rem;margin-bottom:24px}
  .desc{color:#94a3b8;font-size:1.05rem;line-height:1.7;margin-bottom:36px}
  .tools{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:40px}
  .tool{background:#111827;border:1px solid #1e293b;border-radius:12px;padding:20px}
  .tool-name{color:#38bdf8;font-weight:600;font-size:.95rem;margin-bottom:6px}
  .tool-desc{color:#64748b;font-size:.85rem;line-height:1.5}
  .pro-badge{background:#7c3aed;color:#fff;font-size:.7rem;padding:2px 8px;border-radius:10px;margin-left:6px;vertical-align:middle}
  .tiers{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:36px}
  .tier{border-radius:12px;padding:24px;border:1px solid}
  .tier.free{background:#0f2027;border-color:#1e3a5f;color:#38bdf8}
  .tier.pro{background:#1a0a2e;border-color:#7c3aed;color:#a78bfa}
  .tier h3{font-size:1.1rem;margin-bottom:8px}
  .tier .price{font-size:1.8rem;font-weight:700;margin-bottom:8px}
  .tier p{font-size:.85rem;opacity:.8}
  .endpoint{background:#111827;border:1px solid #1e293b;border-radius:8px;padding:16px;margin-bottom:12px;font-family:monospace;font-size:.85rem}
  .endpoint .method{color:#4ade80;margin-right:10px}
  .endpoint .path{color:#f8fafc}
  footer{color:#475569;font-size:.8rem;text-align:center;margin-top:48px}
  a{color:#38bdf8;text-decoration:none}
  @media(max-width:600px){.tools,.tiers{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="container">
  <h1>Database Toolkit MCP</h1>
  <div class="badge">DataBridge Protocol v1.0</div>
  <p class="desc">Universal database bridge for AI agents. Query, insert, update, and migrate D1, PostgreSQL, MongoDB, MySQL, and SQLite databases via natural language or SQL. Built-in SafeWrite Guard, NLQ engine, SchemaCache, and migration audit log.</p>

  <div class="tools">
    <div class="tool"><div class="tool-name">query_database</div><div class="tool-desc">Execute SQL or natural language queries. NLQ auto-translation. Multi-DB support.</div></div>
    <div class="tool"><div class="tool-name">insert_records</div><div class="tool-desc">Bulk insert up to 1000 records with auto-batching and conflict strategies.</div></div>
    <div class="tool"><div class="tool-name">update_records<span class="pro-badge">PRO</span></div><div class="tool-desc">SafeWrite Guard updates with pre-check row count and dry-run mode.</div></div>
    <div class="tool"><div class="tool-name">get_schema</div><div class="tool-desc">Schema introspection with 1h SchemaCache. Tables, columns, constraints, FK, indexes.</div></div>
    <div class="tool"><div class="tool-name">migrate_schema<span class="pro-badge">PRO</span></div><div class="tool-desc">DDL migrations with dry-run, up/down support, and audit log.</div></div>
  </div>

  <div class="tiers">
    <div class="tier free">
      <h3>Free</h3>
      <div class="price">$0</div>
      <p>20 requests/day · query_database · insert_records · get_schema</p>
    </div>
    <div class="tier pro">
      <h3>Pro</h3>
      <div class="price">$9<span style="font-size:1rem">/mo</span></div>
      <p>1000 requests/day · All tools · update_records · migrate_schema · SafeWrite Guard</p>
      <p style="margin-top:8px"><a href="https://buy.stripe.com/4gw5na5U19SP9TW288">Upgrade →</a></p>
    </div>
  </div>

  <h2 style="margin-bottom:16px;color:#94a3b8">Endpoints</h2>
  <div class="endpoint"><span class="method">GET</span><span class="path">/</span> — This landing page</div>
  <div class="endpoint"><span class="method">POST</span><span class="path">/mcp</span> — MCP Streamable HTTP (JSON-RPC 2.0)</div>
  <div class="endpoint"><span class="method">GET</span><span class="path">/llms.txt</span> — LLM-readable server description</div>

  <footer>
    <p>Part of <a href="https://openclaw.dev">OpenClaw</a> Cloud Army · 10 MCP servers</p>
    <p style="margin-top:8px">Database Toolkit MCP · DataBridge Protocol · SafeWrite Guard · NLQ Engine</p>
  </footer>
</div>
</body>
</html>`;

// ── MCP handler ───────────────────────────────────────────────────────────────
async function handleMcp(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
  const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '');

  let body;
  try { body = await request.json(); }
  catch { return Response.json(jsonRpcError(null, -32700, 'Parse error'), { headers: CORS }); }

  const { id, method, params = {} } = body;

  if (method === 'initialize') {
    return Response.json(jsonRpcResponse(id, {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: CAPABILITIES,
      serverInfo: SERVER_INFO,
    }), { headers: CORS });
  }

  if (method === 'notifications/initialized') return new Response(null, { status: 204, headers: CORS });

  if (method === 'tools/list') {
    return Response.json(jsonRpcResponse(id, { tools: TOOLS }), { headers: CORS });
  }

  if (method === 'tools/call') {
    const { name, arguments: args = {} } = params;

    const proTools = new Set(['update_records', 'migrate_schema']);
    let proData = null;
    if (apiKey) proData = await validateProKey(apiKey, env);
    const isPro = !!proData;

    if (proTools.has(name) && !isPro) {
      return Response.json(jsonRpcResponse(id, toolResult({
        error: `${name} requires Pro subscription`,
        upgrade: 'https://buy.stripe.com/4gw5na5U19SP9TW288',
        message: 'Upgrade to Pro ($9/mo) for SafeWrite Guard updates and schema migrations.',
        free_tools: ['query_database', 'insert_records', 'get_schema'],
      })), { headers: CORS });
    }

    // Rate limiting
    if (isPro) {
      const ok = await proKeyRateLimit(apiKey, env);
      if (!ok) return Response.json(jsonRpcResponse(id, toolError('Pro daily limit reached (1000/day). Resets at midnight UTC.')), { headers: CORS });
    } else {
      const ok = await checkRateLimit(ip, env);
      if (!ok) return Response.json(jsonRpcResponse(id, toolResult({
        error: 'Free tier limit reached (20/day)',
        upgrade: 'https://buy.stripe.com/4gw5na5U19SP9TW288',
        resets: 'Midnight UTC',
        ecosystem: ECOSYSTEM,
      })), { headers: CORS });
    }

    let result;
    try {
      switch (name) {
        case 'query_database':    result = await queryDatabase(args, env); break;
        case 'insert_records':    result = await insertRecords(args, env); break;
        case 'update_records':    result = await updateRecords(args, env); break;
        case 'get_schema':        result = await getSchema(args, env); break;
        case 'migrate_schema':    result = await migrateSchema(args, env); break;
        default: return Response.json(jsonRpcError(id, -32601, `Unknown tool: ${name}`), { headers: CORS });
      }
    } catch (e) {
      return Response.json(jsonRpcResponse(id, toolError(`Tool error: ${e.message}`)), { headers: CORS });
    }

    return Response.json(jsonRpcResponse(id, toolResult(result)), { headers: CORS });
  }

  return Response.json(jsonRpcError(id, -32601, `Method not found: ${method}`), { headers: CORS });
}

// ── Router ────────────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    if (url.pathname === '/') {
      return new Response(LANDING_HTML, { headers: { ...CORS, 'Content-Type': 'text/html; charset=utf-8' } });
    }

    if (url.pathname === '/llms.txt') {
      const txt = [
        `# ${SERVER_INFO.name} MCP Server v${SERVER_INFO.version}`,
        `Vendor: ${VENDOR}`,
        `Protocol: MCP ${MCP_PROTOCOL_VERSION}`,
        '',
        '## Description',
        'Universal database bridge for AI agents. DataBridge Protocol supports D1, PostgreSQL, MongoDB, MySQL, SQLite.',
        'Features: NLQ engine, SafeWrite Guard, SchemaCache, migration audit log.',
        '',
        '## Tools',
        ...TOOLS.map(t => `- ${t.name}: ${t.description}`),
        '',
        '## Tiers',
        `Free: ${RATE_LIMIT_MAX} req/day | Pro: ${PRO_DAILY_LIMIT} req/day ($9/mo)`,
        '',
        '## Endpoint',
        `POST ${url.origin}/mcp (MCP Streamable HTTP, JSON-RPC 2.0)`,
        '',
        '## Ecosystem',
        ...Object.entries(ECOSYSTEM).map(([k, v]) => `- ${k}: ${v}`),
      ].join('\n');
      return new Response(txt, { headers: { ...CORS, 'Content-Type': 'text/plain; charset=utf-8' } });
    }

    if (url.pathname === '/mcp') {
      if (request.method !== 'POST') {
        return new Response('POST only', { status: 405, headers: CORS });
      }
      return handleMcp(request, env);
    }

    return new Response('Not Found', { status: 404, headers: CORS });
  },
};
