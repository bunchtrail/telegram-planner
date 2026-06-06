# Example: telegram-miniapp-architecture

## Prompt

```
Use $telegram-miniapp-architecture to scaffold a Telegram Mini App for a task manager:
users open it from the bot's main button, manage tasks with deadlines, and get reminders
via bot messages. Stack: Next.js + Supabase + grammY.
```

## What the skill produces

### Chosen launch surface

**Main Mini App** — user taps the bot's keyboard button to open the full app. No `sendData` needed; all data flows through the backend API. Deep links via `startapp` parameter for reminder notifications (bot sends link → user taps → app opens to specific task).

Secondary: **Inline button** for sharing a task card into a chat.

### Repository shape

```
repo/
├─ AGENTS.md
├─ .agents/skills/
├─ apps/
│  ├─ web/           # Next.js Mini App (App Router, standalone output)
│  ├─ bot/           # grammY bot process
│  └─ api/           # (optional) shared API routes if split from web
├─ packages/
│  └─ shared/        # Zod schemas, Telegram types, date utils
├─ supabase/
│  ├─ migrations/
│  └─ seed.sql
└─ deploy/
   └─ docker-compose.yml
```

### Runtime boundaries

| Where | What runs there |
|---|---|
| Telegram WebView | Next.js SPA; reads `Telegram.WebApp.initData`; calls backend API |
| Next.js API routes | `initData` validation, session issuance, CRUD, reminder scheduling |
| Supabase | Postgres with RLS by `telegram_id`; Realtime for live task updates |
| grammY bot process | Webhook handler; sends reminders; processes `/start?startapp=<taskId>` |

### Env / secrets checklist

```
# Server-only
SUPABASE_SERVICE_ROLE_KEY=
BOT_TOKEN=
SESSION_SECRET=
REMINDER_CRON_SECRET=

# Shared (safe to expose in Next.js public config)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_BOT_USERNAME=

# Infra
DATABASE_URL=
WEBHOOK_BASE_URL=
```

### First scaffold plan

```
apps/web/
  app/
    layout.tsx          ← TelegramProvider (bootstrap + ready())
    page.tsx            ← TaskList
    tasks/[id]/page.tsx ← TaskDetail
  lib/
    telegram.ts         ← wrapper over window.Telegram.WebApp
    supabase.ts         ← browser client
  api/
    auth/telegram/      ← POST: validate initData, issue session
    tasks/              ← CRUD + RLS enforced via service role
  hooks/
    useTelegramTheme.ts
    useSafeArea.ts

apps/bot/
  index.ts              ← grammY webhook entry
  commands/start.ts     ← parse startapp, send task deep link
  reminders/scheduler.ts← cron that queries due tasks + bot.sendMessage

packages/shared/
  schemas/task.ts       ← Zod Task schema used by web + bot
  telegram-types.ts     ← InitData, TelegramUser (with bigint IDs)
```

### Phase 1 acceptance criteria

- [ ] App opens from bot keyboard button; no blank screen on first load
- [ ] `initData` validation passes on server; tampered payloads rejected with 401
- [ ] Tasks CRUD works; RLS prevents cross-user data access
- [ ] Bot sends reminder message; tapping link opens app to correct task
- [ ] Theme tokens applied; app matches Telegram dark/light mode
- [ ] App survives close → reopen without broken state

### Known risks / assumptions

- Supabase Realtime latency may spike on free tier — add optimistic updates in TanStack Query
- grammY webhook requires HTTPS with valid cert; use nginx + Let's Encrypt in prod
- `startapp` deep link parameter has 64-char limit — use task ID, not full title
