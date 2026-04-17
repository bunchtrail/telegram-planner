# Telegram Mini Apps project guidance

Этот репозиторий использует Codex для разработки **Telegram Mini Apps / Web Apps**.

## Базовые правила

- Сначала определяй **launch surface**: keyboard button, inline button, main mini app, direct link, attachment menu или inline mode.
- Для авторизации доверяй только данным, полученным после серверной валидации `Telegram.WebApp.initData`.
- Никогда не считай `initDataUnsafe` источником истины для auth, ролей, платежей или entitlement-логики.
- Любой UI должен быть:
  - mobile-first,
  - theme-aware,
  - safe-area-aware,
  - устойчивым к изменению viewport и reopen/minimize сценариям.
- Любой Telegram runtime feature используй только после capability/version checks.
- Если в задаче есть:
  - архитектура или scaffolding — используй `telegram-miniapp-architecture`;
  - UI shell / theme / buttons / layout — используй `telegram-miniapp-ui-shell`;
  - auth / session / `initData` — используй `telegram-miniapp-auth-session`;
  - bot flows / кнопки / deep links / query_id — используй `telegram-miniapp-bot-integration`;
  - invoices / платежи — используй `telegram-miniapp-payments`;
  - fullscreen / QR / location / clipboard / biometrics / downloads — используй `telegram-miniapp-native-capabilities`;
  - баги / регрессии / pre-release — используй `telegram-miniapp-debug-qa`.
- После значимых изменений оставляй короткий smoke checklist:
  - launch,
  - auth,
  - theme change,
  - viewport/safe area,
  - Main/Back/Secondary button,
  - close/reopen,
  - error states.

## Стиль реализации

- Предпочитай небольшие, переиспользуемые обёртки над `Telegram.WebApp`, а не размазывание прямых вызовов по всему UI.
- Держи launch-specific логику в одном месте, чтобы было видно, где используется `sendData`, `query_id`, `answerWebAppQuery`, `startapp` и другие transport-specific ветки.
- Для долгих операций показывай пользователю явный прогресс.
- Для серверной логики делай проверяемые, идемпотентные flows.
