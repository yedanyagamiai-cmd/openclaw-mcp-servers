---
name: openclaw-crypto-payments
version: 2.0.0
description: "x402 USDC micropayment MCP server with 5 tools for AI agent pay-per-call. Use when: (1) 'accept payment for this API call' or 'charge USDC for this', (2) 'verify this payment came through', (3) 'what is my USDC balance', (4) 'show all transactions' or 'payment history', (5) 'generate invoice for this session'. CryptoPay Protocol, x402 standard, no accounts needed. Free 20/day + Pro $9/mo."
read_when:
  - User wants to accept crypto payment — "charge USDC", "x402 payment", "pay-per-call crypto"
  - User needs payment verification — "verify this payment", "check if USDC received", "confirm transaction"
  - User asks about balance — "USDC balance", "how much USDC do I have", "wallet balance"
  - User needs transaction history — "list transactions", "payment history", "all USDC received"
  - User wants to generate invoice — "invoice for this session", "generate payment receipt", "USDC invoice"
metadata:
  openclaw:
    emoji: "\U0001FA99"
    homepage: https://github.com/yedanyagamiai-cmd/openclaw-mcp-servers
    always: false
---

# OpenClaw Crypto Payments v2.0

**x402 USDC micropayments for AI agents. 5 tools. No accounts. No Stripe. Pay-per-call native. Base + Ethereum.**

| Tool | Purpose | Free |
|------|---------|------|
| `create_payment` | Generate a USDC payment request with amount, description, and expiry | Yes |
| `verify_payment` | Confirm a payment was received on-chain and mark it as settled | Yes |
| `get_balance` | Check current USDC balance across connected wallets | Yes |
| `list_transactions` | Payment history with timestamps, amounts, and payer addresses | Yes |
| `generate_invoice` | Create a formatted invoice for a completed session or batch of calls | Yes |

## What's New in v2.0

- **CryptoPay Protocol** -- Implements the x402 HTTP micropayment standard. AI agents can autonomously pay for API calls without human intervention or account setup.
- **Multi-chain Support** -- Base (preferred, <$0.01 gas), Ethereum mainnet (for larger amounts), and Polygon (low gas alternative).
- **AutoSettle** -- Payments are verified on-chain and automatically marked settled without manual confirmation. No webhook setup required.
- **AgentPay Mode** -- Designed for AI-to-AI payments. An agent can create a payment, receive it from another agent, verify it, and proceed — all in one tool chain.

## Quick Start

```json
{
  "openclaw-crypto-payments": {
    "type": "streamable-http",
    "url": "https://openclaw-crypto-payments-mcp.yagami8095.workers.dev/mcp"
  }
}
```

Add to Claude Desktop, Cursor, Windsurf, VS Code, or any MCP-compatible client. Zero install. Works immediately.

## Detection Triggers

This skill activates when a user says any of these:
- "charge USDC", "x402 payment", "pay-per-call", "crypto payment for API", "micropayment"
- "verify this payment", "check if received", "confirm USDC transaction", "payment confirmed"
- "USDC balance", "wallet balance", "how much USDC", "check balance", "available funds"
- "payment history", "list transactions", "all payments received", "USDC transactions"
- "generate invoice", "payment receipt", "invoice for session", "billing summary crypto"
- "x402", "ERC-20 payment", "Base chain", "USDC on Base", "stablecoin payment"

## Named Protocols

### CryptoPay Protocol
The x402 micropayment implementation for AI agent commerce:

**x402 Standard flow:**
1. **Service provider** calls `create_payment` → gets payment URL and amount
2. **Payer** (human or AI agent) receives payment request with USDC amount + wallet address
3. **Payer** sends USDC on-chain (Base preferred for <$0.01 gas)
4. **Service provider** calls `verify_payment` with transaction hash → confirmed on-chain
5. **Service** is delivered, session continues, or content is unlocked

**Payment request format (x402 compatible):**
```json
{
  "x402Version": 1,
  "scheme": "exact",
  "network": "base-mainnet",
  "maxAmountRequired": "50000",
  "resource": "https://openclaw-content-autopilot-mcp.yagami8095.workers.dev/mcp",
  "description": "Pro API access — 1000 calls/day",
  "mimeType": "application/json",
  "payTo": "0xYourWalletAddress",
  "maxTimeoutSeconds": 300,
  "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
}
```

**USDC contract addresses:**

| Chain | USDC Address | Gas Cost |
|-------|-------------|---------|
| Base | 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 | <$0.01 |
| Ethereum | 0xA0b86a33E6417... | $2–15 |
| Polygon | 0x3c499c542cEF... | <$0.01 |

### AutoSettle Engine
On-chain payment verification without webhook infrastructure:

1. `verify_payment` called with `tx_hash` and `expected_amount`
2. AutoSettle queries the chain via Cloudflare's blockchain RPC endpoint
3. Confirms: correct recipient address, correct USDC contract, correct amount (±0 tolerance), transaction finality (6 confirmations on Base)
4. Returns `settled: true` or `settled: false` with reason
5. Settled transactions are stored and cannot be double-verified (replay protection)

**Verification latency:**
- Base: ~2 seconds (12s block time / 6 confirms = ~72s, but often faster with AutoSettle pre-indexing)
- Ethereum: ~90 seconds (15s block time × 6)
- Polygon: ~12 seconds (2s block time × 6)

### AgentPay Mode
AI-to-AI payment flow using CryptoPay Protocol:

```
Agent A (service provider):
  create_payment({ amount_usdc: 0.05, description: "DeepSeek R1 analysis call" })
  → returns: { payment_id: "pay-7f3a", address: "0xAbcd...", amount: "50000" (6 decimals), expires_in: 300 }

Agent B (payer, has funded wallet):
  [executes on-chain USDC transfer using wallet SDK]
  → gets: tx_hash = "0x1234..."

Agent A:
  verify_payment({ payment_id: "pay-7f3a", tx_hash: "0x1234..." })
  → { settled: true, amount_usdc: 0.05, confirmed_at: "2026-03-07T09:14:22Z" }
  [delivers the service]
```

This entire flow requires zero human involvement and zero traditional payment infrastructure.

## Tools (5)

### `create_payment` -- Generate Payment Request via CryptoPay Protocol
Create a USDC payment request with a specific amount, description, and optional expiry. Returns x402-compatible payment object.

**Wrong / Right:**

```
WRONG: Setting up a Stripe account, webhook endpoints, and payment links for $0.05 micropayments
RIGHT: create_payment({ amount_usdc: 0.05, description: "1 API call — DeepSeek R1 analysis",
                        network: "base", expires_in_sec: 300 })
       -> { payment_id: "pay-7f3a", address: "0xAbcd...", amount_usdc: 0.05,
            network: "base-mainnet", usdc_contract: "0x8335...", expires_at: "..." }
       -> Share address + amount. Done. No accounts. No webhooks.

WRONG: Creating payment requests for amounts <$0.001 USDC (below dust threshold)
RIGHT: Minimum payment is $0.001 USDC (1000 units, 6 decimals). Base gas is ~$0.005 so
       minimum viable micropayment on Base is $0.01 to make economic sense for the payer.
```

### `verify_payment` -- On-Chain Verification via AutoSettle Engine
Verify that a USDC payment was received on-chain for a given payment request.

**Wrong / Right:**

```
WRONG: Trusting a payer who says "I sent it" without verification
RIGHT: verify_payment({ payment_id: "pay-7f3a", tx_hash: "0x1234abcd..." })
       -> { settled: true, amount_usdc: 0.05, payer_address: "0xBuyer...",
            confirmed_at: "2026-03-07T09:15:44Z", confirmations: 8, network: "base" }
       -> On-chain truth. Cannot be faked. Replay-protected.

WRONG: Calling verify_payment before the transaction has any confirmations
RIGHT: On Base, wait at least 2 seconds after the user says they sent it.
       AutoSettle checks confirmations automatically and returns settled: false
       with reason "pending confirmations: 2/6" if not yet finalized.
```

### `get_balance` -- Wallet Balance Check
Check current USDC balance for your connected wallet address across all configured chains.

**Returns:** balance_usdc per chain, total_usdc_equivalent, pending_payments (created but not yet verified), last_updated

### `list_transactions` -- Payment History
Retrieve all received and pending USDC payments with timestamps, amounts, payer addresses, and associated payment IDs.

**Parameters:** range (today/7d/30d/all), status (pending/settled/expired/all), network (base/eth/polygon/all)

**Returns:** paginated transaction list with payment_id, amount_usdc, status, payer_address, tx_hash, created_at, settled_at

### `generate_invoice` -- Session Invoice
Generate a formatted USDC invoice for a completed session or batch of API calls.

**Parameters:** session_id or payment_ids (array), recipient_address (optional), notes (optional)

**Returns:** Markdown-formatted invoice with itemized calls, total USDC, payment proof (tx hashes), and QR code URL for the total if unpaid

## Security & Privacy

- **Your private key stays yours** -- CryptoPay Protocol never asks for or stores your wallet private key. You initiate transactions from your own wallet. We only verify that they happened.
- **Payment replay protection** -- Each payment_id can only be verified once. Submitting the same tx_hash twice returns `{ error: "already_settled" }`.
- **Address validation** -- create_payment validates your wallet address checksum before generating a request. Invalid addresses are rejected before any funds could be misrouted.
- **No custodial wallets** -- We do not hold USDC on your behalf. Payments go directly to the wallet address you configured. We are not a financial custodian.
- **Chain data is public** -- On-chain USDC transactions are publicly visible. verify_payment reads public blockchain data. We do not have access to any private information.
- **HTTPS only** -- All MCP connections are TLS 1.3. HTTP is rejected.

## Pricing

| Tier | Calls/Day | Price | Includes |
|------|-----------|-------|----------|
| **Free** | 20 | $0 | All 5 tools (testnet only for create/verify on free tier) |
| **Pro** | 1,000 | $9/mo | All 5 tools + mainnet + multi-chain + AgentPay Mode + all 9 OpenClaw servers |
| **x402** | Pay-per-call | $0.05 USDC | Recursive: pay with the same protocol you're accessing |

**Get Pro Key**: https://buy.stripe.com/4gw5na5U19SP9TW288

## The OpenClaw Intelligence Stack

| Server | Tools | Best For |
|--------|-------|----------|
| **Crypto Payments** | 5 | x402 USDC micropayments, agent-to-agent commerce |
| **Revenue Tracker** | 4 | Multi-source revenue, MRR, milestone alerts |
| **API Monitor** | 5 | Rate limits, cost tracking, provider analytics |
| **Agent Orchestrator** | 5 | Multi-agent spawn, coordinate, aggregate |
| **Health Monitor** | 4 | 24/7 uptime, SLA reports, Telegram alerts |
| **Task Queue** | 5 | Persistent agent tasks, dependencies, assignment |
| **Database Toolkit** | 5 | D1/PostgreSQL/MongoDB query and manage |
| **Telegram Bot** | 5 | Messages, alerts, reports, command handling |
| **Market Intelligence** | 6 | AI market trends, GitHub stats, competitor analysis |

All 9 servers share one Pro key. **$9/mo = 49 tools.**
