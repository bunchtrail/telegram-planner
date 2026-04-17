---
name: telegram-miniapp-ui-shell
description: >-
  UI shell, theming, viewport, safe area, lifecycle events, Back/Main/Secondary buttons и
  Telegram runtime integration для Telegram Mini Apps / Web Apps. Используй, когда нужно
  построить или исправить оболочку интерфейса, адаптацию под theme/viewport/fullscreen,
  работу кнопок, navigation и root layout. Не используй для backend auth или bot command logic.
---

# Telegram Mini App UI Shell

## Overview

Построй **правильную Telegram-native оболочку** Mini App. Цель — сделать интерфейс,
который чувствует себя как часть Telegram: mobile-first, theme-aware, safe-area-aware
и устойчивый к resize, reopen, minimize и смене темы.

Используй этот skill для:

- root layout и app shell;
- theme tokens и CSS variables;
- viewport/safe area handling;
- MainButton / SecondaryButton / BackButton orchestration;
- lifecycle events;
- loading/progress/unsaved state behavior.

## Mandatory runtime posture

При работе с UI придерживайся следующей последовательности.

### 1. Создай единый bridge/module над `Telegram.WebApp`

Не размазывай прямые обращения к глобальному объекту по компонентам.
Сконцентрируй доступ в одном месте:

- инициализация;
- capability checks;
- подписка/отписка на события;
- синхронизация theme/viewport/safe area;
- управление кнопками.

### 2. Вызывай `ready()` рано

Как только essential UI готов, вызывай `ready()`.
Не держи пользователя на placeholder дольше необходимого.

### 3. Используй `expand()` осознанно

Если сценарий выигрывает от максимальной высоты, вызывай `expand()` после загрузки
основной структуры экрана. Не делай это бездумно для каждого экрана.

### 4. Делай интерфейс theme-aware

Используй Telegram theme variables и актуальные theme params как основу системы дизайна:

- background;
- text;
- button colors;
- section backgrounds;
- header/bottom bar colors.

Не хардкодь светлую тему как дефолтную истину.

### 5. Делай интерфейс safe-area-aware

Любые fixed/sticky элементы снизу и сверху должны учитывать safe area и content safe area.
Особенно это важно в fullscreen и на устройствах с notch/navigation areas.

### 6. Не привязывай fixed layout к “живому” `viewportHeight`

Если нужен устойчивый нижний layout, ориентируйся на стабильное состояние viewport и safe area.
Не пытайся “приклеить” UI к быстро меняющемуся размеру во время анимации.

## Event handling

Поддерживай как минимум следующие события, если они релевантны задаче:

- `themeChanged`
- `viewportChanged`
- `safeAreaChanged`
- `contentSafeAreaChanged`
- `activated`
- `deactivated`
- `fullscreenChanged`
- button click events

Каждую подписку сопроводи корректной очисткой.

## Buttons policy

### BackButton
Показывай только когда есть реальное действие “назад”:

- вложенная навигация;
- multi-step flow;
- экран подтверждения;
- несохраненные изменения.

Не показывай BackButton декоративно.

### MainButton
Используй для primary action текущего экрана.
Если действие длительное:

- показывай progress;
- блокируй повторные клики, если это не идемпотентный safe action;
- явно меняй текст под шаг процесса.

### SecondaryButton
Используй для вторичного действия, когда это реально улучшает UX:
`Cancel`, `Skip`, `Back`, `Reset filters`, `Open details`.

### Closing confirmation
Если пользователь может потерять прогресс или черновик, включай closing confirmation
на время dirty state и выключай после сохранения.

### Vertical swipes
Не отключай vertical swipes без причины.
Отключай только если собственные жесты приложения конфликтуют с системным поведением.

## UX rules

- Все экраны — mobile-first.
- Анимации — короткие и экономные.
- Поддерживай labels/aria и доступность.
- Пустые состояния и ошибки должны выглядеть как полноценная часть продукта.
- Любой screen-level loading state должен быть совместим с Telegram shell.

## Output contract

Когда применяешь этот skill, старайся выдавать:

1. bridge/module над Telegram runtime;
2. root layout or shell component;
3. theme token mapping;
4. viewport/safe area strategy;
5. button orchestration plan;
6. smoke checklist для UI.

## Guardrails

- Не добавляй тяжелую desktop-first навигацию как базовый UI паттерн.
- Не полагайся на браузерный env как на главный runtime: Telegram WebView важнее.
- Не размещай критичные CTA там, где они перекрываются Telegram UI.
- Не оставляй подписки на события без cleanup.

## Prompt examples

- `Use $telegram-miniapp-ui-shell to build a reusable Telegram WebApp bridge and app shell for a React app.`
- `Используй $telegram-miniapp-ui-shell чтобы исправить theme, safe area и MainButton/BackButton в этом Mini App.`
- `Use $telegram-miniapp-ui-shell to refactor the layout for fullscreen and viewport changes.`
