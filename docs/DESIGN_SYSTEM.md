# Design System & UX (Telegram Mini App)

## Дизайн-цели

- “Теплый” интерфейс, высокий контраст, мягкие поверхности.
- Управление одной рукой: крупные touch targets, плавающая кнопка.
- Быстрое ощущение прогресса: haptics + конфетти + micro-animations.

## Токены (CSS variables)

Источник: `app/globals.css`

### Правила

- Все новые цвета/тени — через CSS variables в `:root`.
- Не “вшивать” hex в компоненты (кроме редких исключений).
- Для тёмной темы — обязательно определить эквивалент.

### Семантика

- `--bg`, `--surface`, `--ink`, `--muted`, `--border`, `--accent`, `--danger`, `--shadow-*`
  Старайтесь добавлять именно семантические токены, а не “blue500”.

## Tailwind usage

- Tailwind используется как “layout engine”, но цвета — через `var(--...)`.
- Предпочитайте классы вида: `bg-[var(--surface)]`, `text-[var(--muted)]`.

## Motion и микроинтеракции

- Удаление/переключение — haptic + небольшая motion анимация.
- Списки — `AnimatePresence` + `layout` для приятной перестройки.
- Sheet:
  - drag-to-close
  - скролл внутри + body scroll lock
  - адаптация к клавиатуре (`visualViewport`)

## Telegram особенности

- Safe-area: используйте `max(env(safe-area-inset-<side>), var(--tg-content-safe-<side>, 0px))` для защиты от UI Telegram (контентный safe area).
- Haptics:
  - `selectionChanged()` — при выборе даты/шаге слайдера
  - `impactOccurred("light/medium")` — при переключении задач
  - `notificationOccurred("success/error/warning")` — результат действия

Best practice:

- Haptics не должны быть слишком частыми (не “дребезжать” на каждом пикселе).

## Компонентные стандарты UI

- Минимальный размер кликабельной зоны: 44x44 px (ориентир).
- Состояния:
  - `hover` (на десктопе), `active`, `focus-visible`, `disabled`.
- Контраст:
  - текст на `--accent` должен быть `--accent-ink`.

## Ошибки и пустые состояния

- Пустые состояния должны давать “следующий шаг” (как кнопка “Добавить задачу”).
- Ошибки — короткие, без технических подробностей, с возможным восстановлением.
