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

## Слои UI

### `planner/shared/ui/*` — primitives

- Это единая база визуальных контролов и frame helpers.
- Кнопки, surface wrappers, dialog/sheet контейнеры, заголовки модалок и field labels должны переиспользоваться, а не копироваться по доменным экранам.
- Если новая сущность нужна не только задачам или привычкам, начинайте с этого слоя.

### `planner/shared/task/*` и `planner/shared/habit/*` — domain composition

- Карточки, формы и секции форм собираются здесь из primitives и доменных утилит.
- Экран не должен заново описывать одинаковую раскладку title/duration/color/repeat или habit name/icon/color.
- Новые формы и редакторы расширяем через shared sections, а не через inline JSX в shell-файлах.

### `planner/mobile/*` и `planner/desktop/*` — frame/layout

- Эти файлы отвечают за размещение shared-блоков в конкретной оболочке: bottom tabs, sidebars, sheet width, sticky panels, safe-area padding.
- Здесь допустима platform-specific геометрия, но не дублирование примитивов и доменных form blocks.

## Motion и микроинтеракции

- Удаление/переключение — haptic + небольшая motion анимация.
- Списки — `AnimatePresence` + `layout` для приятной перестройки.
- Sheet:
  - drag-to-close
  - скролл внутри + body scroll lock
  - адаптация к клавиатуре (`visualViewport`)

## Telegram особенности

- Safe-area: используйте `max(env(safe-area-inset-<side>), var(--tg-content-safe-<side>, 0px))` для защиты от UI Telegram (контентный safe area).
- Keyboard/safe-area компенсации держите в shell/frame-слое. Shared controls и domain forms не должны сами знать про Telegram viewport offsets.
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

## Формы

- У каждого поля должна быть видимая подпись. Placeholder используется только как дополнительная подсказка, а не как единственный label.
- Для подписей и отступов используйте shared form primitives (`FieldLabel`) или доменные field-компоненты, а не произвольную разметку в каждом экране.
- Shell решает, где форма живёт: в `BottomSheet`, `Dialog`, inline card или desktop panel.
- Shared form отвечает за консистентную структуру секций, локальную валидацию и доступность, но не за platform-specific keyboard hacks.

## Ошибки и пустые состояния

- Пустые состояния должны давать “следующий шаг” (как кнопка “Добавить задачу”).
- Ошибки — короткие, без технических подробностей, с возможным восстановлением.
