# docker/web.Dockerfile — Miamo Web (Next.js)
# Build: docker build -f docker/web.Dockerfile -t miamo-web .

# ─── Stage 1: Dependencies ───────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Web imports from services/shared via relative paths ("../../../../../../shared/…")
# so we need to preserve the services/{web,shared} layout inside the build image.
COPY services/web/package.json services/web/package-lock.json* services/web/
COPY services/shared/package.json services/shared/package-lock.json* services/shared/

RUN cd services/shared && (npm ci --no-audit --no-fund 2>/dev/null || npm install --no-audit --no-fund)
RUN cd services/web && (npm ci --prefer-offline --no-audit --no-fund 2>/dev/null || npm install --no-audit --no-fund)

# ─── Stage 2: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

ENV NEXT_PUBLIC_API_URL=https://api.miamo.in
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/services/shared/node_modules services/shared/node_modules
COPY --from=deps /app/services/web/node_modules    services/web/node_modules
COPY services/shared services/shared
COPY services/web/package.json services/web/next.config.js services/web/tsconfig.json services/web/
COPY services/web/tailwind.config.ts services/web/postcss.config.js services/web/
COPY services/web/src services/web/src
COPY services/web/public services/web/public

WORKDIR /app/services/web
# Cap Node heap for Next.js build (t3.small has 2 GB total; NEXT + tsc can
# climb past 1.5 GB without a cap and get OOM-killed).
RUN NODE_OPTIONS="--max-old-space-size=1400" npm run build

# ─── Stage 3: Runner ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache curl

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3100
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -g 1001 -S miamo && adduser -u 1001 -S miamo -G miamo

# Next.js "standalone" output (without outputFileTracingRoot) hoists
# `server.js` to the top of the standalone bundle. After this COPY, the
# runtime layout is:
#     /app/server.js
#     /app/node_modules/
#     /app/.next/server/…
# The server serves /_next/static/* from `path.join(__dirname, '.next/static')`
# and /public/* from `path.join(__dirname, 'public')` — so BOTH must sit
# adjacent to /app/server.js, not under services/web/.
COPY --from=build /app/services/web/.next/standalone ./
COPY --from=build /app/services/web/.next/static     ./.next/static
COPY --from=build /app/services/web/public           ./public

RUN chown -R miamo:miamo /app

USER miamo

EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3100 || exit 1

CMD ["node", "server.js"]
