# docker/auth.Dockerfile — Miamo Auth Service
# Build: docker build -f docker/auth.Dockerfile -t miamo-auth .
#
# Layout note: every backend service has tsconfig `rootDir: ".."`, so it
# compiles BOTH `services/<svc>/src` and `services/shared/src` into
# `services/<svc>/dist/{<svc>,shared}/src/*.js`. We mirror that layout in
# the image and set NODE_PATH so transitive deps (zod, prom-client, redis,
# google-auth-library, …) declared in services/shared resolve at runtime.

# ─── Stage 1: deps ───────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY services/auth/package.json   services/auth/package-lock.json*   services/auth/
COPY services/shared/package.json services/shared/package-lock.json* services/shared/
RUN cd services/shared && (npm ci --no-audit --no-fund 2>/dev/null || npm install --no-audit --no-fund)
RUN cd services/auth   && (npm ci --no-audit --no-fund 2>/dev/null || npm install --no-audit --no-fund)

# ─── Stage 2: build (prisma generate + tsc) ──────────────────────────────
FROM node:20-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/services/shared/node_modules services/shared/node_modules
COPY --from=deps /app/services/auth/node_modules   services/auth/node_modules
COPY services/shared services/shared
COPY services/auth   services/auth
RUN cd services/shared && npx prisma generate
RUN cd services/auth   && npx tsc --removeComments

# ─── Stage 3: runner ─────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl curl
WORKDIR /app/services/auth
ENV NODE_ENV=production \
    PORT=3201 \
    NODE_PATH=/app/services/shared/node_modules

RUN addgroup -g 1001 -S miamo && adduser -u 1001 -S miamo -G miamo

COPY --from=build /app/services/auth/dist          ./dist
COPY --from=build /app/services/auth/node_modules  ./node_modules
COPY --from=build /app/services/auth/package.json  ./package.json
COPY --from=build /app/services/shared             ../shared

RUN chown -R miamo:miamo /app
USER miamo

EXPOSE 3201
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3201/health || exit 1

CMD ["node", "dist/auth/src/server.js"]
