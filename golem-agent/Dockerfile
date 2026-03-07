# ── Build stage: install deps ─────────────────────────────────────────────────
FROM node:20-slim AS deps

WORKDIR /app
COPY package.json ./
RUN npm install --production --ignore-scripts

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:20-slim

# playwright-core system deps (Chromium shared libs)
# Only needed if NOT using CF Browser CDP endpoint.
# Safe to install — adds ~60MB; skip with: ARG SKIP_BROWSER_DEPS=1
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
      libnss3 \
      libnspr4 \
      libatk1.0-0 \
      libatk-bridge2.0-0 \
      libcups2 \
      libdrm2 \
      libdbus-1-3 \
      libxkbcommon0 \
      libx11-6 \
      libxcomposite1 \
      libxdamage1 \
      libxext6 \
      libxfixes3 \
      libxrandr2 \
      libgbm1 \
      libasound2 \
      libpango-1.0-0 \
      libpangocairo-1.0-0 \
      curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy production deps from build stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source
COPY index.js ./
COPY package.json ./

# Install playwright-core browser (only if you want local fallback Chromium)
# Comment out to save ~120MB — the agent works fine with CF Browser only.
# RUN npx playwright-core install chromium --with-deps

EXPOSE 3000

# Non-root user for security
RUN groupadd -r golem && useradd -r -g golem golem \
    && chown -R golem:golem /app
USER golem

ENV NODE_ENV=production
ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -fsS http://localhost:3000/health || exit 1

CMD ["node", "index.js"]
