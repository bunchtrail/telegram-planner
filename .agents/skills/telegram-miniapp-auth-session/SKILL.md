---
name: telegram-miniapp-auth-session
description: >-
  Auth, session management, серверная валидация Telegram WebApp initData, security boundaries и
  user identity mapping для Telegram Mini Apps / Web Apps. Используй, когда нужно реализовать
  login/session flow, проверить initData, выдать JWT/cookie session, связать Telegram user с
  внутренним пользователем или провести security hardening auth слоя. Не используй для общего UI.
---

# Telegram Mini App Auth and Session

## Overview

Сделай auth слой Mini App **серверно-проверяемым и устойчивым**. Основная цель —
не доверять данным из WebView напрямую и строить сессию только после валидации `initData`.

Используй этот skill для:

- auth bootstrap;
- validation endpoint;
- session issuance;
- user mapping;
- security review auth flow;
- negative test cases и hardening.

## Non-negotiable rules

- Никогда не доверяй `initDataUnsafe` для авторизации.
- Клиент может передавать только raw `initData`; проверка выполняется на сервере.
- Любая роль, entitlement или платный доступ должны опираться на серверную истину.
- Telegram user/chat identifiers храни в типах, безопасных для 64-bit значений.
- Не логируй bot token, HMAC secrets и чувствительные auth payloads в открытом виде.

## Workflow

### 1. Прими raw `initData` на backend

Frontend должен отправлять:

- raw `Telegram.WebApp.initData`;
- минимальные client metadata при необходимости;
- опционально device/session correlation id.

Не отправляй только распарсенный JSON как единственный источник истины.

### 2. Валидируй подпись

По умолчанию реализуй серверную проверку через HMAC flow с bot token.

Если задача прямо требует валидации третьей стороной без bot token,
поддержи альтернативный verification path через `signature` и `bot_id`.

### 3. Проверь freshness

Обязательно проверяй `auth_date` и отклоняй устаревшие payloads.
Сделай допустимое окно явно конфигурируемым.

### 4. Нормализуй identity

После успешной проверки:

- извлеки validated Telegram user;
- свяжи его с внутренней записью пользователя;
- создай session/JWT/cookie;
- зафиксируй audit trail для входа.

### 5. Раздели auth bootstrap и domain authz

Не смешивай:

- подтверждение, что payload пришел из Telegram;
- решение, что пользователь может делать внутри продукта.

Сначала валидация Telegram identity, потом обычные правила приложения.

### 6. Построй negative paths

Обязательно покрой кейсы:

- битая подпись;
- устаревший `auth_date`;
- отсутствующий обязательный user payload;
- повторное использование старого payload;
- clock skew;
- невалидные JSON-поля в составных значениях.

## Recommended deliverables

- middleware/service для валидации `initData`;
- auth endpoint;
- user mapping service;
- session issuer;
- structured error model;
- automated tests с positive/negative vectors;
- короткая security note по trust boundaries.

## Output contract

В ответе старайся включать:

1. trust boundary diagram в текстовом виде;
2. validation strategy;
3. session issuance strategy;
4. failure cases;
5. тесты;
6. список assumptions.

## Guardrails

- Не аутентифицируй пользователя по `initDataUnsafe`.
- Не вычисляй роль/доступ только на клиенте.
- Не принимай отсутствие `auth_date` как допустимое состояние.
- Не делай “best effort auth” при провале валидации: это должно завершаться отказом.
- Не преобразуй Telegram IDs в небезопасные типы.

## Prompt examples

- `Use $telegram-miniapp-auth-session to implement secure server-side validation of Telegram WebApp initData in Node.js.`
- `Используй $telegram-miniapp-auth-session чтобы добавить session auth для Mini App на Fastify + PostgreSQL.`
- `Use $telegram-miniapp-auth-session to review this auth flow for replay, stale auth_date and trust-boundary issues.`
