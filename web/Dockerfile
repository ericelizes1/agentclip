# Production container for the AgentClip web frontend.
#
# Multi-stage build: a deps stage that installs node_modules from the
# committed pnpm-lock, a builder stage that runs `next build` with
# `output: 'standalone'`, and a runtime stage that ships only the
# trimmed standalone server + static assets. Final image is ~150 MB
# instead of the ~1.5 GB monorepo workspace.
#
# Build (from web/): docker build -t agentclip-web .
# Run:               docker run -p 3000:3000 -e AGENTCLIP_API_URL=https://api.agentclip.dev agentclip-web

# ---- deps ----
FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---- builder ----
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ---- runtime ----
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Run as a non-root user. Next's image template uses uid 1001; matching
# that here keeps file ownership predictable across builds.
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Standalone build emits a self-contained server.js + a trimmed
# node_modules at .next/standalone. Static assets and public/ ship
# alongside, copied to where the standalone server expects them.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
