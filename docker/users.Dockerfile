# docker/users.Dockerfile — Miamo Users Service
# Build: docker build -f docker/users.Dockerfile -t miamo-users .
# See docker/auth.Dockerfile for layout/NODE_PATH notes.

FROM node:20-alpine AS deps
WORKDIR /app
COPY services/users/package.json  services/users/package-lock.json*  services/users/
COPY services/shared/package.json services/shared/package-lock.json* services/shared/
RUN cd services/shared && (npm ci --no-audit --no-fund 2>/dev/null || npm install --no-audit --no-fund)
RUN cd services/users  && (npm ci --no-audit --no-fund 2>/dev/null || npm install --no-audit --no-fund)

FROM node:20-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/services/shared/node_modules services/shared/node_modules
COPY --from=deps /app/services/users/node_modules  services/users/node_modules
COPY services/shared services/shared
COPY services/users   services/users
# See auth.Dockerfile for the rationale: prisma writes to the shared/ tree, so
# overlay the generated client into this service's own node_modules.
RUN cd services/users && npx prisma generate --schema=../shared/prisma/schema.prisma \
    && rm -rf node_modules/.prisma \
    && cp -r ../shared/node_modules/.prisma node_modules/.prisma
RUN cd services/users  && npx tsc --removeComments --noCheck

FROM node:20-alpine AS runner
RUN apk add --no-cache openssl curl
WORKDIR /app/services/users
ENV NODE_ENV=production \
    PORT=3202 \
    NODE_PATH=/app/services/shared/node_modules

RUN addgroup -g 1001 -S miamo && adduser -u 1001 -S miamo -G miamo

COPY --from=build /app/services/users/dist          ./dist
COPY --from=build /app/services/users/node_modules  ./node_modules
COPY --from=build /app/services/users/package.json  ./package.json
COPY --from=build /app/services/shared             ../shared

RUN chown -R miamo:miamo /app
USER miamo

EXPOSE 3202
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3202/health || exit 1

CMD ["node", "dist/users/src/server.js"]
