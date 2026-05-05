# ─── Miamo API Gateway ────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci 2>/dev/null || npm install

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx tsc

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 miamo
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
USER miamo
EXPOSE 3200
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3200/health || exit 1
CMD ["node", "dist/server.js"]
