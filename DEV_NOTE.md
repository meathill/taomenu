# DEV_NOTE

长期有效的工程决策与踩坑记录。

## Monorepo 拆分（2026-07-28）

- `apps/website`：营销站与 SEO（生产 `menu.dyqr.me`，本地 :3000）
- `apps/app`：PWA 产品面——店主/员工登录能力 + 顾客扫码公开页（生产 `app.menu.dyqr.me`，本地 :3001）
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

## 公开 URL / 环境变量（2026-08-03）

- 生产域名经 env：`menu.dyqr.me` / `app.menu.dyqr.me`（勿在业务代码硬编码）
- `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_WEBSITE_URL` / `BETTER_AUTH_URL` **只读 `process.env.*`**
- **禁止** `getCloudflareContext().env.NEXT_PUBLIC_*`
- `getCloudflareContext` 仅用于 binding（DB / EMAIL / MEDIA）与密钥
- URL 统一无尾斜杠；`public-url.ts` / `site.ts` 负责读取与规范化
- 构建时：`scripts/run-with-wrangler-vars.mjs` 注入 wrangler `vars`

## 营销站 i18n（2026-08-03）

- UI locale：`en`（默认）/ `zh` / `ja` / `vi`（`packages/shared/src/locale.ts`）
- next-intl + `localePrefix: always`；协商：cookie → Accept-Language → CF 国家 → en
- 全局 `SiteHeader` + `SiteFooter`；语言切换在 **footer**
- 文档页 MDX：`content/{about,contact-us,privacy,terms}/{en,zh,ja,vi}.mdx`，`next-mdx-remote` + `force-static`
- 非英文文档顶部 alert：「仅供理解，以英文为准」+ 链到 `/en/...`
- 与**菜单内容** `stores.baseLocale`（默认仍 `vi`）分离
- 发信：`EMAIL_FROM=noreply@dyqr.me`（`dyqr.me` 须 Email Sending enable）

## 产品 app i18n（2026-08-03）

- 同样 en/zh/ja/vi，默认 en；**`localePrefix: 'never'`**（对外仍是 `/login` `/app`）
- 页面必须放在 `app/[locale]/…`：middleware 会 rewrite 成内部 `/zh/login` 等
- 协商与 cookie `NEXT_LOCALE` 同 marketing；middleware 兼鉴权
- 全局 header/footer，语言切换在 footer
- 已 i18n：登录、店主壳、onboarding 标题；菜单编辑/顾客页等仍有越南文硬编码，后续按页迁移

## 验收切片（2026-07-28）

- 服务请求 / 付款 / 关台 / 暂停接单已接主路径；详见 `ACCEPTANCE.md`
- 顾客堂食页：状态刷新 + 叫人/结账；外带：取餐号 + 切回刷新
- 桌码创建时本地生成 QR data URL（`qrcode` 包）
