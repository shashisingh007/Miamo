# docker/social.Dockerfile — Miamo Social Service
# See docker/auth.Dockerfile for layout/NODE_PATH notes.

FROM node:20-alpine AS deps
WORKDIR /app
COPY services/social/package.json services/social/package-lock.json* services/social/
COPY services/shared/package.json services/shared/package-lock.json* services/shared/
RUN cd services/shared && (npm ci --no-audit --no-fund 2>/dev/null || npm install --no-audit --no-fund)
RUN cd services/social && (npm ci --no-audit --no-fund 2>/dev/null || npm install --no-audit --no-fund)

FROM node:20-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/services/shared/node_modules services/shared/node_modules
COPY --from=deps /app/services/social/node_modules services/social/node_modules
COPY services/shared services/shared
COPY services/social  services/social
RUN cd services/shared && npx prisma generate
RUN cd services/social && npx tsc --removeComments

FROM node:20-alpine AS runner
RUN apk add --no-cache openssl curl
WORKDIR /app/services/social
ENV NODE_ENV=production \
    PORT=3203 \
    NODE_PATH=/app/services/shared/node_modules

RUN addgroup -g 1001 -S miamo && adduser -u 1001 -S miamo -G miamo

COPY --from=build /app/services/social/dist          ./dist
COPY --from=build /app/services/social/node_modules  ./node_modules
COPY --from=build /app/services/social/package.json  ./package.json
COPY --from=build /app/services/shared               ../shared

RUN chown -R miamo:miamo /app
USER miamo

EXPOSE 3203
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3203/health || exit 1

CMD ["node", "dist/social/src/server.js"]
