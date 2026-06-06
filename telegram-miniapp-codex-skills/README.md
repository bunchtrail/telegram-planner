# telegram-miniapp-codex-skills

Seven reusable Codex skills that encode production knowledge for **Telegram Mini Apps** — so you spend prompts on your product, not on re-explaining Telegram's runtime quirks every time.

> Covers the full stack: architecture choices, Telegram UI shell, server-side auth, bot integration, payments, native APIs, and debug/QA.

## Contents

| Skill | What it covers |
|---|---|
| `telegram-miniapp-architecture` | Launch surface selection, repo shape, env plan, scaffold |
| `telegram-miniapp-ui-shell` | Theme tokens, viewport, safe-area, MainButton/BackButton, lifecycle |
| `telegram-miniapp-auth-session` | Server-side `initData` HMAC validation, session issuance, user mapping |
| `telegram-miniapp-bot-integration` | Bot commands, inline buttons, deep links, `sendData`, `answerWebAppQuery` |
| `telegram-miniapp-payments` | Invoice flow, idempotency, payment status, error handling |
| `telegram-miniapp-native-capabilities` | Fullscreen, QR, clipboard, location, biometrics, downloads, device storage |
| `telegram-miniapp-debug-qa` | Debugging, bug reproduction, regression checklist, pre-release checklist |

## Requirements

- **OpenAI Codex** (CLI) or any agent runtime that supports the `AGENTS.md` + `.agents/skills/` convention
- A project with an `AGENTS.md` in the root (you can copy the one from this repo as-is)
- Node / Python / any backend — skills are stack-agnostic; they output strategy + code patterns, not locked-in boilerplate

## Quick start

```bash
# 1. Copy AGENTS.md into your project root
cp AGENTS.md /path/to/your-project/

# 2. Copy the skills directory alongside it
cp -r .agents /path/to/your-project/

# 3. Call a skill from Codex
codex "Use $telegram-miniapp-auth-session to implement server-side initData validation in Node.js"
```

That's it. Codex picks up the skill context automatically.

## How to invoke skills

**Explicit** (always works):

```
Use $telegram-miniapp-architecture to scaffold a Telegram Mini App with React and Fastify.
Используй $telegram-miniapp-ui-shell чтобы привести UI к Telegram Mini App runtime.
Use $telegram-miniapp-auth-session to review this auth flow for replay and trust-boundary issues.
```

**Implicit** (Codex matches by description):

Just describe the task — Codex selects the relevant skill automatically when the description matches.

## Example outputs

See [`examples/`](examples/) for sample prompts and the kind of output each skill produces.

## Project structure

After installation your repo looks like this:

```
your-project/
├─ AGENTS.md               ← copied from this repo
├─ .agents/
│  └─ skills/
│     ├─ telegram-miniapp-architecture/
│     ├─ telegram-miniapp-ui-shell/
│     ├─ telegram-miniapp-auth-session/
│     ├─ telegram-miniapp-bot-integration/
│     ├─ telegram-miniapp-payments/
│     ├─ telegram-miniapp-native-capabilities/
│     └─ telegram-miniapp-debug-qa/
├─ apps/                   ← your code
│  ├─ web/
│  ├─ bot/
│  └─ api/
└─ ...
```

For monorepos you can keep the skills in the root and add local skills deeper in the tree for module-specific rules.

## Contributing

Issues and PRs welcome. If you add a skill, follow the existing `SKILL.md` structure: frontmatter `name` + `description`, then Overview → Non-negotiable rules → Workflow → Output contract → Guardrails → Prompt examples.

## License

MIT — see [LICENSE](LICENSE).
