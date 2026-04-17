# Testing & QA

Сейчас в проекте нет тестового стека. Ниже — рекомендованный минимум, чтобы развитие было безопасным.

## Рекомендуемый стек

- Unit/Component: Vitest + React Testing Library
- E2E: Playwright
- Линт: ESLint (уже есть)
- (Опционально) Type-level tests: `tsd` для публичных типов/утилит

## Что тестировать в первую очередь (высокая отдача)

### 1) usePlanner: бизнес-правила

- группировка целей по периодам
- добавление целей без лимита слотов
- расчёт `hours/minutes` по незавершенным
- корректный rollback при ошибках Supabase
- защита от гонок toggle (requestId)

### 2) Auth route

- missing env → 500
- invalid initData → 401
- stale auth_date → 401
- happy path → выдаётся token и user.id

### 3) UI критические сценарии

- AddTaskSheet:
  - фокус внутри
  - ESC закрывает
  - сабмит пустого названия показывает ошибку
- PlannerApp router:
  - `platform=mobile` монтирует mobile shell
  - `platform=desktop` монтирует desktop shell
- usePlannerUiController:
  - create/edit sheet flow общий для обоих shell-ов
  - delete/undo работает без дублирования по layout-ам
- WeekStrip/MonthGrid:
  - выбранная дата помечена aria-атрибутами
  - смена даты вызывает selection haptic (можно мокать)

## QA чеклист (ручной)

- На iOS:
  - клавиатура не перекрывает sheet
  - нет скачка layout при открытии/закрытии
- Safe-area:
  - FAB не “уползает” под системные элементы
- На desktop:
  - рендерится desktop shell, а не mobile layout с условными ветками
  - create/edit/delete/undo проходят без regressions
- Realtime:
  - изменения на другом устройстве приходят без дублей
- Offline/плохая сеть:
  - toggle откатывается при ошибке
  - delete откатывается при ошибке
- Reduce motion:
  - включить “уменьшить движение” → анимации исчезают

## Регрессии дат

- Переключение недели/месяца корректно
- Задачи отображаются в правильном дне
- `taskDates` корректно подсвечивает дни в MonthGrid
