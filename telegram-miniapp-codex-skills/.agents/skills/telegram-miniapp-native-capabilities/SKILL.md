---
name: telegram-miniapp-native-capabilities
description: >-
  Fullscreen, safe area, QR, clipboard, location, biometrics, home screen, downloads,
  device/secure storage и другие Telegram Mini App native capabilities. Используй,
  когда нужно добавить platform features, capability checks, permission UX и fallback поведение.
  Не используй для обычного web UI, если задача не затрагивает нативные возможности Telegram runtime.
---

# Telegram Mini App Native Capabilities

## Overview

Подключай нативные возможности Telegram Mini App **по принципу progressive enhancement**:
сначала базовый продукт, потом capability checks, permission UX и fallback.

Используй этот skill для:

- fullscreen / orientation;
- QR scanner;
- clipboard;
- location;
- biometrics;
- home screen;
- file downloads;
- device or secure storage;
- feature gating и fallback logic.

## Core rule

Каждая нативная возможность должна иметь:

- capability check;
- user-triggered entry point, если это требуется платформой;
- fallback UX;
- telemetry;
- explicit failure handling.

## Workflow

### 1. Составь capability matrix

Для конкретной задачи перечисли:

- какая функция нужна;
- обязательна ли она для core UX;
- какая есть fallback стратегия;
- какой минимум проверки нужен: version check, object presence или оба.

### 2. Добавь unified runtime wrappers

Не вызывай нативные методы напрямую из случайных компонентов.
Собери тонкий слой с:

- `canUse...`
- `request...`
- `on...Changed`
- fallback result types

### 3. Делай permission UX объяснимым

Для location, biometrics, clipboard и похожих функций пользователь должен понимать:

- зачем запрашивается доступ;
- что произойдет после подтверждения;
- что будет, если он откажется.

### 4. Проектируй fullscreen и safe area вместе

Если используешь fullscreen:

- проверь layout на safe area;
- синхронизируй header/bottom bar поведение;
- не размещай controls под системными перекрытиями.

### 5. Для download flow учитывай серверные заголовки

Если Mini App предлагает скачать файл, backend должен отдавать файл так,
чтобы скачивание было предсказуемым на поддерживаемых Telegram/web платформах.

### 6. Для storage/biometric/location flows проектируй отказоустойчивость

Проверь сценарии:

- unsupported;
- permission denied;
- user cancelled;
- temporary failure;
- stale token/value;
- restore after reopen.

## Feature-specific notes

### QR
Используй для коротких, user-initiated scan flows.
Закладывай способ закрыть popup и обработать повторное сканирование.

### Clipboard
Считай clipboard опциональной возможностью и не строй на ней обязательный core flow.

### Biometrics
Используй как дополнительный фактор удобства/подтверждения, а не как единственный источник identity.

### Location
Давай понятный reason и UX, который работает и без location.

### Home screen
Предлагай как улучшение retention, а не как обязательный шаг onboarding.

### Downloads
Убедись, что backend и UI согласованы по имени файла, MIME type и user expectations.

## Recommended deliverables

- capability matrix;
- runtime wrapper layer;
- permission/fallback UX;
- telemetry hooks;
- regression checklist по платформенным сценариям.

## Output contract

Обычно включай:

1. список затронутых возможностей;
2. capability/fallback matrix;
3. wrapper API;
4. user interaction requirements;
5. failure states;
6. QA checklist.

## Guardrails

- Не делай нативную возможность обязательной без fallback.
- Не запрашивай доступ “на всякий случай”.
- Не игнорируй unsupported и denied branches.
- Не смешивай permission prompt с неясным UX.
- Не храни чувствительные вещи в небезопасных client-side местах только ради удобства.

## Prompt examples

- `Use $telegram-miniapp-native-capabilities to add QR scan, fullscreen and safe-area-safe layout.`
- `Используй $telegram-miniapp-native-capabilities чтобы подключить location, biometrics и fallback UX.`
- `Use $telegram-miniapp-native-capabilities to review this runtime wrapper for unsupported/permission-denied bugs.`
