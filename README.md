# Telegram Planner — Mini App

A full-featured productivity Telegram Mini App: tasks with subtasks and recurrence, habits with streaks, Pomodoro timer with statistics, and bot reminders — all skinned to Telegram's native theme.

## Features

- **Tasks** — subtasks, priorities, due dates, recurrence rules, drag-and-drop reorder
- **Habits** — daily/weekly schedules, streak tracking, confetti on completion
- **Pomodoro** — configurable sessions, break timer, per-day statistics
- **Bot reminders** — scheduled push via Telegram bot, idempotent delivery
- **Telegram-native UI** — theme tokens, safe-area, MainButton / BackButton, swipe-to-close

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, standalone output) |
| Database | Supabase (Postgres + RLS + Realtime) |
| Data fetching | TanStack Query v5 |
| Animation | Framer Motion |
| Styling | Tailwind CSS v4 |
| Validation | Zod |
| Tests | Vitest + Testing Library |

## Security & architecture highlights

- Server-side HMAC validation of `initData` with anti-replay (`auth_date` window check) — client never touches auth secrets
- Row-Level Security on every table keyed by `telegram_id`; no shared-secret bypass possible
- Bot reminders are idempotent — duplicate bot events never double-send
- 64-bit Telegram IDs stored as `bigint` throughout; no silent truncation

See [`docs/`](docs/) for the full picture:

| Doc | Contents |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System diagram, layers, data flow |
| [AUTH_TELEGRAM.md](docs/AUTH_TELEGRAM.md) | initData validation, session issuance |
| [DATA_MODEL_SUPABASE.md](docs/DATA_MODEL_SUPABASE.md) | Schema, RLS policies |
| [STATE_REALTIME.md](docs/STATE_REALTIME.md) | TanStack Query + Supabase Realtime |
| [SECURITY_PRIVACY.md](docs/SECURITY_PRIVACY.md) | Threat model, trust boundaries |
| [DEPLOY_VPS.md](docs/DEPLOY_VPS.md) | VPS deployment (Docker, nginx, systemd) |
| [FRONTEND_GUIDE.md](docs/FRONTEND_GUIDE.md) | Component conventions, theming |
| [TESTING_QA.md](docs/TESTING_QA.md) | Test strategy, smoke checklist |

## Setup

```bash
cp .env.example .env.local   # fill in Supabase + bot token vars
npm ci
npm run dev
```

Open `http://localhost:3000` — for the Telegram runtime pass `?initData=...` or run inside BotFather's test env.

For production deployment see [docs/DEPLOY_VPS.md](docs/DEPLOY_VPS.md) (Next.js standalone + nginx reverse proxy).

## AI / Codex skills

The Codex skills used to build this project are published as a standalone package:
[**bunchtrail/telegram-miniapp-codex-skills**](https://github.com/bunchtrail/telegram-miniapp-codex-skills) — reusable skills for Telegram Mini App development (architecture, auth, UI shell, bot integration, payments, native APIs, debug/QA).
