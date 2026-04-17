# Frontend Guide (Next.js + React)

## Принципы

- По умолчанию предпочитайте Server Components, но Telegram WebApp APIs доступны только на клиенте, поэтому `use client` границы должны быть локальными и явными.
- Держите компоненты “глупыми”: состояние и бизнес-правила живут в хуках/сервисах, а UI собирает готовые view-model props.
- Типы лежат в `app/types`, утилиты и нормализация — в `app/lib`.

## Frontend Contract

Текущий frontend развиваем по слоям. Новые фичи должны встраиваться в этот контракт, а не возвращать проект к большим screen-файлам.

### `app/components/planner/mobile/*` и `app/components/planner/desktop/*`

- Только shell/layout/adapters.
- Здесь допустимы platform-specific frame-решения: safe-area, keyboard inset, sheet/modal placement, tab bars, desktop sidebar, sticky headers.
- Shell может выбрать контейнер и собрать экран из shared-доменных блоков, но не должен руками дублировать поля формы, карточки задач или habit controls.

### `app/components/planner/shared/ui/*`

- Набор primitive controls и frame helpers: `Button`, `Dialog`, `BottomSheet`, `SurfaceCard`, `FieldLabel`, `ModalHeader`, `useFrameFocusScope`.
- Компоненты здесь не знают про задачи, привычки, лимиты целей или planner state.
- Если блок можно переиспользовать вне конкретного домена, он должен жить здесь.
- Для frame primitives действует единый close contract: `Escape`, backdrop click и drag-dismiss идут в `onRequestClose`, если у контейнера есть вложенный confirm/guard слой.
- `onRequestClose` должен сначала закрыть внутренний guard/confirm, а не весь `Dialog`/`BottomSheet`.
- `onClose` — финальный путь закрытия frame после того, как interception logic больше не нужна.

### `app/components/planner/shared/task/*` и `app/components/planner/shared/habit/*`

- Доменный composition layer.
- Здесь живут переиспользуемые карточки, формы, секции форм и специализированные контролы для задач/привычек.
- Mobile/desktop экраны импортируют эти блоки и передают им данные, а не повторяют JSX вручную.

## Формы и валидация

- Новые формы собираются из shared fields/sections, а не пишутся inline в `mobile/*`, `desktop/*` или больших screen-компонентах.
- Если поле/секция нужны и для create, и для edit, или встречаются в нескольких контейнерах, выносите их в `planner/shared/task/*` или `planner/shared/habit/*`.
- Если блок универсален и не зависит от домена, выносите его в `planner/shared/ui/*`.
- UI-валидация должна быть мгновенной; серверная и финальная защита остаются в Postgres constraints/RLS.
- Правила нормализации и парсинга держите рядом с доменной логикой (`app/lib/*utils`, `constants`, validators), а не размазывайте по JSX.

### Контракт полей

- У каждого `input`/`textarea`/`select` должна быть видимая label.
- Placeholder — только подсказка формата или примера, но не замена label.
- Для новых форм используйте shared label/field abstractions (`FieldLabel` или доменные field-компоненты), чтобы подписи, интервалы и a11y были единообразны.

### Контракт shell/frame

- Platform-specific keyboard и safe-area handling живут в frame/shell слое.
- Shared формы не должны сами вычислять `visualViewport`, Telegram safe-area переменные или platform offset.
- Допустим только явно проброшенный layout variant вроде `isDesktop`, если меняется раскладка секций, а не поведение платформы.
- Если внутри frame есть confirm/unsaved-changes guard, shell или контейнер должен пробросить interception через `onRequestClose`, а не вызывать финальный `onClose` напрямую из backdrop/Escape/drag-dismiss.

## Accessibility (a11y)

- Диалоги: `role="dialog"`, `aria-modal="true"`, фокус-трап, ESC/close behavior.
- Кнопки без текста обязаны иметь `aria-label`.
- `aria-current="date"` для выбранной даты, списки размечайте семантически там, где это даёт пользу.
- Любая новая анимация обязана уважать `prefers-reduced-motion`.

## Анимации и motion

- Framer Motion используйте точечно: list animations через `AnimatePresence` и `layout`, без тяжёлых постоянных эффектов.
- Для `Reorder` держите `layout="position"` на `Reorder.Item` и tween-transition.
- Не используйте `layoutScroll/layoutRoot` и `transformTemplate` в скроллируемых списках.
- Не анимируйте `scale/zIndex/box-shadow` на элементах списка во время reorder.
- Эффекты вроде glow/wave держите в абсолютных слоях, чтобы не менять layout карточки.
- Избегайте `height: auto` анимаций; для раскрывающихся секций используйте измерение высоты.

## Клавиатура и viewport (Telegram/iOS)

- Используем нативный ресайз контента: `interactiveWidget: 'resizes-content'` в `app/layout.tsx`.
- Модалки и шиты строим от вьюпорта: `fixed inset-0`, без ручной геометрии на каждое состояние клавиатуры.
- Не перезаписывайте Telegram CSS-переменные `--tg-viewport-*`.
- Любые iOS keyboard fixes остаются в mobile shell/wrapper, а не в shared form/UI.

## Производительность

- Крупные derived structures мемоизируйте по стабильным ключам.
- Чистите realtime-подписки при смене `userId` и на unmount.
- `useCallback` и прочие микрооптимизации применяйте только там, где это реально снижает re-render churn.

## Даты и форматирование

- `date` в БД — календарный день без времени.
- В UI используем `date-fns` и локаль `ru`.
- Сравнение дат — через `isSameDay`, строковые ключи — через `yyyy-MM-dd`.
- Если появится время, добавляйте отдельное `timestamptz` поле, не ломая текущую календарную модель.

## Структура файлов

- `app/components/PlannerApp.tsx` — только platform router.
- `app/components/planner/mobile/*` — mobile shell/adapters.
- `app/components/planner/desktop/*` — desktop shell/adapters.
- `app/components/planner/shared/ui/*` — primitive reusable controls.
- `app/components/planner/shared/task/*` — task-specific composable blocks.
- `app/components/planner/shared/habit/*` — habit-specific composable blocks.
- `app/hooks/` — orchestration/state/hooks.
- `app/lib/` — utils/config/clients.
- `app/types/` — доменные типы.

Если появятся более сложные сценарии:

- `app/services/` — операции с Supabase/API.
- `app/validators/` — схемы валидации и shared form rules.
