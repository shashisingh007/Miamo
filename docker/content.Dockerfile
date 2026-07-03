# docker/content.Dockerfile — Miamo Content Service
# See docker/auth.Dockerfile for layout/NODE_PATH notes.

FROM node:20-alpine AS deps
WORKDIR /app
COPY services/content/package.json services/content/package-lock.json* services/content/
COPY services/shared/package.json  services/shared/package-lock.json*  services/shared/
RUN cd services/shared  && (npm ci --no-audit --no-fund 2>/dev/null || npm install --no-audit --no-fund)
RUN cd services/content && (npm ci --no-audit --no-fund 2>/dev/null || npm install --no-audit --no-fund)

FROM node:20-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/services/shared/node_modules  services/shared/node_modules
COPY --from=deps /app/services/content/node_modules services/content/node_modules
COPY services/shared  services/shared
COPY services/content services/content
# See auth.Dockerfile: prisma writes to shared/, overlay the client here.
RUN cd services/content && npx prisma generate --schema=../shared/prisma/schema.prisma \
    && rm -rf node_modules/.prisma \
    && cp -r ../shared/node_modules/.prisma node_modules/.prisma
RUN cd services/content && npx tsc --removeComments --noCheck

FROM node:20-alpine AS runner
RUN apk add --no-cache openssl curl
WORKDIR /app/services/content
ENV NODE_ENV=production \
    PORT=3205 \
    NODE_PATH=/app/services/shared/node_modules

RUN addgroup -g 1001 -S miamo && adduser -u 1001 -S miamo -G miamo

COPY --from=build /app/services/content/dist          ./dist
COPY --from=build /app/services/content/node_modules  ./node_modules
COPY --from=build /app/services/content/package.json  ./package.json
COPY --from=build /app/services/shared             ../shared

RUN chown -R miamo:miamo /app
USER miamo

EXPOSE 3205
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3205/health || exit 1

CMD ["node", "dist/content/src/server.js"]
