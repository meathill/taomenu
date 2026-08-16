# DEV_NOTE

长期有效的工程决策与踩坑记录。

## Monorepo 拆分（2026-07-28）

- `apps/website`：营销站与 SEO（生产 `menu.dyqr.me`，本地 :3000）
- `apps/app`：PWA 产品面——店主/员工登录能力 + 顾客扫码公开页（生产 `app.menu.dyqr.me`，本地 :3001）
- 顾客 `/m/*` 放在 `app` 并 `noindex`，不做门店发现 SEO
- `apps/ai`：菜单识别 Queue consumer；只从 R2 读取导入素材，不暴露业务 API
- 不预建空的 realtime 包；需要时再加
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
- 规格：`modifier_groups` / `modifiers`；owner 面板整组一次保存（`saveModifierGroup`），组间 `PATCH orderedIds` 排序；顾客 `ModifierPicker`；下单 `resolveModifierSelection` 重算加价，名称快照 `菜名 (规格…)`
- 按钮：列表行操作用 `ghost sm`；工具条/次操作用 `outline`；主提交用 `default`（店主端 primary 为翡翠）
- 菜品图：R2 binding `MEDIA`（bucket `taomenu-media`）；key `menu/{storeId}/{itemId}/{uuid}.ext`；上传 `POST .../items/:id/image`（MIME/魔数/2MB）；公开读 `GET /api/media/...`
- 桌码/取餐码：token 明文存储、固定不变（无轮换），列表接口直接返回，二维码可随时重印；A4 打印页 `/app/tables/print`（模版 + 勾选，`@page A4`）
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
- 已 i18n：登录、店主壳、onboarding 表单；菜单编辑/顾客页等仍有越南文硬编码，后续按页迁移

## Auth cookie（2026-08-03）

- Better Auth `cookiePrefix: 'taomenu'` → `__Secure-taomenu.session_token`
- **不要**与主站 `better-auth.*`（Domain=`.dyqr.me`）同名；否则 Cookie 头撞车，登录后 getSession 失败又回 /login
- middleware 只认名称含 `taomenu` + `session_token` 的 cookie
- 不要开 `crossSubDomainCookies`

## Auth + Cloudflare Workers（2026-08-15）

- 生产曾出现 `/api/auth/*` 无限 pending（`/ok`、`get-session`、social、OTP 一起挂），页面和 `/api/health` 正常
- 根因：better-auth 把 `import("node:async_hooks")` 缓存在模块作用域；Workers 里请求被取消后该 Promise 永不结束，isolate 上后续 auth 全挂
- 决策：`lib/auth-runtime.ts` 静态预热 ALS；catch-all handler 10s 超时返回 503，禁止无限 pending
- Workers 上不要把「请求期内创建的 Promise」缓存到模块/isolate 生命周期

## 验收切片（2026-07-28）

- 服务请求 / 付款 / 关台 / 暂停接单已接主路径；详见 `ACCEPTANCE.md`
- 顾客堂食页：状态刷新 + 叫人/结账；外带：取餐号 + 切回刷新
- 桌码创建时本地生成 QR data URL（`qrcode` 包）

## AI 菜单导入（2026-08-09）

- Provider 边界使用版本化 `MenuImportOutput`；当前实现为 OpenAI Responses API + `gpt-5.6-luna`
- 图片使用 `detail: original`，PDF 使用 `input_file` + `detail: high`；Structured Outputs 后仍用 Zod 二次校验
- Web API 只负责 Pro 权益、文件校验、R2 和 Queue；模型请求由 `apps/ai` 异步消费
- 识别结果按分类/菜品保存为 suggestion，逐项接受、编辑或拒绝后才可写入菜单草稿；不会自动发布
- 成功识别并落库后删除 R2 原始素材；失败时保留素材以便重试
- `OPENAI_API_KEY` 只存 `taomenu-ai` Worker secret；业务 app 不持有模型密钥
- BCP-47 地区标签按主语言比较：`vi` 与 `vi-VN` 视为同语言，并统一写入门店 `baseLocale`
- 空菜单首次导入其他语言时，审核页明确提示并采用检测语言作为 `baseLocale`；已有菜单则阻止混入另一种源语言

## Stripe 与多币种计费（2026-08-10）

- 支持 VND/USD/JPY/CNY；`stores.currency` 决定显示与结算币种，金额一律最小单位整数存储
  （VND/JPY 0 位小数，USD/CNY 2 位）；`packages/shared/src/currency.ts` + `pricing.ts` 是唯一事实来源
- 价格推送方向永远是「代码 → Stripe」，运行时从不拉取 Stripe 价格：改 `pricing.ts` 数字 →
  `pnpm stripe:prices:sync` 覆盖式写 Price 的 `currency_options` → 提交代码
- Stripe 限制：Price 默认币种与其金额创建后不可改，只有 `currency_options` 可更新；
  同一 Stripe Customer 首笔订阅后订阅币种锁定，换币种后新订阅需先取消原订阅
- `scripts/stripe-common.ts` 提供凭据解析（env → `.dev.vars` → `wrangler.jsonc` vars，
  secret 不从 vars 取）、`redact`、`stripeRequest`；两个入口脚本
  （`sync-stripe-prices.ts` / `create-stripe-products.ts`）各自 `module.registerHooks`
  给无扩展名相对导入补 `.ts`，因为 Node 原生跑 TS 不会自动补，需早于动态 import shared
- Checkout Session 显式传小写 `currency` 参数选结算币种；**不传** `payment_method_types`
  （写死会锁死 Stripe 的动态支付方式协商）
- `STRIPE_PRO_PRICE_ID` 配置前以空串占位即视为未配置；key/secret 只进 `apps/app/.dev.vars` 与 secret
- 历史订单不存币种快照，切换门店币种后统计按新币种重新解释（已知限制，非 bug）

## Stripe webhook 幂等去重（2026-08-09）

- `stripe_webhook_events` 表（migration 0013），`event_id` 主键即去重键
- `claimStripeWebhookEvent` 用 `ON CONFLICT DO NOTHING ... RETURNING` 按插入行数判定首次/重复
- 处理抛错时 best-effort `releaseStripeWebhookEvent` 删占位再原样抛出（释放失败不掩盖原错误），
  保证 Stripe 重投仍会处理
- 编排逻辑在 `apps/app/lib/stripe-webhook.ts` 的 `handleStripeEventOnce`（可注入去重存储）便于单测

## 页面加载与导航反馈（2026-08-12）

- owner 页面都是 `force-dynamic`，但**读 cookies/headers（`getSession` → `headers()`）的路由本就自动动态渲染**，`force-dynamic` 是冗余显式声明，删掉行为不变
- 路由级 `loading.tsx` 是 Suspense fallback：**整页加载（刷新/硬导航）时必生效**；但「点击链接」走客户端软导航（segment cache 导航 + `<Link>` 默认 prefetch），缓存命中时直接渲染缓存 shell 并后台补数据，**loading 边界可能不显示**——表现为「点击 → 空窗 → 跳转」
- 客户端导航的即时反馈要用 `useLinkStatus`（`next/link`，`useOptimistic` 实现，点击瞬间 pending 即 true）：
  `components/navigation-spinner.tsx` 作为 `<Link>` 子组件使用，pending 时渲染 spinner
- 手写 `<Suspense fallback>` 包裹 DB 查询与 loading.tsx 机制相同，软导航下同样不可靠
