# DEV_NOTE

长期有效的工程决策与踩坑记录。

## Monorepo 拆分（2026-07-28）

- `apps/website`：营销站与 SEO（`taomenu.app`，本地 :3000）
- `apps/app`：PWA 产品面——店主/员工登录能力 + 顾客扫码公开页（`app.taomenu.app`，本地 :3001）
- 顾客 `/m/*` 放在 `app` 并 `noindex`，不做门店发现 SEO
- 不预建空的 realtime/ai/db 包；需要时再加
- `packages/*` 直接导出 TypeScript 源码（`workspace:*` + Next `transpilePackages`），不强制 Vite 出 dist，减少双构建

## 认证与 D1（2026-07-28）

- Better Auth + drizzle adapter + D1；Google OAuth（可选 env）+ 邮箱 OTP
- OTP 本地只 `console.info('[taomenu-otp] …')`，未接邮件发送
- 账号合并：`accountLinking` + `trustedProviders: ['google']`
- 本地：`apps/app/.dev.vars`（见 `.dev.vars.example`）+ `pnpm --filter @taomenu/app db:migrate:local`
- repository 强制 `StoreContext`；跨租户路径 id 在 API 层 `resolveStoreContext` 失败 → 404

## 菜单与订单（2026-07-28）

- 菜单：`menus` + categories/items + 翻译；发布前 `validateMenuForPublish` 纯函数
- Free：`maxMenuLocales=1`，写第二语言或发布多语言会 422
- 复制菜品：`POST .../menu/items/:id/copy` → `duplicateItem`（名称加 `(sao chép)`，售罄重置；含规格组）
- 批量上下架：`PATCH .../menu/items` + `batchItemAvailabilitySchema`（`isSoldOut` / `isAvailable`）
- 规格：`modifier_groups` / `modifiers`；owner 面板 + 顾客 `ModifierPicker`；下单 `resolveModifierSelection` 重算加价，名称快照 `菜名 (规格…)`
- 菜品图：R2 binding `MEDIA`（bucket `taomenu-media`）；key `menu/{storeId}/{itemId}/{uuid}.ext`；上传 `POST .../items/:id/image`（MIME/魔数/2MB）；公开读 `GET /api/media/...`
- 桌码/取餐码：明文仅创建或轮换时返回，库内 `token_hash`（SHA-256）
- 顾客下单：服务端按当前菜单价重算；`idempotency_key` 唯一；外带取餐号按 `Asia/Ho_Chi_Minh` 营业日序列
- Terminal MVP 用店主 session 拉单/改状态；终端配对码仍未做
- 本地迁移：`pnpm --filter @taomenu/app db:migrate:local`（含 0001～0005）

## PWA / Web Push（2026-07-28）

- Service Worker：`apps/app/public/sw.js`（push + notificationclick + 壳缓存）；**顾客 `/m/*` 不注册、不申请权限**
- VAPID：`@pushforge/builder`（Web Crypto，Workers 可用）；密钥在 `.dev.vars`
- 新订单：同路径写 `notification_outbox`（`not_before` +2s），下单 API `scheduleOutboxProcessing`；仍为 `submitted` 才投递
- 永久失效：Push 404/410 → `disabled_at`；测试推送点击后 `verified_at`
- 补扫：`POST /api/internal/process-outbox`（可选 `Authorization: Bearer CRON_SECRET`）
- Terminal UI：安装引导 + 开通知 + 测试 + 点击验证

## Email Sending + 部署约定（2026-07-28）

- OTP：`apps/app/lib/email.ts` → `env.EMAIL.send`（Cloudflare Email Sending binding）
- 无 EMAIL / `EMAIL_DEV_LOG_ONLY=1` → console `[taomenu-otp]`
- `cloudflare-env.d.ts` 不入库；`pnpm cf-typegen` 在 typecheck/build/deploy 前执行
- 密钥只进 secret / `.dev.vars`；`NEXT_PUBLIC_*` 仅 APP/WEBSITE URL
- 详见 `DEPLOYMENT.md`

## 验收切片（2026-07-28）

- 服务请求 / 付款 / 关台 / 暂停接单已接主路径；详见 `ACCEPTANCE.md`
- 顾客堂食页：状态刷新 + 叫人/结账；外带：取餐号 + 切回刷新
- 桌码创建时本地生成 QR data URL（`qrcode` 包）
