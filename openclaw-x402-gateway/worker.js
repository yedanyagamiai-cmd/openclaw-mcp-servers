/**
 * OpenClaw x402 Payment Gateway v1.0
 * HTTP 402 Payment Required — AI-Native Micropayments
 *
 * Wraps existing MCP servers with x402 pay-per-request.
 * Payments: USDC on Base (L2) via x402 protocol.
 * Fee: 0% protocol fee. Only Base gas (~$0.001).
 *
 * Flow:
 *   1. Client requests protected endpoint
 *   2. Gateway returns 402 with payment requirements
 *   3. Client signs USDC permit and retries with PAYMENT header
 *   4. Gateway verifies via facilitator, settles on-chain
 *   5. Gateway proxies request to origin MCP server
 *
 * Free endpoints (no payment): /health, /ping, /, /mcp (free-tier tools)
 * Paid endpoints: /pro/*, /api/v1/query, /api/v1/analyze
 */

// Your USDC receiving wallet on Base
const PAY_TO = '0x742d35Cc6634C0532925a3b844Bc9e7595f5bA16';

// Facilitator URL (verifies + settles payments)
const FACILITATOR_URL = 'https://x402.org/facilitator';

// Base network (mainnet for production)
const NETWORK = 'eip155:8453'; // Base mainnet
// const NETWORK = 'eip155:84532'; // Base Sepolia (testnet)

// Protected routes with pricing
const PAID_ROUTES = {
  '/pro/intel/query': {
    price: '$0.05',
    description: 'AI market intelligence query (full report)',
    origin: 'https://openclaw-intel-mcp.yagami8095.workers.dev',
    path: '/mcp',
  },
  '/pro/intel/analyze': {
    price: '$0.10',
    description: 'Deep AI market analysis with DeepSeek R1',
    origin: 'https://openclaw-intel-api.yagami8095.workers.dev',
    path: '/api/v1/analyze',
  },
  '/pro/fortune/reading': {
    price: '$0.02',
    description: 'AI fortune reading (premium)',
    origin: 'https://openclaw-fortune-mcp.yagami8095.workers.dev',
    path: '/mcp',
  },
  '/pro/json/transform': {
    price: '$0.01',
    description: 'JSON transformation tool (unlimited)',
    origin: 'https://json-toolkit-mcp.yagami8095.workers.dev',
    path: '/mcp',
  },
  '/pro/regex/engine': {
    price: '$0.01',
    description: 'Regex engine tool (unlimited)',
    origin: 'https://regex-engine-mcp.yagami8095.workers.dev',
    path: '/mcp',
  },
  '/pro/prompt/enhance': {
    price: '$0.03',
    description: 'AI prompt enhancement',
    origin: 'https://prompt-enhancer-mcp.yagami8095.workers.dev',
    path: '/mcp',
  },
  '/pro/agentforge/compare': {
    price: '$0.05',
    description: 'AI agent comparison analysis',
    origin: 'https://agentforge-compare-mcp.yagami8095.workers.dev',
    path: '/mcp',
  },
  '/pro/color/palette': {
    price: '$0.01',
    description: 'Color palette generation',
    origin: 'https://color-palette-mcp.yagami8095.workers.dev',
    path: '/mcp',
  },
  '/pro/timestamp/convert': {
    price: '$0.01',
    description: 'Timestamp conversion tool',
    origin: 'https://timestamp-converter-mcp.yagami8095.workers.dev',
    path: '/mcp',
  },
};

// Revenue tracking
let sessionRevenue = 0;
let sessionRequests = 0;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    // Free endpoints
    if (path === '/' || path === '/health') {
      return json({
        name: 'OpenClaw x402 Payment Gateway',
        version: '1.0.0',
        protocol: 'x402',
        network: NETWORK,
        wallet: PAY_TO,
        routes: Object.entries(PAID_ROUTES).map(([path, r]) => ({
          path, price: r.price, description: r.description
        })),
        stats: {
          session_revenue: sessionRevenue,
          session_requests: sessionRequests,
        },
        docs: 'https://x402.org',
        status: 'operational',
      });
    }

    if (path === '/ping') {
      return json({ pong: true, gateway: 'x402', ts: Date.now() });
    }

    // Catalog of all paid endpoints (machine-readable for AI agents)
    if (path === '/catalog' || path === '/.well-known/x402') {
      return json({
        protocol: 'x402',
        version: '1.0.0',
        network: NETWORK,
        payTo: PAY_TO,
        facilitator: FACILITATOR_URL,
        endpoints: Object.entries(PAID_ROUTES).map(([path, r]) => ({
          path,
          method: 'POST',
          price: r.price,
          currency: 'USDC',
          network: NETWORK,
          description: r.description,
        })),
      });
    }

    // Check if this is a paid route
    const route = PAID_ROUTES[path];
    if (!route) {
      return json({ error: 'Not found. See / for available endpoints.' }, 404);
    }

    // Check for payment header
    const paymentHeader = request.headers.get('X-PAYMENT') ||
                          request.headers.get('Payment') ||
                          request.headers.get('PAYMENT-SIGNATURE');

    if (!paymentHeader) {
      // Return 402 Payment Required
      return paymentRequired(route, path);
    }

    // Verify payment via facilitator
    try {
      const verification = await verifyPayment(paymentHeader, route, path);

      if (!verification.ok) {
        return json({
          error: 'Payment verification failed',
          reason: verification.reason,
          retry: true,
          payment_required: buildPaymentRequirements(route, path),
        }, 402);
      }

      // Payment verified! Proxy to origin
      sessionRevenue += parseFloat(route.price.replace('$', ''));
      sessionRequests++;

      const originResponse = await proxyToOrigin(request, route);

      // Add payment receipt headers
      const headers = new Headers(originResponse.headers);
      headers.set('X-Payment-Status', 'settled');
      headers.set('X-Payment-TxHash', verification.txHash || 'pending');
      headers.set('X-Payment-Amount', route.price);
      headers.set('X-Payment-Network', NETWORK);
      Object.entries(corsHeaders()).forEach(([k, v]) => headers.set(k, v));

      return new Response(originResponse.body, {
        status: originResponse.status,
        headers,
      });

    } catch (e) {
      return json({ error: 'Payment processing error', message: e.message }, 500);
    }
  },
};

// === 402 Response ===
function paymentRequired(route, path) {
  const requirements = buildPaymentRequirements(route, path);

  // Base64-encode the requirements for the PAYMENT-REQUIRED header
  const encoded = btoa(JSON.stringify(requirements));

  return new Response(JSON.stringify({
    error: 'Payment Required',
    message: `This endpoint requires ${route.price} USDC on Base. Send payment via x402 protocol.`,
    price: route.price,
    currency: 'USDC',
    network: NETWORK,
    payTo: PAY_TO,
    protocol: 'x402',
    how_to_pay: {
      step1: 'Sign a USDC EIP-2612 permit for the amount',
      step2: 'Base64-encode the signed payload',
      step3: 'Retry this request with header: X-PAYMENT: <base64_payload>',
      docs: 'https://docs.cdp.coinbase.com/x402/quickstart-for-buyers',
    },
    accepts: requirements.accepts,
    catalog: '/.well-known/x402',
  }, null, 2), {
    status: 402,
    headers: {
      'Content-Type': 'application/json',
      'PAYMENT-REQUIRED': encoded,
      'X-Payment-Protocol': 'x402',
      'X-Payment-Network': NETWORK,
      'X-Payment-Price': route.price,
      ...corsHeaders(),
    },
  });
}

function buildPaymentRequirements(route, path) {
  return {
    accepts: [{
      scheme: 'exact',
      network: NETWORK,
      maxAmountRequired: route.price,
      resource: path,
      description: route.description,
      mimeType: 'application/json',
      payTo: PAY_TO,
      extra: {
        name: 'OpenClaw x402 Gateway',
        version: '1.0.0',
      },
    }],
  };
}

// === Payment Verification ===
async function verifyPayment(paymentHeader, route, path) {
  try {
    // Decode the payment payload
    let paymentData;
    try {
      paymentData = JSON.parse(atob(paymentHeader));
    } catch {
      // If not base64, try direct JSON
      try {
        paymentData = JSON.parse(paymentHeader);
      } catch {
        return { ok: false, reason: 'Invalid payment header format' };
      }
    }

    // Verify via facilitator
    const verifyResp = await fetch(`${FACILITATOR_URL}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment: paymentData,
        paymentRequirements: buildPaymentRequirements(route, path),
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!verifyResp.ok) {
      const err = await verifyResp.text().catch(() => 'Unknown error');
      return { ok: false, reason: `Facilitator rejected: ${err}` };
    }

    // Settle the payment
    const settleResp = await fetch(`${FACILITATOR_URL}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment: paymentData,
        paymentRequirements: buildPaymentRequirements(route, path),
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!settleResp.ok) {
      return { ok: false, reason: 'Settlement failed' };
    }

    const settlement = await settleResp.json().catch(() => ({}));

    return {
      ok: true,
      txHash: settlement.txHash || settlement.transactionHash || 'settled',
      payer: settlement.payer || paymentData.payload?.authorization?.from || 'unknown',
    };
  } catch (e) {
    return { ok: false, reason: `Verification error: ${e.message}` };
  }
}

// === Proxy to Origin MCP Server ===
async function proxyToOrigin(request, route) {
  const originUrl = route.origin + route.path;

  // Forward the original request body
  const body = request.method !== 'GET' ? await request.text() : null;

  return await fetch(originUrl, {
    method: request.method === 'GET' ? 'POST' : request.method,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'OpenClaw-x402-Gateway/1.0',
    },
    body: body || JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/list',
      params: {},
      id: 1,
    }),
    signal: AbortSignal.timeout(30000),
  });
}

// === CORS Headers ===
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-PAYMENT, Payment, PAYMENT-SIGNATURE',
    'Access-Control-Expose-Headers': 'PAYMENT-REQUIRED, X-Payment-Status, X-Payment-TxHash, X-Payment-Amount, X-Payment-Network',
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}
