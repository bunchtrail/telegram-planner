# Деплой telegram-planner на VPS (systemd + Cloudflare Tunnel)

Документ описывает, как развернуть приложение на самостоятельном Linux-сервере
(Ubuntu 22.04 / 24.04), не задействуя ни Vercel, ни внешний reverse-proxy на
порту 443. Публичный HTTPS-доступ обеспечивается через **Cloudflare Tunnel** —
домен и валидный TLS-сертификат настраиваются на стороне Cloudflare,
сервер не должен принимать входящий трафик на 443.

Альтернативный вариант с Docker есть в конце документа.

---

## 0. Требования к серверу

| Параметр | Минимум |
|---|---|
| ОС | Ubuntu 22.04+ / Debian 12+ |
| RAM | 1 ГБ (рекомендуется 2 ГБ) |
| Диск | 3 ГБ свободно |
| Node.js | **20.x LTS** (Next.js 16 требует Node 20+) |
| Доступ | sudo, исходящий HTTPS наружу |

Пакеты в системе: `git`, `curl`, `ca-certificates`, `build-essential`.

---

## 1. Установка Node.js 20 и cloudflared

```bash
# Node.js 20 LTS (через NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs

# cloudflared (официальный репозиторий Cloudflare)
sudo mkdir -p /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
  | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" \
  | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt-get update
sudo apt-get install -y cloudflared

node -v        # v20.x
cloudflared -v # 2024+
```

---

## 2. Клонирование репозитория и переменные окружения

```bash
mkdir -p ~/apps && cd ~/apps
git clone https://github.com/bunchtrail/telegram-planner.git
cd telegram-planner

# Скопировать шаблон и заполнить реальными значениями
cp .env.example .env.local
chmod 600 .env.local
$EDITOR .env.local
```

Обязательные переменные (см. также [`docs/DEPLOYMENT_OPERATIONS.md`](./DEPLOYMENT_OPERATIONS.md)):

| Переменная | Где взять |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_JWT_SECRET` | Supabase → Project Settings → API → JWT Settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |
| `TELEGRAM_BOT_TOKEN` | @BotFather |
| `REMINDERS_RUN_SECRET` | `openssl rand -hex 32` |

> Файл `.env.local` хранит секреты и **не должен попадать в git** (он уже в
> `.gitignore`). Права `0600`, владелец — пользователь, под которым запущен
> сервис (`devin:devin` в этом гайде).

---

## 3. Сборка приложения

```bash
cd ~/apps/telegram-planner
npm ci --no-audit --no-fund
npm run lint
npm run build
```

`next.config.ts` использует `output: "standalone"`, поэтому после сборки
итоговый минимальный сервер лежит в `.next/standalone/server.js`, а статика —
в `.next/static/` (она автоматически подмонтируется относительными путями).

Быстрая проверка:

```bash
PORT=3000 HOSTNAME=127.0.0.1 \
  node --env-file=.env.local .next/standalone/server.js &
curl -sS -I http://127.0.0.1:3000/ | head -1   # ожидаем 200 OK
kill %1
```

---

## 4. systemd unit: `telegram-planner.service`

В репозитории лежит готовый шаблон [`deploy/telegram-planner.service`](../deploy/telegram-planner.service).
Подгоните в нём пути / имя пользователя, если у вас отличается от `devin`,
затем установите:

```bash
sudo install -m 0644 \
  ~/apps/telegram-planner/deploy/telegram-planner.service \
  /etc/systemd/system/telegram-planner.service

sudo systemctl daemon-reload
sudo systemctl enable --now telegram-planner.service
sudo systemctl status telegram-planner.service --no-pager
sudo journalctl -u telegram-planner -n 50 --no-pager
```

Проверка изнутри VPS:

```bash
curl -sS -I http://127.0.0.1:3000/ | head -1
```

Сервис слушает `127.0.0.1:3000` — наружу никаких портов не открываем,
наружный трафик пойдёт через Cloudflare Tunnel.

---

## 5. Cloudflare Tunnel

### 5.1. Один раз: войти в Cloudflare

```bash
cloudflared tunnel login
```

Команда печатает URL — откройте его в браузере, авторизуйтесь и выберите зону
(домен), к которой будет привязан тоннель. Cloudflare скачает на сервер файл
`~/.cloudflared/cert.pem`.

### 5.2. Создать именованный тоннель

```bash
cloudflared tunnel create telegram-planner
# Будет создан ~/.cloudflared/<TUNNEL_ID>.json с приватным ключом.
# Запомните <TUNNEL_ID>.
```

### 5.3. Маршрут DNS → тоннель

```bash
# Замените planner.example.com на ваш реальный хост в зоне Cloudflare.
cloudflared tunnel route dns telegram-planner planner.example.com
```

### 5.4. Конфиг тоннеля

```bash
cat > ~/.cloudflared/config.yml <<'YAML'
tunnel: telegram-planner
credentials-file: /home/devin/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: planner.example.com
    service: http://127.0.0.1:3000
    originRequest:
      connectTimeout: 30s
      noTLSVerify: false
  - service: http_status:404
YAML
```

Поправьте `credentials-file`, `tunnel` (id или имя) и `hostname`.

### 5.5. systemd unit для тоннеля

В репозитории лежит шаблон [`deploy/cloudflared-telegram-planner.service`](../deploy/cloudflared-telegram-planner.service):

```bash
sudo install -m 0644 \
  ~/apps/telegram-planner/deploy/cloudflared-telegram-planner.service \
  /etc/systemd/system/cloudflared-telegram-planner.service

sudo systemctl daemon-reload
sudo systemctl enable --now cloudflared-telegram-planner.service
sudo systemctl status cloudflared-telegram-planner.service --no-pager
sudo journalctl -u cloudflared-telegram-planner -n 30 --no-pager
```

Проверка:

```bash
curl -sS -I https://planner.example.com/ | head -1   # 200 OK через HTTPS
```

### 5.6. Quick Tunnel (если нет своего домена)

Удобный fallback без аккаунта Cloudflare — URL вида
`https://<random>.trycloudflare.com`. **Внимание:** URL новый при каждом
старте процесса, поэтому подходит для смоук-тестов и временного хостинга,
но не для прод-режима с фиксированной ссылкой в BotFather.

Разовый запуск в терминале:

```bash
cloudflared tunnel --url http://127.0.0.1:3000
# В логах появится https://<random>.trycloudflare.com
```

Постоянный systemd-сервис (готовый unit лежит в репозитории
[`deploy/cloudflared-telegram-planner-quick.service`](../deploy/cloudflared-telegram-planner-quick.service)):

```bash
sudo install -m 0644 deploy/cloudflared-telegram-planner-quick.service \
  /etc/systemd/system/cloudflared-telegram-planner-quick.service
sudo systemctl daemon-reload
sudo systemctl enable --now cloudflared-telegram-planner-quick.service

# Получить актуальный URL после старта
sudo journalctl -u cloudflared-telegram-planner-quick --no-pager \
  | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1
```

После каждого `systemctl restart` URL меняется — не забудьте обновить
WebApp URL в BotFather или через `setChatMenuButton` Bot API.

---

## 6. Привязка к Telegram Mini App

1. Откройте [@BotFather](https://t.me/BotFather) → ваш бот → **Bot Settings** →
   **Menu Button** или **Configure Mini App**.
2. Установите URL приложения: `https://planner.example.com/` (или Quick Tunnel
   URL).
3. Опционально: `/setdomain` → `planner.example.com` — нужно, если планируете
   использовать Telegram Login Widget вне Mini App.

> ⚠️ Telegram **не загрузит** Mini App, если у URL нет валидного TLS-серта.
> Cloudflare Tunnel выдаёт сертификат автоматически.

---

## 7. Cron для напоминаний (опционально)

`/api/reminders/run` — серверный обработчик, который надо вызывать по cron.
Простейший вариант — `cron` на самом VPS:

```bash
sudo tee /etc/cron.d/telegram-planner-reminders >/dev/null <<'CRON'
# Каждую минуту дёргать reminders runner.
# Секрет — в /etc/telegram-planner/reminders.secret (chmod 0600 root:root).
* * * * * devin curl -sS -X POST \
  -H "x-reminders-secret: $(cat /etc/telegram-planner/reminders.secret)" \
  http://127.0.0.1:3000/api/reminders/run \
  >>/var/log/telegram-planner-reminders.log 2>&1
CRON
```

Положите `REMINDERS_RUN_SECRET` в `/etc/telegram-planner/reminders.secret`
(тот же, что в `.env.local`), и не забудьте `chmod 0600`.

---

## 8. Обновление и откат

```bash
cd ~/apps/telegram-planner
git fetch origin
git checkout main
git pull --ff-only
npm ci --no-audit --no-fund
npm run build
sudo systemctl restart telegram-planner.service
sudo journalctl -u telegram-planner -n 50 --no-pager
```

Откат — `git checkout <prev_commit>` + `npm ci && npm run build && systemctl
restart`.

---

## 9. Альтернатива: Docker

Если предпочитаете контейнер, в репозитории лежит [`Dockerfile`](../Dockerfile)
для standalone-сборки:

```bash
docker build -t telegram-planner:latest .

# .env-файл для docker (тот же формат, что .env.local)
sudo install -d -m 0700 /etc/telegram-planner
sudo cp ~/apps/telegram-planner/.env.local /etc/telegram-planner/env
sudo chmod 0600 /etc/telegram-planner/env

docker run -d --name telegram-planner \
  --restart=always \
  -p 127.0.0.1:3000:3000 \
  --env-file /etc/telegram-planner/env \
  telegram-planner:latest

docker logs -f telegram-planner
```

Cloudflare Tunnel в этом сценарии настраивается точно так же —
он смотрит на `http://127.0.0.1:3000`.

---

## 10. Диагностика

| Симптом | Проверьте |
|---|---|
| `systemctl status` → exit code 1 | `journalctl -u telegram-planner -n 200` — обычно отсутствует переменная окружения или `.next/standalone/server.js` не собрался (`npm run build`) |
| `curl 127.0.0.1:3000` → 500 | Логи приложения: чаще всего неверный `SUPABASE_JWT_SECRET` или `SUPABASE_SERVICE_ROLE_KEY` |
| Telegram не открывает Mini App | Проверьте, что URL точно HTTPS, без редиректов, и что Cloudflare-зона активна (`cloudflared tunnel info <name>`) |
| `cloudflared` крутится, но `curl` через домен 502/530 | Сервис `telegram-planner` упал, либо порт в `config.yml` отличается от `PORT` сервиса |
| `auth/telegram` возвращает 401 | `TELEGRAM_BOT_TOKEN` не совпадает с ботом, чей initData отправляется |
