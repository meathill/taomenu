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
- 表单控件：可输入组件白底（`fieldClassName`）；布尔设置用 Switch，不要用 checkbox；多选列表仍用 checkbox
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

## 营销站 SEO 与落地页（2026-08-16）

- 策略依据 `docs/KEYWORD_RESEARCH.md`：首页承接 `phần mềm order nhà hàng` 主词，7 个高意图落地页承接长尾；核心痛点是**外国游客语言障碍**
- 落地页：`app/[locale]/[slug]/page.tsx`（静态路由优先，`isLandingSlug` 判非法 slug → notFound）+ `content/landing/{slug}/{locale}.mdx`（4 语言，force-static）
- 落地页结构：H1/description/结论先行 answer（messages）→ MDX 正文 → FAQ（messages `landing.{slug}.faq`）→ related 内链（`lib/landing.ts` `LANDING_RELATED`）→ CTA → 更新时间（`LANDING_UPDATED_AT` 手写常量）
- SEO 基建：`lib/seo.ts` `buildPageMetadata` 统一 title/description/canonical/hreflang(+x-default)/OG/Twitter；`metadataBase` 在 layout；页面级 openGraph 会**整体替换** layout 默认值，images/twitter 需在 helper 里显式带上
- 结构化数据：layout 注入 WebSite + Organization；首页 SoftwareApplication（含报价）+ FAQPage；落地页 SoftwareApplication + BreadcrumbList + FAQPage——只写真实产品事实
- OG 图：`public/brand/og-default.png`（1200×630，`scripts/gen-og-image.mjs` 用 sharp 从 SVG 生成，一次性入库）
- 付款口径：FAQ 统一「目前顾客直接付款，在线收款正在开发中」；促销套餐/会员系统等未上线功能标注 Coming soon，不编造
- sitemap 覆盖：首页 + pricing + docs + 7 个落地页 × 4 locale

### 营销站内容与缓存（2026-08-17）

- **MDX 一律编译进 bundle（`@next/mdx`）**，不再运行时 `fs.readFile(content/*.mdx)`：Worker 的 Next 输出追踪（`.nft.json`）追踪不到动态 fs 读，`content/` 不会进部署包，运行时渲染直接 ENOENT 500（issue #5 根因）。
  做法照 mui-api `blog-content.ts`：`lib/content-sources.ts` 里 slug×locale → `import('@/content/...mdx')` 的动态 loader map + 英文回退，页面直接渲染编译后的 MDX 组件。
- 依赖：`@next/mdx`（版本跟 Next minor 对齐）+ `@mdx-js/loader`/`@mdx-js/react`（`@next/mdx` peer）+ `remark-gfm`；`next-mdx-remote` 已移除。
- **`mdx-components.tsx` 必须放 app 根目录并按约定导出 `useMDXComponents`**，`@next/mdx` 才会全局注入组件样式；`*.mdx` 模块类型要在 tsconfig 里 `/// <reference types="mdx" />`（`types/mdx.d.ts`）。
- **纯 SSG 站 OpenNext 缓存配置**：`incrementalCache: staticAssetsIncrementalCache` + `enableCacheInterception: true`。默认 `defineCloudflareConfig()` 的 incrementalCache 是 `dummy`（不缓存任何东西），预渲染页每次请求都进 NextServer 运行时渲染——内容页在这种模式下必然读不到 bundle 外的文件。`staticAssets` 是只读缓存，`deploy` 时 `populateCache` 会把 `.open-next/cache` 拷进 assets 的 `cdn-cgi/_next_cache`，命中路由不启动 NextServer。不需要 R2/DO/D1（无 ISR/无 revalidateTag/无 D1）。
- 静态资源缓存：`public/_headers` 给 `/_next/static/*` 配 `immutable`（Workers Static Assets 默认 `max-age=0`）。

### Owner App 缓存边界（2026-08-17）

- Owner App 是动态业务应用（订单/桌台/终端/菜单/用户态），**不是 SSG**：`open-next.config.ts` 保持默认 `defineCloudflareConfig()`（incrementalCache=dummy），页面与 API 全程进 NextServer 运行时，不引入 R2/DO/D1 增量缓存
- 静态 chunk：`public/_headers` 给 `/_next/static/*` 配 `immutable`（带 hash，可安全强缓存）；**其余路径一律不配置缓存头** → 默认 `max-age=0`，保证菜单/订单/桌台等实时业务不出现跨门店、跨用户或过期缓存
- 与 Website 的差异：Website 纯 SSG 用 `staticAssetsIncrementalCache` + `enableCacheInterception` 缓存整个预渲染页；App 只有 chunk 走强缓存，页面永远实时

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

## 落地页图片与演示门店截图管线（2026-08-17）

- 营销站是纯 SSG（Cloudflare Workers Static Assets）。`next/image` 走自定义 loader
  （`apps/website/image-loader.ts`，对齐 blog-2026 / OpenNext custom loader）：
  开发环境返回原图；生产走 `/cdn-cgi/image/fit=scale-down,format=auto,width=…`。
  需要在 menu.dyqr.me 所在 zone 打开 Cloudflare Image Transformations。
- 截图素材规范：`public/screenshots/{slug}/*.webp`（手机 780×1688，桌面 1280×800）。
  `Screenshot` 按文件名/宽高判断：竖屏套手机框，横屏（staff / menu-editor / qr-tables / payment）全宽展示。
  hero 与配图可点击弹出准全屏 dialog。
  hero 场景图放 `public/images/landing/{slug}/hero.webp`，接入要更新 `lib/landing.ts` 的 `LANDING_HERO`
- 演示门店造数：`apps/app/scripts/seed-demo-stores.ts`（tsx 运行）直写本地 miniflare D1——
  用 `node:sqlite` + drizzle d1 驱动包装（参考 `packages/db/src/testing/memory-d1.ts`），复用 `@taomenu/db` repository 函数；
  订单状态机必须逐级 transition（submitted→accepted→ready_for_pickup→picked_up），跳级会 INVALID_TRANSITION
- **本地 R2 上传坑**：`wrangler r2 object put --local` 的 `--persist-to` 会自动追加 `v3`，
  写 `.wrangler/state` 才会落到 dev server 读取的 `.wrangler/state/v3/r2`（直接写 `v3` 会嵌套成 `v3/v3`）
- 本地 OTP 登录：验证码存在 D1 `verification` 表（identifier `sign-in-otp-{email}`），
  本地 EMAIL binding 走真实发送不打印日志时，直接查表拿码
- 图片批量处理：sips 不支持 WebP 输出；macOS 有 `cwebp`（`cwebp -q 85 in.png -o out.webp`）；
  另有 https://tools.meathill.com/tools/image-converter（浏览器本地批量转换，支持 HEIC）
- 菜品图（demo 菜单）：8 道主菜（phở bò / bún chả / bánh mì / chè ba màu / cà phê sữa đá /
  trà sữa / xôi xéo / sữa chua nếp cẩm）为统一棚拍 AI 图；其余仍来自 Wikimedia Commons。
  600px JPEG 进 `scripts/dish-images/`，本地 R2 用 `node scripts/upload-dish-images.ts`
