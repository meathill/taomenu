# TaoMenu 部署指南（Cloudflare）

目标：把 monorepo 两个 OpenNext Worker 部署到 Cloudflare，并接通 **D1**、**Email Sending**、**Web Push VAPID**。

## 架构

| Worker | 包 | 职责 |
|---|---|---|
| `taomenu-website` | `apps/website` | 营销站 / SEO |
| `taomenu-app` | `apps/app` | PWA、Auth、API、Push、业务 |

生产域名：

- `https://menu.dyqr.me` → website（营销站）  
- `https://app.menu.dyqr.me` → app（PWA / API）  
- 发信域名：`dyqr.me`（如 `noreply@dyqr.me`）  
- 本地：website `:3000`，app `:3001`

**URL 一律无尾斜杠**。

## 环境变量约定

### 读取规则（强制）

| 变量类型 | 代码怎么读 | 不要 |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_WEBSITE_URL` | **`process.env.NEXT_PUBLIC_*`**（见 `public-url.ts` / `site.ts`） | `getCloudflareContext().env.NEXT_PUBLIC_*` |
| `BETTER_AUTH_URL` | **`process.env.BETTER_AUTH_URL`**（Auth baseURL） | 写死域名 |
| DB / EMAIL / MEDIA 等 binding、密钥 | `getCloudflareContext().env`（`getEnv()`） | 放进 `NEXT_PUBLIC_*` |

`NEXT_PUBLIC_*` 在 **构建时** 内联到客户端；运行时也依赖 `process.env`（`nodejs_compat` 会把 wrangler vars 灌进 process.env）。  
`pnpm deploy` / `build` 会经 `scripts/run-with-wrangler-vars.mjs` 把当前包 `wrangler.jsonc` 的 `vars` 注入构建环境（**不覆盖** shell / `.env.production` 已有值）。

### 可以进客户端的（`NEXT_PUBLIC_*`）

| 变量 | 用途 |
|---|---|
| `NEXT_PUBLIC_APP_URL` | app 绝对 URL（营销站 CTA、Better Auth 回退基址等） |
| `NEXT_PUBLIC_WEBSITE_URL` | 营销站绝对 URL（sitemap、robots） |

只放**非密钥**、可公开的配置。浏览器包体会内嵌这些值。

### 放 wrangler `vars`（非密钥）

| 变量 | 用途 |
|---|---|
| `BETTER_AUTH_URL` | Better Auth `baseURL`（通常等于当前 app 公网 URL） |
| `EMAIL_FROM` | 发件地址（**域名须已** Cloudflare Email Sending enable；生产 `noreply@dyqr.me`） |
| `EMAIL_FROM_NAME` | 发件显示名，默认 `TaoMenu` |
| `VAPID_PUBLIC_KEY` | Web Push 公钥（经 API 下发到终端，不是密钥） |
| `VAPID_SUBJECT` | VAPID contact，如 `mailto:ops@dyqr.me` |
| `GOOGLE_CLIENT_ID` | Google OAuth 客户端 ID（可公开） |
| `STRIPE_STAFF_SEAT_PRICE_ID` | 一个额外 Staff 席位的 recurring Price ID |
| `NEXT_PUBLIC_*` | 同上；生产为 `menu.dyqr.me` / `app.menu.dyqr.me` |

### 必须 `wrangler secret` / `.dev.vars`（密钥，禁止提交）

| 密钥 | 用途 |
|---|---|
| `BETTER_AUTH_SECRET` | Auth 签名密钥（足够长的随机串） |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret（可选） |
| `VAPID_PRIVATE_JWK` | Web Push 私钥 JWK JSON 字符串 |
| `CRON_SECRET` | 可选，保护 `POST /api/internal/process-outbox` |
| `STRIPE_SECRET_KEY` | Stripe 服务端 Restricted API Key（建议 `rk_`，仅支付 API） |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook 签名密钥 |

### Cloudflare Bindings（不是 env 字符串）

| Binding | 配置位置 | 用途 |
|---|---|---|
| `DB` | `d1_databases` | 业务库 |
| `EMAIL` | `send_email` | Cloudflare Email Sending |
| `MEDIA` | `r2_buckets` | 菜品图片等媒体（bucket: `taomenu-media`） |
| `ASSETS` | OpenNext 静态资源 | 自动 |
| `WORKER_SELF_REFERENCE` | `services` | OpenNext 自引用 |

**不要**把 binding 写成 `NEXT_PUBLIC_`。  
**不要**提交 `.dev.vars`、`.env`、真实 `database_id` 以外的密钥文件。

### 类型生成（强制）

`cloudflare-env.d.ts` / `worker-configuration.d.ts` **不入库**，由构建生成：

```bash
pnpm --filter @taomenu/app cf-typegen
pnpm --filter @taomenu/website cf-typegen
```

`typecheck` / `build` / `deploy` 脚本已内嵌 `cf-typegen`。  
可选密钥通过 `apps/*/types/env-augment.d.ts` 与生成类型 **interface 合并**，不手写 `EMAIL`/`DB` 形状。

---

## 一次性准备

### 1. 账号与工具

- Node ≥ 24、pnpm 11  
- 已登录：`npx wrangler login`  
- 域名 `dyqr.me` 在 Cloudflare；绑定 `menu.dyqr.me` / `app.menu.dyqr.me`

### 2. D1（必做，否则 OTP / 登录会 500）

**只 create 数据库不够**：远程 D1 必须跑 migration，否则没有 `user` / `verification` 等表，  
`send-verification-otp` 会在 `createVerificationValue` 阶段炸（看起来像邮件失败）。

```bash
cd apps/app
npx wrangler d1 create taomenu
# 把输出的 database_id 写入 wrangler.jsonc → d1_databases[0].database_id
pnpm --filter @taomenu/app db:migrate:remote
# 或：npx wrangler d1 migrations apply taomenu --remote
```

本地：

```bash
pnpm --filter @taomenu/app db:migrate:local
```

检查表是否齐全：

```bash
npx wrangler d1 execute taomenu --remote --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
# 应含 user、session、account、verification、stores、…
```

### 3. R2（菜品图片）

```bash
npx wrangler r2 bucket create taomenu-media
# apps/app/wrangler.jsonc 已配置 binding MEDIA → taomenu-media
```

本地 `wrangler`/`next dev` 会用模拟 R2；生产需先创建真实 bucket。

### 4. Cloudflare Email Sending

发件域名必须与 `EMAIL_FROM` 同域，且该域已在 Cloudflare 上 **Email Sending enable**。生产用 **`dyqr.me`**：

```bash
npx wrangler email sending enable dyqr.me
# 按提示完成 SPF / DKIM 等 DNS
npx wrangler email sending list
```

`wrangler.jsonc` vars：

```jsonc
"EMAIL_FROM": "noreply@dyqr.me",
"EMAIL_FROM_NAME": "TaoMenu"
```

注意：收件人看到 `TaoMenu <noreply@dyqr.me>`；未 enable 的域会 `E_SENDER_NOT_VERIFIED`。

`apps/app/wrangler.jsonc` 已配置：

```jsonc
"send_email": [{ "name": "EMAIL", "remote": true }]
```

- `remote: true`：本地 `wrangler`/OpenNext 开发可走真实发送  
- 无 binding 或 `EMAIL_DEV_LOG_ONLY=1`：OTP 打到 console（`[taomenu-otp]`）

### 5. VAPID（Web Push）

```bash
npx @pushforge/builder vapid
```

- 公钥 → vars `VAPID_PUBLIC_KEY`  
- 私钥 JWK → secret `VAPID_PRIVATE_JWK`（整段 JSON 一行）

### 6. Google OAuth（可选）

- 授权回调：`{NEXT_PUBLIC_APP_URL}/api/auth/callback/google`（与 vars 一致）  
- `GOOGLE_CLIENT_ID` → vars  
- `GOOGLE_CLIENT_SECRET` → secret  

---

## 配置生产 vars / secrets

### app（`apps/app`）

```bash
cd apps/app

# secrets
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put VAPID_PRIVATE_JWK
# 可选
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put CRON_SECRET
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
```

非密钥写在 `wrangler.jsonc` → `vars`（仓库默认已是生产域名）。**不要尾斜杠**：

```jsonc
"vars": {
  "BETTER_AUTH_URL": "https://app.menu.dyqr.me",
  "NEXT_PUBLIC_APP_URL": "https://app.menu.dyqr.me",
  "NEXT_PUBLIC_WEBSITE_URL": "https://menu.dyqr.me",
  "EMAIL_FROM": "noreply@dyqr.me",
  "EMAIL_FROM_NAME": "TaoMenu",
  "VAPID_PUBLIC_KEY": "<your-public-key>",
  "VAPID_SUBJECT": "mailto:ops@dyqr.me",
  "GOOGLE_CLIENT_ID": "<optional>",
  "STRIPE_STAFF_SEAT_PRICE_ID": "price_<staff-seat>"
}
```

Stripe Webhook 指向：

```text
https://app.menu.dyqr.me/api/billing/stripe/webhook
```

只订阅 `checkout.session.completed`、`customer.subscription.created`、
`customer.subscription.updated` 和 `customer.subscription.deleted` 事件。
服务端会校验 `Stripe-Signature`，并将额外 Staff 席位同步到门店。

也可复制 `apps/app/.env.production.example` → `.env.production` 覆盖构建时的 `process.env`（优先级高于 wrangler vars 注入）。

### website（`apps/website`）

```jsonc
"vars": {
  "NEXT_PUBLIC_WEBSITE_URL": "https://menu.dyqr.me",
  "NEXT_PUBLIC_APP_URL": "https://app.menu.dyqr.me"
}
```

website **无密钥、无 D1、无 Email binding**。

---

## 部署命令

在仓库根：

```bash
pnpm install

# 确认自定义域已绑到对应 Worker，再：
pnpm --filter @taomenu/app deploy
pnpm --filter @taomenu/website deploy
```

等价于：`cf-typegen` → `run-with-wrangler-vars` 注入 vars → OpenNext build → deploy。

### 自定义域

Workers 控制台为两个 Worker 绑定：

```bash
cd apps/app && npx wrangler domains add app.menu.dyqr.me
cd apps/website && npx wrangler domains add menu.dyqr.me
```

（子命令以当前 wrangler 文档为准；也可在 Dashboard → Workers → Custom Domains 添加。）

改域后同步更新两边 `vars` 的 `NEXT_PUBLIC_*` / `BETTER_AUTH_URL` 并 **重新 deploy**（客户端 URL 靠构建内联）。

### 部署后检查

1. `https://app.menu.dyqr.me/api/health` → `{ ok: true }`  
2. **已对远程 D1 执行 `db:migrate:remote`**（否则 OTP 入库失败）  
3. 登录页发 OTP → 邮箱收到（检查 Spam；From `noreply@dyqr.me` 须 Email Sending enable）  
4. 终端 `/terminal` Push 测试  
5. `https://menu.dyqr.me` CTA 指向 `https://app.menu.dyqr.me/login`  

### Outbox 补扫（可选 Cron）

```bash
curl -X POST "$NEXT_PUBLIC_APP_URL/api/internal/process-outbox" \
  -H "Authorization: Bearer $CRON_SECRET"
```

可用 Cloudflare Cron Triggers 或外部 cron 调该接口。

---

## 本地开发

```bash
cp apps/app/.dev.vars.example apps/app/.dev.vars
# 编辑密钥；Email 未就绪时设 EMAIL_DEV_LOG_ONLY=1
pnpm --filter @taomenu/app db:migrate:local
pnpm --filter @taomenu/app cf-typegen
pnpm dev:app
```

OTP：

- 有真实 `EMAIL` + 域名验证 → 收邮件  
- 否则 terminal 日志 `[taomenu-otp]`

---

## 禁止事项

| 不要 | 原因 |
|---|---|
| 提交 `.dev.vars` / 真实 secrets | 泄露 |
| 提交 `cloudflare-env.d.ts` | 应用 `cf-typegen` 生成 |
| 把 `VAPID_PRIVATE_JWK`、`BETTER_AUTH_SECRET` 放进 `NEXT_PUBLIC_*` 或 `vars` | 会进客户端或仓库 |
| 用未 onboard 的域名作 `EMAIL_FROM` | `E_SENDER_NOT_VERIFIED` |
| 在顾客页申请 Push | 产品边界 |

---

## 回滚与迁移

- 代码：Worker 版本回滚（Dashboard）  
- 数据：D1 迁移只前进；新 migration 放 `packages/db/migrations/`，先 `--local` 再 `--remote`  
- 切域名：同步改 `BETTER_AUTH_URL`、`NEXT_PUBLIC_*`、OAuth 回调、VAPID 无域名绑定但需重装 PWA 订阅  

---

## 相关文件

| 路径 | 说明 |
|---|---|
| `apps/app/wrangler.jsonc` | app Worker、D1、Email |
| `apps/website/wrangler.jsonc` | website Worker |
| `apps/app/lib/email.ts` | OTP 发送 |
| `apps/app/.dev.vars.example` | 本地密钥模板 |
| `ACCEPTANCE.md` | 功能验收 |
