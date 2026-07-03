# syntax=docker/dockerfile:1.6
FROM node:20-alpine AS deps
WORKDIR /app
COPY services/tracking-worker/package.json services/tracking-worker/
COPY services/shared/package.json services/shared/
WORKDIR /app/services/tracking-worker
RUN npm install --omit=dev --no-audit --no-fund

FROM node:20-alpine AS build
WORKDIR /app
COPY services/tracking-worker services/tracking-worker
COPY services/shared services/shared
WORKDIR /app/services/tracking-worker
RUN npm install --no-audit --no-fund && npx tsc

FROM node:20-alpine
WORKDIR /app/services/tracking-worker
ENV NODE_ENV=production PORT=3261
COPY --from=deps  /app/services/tracking-worker/node_modules ./node_modules
COPY --from=build /app/services/tracking-worker/dist ./dist
COPY --from=build /app/services/shared ../shared
EXPOSE 3261
CMD ["node", "dist/index.js"]
