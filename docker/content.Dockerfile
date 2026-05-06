# docker/content.Dockerfile — Miamo Content Service
# Build: docker build -f docker/content.Dockerfile -t miamo-content .

# ─── Stage 1: Dependencies ───────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

COPY services/content/package.json services/content/package-lock.json* ./

RUN npm ci --prefer-offline --no-audit --no-fund || npm install --no-audit --no-fund

# ─── Stage 2: Prisma ─────────────────────────────────────────────────────────
FROM node:20-alpine AS prisma

RUN apk add --no-cache openssl

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY services/content/package.json ./
COPY services/shared/prisma ./prisma

RUN npx prisma generate

# ─── Stage 3: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

COPY --from=prisma /app/node_modules ./node_modules
COPY services/content/package.json services/content/tsconfig.json ./
COPY services/content/src ./src

RUN npx tsc --removeComments

# ─── Stage 4: Runner ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl curl

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3205

RUN addgroup -g 1001 -S miamo && adduser -u 1001 -S miamo -G miamo

COPY --from=build /app/dist ./dist
COPY --from=prisma /app/node_modules ./node_modules
COPY --from=prisma /app/prisma ./prisma
COPY services/content/package.json ./

RUN chown -R miamo:miamo /app

USER miamo

EXPOSE 3205

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3205/health || exit 1

CMD ["node", "dist/server.js"]
