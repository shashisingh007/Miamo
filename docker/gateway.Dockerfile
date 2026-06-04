# docker/gateway.Dockerfile — Miamo Gateway Service
# See docker/auth.Dockerfile for layout/NODE_PATH notes. Gateway has no Prisma.

FROM node:26-alpine AS deps
WORKDIR /app
COPY services/gateway/package.json services/gateway/package-lock.json* services/gateway/
COPY services/shared/package.json  services/shared/package-lock.json*  services/shared/
RUN cd services/shared  && (npm ci --no-audit --no-fund 2>/dev/null || npm install --no-audit --no-fund)
RUN cd services/gateway && (npm ci --no-audit --no-fund 2>/dev/null || npm install --no-audit --no-fund)

FROM node:26-alpine AS build
WORKDIR /app
COPY --from=deps /app/services/shared/node_modules  services/shared/node_modules
COPY --from=deps /app/services/gateway/node_modules services/gateway/node_modules
COPY services/shared  services/shared
COPY services/gateway services/gateway
RUN cd services/gateway && npx tsc --removeComments

FROM node:26-alpine AS runner
RUN apk add --no-cache curl
WORKDIR /app/services/gateway
ENV NODE_ENV=production \
    PORT=3200 \
    NODE_PATH=/app/services/shared/node_modules

RUN addgroup -g 1001 -S miamo && adduser -u 1001 -S miamo -G miamo

COPY --from=build /app/services/gateway/dist          ./dist
COPY --from=build /app/services/gateway/node_modules  ./node_modules
COPY --from=build /app/services/gateway/package.json  ./package.json
COPY --from=build /app/services/shared                ../shared

RUN chown -R miamo:miamo /app
USER miamo

EXPOSE 3200
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3200/health || exit 1

CMD ["node", "dist/gateway/src/server.js"]
