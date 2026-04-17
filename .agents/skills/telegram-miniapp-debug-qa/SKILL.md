---
name: telegram-miniapp-debug-qa
description: >-
  Debugging, reproducibility, platform-specific inspection, regression testing и release checklist
  для Telegram Mini Apps / Web Apps. Используй, когда нужно воспроизвести баг в Telegram runtime,
  составить QA matrix, проверить launch/auth/theme/viewport/button/payment сценарии или подготовить
  Mini App к релизу. Не используй как общий skill для написания новых feature без задачи на проверку.
---

# Telegram Mini App Debugging and QA

## Overview

Проверяй Mini App **внутри Telegram runtime**, а не только в обычном браузере.
Главная задача этого skill — сделать баг воспроизводимым, локализовать его до слоя
(web UI / bot / backend / Telegram runtime), исправить и оставить регрессионный след.

Используй этот skill для:

- platform-specific debugging;
- воспроизведения и фикса багов;
- regression matrix;
- pre-release smoke plan;
- QA handoff.

## Debugging workflow

### 1. Сначала локализуй слой

Для каждого бага ответь:

- это web UI bug;
- bot integration bug;
- backend/auth bug;
- launch-mode bug;
- Telegram runtime/platform bug;
- race condition между этими слоями.

### 2. Всегда фиксируй окружение

В баг-репорте или ответе укажи:

- Telegram client/platform;
- launch surface;
- тема/режим;
- экран/маршрут;
- что ожидалось;
- что произошло;
- можно ли воспроизвести повторно.

### 3. Проверяй в Telegram, а не только в браузере

Если issue связан с:

- theme,
- buttons,
- viewport,
- safe area,
- fullscreen,
- auth bootstrap,
- QR,
- clipboard,
- invoice,
- close/reopen,

то sign-off только по браузеру недостаточен.

### 4. Проверяй console/network/runtime events

При отладке ищи:

- новые console errors;
- failed network requests;
- отсутствующие cleanup subscriptions;
- дублирование событий;
- некорректный dirty/progress/button state;
- неочищенные timers/listeners.

### 5. После фикса прогоняй минимальную регрессию

Не ограничивайся “консоль чистая”.
Повтори пользовательский сценарий от launch до outcome.

## QA matrix

Для релизного или bugfix-пакета по умолчанию проверяй:

- launch/open;
- auth bootstrap;
- theme switch;
- viewport change;
- safe area;
- MainButton / SecondaryButton / BackButton;
- close/reopen/minimize;
- empty/loading/error states;
- slow network;
- invalid or stale auth payload;
- payment or native feature flows, если они затронуты.

## Release checklist

Перед релизом постарайся оставить:

1. список проверенных платформ;
2. список launch surfaces;
3. список критичных flows;
4. известные ограничения;
5. rollback-safe notes, если есть рискованный change.

## Output contract

Обычно результат должен содержать:

1. reproduction steps;
2. suspected root cause;
3. fix summary;
4. regression checklist;
5. remaining risk list.

## Guardrails

- Не говори “работает”, если это проверено только в обычном браузере.
- Не закрывай issue без повторного end-to-end прогона сценария.
- Не смешивай несколько багов в один недиагностированный патч.
- Не пропускай cleanup и edge cases, если баг был event-driven.
- Не забывай про launch-mode-specific регрессию после фикса transport logic.

## Prompt examples

- `Use $telegram-miniapp-debug-qa to reproduce and fix a Telegram Mini App viewport bug on Android.`
- `Используй $telegram-miniapp-debug-qa чтобы составить pre-release checklist для этого Mini App.`
- `Use $telegram-miniapp-debug-qa to audit this repo for launch/auth/theme/button regressions before release.`
