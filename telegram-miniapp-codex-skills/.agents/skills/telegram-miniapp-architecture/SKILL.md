---
name: telegram-miniapp-architecture
description: >-
  Проектирование, scaffolding, refactoring и repository planning для Telegram Mini Apps / Web Apps.
  Используй, когда нужно выбрать launch surface, разложить frontend/bot/backend, создать стартовый
  каркас проекта, структуру директорий, env и архитектурный план. Не используй для точечной правки UI,
  отдельной auth-валидации или локального bugfix без архитектурного решения.
---

# Telegram Mini App Architecture

## Overview

Собери **минимально правильную архитектуру** Telegram Mini App до написания деталей. Главная цель —
быстро выбрать правильный способ запуска приложения и не смешать transport-слои:
`sendData`, `answerWebAppQuery`, direct links, main mini app, attachment menu и обычный backend API.

Используй этот skill, чтобы выдать:

- решение по launch surface;
- repo shape и boundaries между `web`, `bot`, `api`, `shared`;
- env/secrets plan;
- bootstrap plan для frontend и backend;
- список первых задач и acceptance criteria.

## Inputs to collect or infer

Перед кодом собери или обоснованно выведи:

- какой основной пользовательский сценарий строится;
- должен ли Mini App отправлять сообщение в чат **от имени пользователя**;
- нужен ли chat context;
- обязателен ли внешний backend, или достаточно простого `sendData` flow;
- стек frontend/backend;
- где и как проект будет запускаться локально и в проде;
- нужна ли оплата, QR, fullscreen, location, storage, biometrics.

Если часть данных отсутствует, делай наилучшее предположение и фиксируй его явно.

## Choose launch surface first

Перед генерацией кода определи основной режим запуска:

### 1) Keyboard button
Выбирай, если нужен **самый простой input flow** и достаточно отправить данные обратно боту
через `sendData`. Не выбирай, если нужно полноценное серверное auth/session решение,
сложный app lifecycle или chat-aware deep link сценарии.

### 2) Inline button
Выбирай, если нужен более интерактивный flow и бот должен уметь отправить результат назад в чат
через `query_id`/`answerWebAppQuery`.

### 3) Main Mini App
Выбирай, если продукт должен открываться “в один тап” как основной интерфейс бота.

### 4) Direct link
Выбирай, если важно открывать Mini App из ссылки, передавать `startapp`/контекст
и быстро маршрутизировать пользователя внутрь нужного сценария.

### 5) Attachment menu
Выбирай, если нужен запуск из attachment menu и сценарий тесно связан с конкретным чатом.

### 6) Inline mode
Выбирай, если пользователь создает контент в web-интерфейсе и затем возвращается в inline mode.

Если возможны несколько режимов, выбери **основной** и отдельно перечисли вторичные.

## Architecture workflow

### 1. Определи repo shape

Предпочитай один из паттернов:

#### A. Monorepo app split
- `apps/web`
- `apps/bot`
- `apps/api`
- `packages/shared`

Используй, если есть полноценный backend и общие DTO/validation schemas.

#### B. Bot + web + shared
- `bot/`
- `web/`
- `shared/`

Используй для небольших проектов.

#### C. Web-only + bot transport shim
Используй только когда требования очень простые и нет серьёзной server-side логики, кроме бота.

### 2. Определи runtime boundaries

Явно зафиксируй:

- что работает **внутри Telegram WebView**;
- что работает в backend API;
- что делает bot process;
- какие данные приходят из Telegram runtime;
- какие данные являются внутренним состоянием продукта.

### 3. Спланируй env и secrets

Разделяй:

- frontend public config;
- server secrets;
- bot token;
- database/storage config;
- webhook/base URLs;
- feature flags для Telegram-specific функций.

Не допускай утечки bot token в web bundle.

### 4. Спланируй bootstrap frontend

В стартовом плане обязательно учти:

- bootstrap wrapper над `window.Telegram.WebApp`;
- ранний `ready()` после загрузки essential UI;
- theme-aware root layout;
- viewport/safe-area handling;
- место для button orchestration;
- app router или state machine для deep links и `start_param`.

### 5. Спланируй backend/auth boundary

Даже если auth будет реализован позже, заранее зарезервируй:

- endpoint для приема `initData`;
- validation layer;
- session issuance strategy;
- user mapping strategy;
- idempotent mutation layer для платежей и команд.

### 6. Спланируй observability

Сразу предложи:

- client error logging;
- bot event logging;
- payment/audit logging;
- correlation id на критичных flows.

## Output contract

В ответе старайся выдавать:

1. **Chosen launch surface** с коротким обоснованием.
2. **Repository shape**.
3. **Runtime boundaries**.
4. **Env/secrets checklist**.
5. **First scaffold plan** по папкам и ключевым файлам.
6. **Phase 1 acceptance criteria**.
7. **Known risks / assumptions**.

## Guardrails

- Не используй `sendData` как универсальный транспорт.
- Не смешивай direct link flow и inline button flow без явной причины.
- Не предлагай хранить чувствительные данные в frontend.
- Не привязывай архитектуру к одному Telegram runtime feature, если продукт можно сделать устойчивее.
- Если новая нативная возможность не обязательна, делай её опциональной, а не архитектурным фундаментом.

## Prompt examples

- `Use $telegram-miniapp-architecture to scaffold a Telegram Mini App with React, Fastify and grammY.`
- `Используй $telegram-miniapp-architecture чтобы выбрать лучший launch mode и структуру monorepo для Telegram Mini App магазина.`
- `Use $telegram-miniapp-architecture to refactor this repo into web/bot/api/shared boundaries.`
