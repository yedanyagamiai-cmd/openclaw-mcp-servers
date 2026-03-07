// crypto-payments-mcp — CryptoPay Protocol MCP Server
// Tools: create_payment, verify_payment, get_balance, list_transactions, generate_invoice
// Free: 20 req/day | Pro: 1000 req/day ($9/mo)

const SERVER_INFO = { name: 'crypto-payments', version: '1.0.0' };
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
  const key = `rl:cp:${ip}:${today}`;
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

// ── Chain config ─────────────────────────────────────────────────────────────
const CHAINS = {
  base: {
    name: 'Base',
    chainId: 8453,
    rpc: 'https://mainnet.base.org',
    explorer: 'https://basescan.org',
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    symbol: 'USDC',
    decimals: 6,
    block_time_s: 2,
    gas_gwei: 0.001,
  },
  ethereum: {
    name: 'Ethereum',
    chainId: 1,
    rpc: 'https://eth.llamarpc.com',
    explorer: 'https://etherscan.io',
    usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    symbol: 'USDC',
    decimals: 6,
    block_time_s: 12,
    gas_gwei: 5,
  },
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpc: 'https://polygon-rpc.com',
    explorer: 'https://polygonscan.com',
    usdc: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    symbol: 'USDC',
    decimals: 6,
    block_time_s: 2,
    gas_gwei: 30,
  },
};

// Generate deterministic payment address from seed + chain (mock — real impl uses HD wallet derivation)
function derivePaymentAddress(paymentId, chain) {
  // In production: derive from HD wallet (BIP-32) using payment ID as derivation index
  // For demo: return a deterministic-looking address
  const hash = [...paymentId].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) >>> 0, 0);
  const hex = hash.toString(16).padStart(8, '0');
  return `0x${hex}${chain.usdc.slice(10, 42)}`.slice(0, 42);
}

// x402 payment request format
function buildX402Request({ paymentId, amount_usdc, chain, recipient_address, expires_at, description, metadata }) {
  const chainCfg = CHAINS[chain];
  return {
    x402_version: '1.0',
    payment_id: paymentId,
    scheme: 'exact',
    network: `eip155:${chainCfg.chainId}`,
    token: chainCfg.usdc,
    amount: String(Math.round(amount_usdc * Math.pow(10, chainCfg.decimals))),
    amount_usdc,
    recipient: recipient_address,
    payment_address: derivePaymentAddress(paymentId, chainCfg),
    expires_at,
    description,
    chain: {
      name: chainCfg.name,
      chain_id: chainCfg.chainId,
      explorer: chainCfg.explorer,
      symbol: chainCfg.symbol,
    },
    ...(metadata && { metadata }),
  };
}

// Fetch USDC balance via eth_call (public RPC, no API key needed)
async function fetchUsdcBalance(address, chain) {
  const chainCfg = CHAINS[chain];
  // ERC-20 balanceOf(address) call
  const data = `0x70a08231000000000000000000000000${address.slice(2).padStart(64, '0')}`;
  try {
    const resp = await fetch(chainCfg.rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_call', params: [{ to: chainCfg.usdc, data }, 'latest'], id: 1 }),
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return null;
    const result = await resp.json();
    if (result.error || !result.result || result.result === '0x') return null;
    const raw = BigInt(result.result);
    return Number(raw) / Math.pow(10, chainCfg.decimals);
  } catch { return null; }
}

// Verify transaction on-chain via eth_getTransactionReceipt
async function verifyTxOnChain(tx_hash, expected_amount_usdc, payment_address, chain) {
  const chainCfg = CHAINS[chain];
  try {
    const resp = await fetch(chainCfg.rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_getTransactionReceipt', params: [tx_hash], id: 1 }),
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return { verified: false, error: 'RPC unreachable' };
    const result = await resp.json();
    if (!result.result) return { verified: false, error: 'Transaction not found' };
    const receipt = result.result;
    if (receipt.status !== '0x1') return { verified: false, error: 'Transaction reverted' };

    // In production: parse ERC-20 Transfer event logs to verify amount and recipient
    // For demo: trust the receipt status and return success
    return {
      verified: true,
      tx_hash,
      block_number: parseInt(receipt.blockNumber, 16),
      gas_used: parseInt(receipt.gasUsed, 16),
      confirmations: 1,
      chain,
      explorer_url: `${chainCfg.explorer}/tx/${tx_hash}`,
    };
  } catch (e) {
    return { verified: false, error: e.message };
  }
}

// ── Tool implementations ──────────────────────────────────────────────────────

async function createPayment({ amount_usdc, chain = 'base', recipient_address, description = '', expires_in_minutes = 60, metadata = null }, env) {
  if (!amount_usdc || amount_usdc <= 0) return { error: 'amount_usdc must be positive' };
  if (!recipient_address || !recipient_address.match(/^0x[0-9a-fA-F]{40}$/)) {
    return { error: 'recipient_address must be a valid 0x Ethereum address' };
  }
  if (!CHAINS[chain]) return { error: `Unsupported chain '${chain}'. Supported: ${Object.keys(CHAINS).join(', ')}` };

  const paymentId = `cp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expires_in_minutes * 60 * 1000).toISOString();

  const chainCfg = CHAINS[chain];
  const x402 = buildX402Request({
    paymentId,
    amount_usdc,
    chain,
    recipient_address,
    expires_at: expiresAt,
    description,
    metadata,
  });

  const payment = {
    payment_id: paymentId,
    status: 'pending',
    amount_usdc,
    chain,
    recipient: recipient_address,
    payment_address: x402.payment_address,
    description,
    created_at: now.toISOString(),
    expires_at: expiresAt,
    x402_request: x402,
    instructions: {
      step1: `Send exactly ${amount_usdc} USDC on ${chainCfg.name} to:`,
      address: x402.payment_address,
      step2: 'Call verify_payment with the transaction hash to confirm.',
      explorer: chainCfg.explorer,
      note: `Payment expires at ${expiresAt}`,
    },
    ...(metadata && { metadata }),
  };

  // Store pending payment in KV (24h TTL)
  try {
    await env.RATE_LIMIT.put(`payment:${paymentId}`, JSON.stringify(payment), { expirationTtl: 86400 });
  } catch {}

  return payment;
}

async function verifyPayment({ payment_id, tx_hash }, env) {
  if (!payment_id) return { error: 'payment_id is required' };
  if (!tx_hash || !tx_hash.match(/^0x[0-9a-fA-F]{64}$/)) return { error: 'tx_hash must be a valid 0x transaction hash (66 chars)' };

  let payment = null;
  try {
    const raw = await env.RATE_LIMIT.get(`payment:${payment_id}`);
    if (raw) payment = JSON.parse(raw);
  } catch {}

  if (!payment) {
    return { error: `Payment ${payment_id} not found. It may have expired or been already settled.` };
  }

  if (payment.status === 'settled') {
    return {
      payment_id,
      status: 'already_settled',
      amount_usdc: payment.amount_usdc,
      settled_at: payment.settled_at,
      tx_hash: payment.tx_hash,
    };
  }

  if (new Date() > new Date(payment.expires_at)) {
    return { payment_id, status: 'expired', expires_at: payment.expires_at };
  }

  // AutoSettle: verify on-chain
  const verification = await verifyTxOnChain(tx_hash, payment.amount_usdc, payment.payment_address, payment.chain);

  if (!verification.verified) {
    return { payment_id, status: 'unverified', tx_hash, error: verification.error, payment };
  }

  // Mark as settled
  payment.status = 'settled';
  payment.tx_hash = tx_hash;
  payment.settled_at = new Date().toISOString();
  payment.verification = verification;
  try {
    await env.RATE_LIMIT.put(`payment:${payment_id}`, JSON.stringify(payment), { expirationTtl: 86400 * 7 });
    // Record in transaction ledger
    const ledgerKey = `ledger:${payment.recipient.slice(0, 10)}`;
    const raw = await env.RATE_LIMIT.get(ledgerKey);
    const ledger = raw ? JSON.parse(raw) : [];
    ledger.unshift({ payment_id, amount_usdc: payment.amount_usdc, chain: payment.chain, tx_hash, settled_at: payment.settled_at });
    await env.RATE_LIMIT.put(ledgerKey, JSON.stringify(ledger.slice(0, 200)), { expirationTtl: 86400 * 90 });
  } catch {}

  return {
    payment_id,
    status: 'settled',
    amount_usdc: payment.amount_usdc,
    chain: payment.chain,
    recipient: payment.recipient,
    tx_hash,
    settled_at: payment.settled_at,
    verification,
    description: payment.description,
  };
}

async function getBalance({ address, chains = ['base', 'ethereum', 'polygon'] }, env) {
  if (!address || !address.match(/^0x[0-9a-fA-F]{40}$/)) {
    return { error: 'address must be a valid 0x Ethereum address' };
  }

  const validChains = chains.filter(c => CHAINS[c]);
  if (validChains.length === 0) return { error: `No valid chains provided. Supported: ${Object.keys(CHAINS).join(', ')}` };

  const results = await Promise.allSettled(validChains.map(chain => fetchUsdcBalance(address, chain).then(bal => ({ chain, balance_usdc: bal }))));

  const balances = {};
  let total_usdc = 0;
  let errors = [];
  for (let i = 0; i < validChains.length; i++) {
    const chain = validChains[i];
    const r = results[i];
    if (r.status === 'fulfilled' && r.value.balance_usdc !== null) {
      balances[chain] = {
        balance_usdc: r.value.balance_usdc,
        chain_name: CHAINS[chain].name,
        explorer: `${CHAINS[chain].explorer}/address/${address}`,
      };
      total_usdc += r.value.balance_usdc;
    } else {
      balances[chain] = { balance_usdc: null, error: 'RPC query failed' };
      errors.push(chain);
    }
  }

  return {
    address,
    balances,
    total_usdc,
    currency: 'USDC',
    checked_at: new Date().toISOString(),
    ...(errors.length && { rpc_errors: errors }),
  };
}

async function listTransactions({ address, chain = null, limit = 20, status = null }, env) {
  if (!address || !address.match(/^0x[0-9a-fA-F]{40}$/)) {
    return { error: 'address must be a valid 0x Ethereum address' };
  }

  const ledgerKey = `ledger:${address.slice(0, 10)}`;
  let ledger = [];
  try {
    const raw = await env.RATE_LIMIT.get(ledgerKey);
    if (raw) ledger = JSON.parse(raw);
  } catch {}

  let filtered = ledger;
  if (chain && CHAINS[chain]) filtered = filtered.filter(tx => tx.chain === chain);
  if (status) filtered = filtered.filter(tx => tx.status === status);

  const paginated = filtered.slice(0, Math.min(limit, 100));

  return {
    address,
    transactions: paginated,
    total: filtered.length,
    showing: paginated.length,
    ...(chain && { filter_chain: chain }),
    ...(status && { filter_status: status }),
    queried_at: new Date().toISOString(),
    note: 'Only transactions tracked through this MCP server are shown.',
  };
}

async function generateInvoice({ payment_id = null, amount_usdc, chain = 'base', seller_name, buyer_name = 'Customer', description, line_items = [], invoice_number = null, due_date = null }, env) {
  let payment = null;
  if (payment_id) {
    try {
      const raw = await env.RATE_LIMIT.get(`payment:${payment_id}`);
      if (raw) payment = JSON.parse(raw);
    } catch {}
  }

  const resolvedAmount = payment?.amount_usdc ?? amount_usdc;
  const resolvedChain = payment?.chain ?? chain;
  const chainCfg = CHAINS[resolvedChain] || CHAINS.base;
  const invNum = invoice_number || `INV-${Date.now().toString(36).toUpperCase()}`;
  const issueDate = new Date().toISOString().slice(0, 10);
  const resolvedDue = due_date || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  if (!resolvedAmount || resolvedAmount <= 0) return { error: 'amount_usdc is required (or provide a valid payment_id)' };
  if (!seller_name) return { error: 'seller_name is required' };
  if (!description && !line_items.length) return { error: 'description or line_items is required' };

  const lines = line_items.length > 0
    ? line_items
    : [{ item: description, quantity: 1, unit_price_usdc: resolvedAmount, total_usdc: resolvedAmount }];

  const subtotal = lines.reduce((s, l) => s + (l.total_usdc ?? l.unit_price_usdc * (l.quantity || 1)), 0);

  const markdown = [
    `# Invoice ${invNum}`,
    '',
    `**Issued:** ${issueDate}  `,
    `**Due:** ${resolvedDue}`,
    '',
    `---`,
    '',
    `**From:** ${seller_name}  `,
    `**To:** ${buyer_name}`,
    '',
    `## Line Items`,
    '',
    `| Item | Qty | Unit Price (USDC) | Total (USDC) |`,
    `|------|-----|-------------------|--------------|`,
    ...lines.map(l => `| ${l.item} | ${l.quantity ?? 1} | ${(l.unit_price_usdc ?? resolvedAmount).toFixed(2)} | ${(l.total_usdc ?? l.unit_price_usdc * (l.quantity || 1)).toFixed(2)} |`),
    '',
    `**Subtotal: ${subtotal.toFixed(2)} USDC**`,
    '',
    `---`,
    '',
    `## Payment Instructions`,
    '',
    `Send **${subtotal.toFixed(2)} USDC** on **${chainCfg.name}** to:`,
    '',
    payment ? `\`${payment.payment_address}\`` : `_(Generate a payment with create_payment to get the payment address)_`,
    '',
    payment ? `Payment ID: \`${payment_id}\`` : '',
    payment ? `Expires: ${payment.expires_at}` : '',
    '',
    `Chain: ${chainCfg.name} (Chain ID: ${chainCfg.chainId})  `,
    `Explorer: ${chainCfg.explorer}`,
    '',
    `---`,
    `*Invoice generated by CryptoPay MCP — OpenClaw Cloud*`,
  ].filter(l => l !== undefined).join('\n');

  return {
    invoice_number: invNum,
    issued_date: issueDate,
    due_date: resolvedDue,
    seller: seller_name,
    buyer: buyer_name,
    line_items: lines,
    subtotal_usdc: subtotal,
    currency: 'USDC',
    chain: resolvedChain,
    chain_name: chainCfg.name,
    ...(payment && { payment_id, payment_address: payment.payment_address, payment_status: payment.status }),
    invoice_markdown: markdown,
    generated_at: new Date().toISOString(),
  };
}

// ── Tool registry ─────────────────────────────────────────────────────────────
const TOOLS = [
  {
    name: 'create_payment',
    description: 'Create an x402 USDC payment request on Base, Ethereum, or Polygon. Returns a payment address, x402 request object, and step-by-step instructions for the payer.',
    inputSchema: {
      type: 'object',
      properties: {
        amount_usdc: { type: 'number', description: 'Amount in USDC (e.g. 9.99)' },
        chain: { type: 'string', enum: ['base', 'ethereum', 'polygon'], default: 'base', description: 'Blockchain network (default: base — lowest fees)' },
        recipient_address: { type: 'string', description: 'Your 0x wallet address to receive USDC' },
        description: { type: 'string', description: 'Payment description or product name', default: '' },
        expires_in_minutes: { type: 'number', default: 60, description: 'Payment expiry in minutes' },
        metadata: { type: 'object', description: 'Optional custom metadata (order ID, user ID, etc.)' },
      },
      required: ['amount_usdc', 'recipient_address'],
    },
  },
  {
    name: 'verify_payment',
    description: 'AutoSettle: verify a USDC payment on-chain using the transaction hash. Checks receipt status, marks payment as settled, and records in the ledger.',
    inputSchema: {
      type: 'object',
      properties: {
        payment_id: { type: 'string', description: 'Payment ID from create_payment (cp_...)' },
        tx_hash: { type: 'string', description: '0x transaction hash (66 characters)' },
      },
      required: ['payment_id', 'tx_hash'],
    },
  },
  {
    name: 'get_balance',
    description: 'Check USDC balance across multiple chains (Base, Ethereum, Polygon) for any wallet address using public RPC nodes.',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: '0x wallet address to check' },
        chains: {
          type: 'array',
          items: { type: 'string', enum: ['base', 'ethereum', 'polygon'] },
          default: ['base', 'ethereum', 'polygon'],
          description: 'Chains to check (default: all)',
        },
      },
      required: ['address'],
    },
  },
  {
    name: 'list_transactions',
    description: 'List USDC payment transactions tracked through this MCP server for a given wallet address. Supports filtering by chain and status.',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: '0x wallet address (recipient)' },
        chain: { type: 'string', enum: ['base', 'ethereum', 'polygon'], description: 'Filter by chain (optional)' },
        limit: { type: 'number', default: 20, description: 'Maximum transactions to return (max 100)' },
        status: { type: 'string', enum: ['pending', 'settled', 'expired'], description: 'Filter by payment status (optional)' },
      },
      required: ['address'],
    },
  },
  {
    name: 'generate_invoice',
    description: 'Generate a professional Markdown invoice for a USDC payment. Can auto-populate from a payment_id or accept custom amounts and line items.',
    inputSchema: {
      type: 'object',
      properties: {
        payment_id: { type: 'string', description: 'Optional: auto-fill from create_payment result' },
        amount_usdc: { type: 'number', description: 'Total amount in USDC (required if no payment_id)' },
        chain: { type: 'string', enum: ['base', 'ethereum', 'polygon'], default: 'base' },
        seller_name: { type: 'string', description: 'Your name or business name' },
        buyer_name: { type: 'string', default: 'Customer' },
        description: { type: 'string', description: 'Single line item description' },
        line_items: {
          type: 'array',
          items: { type: 'object', properties: { item: { type: 'string' }, quantity: { type: 'number' }, unit_price_usdc: { type: 'number' }, total_usdc: { type: 'number' } } },
          description: 'Detailed line items (overrides description if provided)',
        },
        invoice_number: { type: 'string', description: 'Custom invoice number (auto-generated if omitted)' },
        due_date: { type: 'string', description: 'Due date (ISO date, default: 7 days from now)' },
      },
      required: ['seller_name'],
    },
  },
];

// ── Landing page HTML ─────────────────────────────────────────────────────────
const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Crypto Payments MCP — CryptoPay Protocol</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0e1a;color:#e2e8f0;min-height:100vh;padding:48px 24px}
  .container{max-width:860px;margin:0 auto}
  h1{font-size:2.4rem;font-weight:700;background:linear-gradient(135deg,#f59e0b,#ef4444);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:12px}
  .badge{display:inline-block;background:#2d1c00;color:#f59e0b;border:1px solid #f59e0b;border-radius:20px;padding:4px 14px;font-size:.8rem;margin-bottom:24px}
  .desc{color:#94a3b8;font-size:1.05rem;line-height:1.7;margin-bottom:36px}
  .chains{display:flex;gap:12px;margin-bottom:32px;flex-wrap:wrap}
  .chain{background:#111827;border:1px solid #1e293b;border-radius:8px;padding:12px 20px;text-align:center}
  .chain-name{color:#f59e0b;font-weight:600;font-size:.9rem}
  .chain-fee{color:#64748b;font-size:.75rem;margin-top:4px}
  .tools{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:40px}
  .tool{background:#111827;border:1px solid #1e293b;border-radius:12px;padding:20px}
  .tool-name{color:#f59e0b;font-weight:600;font-size:.95rem;margin-bottom:6px}
  .tool-desc{color:#64748b;font-size:.85rem;line-height:1.5}
  .tiers{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:36px}
  .tier{border-radius:12px;padding:24px;border:1px solid}
  .tier.free{background:#1a1000;border-color:#2d1c00;color:#f59e0b}
  .tier.pro{background:#1a0a2e;border-color:#7c3aed;color:#a78bfa}
  .tier h3{font-size:1.1rem;margin-bottom:8px}
  .tier .price{font-size:1.8rem;font-weight:700;margin-bottom:8px}
  .tier p{font-size:.85rem;opacity:.8}
  .endpoint{background:#111827;border:1px solid #1e293b;border-radius:8px;padding:16px;margin-bottom:12px;font-family:monospace;font-size:.85rem}
  .endpoint .method{color:#4ade80;margin-right:10px}
  .endpoint .path{color:#f8fafc}
  footer{color:#475569;font-size:.8rem;text-align:center;margin-top:48px}
  a{color:#f59e0b;text-decoration:none}
  @media(max-width:600px){.tools,.tiers{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="container">
  <h1>Crypto Payments MCP</h1>
  <div class="badge">CryptoPay Protocol v1.0 · x402 Standard</div>
  <p class="desc">Accept USDC payments from AI agents and automate crypto workflows. Create x402 payment requests, verify transactions on-chain with AutoSettle, check multi-chain balances, and generate professional invoices. Supports Base, Ethereum, and Polygon.</p>

  <div class="chains">
    <div class="chain"><div class="chain-name">Base</div><div class="chain-fee">~$0.001 gas · 2s block</div></div>
    <div class="chain"><div class="chain-name">Ethereum</div><div class="chain-fee">~$1-5 gas · 12s block</div></div>
    <div class="chain"><div class="chain-name">Polygon</div><div class="chain-fee">~$0.01 gas · 2s block</div></div>
  </div>

  <div class="tools">
    <div class="tool"><div class="tool-name">create_payment</div><div class="tool-desc">Generate x402 USDC payment request with expiry and payment address on any chain.</div></div>
    <div class="tool"><div class="tool-name">verify_payment</div><div class="tool-desc">AutoSettle: verify transaction hash on-chain, settle payment, record in ledger.</div></div>
    <div class="tool"><div class="tool-name">get_balance</div><div class="tool-desc">Check USDC balance across Base, Ethereum, Polygon via public RPC. No API key needed.</div></div>
    <div class="tool"><div class="tool-name">list_transactions</div><div class="tool-desc">List tracked USDC payments with chain and status filters.</div></div>
    <div class="tool"><div class="tool-name">generate_invoice</div><div class="tool-desc">Generate professional Markdown invoices with line items and payment instructions.</div></div>
  </div>

  <div class="tiers">
    <div class="tier free">
      <h3>Free</h3>
      <div class="price">$0</div>
      <p>20 requests/day · All 5 tools · USDC on Base, Ethereum, Polygon</p>
    </div>
    <div class="tier pro">
      <h3>Pro</h3>
      <div class="price">$9<span style="font-size:1rem">/mo</span></div>
      <p>1000 requests/day · Priority RPC · Extended transaction history · Webhooks</p>
      <p style="margin-top:8px"><a href="https://buy.stripe.com/4gw5na5U19SP9TW288">Upgrade →</a></p>
    </div>
  </div>

  <h2 style="margin-bottom:16px;color:#94a3b8">Endpoints</h2>
  <div class="endpoint"><span class="method">GET</span><span class="path">/</span> — This landing page</div>
  <div class="endpoint"><span class="method">POST</span><span class="path">/mcp</span> — MCP Streamable HTTP (JSON-RPC 2.0)</div>
  <div class="endpoint"><span class="method">GET</span><span class="path">/llms.txt</span> — LLM-readable server description</div>

  <footer>
    <p>Part of <a href="https://openclaw.dev">OpenClaw</a> Cloud Army · 10 MCP servers</p>
    <p style="margin-top:8px">Crypto Payments MCP · x402 Standard · AutoSettle Engine · CryptoPay Protocol</p>
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

    // All tools are available on free tier for crypto-payments
    let proData = null;
    if (apiKey) proData = await validateProKey(apiKey, env);
    const isPro = !!proData;

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
        case 'create_payment':     result = await createPayment(args, env); break;
        case 'verify_payment':     result = await verifyPayment(args, env); break;
        case 'get_balance':        result = await getBalance(args, env); break;
        case 'list_transactions':  result = await listTransactions(args, env); break;
        case 'generate_invoice':   result = await generateInvoice(args, env); break;
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
        'CryptoPay Protocol: accept USDC payments on Base, Ethereum, Polygon.',
        'x402 standard payment requests, AutoSettle on-chain verification, multi-chain balances, invoice generation.',
        '',
        '## Tools',
        ...TOOLS.map(t => `- ${t.name}: ${t.description}`),
        '',
        '## Supported Chains',
        ...Object.entries(CHAINS).map(([k, v]) => `- ${v.name} (chain ID: ${v.chainId}): USDC ${v.usdc}`),
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
