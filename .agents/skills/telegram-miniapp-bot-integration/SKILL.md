---
name: telegram-miniapp-bot-integration
description: >-
  Bot commands, launch surfaces, buttons, deep links, query_id flows, sendData,
  answerWebAppQuery и transport-specific wiring для Telegram Mini Apps / Web Apps.
  Используй, когда нужно связать Mini App с ботом, выбрать правильные кнопки/handlers,
  подключить deep links, startapp/start_param или реализовать возврат результата в чат.
  Не используй для чисто визуальных задач без bot/runtime логики.
---

# Telegram Mini App Bot Integration

## Overview

Построй **правильную связку между ботом и Mini App**, а не просто “кнопку, которая открывает сайт”.
Здесь важнее всего корректно выбрать transport и не перепутать возможности разных launch surfaces.

Используй этот skill для:

- `/start` и bot onboarding;
- keyboard / inline / menu / attachment / direct-link launch;
- `sendData` и service messages;
- `query_id` и `answerWebAppQuery`;
- `startapp` / `start_param` routing;
- fallback messaging после закрытия Mini App.

## Launch surface decision rules

### Keyboard button
Используй, когда нужно отправить данные обратно боту как service message.
Этот путь подходит для простого structured input flow.

### Inline button
Используй, когда нужен интерактивный Mini App, который может завершаться
отправкой результата назад в чат через `answerWebAppQuery`.

### Main Mini App
Используй как “главный вход” в продукт. Бот и профиль должны вести пользователя
в один основной интерфейс.

### Direct link
Используй, когда Mini App нужно открывать из ссылок, кампаний, шаринга или chat-specific сценариев.
Явно обрабатывай `startapp`/`tgWebAppStartParam`.

### Attachment menu
Используй, когда продукт тесно живет рядом с контекстом конкретного чата.

### Inline mode
Используй, когда Mini App — часть inline content creation flow.

## Core workflow

### 1. Зафиксируй основной transport

В ответе всегда явно напиши:

- откуда пользователь запускает Mini App;
- какие данные приходят в runtime;
- как Mini App возвращает результат;
- что происходит после закрытия.

### 2. Реализуй launch-specific handlers

Минимальный набор:

- `/start` handler;
- help/onboarding;
- launch buttons or links;
- deep-link parser;
- optional inline keyboard;
- transport-specific completion handler.

### 3. Не путай completion flows

#### Для keyboard button
Используй `sendData` только там, где это действительно доступно и уместно.

#### Для inline button / attachment flows
Если есть `query_id` и требуется отправить результат в чат,
используй `answerWebAppQuery`.

#### Для direct link
Не предполагай, что direct-link launch автоматически дает тот же chat-send flow.
Если нужен возврат в чат, закладывай отдельный UX.

### 4. Проектируй start parameters

Если продукт поддерживает deep links или multi-entry UX:

- нормализуй `startapp`/`start_param`;
- держи единый parser;
- валидируй допустимые значения;
- делай route mapping явным.

### 5. Проектируй graceful fallback

Если completion flow не сработал:

- оставь пользователя не в тупике;
- покажи понятное сообщение в Mini App;
- предложи fallback шаг в чате или явный CTA.

## Recommended deliverables

- bot launch map;
- handlers для кнопок/команд;
- deep-link/start-param parser;
- Mini App completion strategy;
- README examples;
- integration tests для transport-specific веток.

## Output contract

Обычно стоит выдавать:

1. launch surface map;
2. bot flow diagram в текстовом виде;
3. handler list;
4. completion transport logic;
5. fallback UX;
6. test scenarios.

## Guardrails

- Не используй `sendData` вне сценариев, где он реально доступен.
- Не предполагай наличие `query_id` в любом launch mode.
- Не смешивай handler logic и domain logic в одном большом обработчике.
- Не оставляй deep-link параметры непроверенными.
- Не делай критический user flow зависимым только от одного transport path без fallback.

## Prompt examples

- `Use $telegram-miniapp-bot-integration to wire a Telegram bot, inline button launch and answerWebAppQuery flow.`
- `Используй $telegram-miniapp-bot-integration чтобы добавить startapp/deep link routing и бот-команды для Mini App.`
- `Use $telegram-miniapp-bot-integration to refactor this bot so launch modes are explicit and testable.`
