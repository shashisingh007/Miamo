# docker/migrate.Dockerfile — Miamo Database Migration & Seed
# Build: docker build -f docker/migrate.Dockerfile -t miamo-migrate .
# Runs once: applies migrations, seeds if DB empty, then exits.

FROM node:20-alpine AS deps
WORKDIR /app

COPY services/shared/package.json services/shared/package-lock.json* ./
RUN npm ci --prefer-offline --no-audit --no-fund 2>/dev/null || \
    npm install --no-audit --no-fund

FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=deps /app/node_modules ./node_modules
COPY services/shared/package.json ./
COPY services/shared/prisma ./prisma
RUN npx prisma generate

# Inline entrypoint — was `docker/migrate-and-seed.sh` before the Python-CLI
# migration removed all shell scripts. `miamo prisma migrate-and-seed` does
# the equivalent thing from a host shell; this container runs the raw npx
# commands so nothing extra needs to be installed inside it.
ENTRYPOINT ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed 2>/dev/null || true"]
