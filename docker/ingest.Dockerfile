# syntax=docker/dockerfile:1.6
FROM node:20-alpine AS deps
WORKDIR /app
COPY services/ingest/package.json services/ingest/
COPY services/shared/package.json services/shared/
WORKDIR /app/services/ingest
RUN npm install --omit=dev --no-audit --no-fund

FROM node:20-alpine AS build
WORKDIR /app
COPY services/ingest services/ingest
COPY services/shared services/shared
WORKDIR /app/services/ingest
RUN npm install --no-audit --no-fund && npx tsc

FROM node:20-alpine
WORKDIR /app/services/ingest
ENV NODE_ENV=production PORT=3260
COPY --from=deps  /app/services/ingest/node_modules ./node_modules
COPY --from=build /app/services/ingest/dist ./dist
COPY --from=build /app/services/shared ../shared
EXPOSE 3260
CMD ["node", "dist/server.js"]
