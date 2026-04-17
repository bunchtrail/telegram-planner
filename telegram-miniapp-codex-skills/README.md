# Codex skills for Telegram Mini Apps

Этот набор ориентирован на **Telegram Mini Apps** (исторически: Web Apps) и на связку
**frontend + bot + backend**. Пакет сделан в формате, который понимает Codex:
отдельные директории со `SKILL.md`, плюс короткий корневой `AGENTS.md`.

## Что внутри

- `telegram-miniapp-architecture` — выбор launch surface, структуры репозитория и стартового каркаса.
- `telegram-miniapp-ui-shell` — оболочка приложения: theme, viewport, safe area, кнопки, lifecycle.
- `telegram-miniapp-auth-session` — безопасная валидация `initData`, сессии и авторизация.
- `telegram-miniapp-bot-integration` — команды бота, кнопки, deep links, `sendData`, `answerWebAppQuery`.
- `telegram-miniapp-payments` — инвойсы, платежный поток, идемпотентность, статусы оплаты.
- `telegram-miniapp-native-capabilities` — fullscreen, QR, clipboard, location, biometrics, downloads, device storage.
- `telegram-miniapp-debug-qa` — отладка, воспроизведение багов, регрессии и pre-release checklist.

## Как установить

1. Положи `AGENTS.md` в корень репозитория или в нужный модуль.
2. Положи папку `.agents/skills/` рядом.
3. Запускай Codex из этого каталога или из дочерних директорий.

## Как вызывать

Явно:

- `Use $telegram-miniapp-architecture to scaffold a Telegram Mini App for ...`
- `Используй $telegram-miniapp-ui-shell чтобы привести UI к Telegram Mini App runtime`
- `Используй $telegram-miniapp-auth-session для безопасной серверной валидации initData`

Неявно:

- Codex сможет сам подтянуть нужный skill, если описание задачи совпадает с `description`.

## Рекомендуемая структура проекта

```text
repo/
├─ AGENTS.md
├─ .agents/
│  └─ skills/
│     ├─ telegram-miniapp-architecture/
│     ├─ telegram-miniapp-ui-shell/
│     ├─ telegram-miniapp-auth-session/
│     ├─ telegram-miniapp-bot-integration/
│     ├─ telegram-miniapp-payments/
│     ├─ telegram-miniapp-native-capabilities/
│     └─ telegram-miniapp-debug-qa/
├─ apps/
│  ├─ web/
│  ├─ bot/
│  └─ api/
└─ packages/
   └─ shared/
```

## Практический совет

Для monorepo можно держать общий набор skills в корне, а для конкретного сервиса добавлять
локальные skills глубже по дереву, если у отдельного модуля есть свои правила.
