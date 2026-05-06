# docker/web.Dockerfile — Miamo Web (Next.js)
# Build: docker build -f docker/web.Dockerfile -t miamo-web .

# ─── Stage 1: Dependencies ───────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

COPY services/web/package.json services/web/package-lock.json* ./

RUN npm ci --prefer-offline --no-audit --no-fund || npm install --no-audit --no-fund

# ─── Stage 2: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

ENV NEXT_PUBLIC_API_URL=http://localhost:3200
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY services/web/package.json services/web/next.config.js services/web/tsconfig.json ./
COPY services/web/tailwind.config.ts services/web/postcss.config.js ./
COPY services/web/src ./src
COPY services/web/public ./public

RUN npm run build

# ─── Stage 3: Runner ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache curl

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3100
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -g 1001 -S miamo && adduser -u 1001 -S miamo -G miamo

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

RUN chown -R miamo:miamo /app

USER miamo

EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3100 || exit 1

CMD ["node", "server.js"]
