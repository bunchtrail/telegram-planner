# syntax=docker/dockerfile:1.7
# Multi-stage Dockerfile для Next.js 16 (standalone output).
# Использование (см. docs/DEPLOY_VPS.md):
#   docker build -t telegram-planner:latest .
#   docker run -d --name telegram-planner \
#     --restart=always \
#     -p 127.0.0.1:3000:3000 \
#     --env-file /etc/telegram-planner/env \
#     telegram-planner:latest

ARG NODE_VERSION=20.20.2

# ── deps: ставим зависимости отдельным слоем для кеширования ────────────────
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

# ── builder: компилируем Next.js в standalone-режим ─────────────────────────
FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── runner: минимальный финальный образ ─────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Создаём непривилегированного пользователя
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Копируем standalone-сборку и публичные ассеты
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# `server.js` создаётся Next.js при `output: 'standalone'`.
CMD ["node", "server.js"]
