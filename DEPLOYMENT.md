# TaoMenu 部署指南（Cloudflare）

目标：把 monorepo 两个 OpenNext Worker 部署到 Cloudflare，并接通 **D1**、**Email Sending**、**Web Push VAPID**。

## 架构

| Worker | 包 | 职责 |
|---|---|---|
| `taomenu-website` | `apps/website` | 营销站 / SEO |
| `taomenu-app` | `apps/app` | PWA、Auth、API、Push、业务 |

推荐域名：

- `https://taomenu.app` → website  
- `https://app.taomenu.app` → app  

本地：website `:3000`，app `:3001`。

## 环境变量约定

### 可以进客户端的（`NEXT_PUBLIC_*`）

| 变量 | 用途 |
|---|---|
| `NEXT_PUBLIC_APP_URL` | app 绝对 URL（登录跳转、桌码链接、OAuth callback 基址） |
| `NEXT_PUBLIC_WEBSITE_URL` | 营销站绝对 URL（sitemap、跨站 CTA） |

只放**非密钥**、可公开的配置。推送到浏览器的包体会内嵌这些值。

### 放 wrangler `vars`（非密钥，可进仓库默认值/生产覆盖）

| 变量 | 用途 |
|---|---|
| `BETTER_AUTH_URL` | Better Auth `baseURL`（通常等于 `https://app.taomenu.app`） |
| `EMAIL_FROM` | 发件地址，如 `noreply@taomenu.app`（域名须已 onboard Email Sending） |
| `EMAIL_FROM_NAME` | 发件显示名，默认 `TaoMenu` |
| `VAPID_PUBLIC_KEY` | Web Push 公钥（经 API 下发到终端，不是密钥） |
| `VAPID_SUBJECT` | VAPID contact，如 `mailto:ops@taomenu.app` |
| `GOOGLE_CLIENT_ID` | Google OAuth 客户端 ID（可公开） |
| `NEXT_PUBLIC_*` | 同上，生产必须写成真实 HTTPS 域名 |

### 必须 `wrangler secret` / `.dev.vars`（密钥，禁止提交）

| 密钥 | 用途 |
|---|---|
| `BETTER_AUTH_SECRET` | Auth 签名密钥（足够长的随机串） |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret（可选） |
| `VAPID_PRIVATE_JWK` | Web Push 私钥 JWK JSON 字符串 |
| `CRON_SECRET` | 可选，保护 `POST /api/internal/process-outbox` |

### Cloudflare Bindings（不是 env 字符串）

| Binding | 配置位置 | 用途 |
|---|---|---|
| `DB` | `d1_databases` | 业务库 |
| `EMAIL` | `send_email` | Cloudflare Email Sending |
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
- 域名接入 Cloudflare（建议 `taomenu.app`）

### 2. D1

```bash
cd apps/app
npx wrangler d1 create taomenu
# 把输出的 database_id 写入 wrangler.jsonc → d1_databases[0].database_id
npx wrangler d1 migrations apply taomenu --remote
```

本地：

```bash
pnpm --filter @taomenu/app db:migrate:local
```

### 3. Cloudflare Email Sending

在**发件域名**上启用（与 `EMAIL_FROM` 同域）：

```bash
npx wrangler email sending enable taomenu.app
# 按提示完成 DNS（SPF / DKIM 等）
npx wrangler email sending list
```

`apps/app/wrangler.jsonc` 已配置：

```jsonc
"send_email": [{ "name": "EMAIL", "remote": true }]
```

- `remote: true`：本地 `wrangler`/OpenNext 开发可走真实发送  
- 无 binding 或 `EMAIL_DEV_LOG_ONLY=1`：OTP 打到 console（`[taomenu-otp]`）

### 4. VAPID（Web Push）

```bash
npx @pushforge/builder vapid
```

- 公钥 → vars `VAPID_PUBLIC_KEY`  
- 私钥 JWK → secret `VAPID_PRIVATE_JWK`（整段 JSON 一行）

### 5. Google OAuth（可选）

- 授权回调：`https://app.taomenu.app/api/auth/callback/google`  
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
```

非密钥建议在 `wrangler.jsonc` 的 `vars` 中改为生产值，或使用 Dashboard / `wrangler pages` 等价流程覆盖：

```jsonc
"vars": {
  "BETTER_AUTH_URL": "https://app.taomenu.app",
  "NEXT_PUBLIC_APP_URL": "https://app.taomenu.app",
  "NEXT_PUBLIC_WEBSITE_URL": "https://taomenu.app",
  "EMAIL_FROM": "noreply@taomenu.app",
  "EMAIL_FROM_NAME": "TaoMenu",
  "VAPID_PUBLIC_KEY": "<your-public-key>",
  "VAPID_SUBJECT": "mailto:ops@taomenu.app",
  "GOOGLE_CLIENT_ID": "<optional>"
}
```

### website（`apps/website`）

```jsonc
"vars": {
  "NEXT_PUBLIC_WEBSITE_URL": "https://taomenu.app",
  "NEXT_PUBLIC_APP_URL": "https://app.taomenu.app"
}
```

website **无密钥、无 D1、无 Email binding**。

---

## 部署命令

在仓库根：

```bash
pnpm install

# app
pnpm --filter @taomenu/app deploy

# website
pnpm --filter @taomenu/website deploy
```

等价于：`cf-typegen` → OpenNext build → `opennextjs-cloudflare deploy`。

### 自定义域

Workers 控制台为两个 Worker 绑定路由/自定义域，或：

```bash
cd apps/app && npx wrangler domains add app.taomenu.app
cd apps/website && npx wrangler domains add taomenu.app
```

（具体子命令以当前 wrangler 版本文档为准。）

### 部署后检查

1. `https://app.taomenu.app/api/health` → `{ ok: true }`  
2. 登录页发 OTP → 邮箱收到（检查 Spam）  
3. 终端 `/terminal` Push 测试  
4. 营销站 CTA 指向 `https://app.taomenu.app/login`  

### Outbox 补扫（可选 Cron）

```bash
curl -X POST https://app.taomenu.app/api/internal/process-outbox \
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
