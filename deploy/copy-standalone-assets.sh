#!/usr/bin/env bash
# Копирует статику и public-ассеты внутрь .next/standalone/, чтобы
# собранный `node .next/standalone/server.js` мог отдавать /_next/static/*
# и файлы из /public (icon-192.png, manifest и т.п.).
#
# Next.js в режиме output: 'standalone' НЕ делает это автоматически:
# https://nextjs.org/docs/app/api-reference/config/next-config-js/output#automatically-copying-traced-files
#
# Если этот шаг пропустить, приложение запустится, но все запросы
# к статике вернут 404/500 (см. docs/DEPLOY_VPS.md, раздел "Диагностика").
#
# Запускается автоматически из `npm run build:standalone`.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

STATIC_SRC="$ROOT/.next/static"
STATIC_DST="$ROOT/.next/standalone/.next/static"
PUBLIC_SRC="$ROOT/public"
PUBLIC_DST="$ROOT/.next/standalone/public"

if [[ ! -d "$ROOT/.next/standalone" ]]; then
  echo "error: $ROOT/.next/standalone не существует — сначала выполните 'next build'." >&2
  exit 1
fi

if [[ ! -d "$STATIC_SRC" ]]; then
  echo "error: $STATIC_SRC не существует — сборка прошла некорректно." >&2
  exit 1
fi

rm -rf "$STATIC_DST" "$PUBLIC_DST"
cp -r "$STATIC_SRC" "$STATIC_DST"
cp -r "$PUBLIC_SRC" "$PUBLIC_DST"

echo "copied $STATIC_SRC -> $STATIC_DST"
echo "copied $PUBLIC_SRC -> $PUBLIC_DST"
