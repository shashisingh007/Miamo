# docker/ingest.Dockerfile — Miamo Tracking Ingest Service
# Build: docker build -f docker/ingest.Dockerfile -t miamo-ingest .
# See docker/auth.Dockerfile for the layout/NODE_PATH rationale.

# syntax=docker/dockerfile:1.6
FROM node:20-alpine AS deps
WORKDIR /app
COPY services/ingest/package.json services/ingest/package-lock.json* services/ingest/
COPY services/shared/package.json services/shared/package-lock.json* services/shared/
RUN cd services/shared && (npm ci --no-audit --no-fund 2>/dev/null || npm install --no-audit --no-fund)
RUN cd services/ingest && (npm ci --no-audit --no-fund 2>/dev/null || npm install --no-audit --no-fund)

FROM node:20-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/services/shared/node_modules services/shared/node_modules
COPY --from=deps /app/services/ingest/node_modules services/ingest/node_modules
COPY services/shared services/shared
COPY services/ingest services/ingest
# ingest imports installSentry from shared/src/service.ts which pulls in
# `@prisma/client` at import time — generate the client so require() works.
# Run generate from shared (where prisma@5.x is a devDependency) so `npx`
# doesn't grab the newest Prisma major and reject a v5-format schema.
RUN cd services/shared && npx prisma generate --schema=prisma/schema.prisma \
    && rm -rf ../ingest/node_modules/.prisma \
    && cp -r node_modules/.prisma ../ingest/node_modules/.prisma
RUN cd services/ingest && npx tsc --noCheck

FROM node:20-alpine AS runner
RUN apk add --no-cache openssl curl
WORKDIR /app/services/ingest
ENV NODE_ENV=production \
    PORT=3260 \
    NODE_PATH=/app/services/shared/node_modules

COPY --from=build /app/services/ingest/dist          ./dist
COPY --from=build /app/services/ingest/node_modules  ./node_modules
COPY --from=build /app/services/ingest/package.json  ./package.json
COPY --from=build /app/services/shared               ../shared

EXPOSE 3260
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3260/health || exit 1

# tsconfig `rootDir: ".."` mirrors both `services/ingest/src` AND
# `services/shared/src/track` into dist — so the entry point lands at
# dist/ingest/src/server.js, not dist/server.js.
CMD ["node", "dist/ingest/src/server.js"]
