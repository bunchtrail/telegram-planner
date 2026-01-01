# Документация проекта

Эта папка — “операционный справочник” для поддержки и развития Telegram Planner.

## Карта документов

- `ARCHITECTURE.md` — архитектура, границы модулей, потоки данных
- `AUTH_TELEGRAM.md` — Telegram initData, проверка подписи, выпуск JWT для Supabase
- `DATA_MODEL_SUPABASE.md` — схема БД, RLS, индексы, миграции, рекомендации
- `STATE_REALTIME.md` — realtime + optimistic updates, гонки, reconciliation
- `FRONTEND_GUIDE.md` — правила фронтенда (Next.js/React), a11y, perf, компоненты
- `DESIGN_SYSTEM.md` — дизайн-токены, Tailwind, визуальный язык, motion/haptics
- `TESTING_QA.md` — стратегия тестирования и QA чеклисты
- `DEPLOYMENT_OPERATIONS.md` — окружения, переменные, деплой, мониторинг
- `SECURITY_PRIVACY.md` — угрозы, защита данных, приватность, логирование

## Когда обновлять docs

Обновляйте документы, если вы:

- меняете схему БД или RLS;
- добавляете/меняете API контракты;
- меняете фундаментальную логику (optimistic/realtime, даты/таймзоны);
- добавляете крупную фичу или новый модуль/папку.
