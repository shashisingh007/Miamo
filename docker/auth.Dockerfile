# docker/auth.Dockerfile — Miamo Auth Service
# Build: docker build -f docker/auth.Dockerfile -t miamo-auth .

# ─── Stage 1: Dependencies ───────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

COPY services/auth/package.json services/auth/package-lock.json* ./

RUN npm ci --prefer-offline --no-audit --no-fund || npm install --no-audit --no-fund

# ─── Stage 2: Prisma ─────────────────────────────────────────────────────────
FROM node:20-alpine AS prisma

RUN apk add --no-cache openssl

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY services/auth/package.json ./
COPY services/shared/prisma ./prisma

RUN npx prisma generate

# ─── Stage 3: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

COPY --from=prisma /app/node_modules ./node_modules
COPY services/auth/package.json services/auth/tsconfig.json ./
COPY services/auth/src ./src

RUN npx tsc --removeComments

# ─── Stage 4: Runner ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl curl

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3201

RUN addgroup -g 1001 -S miamo && adduser -u 1001 -S miamo -G miamo

COPY --from=build /app/dist ./dist
COPY --from=prisma /app/node_modules ./node_modules
COPY --from=prisma /app/prisma ./prisma
COPY services/auth/package.json ./

RUN chown -R miamo:miamo /app

USER miamo

EXPOSE 3201

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3201/health || exit 1

CMD ["node", "dist/server.js"]
