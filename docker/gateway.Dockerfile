# docker/gateway.Dockerfile — Miamo Gateway Service
# Build: docker build -f docker/gateway.Dockerfile -t miamo-gateway .

# ─── Stage 1: Dependencies ───────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

COPY services/gateway/package.json services/gateway/package-lock.json* ./

RUN npm ci --prefer-offline --no-audit --no-fund || npm install --no-audit --no-fund

# ─── Stage 2: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY services/gateway/package.json services/gateway/tsconfig.json ./
COPY services/gateway/src ./src

RUN npx tsc --removeComments

# ─── Stage 3: Runner ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache curl

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3200

RUN addgroup -g 1001 -S miamo && adduser -u 1001 -S miamo -G miamo

COPY --from=build /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY services/gateway/package.json ./

RUN chown -R miamo:miamo /app

USER miamo

EXPOSE 3200

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3200/health || exit 1

CMD ["node", "dist/server.js"]
