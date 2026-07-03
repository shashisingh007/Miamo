# docker/tracking-worker.Dockerfile — Miamo Tracking Worker
# Build: docker build -f docker/tracking-worker.Dockerfile -t miamo-tracking-worker .
#
# Runtime = tsx (TypeScript direct execution) — bypasses tsc AoT compile which
# OOMs on t3.small when combined with the heavy shared/algo modules. Same
# pattern used by `miamo start local` for dev.

# syntax=docker/dockerfile:1.6
FROM node:20-alpine AS deps
WORKDIR /app
COPY services/tracking-worker/package.json services/tracking-worker/package-lock.json* services/tracking-worker/
COPY services/shared/package.json services/shared/package-lock.json* services/shared/
RUN cd services/shared          && (npm ci --no-audit --no-fund 2>/dev/null || npm install --no-audit --no-fund)
RUN cd services/tracking-worker && (npm ci --no-audit --no-fund 2>/dev/null || npm install --no-audit --no-fund)
# tsx runtime (globally-callable, tiny)
RUN cd services/tracking-worker && npm install --no-save --no-audit --no-fund tsx@^4.19

FROM node:20-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/services/shared/node_modules          services/shared/node_modules
COPY --from=deps /app/services/tracking-worker/node_modules services/tracking-worker/node_modules
COPY services/shared          services/shared
COPY services/tracking-worker services/tracking-worker
# Generate Prisma from shared (uses pinned prisma@5.x), then overlay the real
# client into tracking-worker's node_modules so `require('@prisma/client')`
# from the worker resolves the actual client, not the "did not initialize" stub.
RUN cd services/shared && npx prisma generate --schema=prisma/schema.prisma \
    && rm -rf ../tracking-worker/node_modules/.prisma \
    && cp -r node_modules/.prisma ../tracking-worker/node_modules/.prisma

FROM node:20-alpine AS runner
RUN apk add --no-cache openssl curl
WORKDIR /app/services/tracking-worker
ENV NODE_ENV=production \
    PORT=3261 \
    NODE_PATH=/app/services/shared/node_modules

# Copy tsx runtime + everything we need to execute the TS entry directly.
COPY --from=build /app/services/tracking-worker/node_modules  ./node_modules
COPY --from=build /app/services/tracking-worker/src            ./src
COPY --from=build /app/services/tracking-worker/tsconfig.json  ./tsconfig.json
COPY --from=build /app/services/tracking-worker/package.json   ./package.json
COPY --from=build /app/services/shared                         ../shared

EXPOSE 3261
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3261/healthz || exit 1

# tsx executes .ts directly — zero compile step, zero OOM risk.
CMD ["node", "--enable-source-maps", "node_modules/tsx/dist/cli.mjs", "src/index.ts"]
