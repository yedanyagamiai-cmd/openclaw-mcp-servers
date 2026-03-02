/**
 * Timestamp Converter MCP Server v1.0.0
 * Utility for AI agents needing time/date conversions, timezone math, and cron expression handling.
 *
 * Tools (5 free):
 *   - convert_timestamp   : unix ↔ ISO 8601 ↔ human readable ↔ relative
 *   - timezone_convert    : convert datetime between timezones (or show all common zones)
 *   - parse_cron          : parse cron expression → human description + next 5 runs
 *   - time_diff           : difference between two datetimes in multiple units
 *   - format_duration     : seconds ↔ "2h 30m 15s" ↔ ISO 8601 duration (PT2H30M15S)
 *
 * Rate limit: 30 free / day (KV)
 * MCP protocol: 2025-03-26, JSON-RPC 2.0, Batch support
 * Vendor: OpenClaw Intelligence
 */

const SERVER_INFO = { name: 'timestamp-converter', version: '1.0.0', vendor: 'OpenClaw Intelligence' };
const CAPABILITIES = { tools: {} };

const ECOSYSTEM = {
  timestamp:  'https://timestamp-converter-mcp.yagami8095.workers.dev/mcp',
  json:       'https://json-toolkit-mcp.yagami8095.workers.dev/mcp',
  regex:      'https://regex-engine-mcp.yagami8095.workers.dev/mcp',
  color:      'https://color-palette-mcp.yagami8095.workers.dev/mcp',
  prompt:     'https://prompt-enhancer-mcp.yagami8095.workers.dev/mcp',
  intel:      'https://openclaw-intel-mcp.yagami8095.workers.dev/mcp',
  fortune:    'https://openclaw-fortune-mcp.yagami8095.workers.dev/mcp',
  moltbook:   'https://moltbook-publisher-mcp.yagami8095.workers.dev/mcp',
  agentforge: 'https://agentforge-compare-mcp.yagami8095.workers.dev/mcp',
  store:      'https://product-store.yagami8095.workers.dev',
  fortune_api:'https://fortune-api.yagami8095.workers.dev',
  intel_api:  'https://openclaw-intel-api.yagami8095.workers.dev',
};

// ============================================================
// Timezone Abbreviation Map
// ============================================================
const TZ_ALIASES = {
  'UTC':  'UTC',
  'GMT':  'UTC',
  'JST':  'Asia/Tokyo',
  'EST':  'America/New_York',
  'EDT':  'America/New_York',
  'CST':  'America/Chicago',
  'CDT':  'America/Chicago',
  'MST':  'America/Denver',
  'MDT':  'America/Denver',
  'PST':  'America/Los_Angeles',
  'PDT':  'America/Los_Angeles',
  'CET':  'Europe/Paris',
  'CEST': 'Europe/Paris',
  'WET':  'Europe/Lisbon',
  'EET':  'Europe/Helsinki',
  'IST':  'Asia/Kolkata',
  'ICT':  'Asia/Bangkok',
  'SGT':  'Asia/Singapore',
  'HKT':  'Asia/Hong_Kong',
  'KST':  'Asia/Seoul',
  'AEST': 'Australia/Sydney',
  'AEDT': 'Australia/Sydney',
  'NZST': 'Pacific/Auckland',
  'BRT':  'America/Sao_Paulo',
  'ART':  'America/Argentina/Buenos_Aires',
  'CAT':  'Africa/Harare',
  'EAT':  'Africa/Nairobi',
  'WAT':  'Africa/Lagos',
  'MSK':  'Europe/Moscow',
  'TRT':  'Europe/Istanbul',
  'PKT':  'Asia/Karachi',
  'BST':  'Asia/Dhaka',
  'ICT2': 'Asia/Bangkok',
  'WIB':  'Asia/Jakarta',
  'CST_CN': 'Asia/Shanghai',
  'PHT':  'Asia/Manila',
};

const SHOW_ALL_ZONES = [
  { label: 'UTC',   tz: 'UTC' },
  { label: 'JST',   tz: 'Asia/Tokyo' },
  { label: 'EST',   tz: 'America/New_York' },
  { label: 'PST',   tz: 'America/Los_Angeles' },
  { label: 'CET',   tz: 'Europe/Paris' },
  { label: 'IST',   tz: 'Asia/Kolkata' },
  { label: 'CST',   tz: 'America/Chicago' },
];

// ============================================================
// CRON field definitions
// ============================================================
const CRON_FIELDS = ['minute', 'hour', 'day', 'month', 'weekday'];
const MONTH_NAMES  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WEEKDAY_NAMES= ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const WEEKDAY_SHORT= ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ============================================================
// MCP TOOLS DEFINITION
// ============================================================
const TOOLS = [
  {
    name: 'convert_timestamp',
    description: 'Convert a timestamp between formats: unix epoch (seconds/ms) ↔ ISO 8601 ↔ human-readable ↔ relative ("3 hours ago"). Auto-detects input format. Returns all formats at once plus UTC offset info.',
    inputSchema: {
      type: 'object',
      properties: {
        input: {
          description: 'The timestamp to convert. Can be: unix epoch (e.g. 1714000000), ms epoch (e.g. 1714000000000), ISO 8601 (e.g. 2024-04-25T10:00:00Z), or human readable (e.g. "Apr 25, 2024 10:00 AM").',
        },
        from_format: {
          type: 'string',
          enum: ['auto', 'unix', 'unix_ms', 'iso8601', 'human'],
          description: 'Input format hint. Default: "auto" (auto-detected).',
        },
        to_format: {
          type: 'string',
          enum: ['all', 'unix', 'unix_ms', 'iso8601', 'human', 'relative'],
          description: 'Output format. Default: "all" (returns every format).',
        },
        timezone: {
          type: 'string',
          description: 'Timezone for human-readable output. Accepts IANA (e.g. "Asia/Tokyo") or abbreviation (e.g. "JST"). Default: "UTC".',
        },
      },
      required: ['input'],
    },
  },
  {
    name: 'timezone_convert',
    description: 'Convert a datetime from one timezone to another. When show_all=true, displays the time in 7 common timezones simultaneously (UTC, JST, EST, PST, CET, IST, CST).',
    inputSchema: {
      type: 'object',
      properties: {
        datetime: {
          type: 'string',
          description: 'Datetime to convert. ISO 8601 string or unix epoch number as string. E.g. "2024-04-25T10:00:00" or "1714000000".',
        },
        from_tz: {
          type: 'string',
          description: 'Source timezone. IANA name (e.g. "America/New_York") or abbreviation (e.g. "EST").',
        },
        to_tz: {
          type: 'string',
          description: 'Target timezone. Required unless show_all=true.',
        },
        show_all: {
          type: 'boolean',
          description: 'If true, show time in all 7 common timezones: UTC, JST, EST, PST, CET, IST, CST.',
        },
      },
      required: ['datetime', 'from_tz'],
    },
  },
  {
    name: 'parse_cron',
    description: 'Parse a standard 5-field cron expression (minute hour day month weekday). Returns: human-readable description, validation status, next 5 run times. E.g. "*/5 9-17 * * 1-5" → "Every 5 minutes from 9am to 5pm, Mon-Fri".',
    inputSchema: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'Cron expression with 5 fields: minute hour day month weekday. Supports *, /step, ranges (1-5), lists (1,3,5), and named months/days.',
        },
        timezone: {
          type: 'string',
          description: 'Timezone for next-run calculations. Default: "UTC".',
        },
      },
      required: ['expression'],
    },
  },
  {
    name: 'time_diff',
    description: 'Calculate the difference between two datetimes. Returns difference in seconds, minutes, hours, days, weeks, and approximate months. Handles past/future direction automatically.',
    inputSchema: {
      type: 'object',
      properties: {
        start: {
          type: 'string',
          description: 'Start datetime. ISO 8601, unix epoch, or human readable string.',
        },
        end: {
          type: 'string',
          description: 'End datetime. ISO 8601, unix epoch, or human readable string. Defaults to "now" if omitted.',
        },
      },
      required: ['start'],
    },
  },
  {
    name: 'format_duration',
    description: 'Convert between duration formats: seconds (integer) ↔ human string ("2h 30m 15s") ↔ ISO 8601 duration ("PT2H30M15S"). Auto-detects input format.',
    inputSchema: {
      type: 'object',
      properties: {
        input: {
          description: 'Duration to convert. Can be: integer seconds (e.g. 9015), human string (e.g. "2h 30m 15s" or "1 day 4 hours"), or ISO 8601 duration (e.g. "PT2H30M15S" or "P1DT4H").',
        },
        format: {
          type: 'string',
          enum: ['all', 'seconds', 'human', 'iso8601'],
          description: 'Output format. Default: "all".',
        },
      },
      required: ['input'],
    },
  },
];

// ============================================================
// HELPERS
// ============================================================

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id',
    'Access-Control-Expose-Headers': 'Mcp-Session-Id',
  };
}

function jsonRpcOk(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function jsonRpcError(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

function toolError(message) {
  return { content: [{ type: 'text', text: JSON.stringify({ error: message }) }], isError: true };
}

function toolOk(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function resolveTimezone(tz) {
  if (!tz) return 'UTC';
  const upper = tz.toUpperCase().trim();
  if (TZ_ALIASES[upper]) return TZ_ALIASES[upper];
  // Try IANA validation
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch {
    return null;
  }
}

// Parse any input into a Date object
function parseInput(input) {
  if (input === null || input === undefined || input === '') return null;

  // Numeric (unix or ms)
  const num = typeof input === 'number' ? input : parseFloat(String(input));
  if (!isNaN(num)) {
    // Heuristic: if > 9999999999 treat as ms; else as seconds
    const ms = num > 9_999_999_999 ? num : num * 1000;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  const str = String(input).trim();

  // ISO 8601 and most standard formats
  const iso = new Date(str);
  if (!isNaN(iso.getTime())) return iso;

  // Relative (for input parsing — not common but handle "now")
  if (str.toLowerCase() === 'now') return new Date();

  return null;
}

// Format date in a given timezone using Intl
function formatInTz(date, tz, opts) {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: tz, ...opts }).format(date);
  } catch {
    return null;
  }
}

// Get UTC offset string like "+09:00"
function getUtcOffset(date, tz) {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(date);
    const offsetPart = parts.find(p => p.type === 'timeZoneName');
    return offsetPart ? offsetPart.value : 'unknown';
  } catch {
    return 'unknown';
  }
}

// Get full timezone name
function getTzName(date, tz) {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'long',
    });
    const parts = formatter.formatToParts(date);
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    return tzPart ? tzPart.value : tz;
  } catch {
    return tz;
  }
}

// Compute a relative-time string ("3 hours ago", "in 2 days")
function toRelative(date) {
  const now = Date.now();
  const diffMs = date.getTime() - now;
  const absDiff = Math.abs(diffMs);
  const past = diffMs < 0;

  let str;
  if (absDiff < 60_000) {
    str = 'just now';
    return str;
  } else if (absDiff < 3_600_000) {
    const mins = Math.round(absDiff / 60_000);
    str = `${mins} minute${mins !== 1 ? 's' : ''}`;
  } else if (absDiff < 86_400_000) {
    const hours = Math.round(absDiff / 3_600_000);
    str = `${hours} hour${hours !== 1 ? 's' : ''}`;
  } else if (absDiff < 7 * 86_400_000) {
    const days = Math.round(absDiff / 86_400_000);
    str = `${days} day${days !== 1 ? 's' : ''}`;
  } else if (absDiff < 30 * 86_400_000) {
    const weeks = Math.round(absDiff / (7 * 86_400_000));
    str = `${weeks} week${weeks !== 1 ? 's' : ''}`;
  } else if (absDiff < 365 * 86_400_000) {
    const months = Math.round(absDiff / (30 * 86_400_000));
    str = `${months} month${months !== 1 ? 's' : ''}`;
  } else {
    const years = Math.round(absDiff / (365 * 86_400_000));
    str = `${years} year${years !== 1 ? 's' : ''}`;
  }

  return past ? `${str} ago` : `in ${str}`;
}

// Build all format representations of a date
function buildAllFormats(date, tz) {
  const resolvedTz = resolveTimezone(tz || 'UTC') || 'UTC';

  const iso = date.toISOString();
  const unixSec = Math.floor(date.getTime() / 1000);
  const unixMs  = date.getTime();

  const humanFull = formatInTz(date, resolvedTz, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true,
  });

  const humanShort = formatInTz(date, resolvedTz, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });

  const dateOnlyStr = formatInTz(date, resolvedTz, {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });

  const timeOnlyStr = formatInTz(date, resolvedTz, {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });

  // ISO with timezone offset
  const offsetStr = getUtcOffset(date, resolvedTz);
  const tzName = getTzName(date, resolvedTz);

  return {
    unix_seconds: unixSec,
    unix_milliseconds: unixMs,
    iso8601_utc: iso,
    human_full: humanFull,
    human_short: humanShort,
    date_only: dateOnlyStr,
    time_only: timeOnlyStr,
    relative: toRelative(date),
    timezone: resolvedTz,
    timezone_name: tzName,
    utc_offset: offsetStr,
  };
}

// ============================================================
// TOOL: convert_timestamp
// ============================================================
function handleConvertTimestamp(args) {
  const { input, to_format = 'all', timezone } = args;

  if (input === undefined || input === null || String(input).trim() === '') {
    return toolError('Missing required parameter: input');
  }

  const date = parseInput(input);
  if (!date) {
    return toolError(`Could not parse input "${input}". Accepted formats: unix epoch (e.g. 1714000000), ms epoch (e.g. 1714000000000), ISO 8601 (e.g. "2024-04-25T10:00:00Z"), human readable (e.g. "Apr 25, 2024").`);
  }

  const resolvedTz = resolveTimezone(timezone || 'UTC');
  if (!resolvedTz) {
    return toolError(`Unknown timezone: "${timezone}". Use IANA name (e.g. "Asia/Tokyo") or abbreviation (e.g. "JST").`);
  }

  const all = buildAllFormats(date, resolvedTz);

  let output;
  if (to_format === 'all' || !to_format) {
    output = all;
  } else if (to_format === 'unix') {
    output = { unix_seconds: all.unix_seconds };
  } else if (to_format === 'unix_ms') {
    output = { unix_milliseconds: all.unix_milliseconds };
  } else if (to_format === 'iso8601') {
    output = { iso8601_utc: all.iso8601_utc };
  } else if (to_format === 'human') {
    output = { human_full: all.human_full, human_short: all.human_short, date_only: all.date_only, time_only: all.time_only, timezone: all.timezone, timezone_name: all.timezone_name, utc_offset: all.utc_offset };
  } else if (to_format === 'relative') {
    output = { relative: all.relative };
  } else {
    output = all;
  }

  return toolOk({ ...output, _ecosystem: ECOSYSTEM });
}

// ============================================================
// TOOL: timezone_convert
// ============================================================
function handleTimezoneConvert(args) {
  const { datetime, from_tz, to_tz, show_all } = args;

  if (!datetime) return toolError('Missing required parameter: datetime');
  if (!from_tz) return toolError('Missing required parameter: from_tz');
  if (!show_all && !to_tz) return toolError('Provide to_tz or set show_all=true');

  const resolvedFrom = resolveTimezone(from_tz);
  if (!resolvedFrom) return toolError(`Unknown source timezone: "${from_tz}". Use IANA name or abbreviation (JST, EST, PST, CET, IST, CST, UTC).`);

  // Parse input — if it has no explicit offset, treat as-is (JS Date assumes UTC for ISO without Z)
  // So we need to interpret the datetime AS IF it's in from_tz.
  let date;
  const numericInput = typeof datetime === 'number' ? datetime : parseFloat(String(datetime));

  if (!isNaN(numericInput)) {
    // Numeric epoch
    date = parseInput(numericInput);
  } else {
    const str = String(datetime).trim();
    // If datetime already has offset/Z, parse directly
    if (/[Zz]$/.test(str) || /[+\-]\d{2}:\d{2}$/.test(str)) {
      date = new Date(str);
    } else {
      // No offset — interpret as from_tz wall time
      // Use Intl to find the offset of from_tz at the approximate time, then subtract
      const naiveDate = new Date(str + 'Z'); // parse as UTC first to get a reference
      if (isNaN(naiveDate.getTime())) {
        return toolError(`Could not parse datetime: "${datetime}". Use ISO 8601 format, e.g. "2024-04-25T10:00:00".`);
      }
      // Get UTC offset of from_tz at naiveDate (close enough for DST)
      const offsetMs = getTimezoneOffsetMs(naiveDate, resolvedFrom);
      date = new Date(naiveDate.getTime() - offsetMs);
    }
  }

  if (!date || isNaN(date.getTime())) {
    return toolError(`Could not parse datetime: "${datetime}". Use ISO 8601 format or unix epoch.`);
  }

  // Origin info
  const originFmt = buildAllFormats(date, resolvedFrom);

  if (show_all) {
    const results = SHOW_ALL_ZONES.map(zone => {
      const resolvedTz = resolveTimezone(zone.tz) || zone.tz;
      const fmt = buildAllFormats(date, resolvedTz);
      return {
        label: zone.label,
        iana: resolvedTz,
        datetime_local: fmt.human_short,
        iso8601: fmt.iso8601_utc,
        utc_offset: fmt.utc_offset,
      };
    });

    return toolOk({
      input: datetime,
      from_tz: resolvedFrom,
      utc_epoch: date.getTime() / 1000,
      all_timezones: results,
      _ecosystem: ECOSYSTEM,
    });
  }

  const resolvedTo = resolveTimezone(to_tz);
  if (!resolvedTo) return toolError(`Unknown target timezone: "${to_tz}". Use IANA name or abbreviation.`);

  const targetFmt = buildAllFormats(date, resolvedTo);

  return toolOk({
    input: datetime,
    from: {
      tz: resolvedFrom,
      datetime: originFmt.human_short,
      utc_offset: originFmt.utc_offset,
    },
    to: {
      tz: resolvedTo,
      datetime: targetFmt.human_short,
      iso8601: targetFmt.iso8601_utc,
      utc_offset: targetFmt.utc_offset,
      timezone_name: targetFmt.timezone_name,
      date_only: targetFmt.date_only,
      time_only: targetFmt.time_only,
    },
    utc_epoch_seconds: date.getTime() / 1000,
    tip: 'Use show_all=true to see UTC, JST, EST, PST, CET, IST, CST simultaneously.',
    _ecosystem: ECOSYSTEM,
  });
}

// Get timezone offset in ms (positive = east of UTC)
function getTimezoneOffsetMs(date, tz) {
  // Format date in given tz and in UTC, compute difference
  try {
    const utcStr  = date.toLocaleString('sv-SE', { timeZone: 'UTC' });
    const localStr = date.toLocaleString('sv-SE', { timeZone: tz });
    const utcMs    = new Date(utcStr + 'Z').getTime();
    const localMs  = new Date(localStr + 'Z').getTime();
    return localMs - utcMs;
  } catch {
    return 0;
  }
}

// ============================================================
// TOOL: parse_cron
// ============================================================

function parseCronField(field, min, max, names) {
  const values = new Set();
  const parts = field.split(',');

  for (const part of parts) {
    if (part === '*') {
      for (let i = min; i <= max; i++) values.add(i);
      continue;
    }

    const stepMatch = part.match(/^(\*|\d+(?:-\d+)?)\/(\d+)$/);
    if (stepMatch) {
      const step = parseInt(stepMatch[2]);
      if (step <= 0) throw new Error(`Invalid step value 0 in "${part}"`);
      let start, end;
      if (stepMatch[1] === '*') {
        start = min; end = max;
      } else if (stepMatch[1].includes('-')) {
        const [s, e] = stepMatch[1].split('-').map(Number);
        start = s; end = e;
      } else {
        start = parseInt(stepMatch[1]); end = max;
      }
      for (let i = start; i <= max; i += step) {
        if (i >= min && i <= max) values.add(i);
      }
      continue;
    }

    const rangeMatch = part.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1]), end = parseInt(rangeMatch[2]);
      if (start > end) throw new Error(`Invalid range ${start}-${end}`);
      for (let i = start; i <= end; i++) {
        if (i >= min && i <= max) values.add(i);
      }
      continue;
    }

    // Named values (months / weekdays)
    let num;
    if (names) {
      const idx = names.findIndex(n => n.toLowerCase() === part.toLowerCase());
      if (idx !== -1) { num = min + idx; }
    }
    if (num === undefined) num = parseInt(part);
    if (isNaN(num)) throw new Error(`Invalid cron field value: "${part}"`);
    if (num < min || num > max) throw new Error(`Value ${num} out of range [${min}-${max}] in "${part}"`);
    values.add(num);
  }

  return Array.from(values).sort((a, b) => a - b);
}

function describeCronField(field, name, min, max, names) {
  if (field === '*') return null; // "every"

  try {
    const values = parseCronField(field, min, max, names);

    if (field.startsWith('*/')) {
      const step = parseInt(field.slice(2));
      return `every ${step} ${name}s`;
    }
    if (field.includes('/')) {
      const step = parseInt(field.split('/')[1]);
      const base = field.split('/')[0];
      if (base === '*') return `every ${step} ${name}s`;
      const [start] = base.split('-').map(Number);
      const label = names ? (names[start - min] || start) : start;
      const endLabel = base.includes('-') ? (names ? names[parseInt(base.split('-')[1]) - min] || base.split('-')[1] : base.split('-')[1]) : null;
      return endLabel
        ? `every ${step} ${name}s from ${label} to ${endLabel}`
        : `every ${step} ${name}s starting at ${label}`;
    }

    const display = values.map(v => names ? (names[v - min] || v) : v);

    if (display.length === 1) return `at ${name} ${display[0]}`;
    if (display.length === 2) return `at ${name}s ${display.join(' and ')}`;
    if (field.includes('-') && !field.includes(',')) {
      const [s, e] = field.split('-').map(Number);
      return `from ${names ? names[s - min] : s} to ${names ? names[e - min] : e}`;
    }
    return `at ${name}s ${display.slice(0, -1).join(', ')} and ${display[display.length - 1]}`;
  } catch {
    return field;
  }
}

function cronToHuman(expr) {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error(`Expected 5 fields, got ${parts.length}. Format: minute hour day month weekday`);
  }

  const [minute, hour, day, month, weekday] = parts;

  const minuteDesc  = describeCronField(minute,  'minute',  0, 59, null);
  const hourDesc    = describeCronField(hour,     'hour',    0, 23, null);
  const dayDesc     = describeCronField(day,      'day',     1, 31, null);
  const monthDesc   = describeCronField(month,    'month',   1, 12, MONTH_SHORT);
  const weekdayDesc = describeCronField(weekday,  'weekday', 0,  6, WEEKDAY_SHORT);

  // Build natural language
  let desc = 'Runs ';

  // Time part
  if (minute === '*' && hour === '*') {
    desc += 'every minute';
  } else if (minute === '*') {
    desc += hourDesc ? `every minute during ${hourDesc}` : 'every minute';
  } else if (minuteDesc && minuteDesc.startsWith('every')) {
    desc += hourDesc ? `${minuteDesc} during ${hourDesc}` : minuteDesc;
  } else {
    if (hour === '*') {
      desc += minuteDesc ? `${minuteDesc} of every hour` : `at minute ${minute} of every hour`;
    } else {
      // Specific time
      try {
        const hrs = parseCronField(hour, 0, 23, null);
        const mins = parseCronField(minute, 0, 59, null);
        if (hrs.length <= 4 && mins.length <= 4) {
          const times = hrs.map(h => mins.map(m => `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`).join(', ')).join(', ');
          desc += `at ${times}`;
        } else {
          desc += [minuteDesc, hourDesc].filter(Boolean).join(', ') || 'at specific times';
        }
      } catch {
        desc += [minuteDesc, hourDesc].filter(Boolean).join(', ') || 'at specific times';
      }
    }
  }

  // Day/Month part
  const dayParts = [];
  if (weekday !== '*') {
    dayParts.push(weekdayDesc || `on weekday ${weekday}`);
  }
  if (day !== '*') {
    dayParts.push(`on ${dayDesc || `day ${day}`} of the month`);
  }
  if (month !== '*') {
    dayParts.push(`in ${monthDesc || `month ${month}`}`);
  }

  if (dayParts.length > 0) {
    desc += ', ' + dayParts.join(', ');
  }

  return desc;
}

// Compute next N run times for a cron (UTC by default, or given tz)
function getNextCronRuns(expr, count, tz) {
  const resolvedTz = resolveTimezone(tz || 'UTC') || 'UTC';
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return [];

  const [minuteF, hourF, dayF, monthF, weekdayF] = parts;

  let minutes, hours, days, months, weekdays;
  try {
    minutes  = parseCronField(minuteF,  0, 59, null);
    hours    = parseCronField(hourF,    0, 23, null);
    days     = parseCronField(dayF,     1, 31, null);
    months   = parseCronField(monthF,   1, 12, MONTH_SHORT);
    weekdays = parseCronField(weekdayF, 0,  6, WEEKDAY_SHORT);
  } catch {
    return [];
  }

  const results = [];
  let candidate = new Date();
  candidate.setSeconds(0, 0);
  candidate.setMinutes(candidate.getMinutes() + 1); // start from next minute

  const maxIterations = 100_000;
  let iterations = 0;

  while (results.length < count && iterations < maxIterations) {
    iterations++;

    // Get wall-clock fields in the target timezone
    const wallStr = candidate.toLocaleString('sv-SE', { timeZone: resolvedTz });
    // sv-SE format: "YYYY-MM-DD HH:mm:ss"
    const [datePart, timePart] = wallStr.split(' ');
    const [yr, mo, dy] = datePart.split('-').map(Number);
    const [hr, mn] = timePart.split(':').map(Number);
    const wd = new Date(wallStr + 'Z').getDay();

    const monthMatch   = months.includes(mo);
    const dayMatch     = weekdayF === '*' ? days.includes(dy) : weekdays.includes(wd);
    const dayMatch2    = dayF === '*' ? true : days.includes(dy);
    const weekdayMatch = weekdayF === '*' ? true : weekdays.includes(wd);

    // Standard cron: if both day and weekday are restricted, either matching is enough
    let dateMatch;
    if (dayF !== '*' && weekdayF !== '*') {
      dateMatch = monthMatch && (dayMatch2 || weekdayMatch);
    } else {
      dateMatch = monthMatch && dayMatch2 && weekdayMatch;
    }

    if (dateMatch && hours.includes(hr) && minutes.includes(mn)) {
      results.push({
        iso8601: candidate.toISOString(),
        local: formatInTz(candidate, resolvedTz, {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
          hour12: false,
        }),
        timezone: resolvedTz,
        relative: toRelative(candidate),
      });
      candidate = new Date(candidate.getTime() + 60_000);
    } else {
      candidate = new Date(candidate.getTime() + 60_000);
    }
  }

  return results;
}

function handleParseCron(args) {
  const { expression, timezone } = args;
  if (!expression) return toolError('Missing required parameter: expression');

  const trimmed = expression.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length !== 5) {
    return toolOk({
      expression: trimmed,
      valid: false,
      error: `Cron expression must have exactly 5 fields (minute hour day month weekday). Got ${parts.length} field${parts.length !== 1 ? 's' : ''}.`,
      format_hint: '* * * * *  →  minute(0-59) hour(0-23) day(1-31) month(1-12) weekday(0-6)',
      examples: [
        { expression: '0 9 * * 1-5',  description: 'Every weekday at 09:00' },
        { expression: '*/15 * * * *', description: 'Every 15 minutes' },
        { expression: '0 0 1 * *',    description: 'Midnight on the 1st of each month' },
        { expression: '30 8 * * 1',   description: 'Every Monday at 08:30' },
      ],
      _ecosystem: ECOSYSTEM,
    });
  }

  // Validate each field
  const validations = [];
  const ranges = [[0,59,null],[0,23,null],[1,31,null],[1,12,MONTH_SHORT],[0,6,WEEKDAY_SHORT]];
  let allValid = true;
  for (let i = 0; i < 5; i++) {
    try {
      parseCronField(parts[i], ranges[i][0], ranges[i][1], ranges[i][2]);
      validations.push({ field: CRON_FIELDS[i], value: parts[i], valid: true });
    } catch (e) {
      validations.push({ field: CRON_FIELDS[i], value: parts[i], valid: false, error: e.message });
      allValid = false;
    }
  }

  if (!allValid) {
    return toolOk({
      expression: trimmed,
      valid: false,
      field_validation: validations,
      _ecosystem: ECOSYSTEM,
    });
  }

  let description;
  try {
    description = cronToHuman(trimmed);
  } catch (e) {
    description = `Could not generate description: ${e.message}`;
  }

  const resolvedTz = resolveTimezone(timezone || 'UTC') || 'UTC';
  const nextRuns = getNextCronRuns(trimmed, 5, resolvedTz);

  return toolOk({
    expression: trimmed,
    valid: true,
    description,
    fields: {
      minute:  parts[0],
      hour:    parts[1],
      day:     parts[2],
      month:   parts[3],
      weekday: parts[4],
    },
    field_validation: validations,
    next_runs: nextRuns,
    timezone: resolvedTz,
    note: nextRuns.length === 0 ? 'Could not compute next runs (expression may be too restrictive or computational limit reached).' : undefined,
    _ecosystem: ECOSYSTEM,
  });
}

// ============================================================
// TOOL: time_diff
// ============================================================
function handleTimeDiff(args) {
  const { start, end } = args;
  if (!start) return toolError('Missing required parameter: start');

  const startDate = parseInput(start);
  if (!startDate) return toolError(`Could not parse start datetime: "${start}"`);

  let endDate;
  if (!end || String(end).toLowerCase() === 'now') {
    endDate = new Date();
  } else {
    endDate = parseInput(end);
    if (!endDate) return toolError(`Could not parse end datetime: "${end}"`);
  }

  const diffMs = endDate.getTime() - startDate.getTime();
  const absDiffMs = Math.abs(diffMs);
  const direction = diffMs >= 0 ? 'future' : 'past';

  const seconds = absDiffMs / 1000;
  const minutes = seconds / 60;
  const hours   = minutes / 60;
  const days    = hours / 24;
  const weeks   = days / 7;
  const months  = days / 30.4375; // average month
  const years   = days / 365.25;

  // Human summary
  let summary;
  if (absDiffMs < 60_000) {
    summary = `${Math.round(seconds)} second${Math.round(seconds) !== 1 ? 's' : ''}`;
  } else if (absDiffMs < 3_600_000) {
    summary = `${Math.round(minutes)} minute${Math.round(minutes) !== 1 ? 's' : ''}`;
  } else if (absDiffMs < 86_400_000) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    summary = m > 0 ? `${h} hour${h!==1?'s':''} ${m} minute${m!==1?'s':''}` : `${h} hour${h!==1?'s':''}`;
  } else if (absDiffMs < 7 * 86_400_000) {
    const d = Math.floor(days);
    const h = Math.round((days - d) * 24);
    summary = h > 0 ? `${d} day${d!==1?'s':''} ${h} hour${h!==1?'s':''}` : `${d} day${d!==1?'s':''}`;
  } else {
    const d = Math.floor(days);
    summary = `${d} days (${weeks.toFixed(1)} weeks)`;
  }

  return toolOk({
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    direction,
    summary: direction === 'future' ? `${summary} until end` : `${summary} since start`,
    absolute: {
      milliseconds: Math.round(absDiffMs),
      seconds:      Math.round(seconds),
      minutes:      parseFloat(minutes.toFixed(4)),
      hours:        parseFloat(hours.toFixed(4)),
      days:         parseFloat(days.toFixed(4)),
      weeks:        parseFloat(weeks.toFixed(4)),
      months_approx: parseFloat(months.toFixed(2)),
      years_approx:  parseFloat(years.toFixed(4)),
    },
    signed: {
      milliseconds: Math.round(diffMs),
      seconds:      Math.round(diffMs / 1000),
    },
    breakdown: (() => {
      const totalSec = Math.floor(absDiffMs / 1000);
      const d = Math.floor(totalSec / 86400);
      const h = Math.floor((totalSec % 86400) / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      return { days: d, hours: h, minutes: m, seconds: s };
    })(),
    _ecosystem: ECOSYSTEM,
  });
}

// ============================================================
// TOOL: format_duration
// ============================================================

// Parse ISO 8601 duration string (P[n]Y[n]M[n]DT[n]H[n]M[n]S)
function parseIso8601Duration(str) {
  const match = str.match(/^P(?:(\d+(?:\.\d+)?)Y)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)W)?(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i);
  if (!match) return null;
  const years   = parseFloat(match[1] || 0);
  const months  = parseFloat(match[2] || 0);
  const weeks   = parseFloat(match[3] || 0);
  const days    = parseFloat(match[4] || 0);
  const hours   = parseFloat(match[5] || 0);
  const minutes = parseFloat(match[6] || 0);
  const seconds = parseFloat(match[7] || 0);
  return years * 31_557_600 + months * 2_629_800 + weeks * 604_800 + days * 86_400 + hours * 3_600 + minutes * 60 + seconds;
}

// Parse human duration strings like "2h 30m 15s", "1 day 4 hours", "90 minutes"
function parseHumanDuration(str) {
  const lower = str.toLowerCase().trim();
  let total = 0;

  const patterns = [
    [/(\d+(?:\.\d+)?)\s*(?:year|yr|y)s?/, 31_557_600],
    [/(\d+(?:\.\d+)?)\s*(?:month|mo)s?/,  2_629_800],
    [/(\d+(?:\.\d+)?)\s*(?:week|wk|w)s?/, 604_800],
    [/(\d+(?:\.\d+)?)\s*(?:day|d)s?/,     86_400],
    [/(\d+(?:\.\d+)?)\s*(?:hour|hr|h)s?/, 3_600],
    [/(\d+(?:\.\d+)?)\s*(?:minute|min|m)s?/, 60],
    [/(\d+(?:\.\d+)?)\s*(?:second|sec|s)s?/, 1],
  ];

  for (const [re, multiplier] of patterns) {
    const m = lower.match(re);
    if (m) total += parseFloat(m[1]) * multiplier;
  }

  return total > 0 ? total : null;
}

function secondsToHuman(totalSec) {
  const sec = Math.round(totalSec);
  if (sec === 0) return '0s';

  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0) parts.push(`${s}s`);

  return parts.join(' ');
}

function secondsToHumanVerbose(totalSec) {
  const sec = Math.round(totalSec);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  const parts = [];
  if (d > 0) parts.push(`${d} day${d !== 1 ? 's' : ''}`);
  if (h > 0) parts.push(`${h} hour${h !== 1 ? 's' : ''}`);
  if (m > 0) parts.push(`${m} minute${m !== 1 ? 's' : ''}`);
  if (s > 0) parts.push(`${s} second${s !== 1 ? 's' : ''}`);
  if (parts.length === 0) return '0 seconds';

  return parts.join(', ');
}

function secondsToIso8601Duration(totalSec) {
  const sec = Math.round(totalSec);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  let result = 'P';
  if (d > 0) result += `${d}D`;
  if (h > 0 || m > 0 || s > 0) {
    result += 'T';
    if (h > 0) result += `${h}H`;
    if (m > 0) result += `${m}M`;
    if (s > 0) result += `${s}S`;
  }
  if (result === 'P') result = 'PT0S';

  return result;
}

function handleFormatDuration(args) {
  const { input, format = 'all' } = args;

  if (input === undefined || input === null || String(input).trim() === '') {
    return toolError('Missing required parameter: input');
  }

  let totalSeconds;
  const inputStr = String(input).trim();

  // Detect input type
  if (!isNaN(parseFloat(inputStr)) && isFinite(inputStr)) {
    // Pure number → seconds
    totalSeconds = parseFloat(inputStr);
  } else if (/^P/i.test(inputStr)) {
    // ISO 8601 duration
    totalSeconds = parseIso8601Duration(inputStr);
    if (totalSeconds === null) {
      return toolError(`Could not parse ISO 8601 duration: "${inputStr}". Expected format: "PT2H30M15S", "P1DT4H", "P1Y2M3DT4H5M6S".`);
    }
  } else {
    // Human string
    totalSeconds = parseHumanDuration(inputStr);
    if (totalSeconds === null) {
      return toolError(`Could not parse duration: "${inputStr}". Expected: integer seconds (e.g. 9015), human string (e.g. "2h 30m 15s", "1 day 4 hours"), or ISO 8601 (e.g. "PT2H30M15S").`);
    }
  }

  if (totalSeconds < 0) {
    return toolError('Duration cannot be negative.');
  }

  const sec   = Math.round(totalSeconds);
  const human = secondsToHuman(sec);
  const humanVerbose = secondsToHumanVerbose(sec);
  const iso   = secondsToIso8601Duration(sec);

  const all = {
    seconds:       sec,
    human_compact: human,
    human_verbose: humanVerbose,
    iso8601:       iso,
    breakdown: {
      days:    Math.floor(sec / 86400),
      hours:   Math.floor((sec % 86400) / 3600),
      minutes: Math.floor((sec % 3600) / 60),
      seconds: sec % 60,
    },
  };

  let output;
  if (format === 'all' || !format) {
    output = all;
  } else if (format === 'seconds') {
    output = { seconds: all.seconds };
  } else if (format === 'human') {
    output = { human_compact: all.human_compact, human_verbose: all.human_verbose };
  } else if (format === 'iso8601') {
    output = { iso8601: all.iso8601 };
  } else {
    output = all;
  }

  return toolOk({ ...output, _ecosystem: ECOSYSTEM });
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
async function checkRateLimit(env, clientId) {
  if (!env || !env.KV) return memoryRateLimit(clientId || 'no-kv');
  const today = new Date().toISOString().slice(0, 10);
  const key = `ts-converter:rate:${clientId}:${today}`;
  const limit = 30;
  try {
    const current = parseInt((await env.KV.get(key)) || '0');
    if (current >= limit) return { allowed: false, remaining: 0, limit };
    await env.KV.put(key, String(current + 1), { expirationTtl: 86400 });
    return { allowed: true, remaining: limit - current - 1, limit };
  } catch {
    return memoryRateLimit(clientId);
  }
}

// Semantic Cache — deterministic tool results cached in KV (24h TTL)
async function cacheHash(str) {
  const data = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getCached(kv, server, tool, args) {
  if (!kv) return null;
  try {
    const h = await cacheHash(JSON.stringify(args));
    const val = await kv.get(`cache:${server}:${tool}:${h}`);
    return val ? JSON.parse(val) : null;
  } catch { return null; }
}

async function setCache(kv, server, tool, args, result, ttl = 86400) {
  if (!kv) return;
  try {
    const h = await cacheHash(JSON.stringify(args));
    await kv.put(`cache:${server}:${tool}:${h}`, JSON.stringify(result), { expirationTtl: ttl });
  } catch {}
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

// ============================================================
// MCP PROTOCOL HANDLER
// ============================================================
async function handleMCPRequest(req, env, request) {
  const { jsonrpc, id, method, params } = req;

  if (!jsonrpc || jsonrpc !== '2.0' || !method) {
    return jsonRpcError(id || null, -32600, 'Invalid JSON-RPC request');
  }

  if (method === 'notifications/initialized') return null;
  if (method === 'ping') return jsonRpcOk(id, {});

  if (method === 'initialize') {
    return jsonRpcOk(id, {
      protocolVersion: '2025-03-26',
      capabilities: CAPABILITIES,
      serverInfo: {
        ...SERVER_INFO,
        description: 'Timestamp & timezone utility for AI agents. Convert unix ↔ ISO 8601, timezone math, cron parsing, duration formatting.',
      },
    });
  }

  if (method === 'tools/list') {
    return jsonRpcOk(id, { tools: TOOLS });
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params || {};
    const clientId = (request && (request.headers.get('x-client-id') || request.headers.get('cf-connecting-ip'))) || 'anon';

    const rateCheck = await checkRateLimit(env, clientId);
    if (!rateCheck.allowed) {
      const rateLimitMsg = {
        error: 'Rate limit exceeded',
        limit: rateCheck.limit,
        message: `Rate limit exceeded (${rateCheck.limit}/day). FREE 7-day trial (100 calls/day): https://product-store.yagami8095.workers.dev/auth/login\n\nPro ($9 one-time, 1000/day): https://paypal.me/Yagami8095/9 | x402: $0.05/call USDC on Base`,
        ecosystem: ECOSYSTEM,
      };
      return jsonRpcOk(id, {
        content: [{ type: 'text', text: JSON.stringify(rateLimitMsg) }],
        isError: true,
      });
    }

    // Semantic cache check
    const kv = env.KV;
    const toolArgs = args || {};
    Object.keys(toolArgs).forEach(k => { if (typeof toolArgs[k] === 'string') toolArgs[k] = sanitizeInput(toolArgs[k]); });
    const cached = await getCached(kv, 'timestamp', name, toolArgs);
    if (cached) {
      const cachedResp = jsonRpcOk(id, cached);
      addUpgradePrompt(cachedResp, rateCheck);
      return cachedResp;
    }

    let result;
    try {
      switch (name) {
        case 'convert_timestamp': result = handleConvertTimestamp(toolArgs); break;
        case 'timezone_convert':  result = handleTimezoneConvert(toolArgs);  break;
        case 'parse_cron':        result = handleParseCron(toolArgs);        break;
        case 'time_diff':         result = handleTimeDiff(toolArgs);         break;
        case 'format_duration':   result = handleFormatDuration(toolArgs);   break;
        default:
          return jsonRpcError(id, -32601, `Unknown tool: "${name}". Available tools: ${TOOLS.map(t => t.name).join(', ')}`);
      }
    } catch (e) {
      result = toolError(`Internal error: ${e.message}`);
    }

    const response = jsonRpcOk(id, result);

    // Cache successful results (parse_cron: 1h, others: 24h)
    if (response?.result && !response.result.isError) {
      const cacheTtl = name === 'parse_cron' ? 3600 : 86400;
      await setCache(kv, 'timestamp', name, toolArgs, response.result, cacheTtl);
    }

    addUpgradePrompt(response, rateCheck);
    return response;
  }

  return jsonRpcError(id, -32601, `Method not found: "${method}"`);
}

// ============================================================
// LANDING PAGE
// ============================================================
const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Timestamp Converter MCP — OpenClaw Intelligence</title>
  <meta name="description" content="Time & timezone utilities for AI agents. unix ↔ ISO 8601, timezone math, cron parsing, duration formatting. MCP protocol.">
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>
    .gradient-bg { background: linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%); }
    .card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); }
    .highlight { color: #a78bfa; }
    .code-block { background: rgba(0,0,0,0.4); }
  </style>
</head>
<body class="gradient-bg text-gray-100 min-h-screen">
  <div class="max-w-4xl mx-auto px-4 py-16">

    <!-- Header -->
    <div class="text-center mb-12">
      <div class="text-5xl mb-4">&#x23F1;&#xFE0F;</div>
      <h1 class="text-5xl font-bold mb-3 text-violet-300">Timestamp Converter MCP</h1>
      <p class="text-xl text-indigo-300 mb-2">Time &amp; Timezone Utilities for AI Agents</p>
      <p class="text-gray-400">unix &#x21C4; ISO 8601 &bull; Timezone Math &bull; Cron Parsing &bull; Duration Formatting</p>
      <div class="mt-4 inline-flex items-center gap-2 bg-green-900/30 border border-green-700/40 rounded-full px-4 py-1 text-sm text-green-400">
        <span class="w-2 h-2 bg-green-400 rounded-full inline-block"></span>
        Free Forever &bull; 30 req/day &bull; No API key needed
      </div>
    </div>

    <!-- Quick Connect -->
    <div class="card rounded-xl p-6 mb-8">
      <h2 class="text-lg font-semibold mb-3 text-violet-300">&#x1F527; Quick Connect</h2>
      <p class="text-gray-400 text-sm mb-3">Add to your Claude Code, Cursor, or any MCP-compatible client:</p>
      <pre class="code-block rounded-lg p-4 text-sm text-green-400 overflow-x-auto">{
  "mcpServers": {
    "timestamp-converter": {
      "url": "https://timestamp-converter-mcp.yagami8095.workers.dev/mcp",
      "transport": "streamable-http"
    }
  }
}</pre>
    </div>

    <!-- Tools Grid -->
    <div class="mb-8">
      <h2 class="text-lg font-semibold mb-4 text-violet-300">&#x1F6E0;&#xFE0F; 5 Free Tools</h2>
      <div class="grid md:grid-cols-2 gap-4">

        <div class="card rounded-xl p-5">
          <div class="text-violet-400 font-mono text-sm mb-1">convert_timestamp</div>
          <div class="text-gray-300 text-sm">Convert any timestamp to all formats at once.</div>
          <div class="text-gray-500 text-xs mt-2">unix &#x21C4; ISO 8601 &#x21C4; human &#x21C4; relative</div>
          <div class="code-block rounded mt-3 p-2 text-xs text-green-300 font-mono">{ "input": 1714000000 }</div>
        </div>

        <div class="card rounded-xl p-5">
          <div class="text-violet-400 font-mono text-sm mb-1">timezone_convert</div>
          <div class="text-gray-300 text-sm">Convert datetimes between timezones. Show all 7 common zones at once with show_all=true.</div>
          <div class="text-gray-500 text-xs mt-2">UTC, JST, EST, PST, CET, IST, CST</div>
          <div class="code-block rounded mt-3 p-2 text-xs text-green-300 font-mono">{ "datetime": "2024-04-25T10:00:00", "from_tz": "JST", "show_all": true }</div>
        </div>

        <div class="card rounded-xl p-5">
          <div class="text-violet-400 font-mono text-sm mb-1">parse_cron</div>
          <div class="text-gray-300 text-sm">Parse a 5-field cron expression. Returns human description, validation, and next 5 run times.</div>
          <div class="text-gray-500 text-xs mt-2">Standard cron: minute hour day month weekday</div>
          <div class="code-block rounded mt-3 p-2 text-xs text-green-300 font-mono">{ "expression": "*/5 9-17 * * 1-5", "timezone": "JST" }</div>
        </div>

        <div class="card rounded-xl p-5">
          <div class="text-violet-400 font-mono text-sm mb-1">time_diff</div>
          <div class="text-gray-300 text-sm">Calculate difference between two datetimes in all units.</div>
          <div class="text-gray-500 text-xs mt-2">seconds, minutes, hours, days, weeks, months</div>
          <div class="code-block rounded mt-3 p-2 text-xs text-green-300 font-mono">{ "start": "2024-01-01", "end": "2024-12-31" }</div>
        </div>

        <div class="card rounded-xl p-5 md:col-span-2">
          <div class="text-violet-400 font-mono text-sm mb-1">format_duration</div>
          <div class="text-gray-300 text-sm">Convert between duration formats in both directions. Auto-detects input type.</div>
          <div class="text-gray-500 text-xs mt-2">seconds &#x21C4; "2h 30m 15s" &#x21C4; ISO 8601 (PT2H30M15S)</div>
          <div class="flex flex-wrap gap-2 mt-3">
            <div class="code-block rounded p-2 text-xs text-green-300 font-mono">{ "input": 9015 }</div>
            <div class="code-block rounded p-2 text-xs text-green-300 font-mono">{ "input": "2h 30m 15s" }</div>
            <div class="code-block rounded p-2 text-xs text-green-300 font-mono">{ "input": "PT2H30M15S" }</div>
          </div>
        </div>

      </div>
    </div>

    <!-- Supported Timezones -->
    <div class="card rounded-xl p-6 mb-8">
      <h2 class="text-lg font-semibold mb-3 text-violet-300">&#x1F30D; Supported Timezone Abbreviations</h2>
      <div class="flex flex-wrap gap-2 text-xs">
        ${['UTC','GMT','JST','EST','EDT','CST','CDT','MST','MDT','PST','PDT','CET','CEST','IST','SGT','HKT','KST','AEST','BRT','MSK','PKT'].map(tz => `<span class="bg-indigo-900/50 border border-indigo-700/30 rounded px-2 py-1 text-indigo-300">${tz}</span>`).join('')}
        <span class="text-gray-500 text-xs self-center">+ full IANA names (Asia/Tokyo, America/New_York, ...)</span>
      </div>
    </div>

    <!-- Ecosystem -->
    <div class="card rounded-xl p-6 mb-8">
      <h2 class="text-lg font-semibold mb-3 text-violet-300">&#x1F9E9; OpenClaw MCP Ecosystem</h2>
      <div class="grid md:grid-cols-3 gap-3 text-sm">
        <a href="https://json-toolkit-mcp.yagami8095.workers.dev" class="block bg-blue-900/20 border border-blue-800/30 rounded-lg p-3 hover:border-blue-600 transition">
          <div class="text-blue-400 font-medium">JSON Toolkit MCP</div>
          <div class="text-gray-400 text-xs mt-1">Format, validate, query, diff JSON</div>
        </a>
        <a href="https://regex-engine-mcp.yagami8095.workers.dev" class="block bg-green-900/20 border border-green-800/30 rounded-lg p-3 hover:border-green-600 transition">
          <div class="text-green-400 font-medium">Regex Engine MCP</div>
          <div class="text-gray-400 text-xs mt-1">Test, explain, generate regex</div>
        </a>
        <a href="https://color-palette-mcp.yagami8095.workers.dev" class="block bg-rose-900/20 border border-rose-800/30 rounded-lg p-3 hover:border-rose-600 transition">
          <div class="text-rose-400 font-medium">Color Palette MCP</div>
          <div class="text-gray-400 text-xs mt-1">Palettes, contrast, gradients</div>
        </a>
        <a href="https://prompt-enhancer-mcp.yagami8095.workers.dev" class="block bg-yellow-900/20 border border-yellow-800/30 rounded-lg p-3 hover:border-yellow-600 transition">
          <div class="text-yellow-400 font-medium">Prompt Enhancer MCP</div>
          <div class="text-gray-400 text-xs mt-1">Optimize AI prompts</div>
        </a>
        <a href="https://openclaw-intel-mcp.yagami8095.workers.dev" class="block bg-purple-900/20 border border-purple-800/30 rounded-lg p-3 hover:border-purple-600 transition">
          <div class="text-purple-400 font-medium">Intel MCP</div>
          <div class="text-gray-400 text-xs mt-1">AI market intelligence reports</div>
        </a>
        <a href="https://openclaw-fortune-mcp.yagami8095.workers.dev" class="block bg-pink-900/20 border border-pink-800/30 rounded-lg p-3 hover:border-pink-600 transition">
          <div class="text-pink-400 font-medium">Fortune MCP</div>
          <div class="text-gray-400 text-xs mt-1">Daily zodiac horoscopes</div>
        </a>
        <a href="https://moltbook-publisher-mcp.yagami8095.workers.dev" class="block bg-indigo-900/20 border border-indigo-800/30 rounded-lg p-3 hover:border-indigo-600 transition">
          <div class="text-indigo-400 font-medium">MoltBook Publisher MCP</div>
          <div class="text-gray-400 text-xs mt-1">Japanese content publishing</div>
        </a>
        <a href="https://agentforge-compare-mcp.yagami8095.workers.dev" class="block bg-orange-900/20 border border-orange-800/30 rounded-lg p-3 hover:border-orange-600 transition">
          <div class="text-orange-400 font-medium">AgentForge Compare MCP</div>
          <div class="text-gray-400 text-xs mt-1">AI coding tool comparisons</div>
        </a>
        <a href="https://product-store.yagami8095.workers.dev" class="block bg-amber-900/20 border border-amber-800/30 rounded-lg p-3 hover:border-amber-600 transition">
          <div class="text-amber-400 font-medium">Digital Store</div>
          <div class="text-gray-400 text-xs mt-1">AI tools and products</div>
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div class="text-center text-gray-500 text-sm">
      <p>Powered by <span class="text-violet-400">OpenClaw Intelligence</span> &bull; Free forever &bull; MCP 2025-03-26</p>
      <p class="mt-1"><a href="https://product-store.yagami8095.workers.dev" class="text-indigo-400 hover:underline">Digital Store</a> &bull; Health: <a href="/health" class="text-green-400 hover:underline">/health</a></p>
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
// MAIN WORKER EXPORT
// ============================================================
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders();

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // Edge Defense
    const defense = await edgeDefense(request, env, 'timestamp');
    if (defense.action === 'honeypot') return new Response('Not Found', { status: 404 });
    if (defense.action === 'reject' || defense.action === 'block') return Response.json({ error: defense.reason }, { status: defense.status, headers: cors });
    if (defense.action === 'throttle' && defense.delay) await new Promise(r => setTimeout(r, defense.delay));

    // FinOps Circuit Breaker
    const finops = await finopsTrack(env, 'timestamp-converter');
    if (!finops.ok) return Response.json({ error: finops.reason }, { status: 503, headers: cors });
    if (finops.delay) await new Promise(r => setTimeout(r, finops.delay));
    await trackRef(request, env, 'timestamp-converter');

    // Landing page
    if ((url.pathname === '/' || url.pathname === '/index.html') && request.method === 'GET') {
      return new Response(LANDING_HTML, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // Health check
    if (url.pathname === '/health') {
      return Response.json({
        status: 'ok',
        server: SERVER_INFO.name,
        version: SERVER_INFO.version,
        vendor: SERVER_INFO.vendor,
        tools: TOOLS.length,
        rate_limit: '30 requests/day (free)',
        timestamp: new Date().toISOString(),
        ecosystem: ECOSYSTEM,
      }, { headers: cors });
    }

    // MCP endpoint — GET info
    if (url.pathname === '/mcp' && request.method === 'GET') {
      return Response.json({
        status: 'ok',
        server: SERVER_INFO.name,
        version: SERVER_INFO.version,
        description: 'Timestamp & timezone utility MCP server. Convert unix ↔ ISO 8601, timezone math, cron parsing, duration formatting.',
        protocol: 'MCP 2025-03-26 (Streamable HTTP)',
        usage: 'POST /mcp with JSON-RPC 2.0 body',
        tools: TOOLS.map(t => ({ name: t.name, description: t.description.slice(0, 80) + '...' })),
        ecosystem: ECOSYSTEM,
      }, { headers: cors });
    }

    // MCP endpoint — DELETE (session cleanup)
    if (url.pathname === '/mcp' && request.method === 'DELETE') {
      return new Response('', { status: 204, headers: cors });
    }

    // MCP endpoint — POST (main RPC handler)
    if (url.pathname === '/mcp' && request.method === 'POST') {
      const contentType = request.headers.get('Content-Type') || '';
      if (!contentType.includes('application/json')) {
        return new Response(
          JSON.stringify(jsonRpcError(null, -32700, 'Content-Type must be application/json')),
          { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
        );
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return new Response(
          JSON.stringify(jsonRpcError(null, -32700, 'JSON parse error')),
          { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
        );
      }

      const isBatch = Array.isArray(body);
      const requests = isBatch ? body : [body];

      const responses = [];
      for (const req of requests) {
        const result = await handleMCPRequest(req, env, request);
        if (result !== null) responses.push(result);
      }

      if (responses.length === 0) {
        return new Response('', { status: 204, headers: cors });
      }

      const responseBody = isBatch ? responses : responses[0];

      // x402: Detect rate limit → HTTP 402 with payment headers
      const first = Array.isArray(responseBody) ? responseBody[0] : responseBody;
      const isRateLimited = first?.error?.code === -32029;
      const httpStatus = isRateLimited ? 402 : 200;
      const respHeaders = { ...cors, 'Content-Type': 'application/json' };
      if (isRateLimited) {
        respHeaders['X-Payment-Required'] = 'true';
        respHeaders['X-Payment-Network'] = 'base';
        respHeaders['X-Payment-Currency'] = 'USDC';
        respHeaders['X-Payment-Amount'] = '0.05';
        respHeaders['X-Payment-Address'] = '0x72aa56DAe3819c75C545c57778cc404092d60731';
      }

      return new Response(JSON.stringify(responseBody), {
        status: httpStatus,
        headers: respHeaders,
      });
    }

    // 404
    return Response.json(
      { error: 'Not found', hint: 'MCP endpoint at /mcp (POST), landing page at /', tools: TOOLS.length },
      { status: 404, headers: cors }
    );
  },
};
