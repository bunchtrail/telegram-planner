# Example: telegram-miniapp-auth-session

## Prompt

```
Use $telegram-miniapp-auth-session to implement secure server-side validation
of Telegram WebApp initData in Node.js with Express and a PostgreSQL session store.
```

## What the skill produces

### Trust boundary diagram

```
Telegram Client (WebView)
  │  Telegram.WebApp.initData  (raw string, signed by Telegram)
  │
  ▼
POST /api/auth/telegram
  │  Body: { initData: "<raw string>" }
  │
  ▼
[Server: validate signature]
  │  1. Split initData into key=value pairs
  │  2. Remove "hash" field, sort remaining pairs alphabetically
  │  3. data_check_string = pairs.join("\n")
  │  4. secret_key = HMAC-SHA256("WebAppData", BOT_TOKEN)
  │  5. expected_hash = HMAC-SHA256(data_check_string, secret_key)
  │  6. Constant-time compare expected_hash vs received hash
  │  7. Check auth_date within MAX_AGE_SECONDS window (reject if stale)
  │
  ▼
[Server: map Telegram user → internal user]
  │  upsert users where telegram_id = parsed.user.id
  │
  ▼
[Server: issue session]
  │  Set-Cookie: session=<signed token>; HttpOnly; Secure; SameSite=Strict
  │
  ▼
Client receives session cookie — never sees bot token or HMAC secret
```

### Validation implementation (Node.js)

```ts
import crypto from "node:crypto";

const MAX_AGE_SECONDS = 3600; // 1 hour; make configurable per your threat model

export function validateInitData(
  rawInitData: string,
  botToken: string
): Record<string, string> {
  const params = new URLSearchParams(rawInitData);
  const receivedHash = params.get("hash");
  if (!receivedHash) throw new AuthError("missing_hash");

  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const expectedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  // Constant-time compare — prevents timing attacks
  if (
    !crypto.timingSafeEqual(
      Buffer.from(expectedHash, "hex"),
      Buffer.from(receivedHash, "hex")
    )
  ) {
    throw new AuthError("invalid_signature");
  }

  const authDate = Number(params.get("auth_date"));
  if (
    !authDate ||
    Date.now() / 1000 - authDate > MAX_AGE_SECONDS
  ) {
    throw new AuthError("stale_auth_date");
  }

  return Object.fromEntries(params.entries());
}
```

### Auth endpoint

```ts
app.post("/api/auth/telegram", async (req, res) => {
  const { initData } = req.body;
  if (typeof initData !== "string") return res.status(400).json({ error: "missing_init_data" });

  let validated: Record<string, string>;
  try {
    validated = validateInitData(initData, process.env.BOT_TOKEN!);
  } catch (e) {
    return res.status(401).json({ error: (e as AuthError).code });
  }

  const tgUser = JSON.parse(validated.user);
  // upsert internal user keyed on tgUser.id (store as bigint — IDs exceed 32-bit range)
  const user = await upsertUser({ telegramId: BigInt(tgUser.id), username: tgUser.username });

  req.session.userId = user.id;
  return res.json({ ok: true });
});
```

### Negative test vectors

```ts
describe("validateInitData", () => {
  it("rejects missing hash");
  it("rejects tampered payload (wrong hash)");
  it("rejects stale auth_date (> MAX_AGE_SECONDS ago)");
  it("rejects auth_date = 0");
  it("handles clock skew within tolerance");
  it("rejects replayed valid payload after session invalidation");
});
```

### Failure cases covered

| Case | Response |
|---|---|
| Missing `hash` | 401 `missing_hash` |
| Wrong `hash` | 401 `invalid_signature` |
| `auth_date` too old | 401 `stale_auth_date` |
| Malformed `user` JSON | 400 `malformed_payload` |
| Replay after session revocation | 401 `session_revoked` |

### Assumptions

- Bot token is stored in server env only; never exposed to client bundle
- `auth_date` window is tunable — default 3600 s is conservative for most apps
- Telegram IDs are stored as `bigint` / `int8` — JavaScript `number` silently truncates IDs above 2^53
