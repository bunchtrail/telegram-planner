---
name: telegram-miniapp-payments
description: >-
  Инвойсы, платежные состояния, order flow, идемпотентность, entitlement handling и
  Telegram Mini App payment UX. Используй, когда нужно встроить оплату в Mini App,
  открыть invoice, обработать статусы закрытия, связать client callbacks с server truth
  и построить безопасный purchase flow. Не используй для общего bot/UI scaffolding без оплаты.
---

# Telegram Mini App Payments

## Overview

Сконструируй оплату как **серверно-истинный workflow**, а не как client-side success callback.
Mini App может запустить оплату и показать статусы, но право на товар/подписку/функцию
должно выдаваться только после серверного подтверждения.

Используй этот skill для:

- invoice launch;
- purchase state machine;
- order reconciliation;
- idempotency;
- entitlement issuance;
- payment failure and retry UX.

## Principles

- Клиент инициирует оплату, но не подтверждает её окончательно.
- Статусы UI — это UX-сигналы, а не единственный источник истины.
- Любая выдача товара/подписки должна быть идемпотентной.
- Нельзя завязывать доступ на один клиентский callback.
- Нужен явный порядок: create order -> open invoice -> observe result -> verify server-side -> grant entitlement.

## Workflow

### 1. Определи продаваемый объект

Сначала зафиксируй:

- что именно продается;
- одноразовая это покупка или периодическая;
- как хранится order;
- как хранится entitlement;
- какие сценарии повторного открытия или повтора допустимы.

### 2. Построй order model

Для каждой покупки предложи явную модель состояний, например:

- `draft`
- `invoice_opened`
- `pending`
- `paid`
- `cancelled`
- `failed`
- `expired`
- `refunded` (если требуется доменной логикой)

### 3. Открой invoice через Mini App

Client-side integration должна:

- открывать invoice в ответ на явное действие пользователя;
- обрабатывать закрытие invoice и UI statuses;
- обновлять локальный экран без выдачи доступа раньше времени.

### 4. Подтверди итог на сервере

После клиентского события и/или bot/service event обработай финальное состояние на сервере:

- сверяй order id;
- обеспечивай идемпотентность;
- защищайся от duplicate callbacks;
- логируй итог и источник подтверждения.

### 5. Дай пользователю понятный post-payment UX

После оплаты пользователь должен увидеть один из явных исходов:

- success с активированным entitlement;
- pending с объяснением;
- failed с повторной попыткой;
- cancelled без ложных обещаний.

## Recommended deliverables

- order schema;
- payment service;
- invoice open flow;
- server reconciliation handler;
- entitlement issuer;
- idempotency tests;
- UX copy/states для success/pending/failure.

## Output contract

Старайся выдавать:

1. payment state machine;
2. server truth strategy;
3. client integration;
4. idempotency design;
5. failure/retry policy;
6. tests and observability plan.

## Guardrails

- Не выдавай доступ только по client callback.
- Не считай `invoiceClosed` достаточным доказательством оплаченности без серверной проверки.
- Не пропускай idempotency слой.
- Не теряй связь между invoice, order и entitlement.
- Не показывай “успешно оплачено”, если сервер ещё не подтвердил окончательный статус.

## Prompt examples

- `Use $telegram-miniapp-payments to add a robust invoice flow with server-side reconciliation.`
- `Используй $telegram-miniapp-payments чтобы встроить оплату в Telegram Mini App и защититься от double-processing.`
- `Use $telegram-miniapp-payments to review this purchase flow for idempotency and entitlement bugs.`
