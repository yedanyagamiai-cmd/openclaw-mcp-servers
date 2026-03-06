# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest  | Yes       |

## Reporting a Vulnerability

Email **yagami8095@gmail.com** with:

1. Description of the vulnerability
2. Steps to reproduce
3. Affected server(s)

We respond within 48 hours. Critical issues patched within 24 hours.

## Architecture Security

- All servers run on Cloudflare Workers (isolated V8 sandboxes)
- No persistent storage of user data (stateless computation)
- Rate limiting via Cloudflare KV prevents abuse
- API keys validated per-request, never stored in logs
- x402 payments use on-chain USDC (no credit card data)
- HTTPS only (TLS 1.3, Cloudflare edge)
- No cookies, no sessions, no tracking

## API Key Security

- Pro API keys are hashed before storage
- Keys transmitted via `X-API-Key` header only
- Keys never appear in URL parameters or logs
- Revocation available within 24h via email request
