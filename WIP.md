# Stripe 收尾 + 多币种计费（2026-08-09）

跟踪：[GitHub issue #1](https://github.com/meathill/taomenu/issues/1) 最后两项。
完整方案见批准计划；要点：VND/USD/JPY/CNY 四币种，显示与结算依据 stores.currency，
价格唯一事实来源在 `packages/shared/src/pricing.ts`，推送脚本同步到 Stripe Price
currency_options，应用运行时不拉取 Stripe 价格。

- [x] Step 1：shared 币种+定价配置（currency.ts / pricing.ts + 测试）
- [x] Step 2：formatCurrency 全量迁移，public-menu 下发 currency，删 formatVnd
  - 金额格式化改为跟随界面语言（原先硬编码 `vi-VN`）：vi 显示不变，en/zh/ja 千分位由 `.` 变 `,`
- [x] Step 3：价格输入按币种处理小数（菜单编辑 + AI 导入）
  - 新增 `sanitizeCurrencyInput`，输入框 onChange 按币种过滤；0 位小数币种行为与旧版完全一致
  - 价格文案 `priceVnd` → `price`（`Price ({currency})`），VND 门店展示不变
  - 遗留：AI 识别提示词写死「integer VND」的问题已在 Step 4.5 解决
- [x] Step 4：stores.currency 可编辑（schema / repo / settings UI + 提示文案）
  - create/update store schema 加 `currency` 枚举，settings 把币种从只读区移进表单
  - onboarding 第二步加币种选择（默认 VND，随草稿存 localStorage）
  - 切换币种不换算已有价格与历史订单金额，页面常显提示；有 Stripe 订阅时追加警告
- [x] Step 4.5：AI 菜单识别按门店币种解析价格
  - 币种不进队列消息：`getMenuImportJob` join `stores` 带出 `storeCurrency`，AI worker 直接读 D1，
    旧队列消息（只有 importId）天然兼容，也不会因门店改币种而读到过期值
  - `buildPriceInstructions` 按小数位生成提示：0 位保持「integer 值 + 35k → 35000」，
    2 位明确「返回最小单位整数，5.99 USD → 599」；`currency` 字段仍只记录到 usageJson，不做阻断
  - AI 翻译（只传 name/description）与图片美化不涉及金额，未改动
- [x] Step 5：Checkout 传 currency + app 端 Pro/席位价格展示
  - `buildProCheckoutParams` / `buildStaffSeatCheckoutParams` 抽成纯函数，参数只多一个小写 `currency`，
    不写 `payment_method_types`（写死会让 Stripe 无法按币种协商支付方式），单测直接断言不用 mock fetch
  - 两个 checkout 路由传 `toBillingCurrency(store.currency)`；已有 subscription item 只改 quantity 的分支
    不涉及币种（订阅币种已锁定），未改动
  - `owner.proPrice` / 新增 `owner.seatPriceHint` 改为 `{price}` 占位符，价格由
    `formatCurrency(getBillingPrice(...))` 按门店币种 + UI locale 现算
  - 价格展示读已保存的 `store.currency`，不跟随设置表单里未保存的选择，避免与实际扣款币种不一致
- [x] Step 6：website 定价页按 locale 币种渲染 + JSON-LD
  - `getBillingCurrencyForLocale(locale)` 决定展示币种，Free/Pro/席位价一律由
    `formatCurrency(getBillingPrice(...))` 现算，website 不再有硬编码金额
  - `freePrice` 文案直接删除（纯金额无措辞，由代码渲染）；`proPrice` / `staffAddOn`
    改 `{price}` 占位符，席位价顺带展示在两档套餐的功能列表里
  - 首页 JSON-LD `offers` 由单个 Offer 扩成数组（Free + Pro），价格用
    `minorAmountToDecimalString`，`priceCurrency` 跟随 locale
- [ ] Step 7：sync-stripe-prices 脚本 + STRIPE_PRO_PRICE_ID env 收尾
- [ ] 人工验收：Stripe test mode 走通 checkout / webhook / portal，生产回归

---

# GitHub issue #1 剩余 Pro / AI 能力（2026-08-09）

目标：在不自动发布、不覆盖店主已确认数据的前提下，尽量完成 #1 中仍未交付的付费价值点，并逐项上线验收。

- [x] Pro 权益预览、AI 输入/输出/限制说明与应用内升级入口
- [x] 越南语语音录入菜单草稿，明确浏览器兼容性并要求手工确认
- [x] AI 菜单翻译：选择目标语言、异步生成、逐项审核、写入草稿
- [x] AI 菜品图片美化：保留原图、生成预览、确认替换、可撤销
- [x] 每个阶段补测试，运行 format / typecheck / test / build
- [x] 每个可独立验收阶段 commit + push，并等待部署后复验
- [x] 更新 `TODO.md` 与 GitHub issue #1，只勾选已完成且经生产验收的项目

未完成：生产尚未配置 `STRIPE_PRO_PRICE_ID`，因此真实 Pro Checkout / Webhook / Portal
支付回归继续保留在 `TODO.md`，不计为本轮已完成。

边界：

- AI 结果只进入草稿，不自动发布菜单。
- 翻译不覆盖已有目标语言内容；图片美化不覆盖原图。
- 没有生产 Price / secret 时，升级入口必须给出可理解的配置提示，不能伪装成可购买。

---

# 生产验收后续整改（2026-08-09）

来源：提交 `ec3028f` 部署后的普通用户回归。

- [x] Service Worker 不再缓存登录页、店主页面或 RSC 响应
- [x] 升级静态缓存版本，清理已存在的旧页面缓存
- [x] 店员设备日期按当前界面语言和门店时区显示
- [x] 补充回归测试并完成 format / typecheck / test / build
- [x] commit + push，等待部署并复验

---

# 复制菜品名称语言修复（2026-08-09）

来源：提交 `bb5b8d7` 部署后的生产菜单复验。

- [x] 复制请求携带店主当前界面语言
- [x] 所有复制出的翻译统一使用本次操作语言的后缀
- [x] 补充测试并完成 format / typecheck / test / build
- [x] commit + push，等待部署并复验

---

# Staff 满席状态修复（2026-08-09）

来源：版本 27 上线前对总 issue 店员配对项的逐条复核。

- [x] 满席时禁用生成配对二维码
- [x] 明确提示撤销旧设备或购买额外席位
- [x] 补充测试并完成 format / typecheck / test / build
- [x] commit + push，等待部署

---

# 普通用户验收整改（2026-08-09）

跟踪：[GitHub issue #1](https://github.com/meathill/taomenu/issues/1)

- [x] 统一 Owner 页面加载与骨架屏，避免加载期间显示错误空状态
- [x] 核对桌台、二维码打印和店员设备数据加载一致性
- [x] 补齐订单收款、已上菜和关台闭环
- [x] 修复暂停接单、订单刷新和规格复核体验
- [x] 增加菜品删除并修复复制名称、本地化问题
- [x] 为尚未实现的 Pro / AI 能力增加 `Coming soon` 标识
- [x] format / typecheck / test / build

---

# 按钮 loading 体验修复（2026-08-07）

问题：一组按钮共享同一个 `busy` state 时，点其中一个，整组按钮全部显示 spinner。

方案：
- `Button` 组件新增 `busy` prop：组内其他按钮进行中时禁用但**不显示 spinner**；只有被点击的按钮传 `pending`
- 各页面把共享的 `busy: boolean` 状态改为 `busyAction: string | null`，每个操作一个唯一 key（列表类用 `操作-id`），按钮传 `pending={busyAction === key}` + `busy={busyAction !== null}`

涉及：login、terminal-board（ack/done）、notification-setup、staff-manager、tables-manager + qr-create-form + qr-entry-row、menu-editor + batch-bar / item-row / item-image / item-draft-form / modifiers-panel

- [x] format / typecheck / test / build 全绿

---

# Tables & QR 改版（2026-08-04）

- [x] token 模型改明文固定（迁移 0007 存量重置一次），删除轮换 API 与前端逻辑
- [x] 桌台/取餐点二维码常显，操作：重命名 / 复制链接 / 打开顾客页 / 下载 PNG / 停用
- [x] QR 模版：standard（免费）+ minimal / banner / elegant（Pro，`canUseProQrTemplates` 权益位）
- [x] A4 打印页 `/app/tables/print`：模版选择 + 勾选入口 + 裁剪虚线，打印隐藏壳层
- [x] 浏览器验收通过：QR 常显、Pro 锁定、停用置灰/过滤/顾客 404、明文 token 公开链路
- [x] format / typecheck / test / build 全绿

---

# TaoMenu 首轮后台改版（2026-08-04）

目标：把店主端从功能入口提升为可日常使用的门店工作台，保持 360px 手机体验，同时让桌面端使用两栏结构。

- [x] 实现 active store、门店切换和响应式后台壳层
- [x] 实现首页今日经营概览、准备清单、订单入口和店铺设置
- [x] 补齐桌台/取餐点二维码的重新生成、分享、下载、打印和基础管理
- [x] 实现店员设备一次性配对、设备列表和撤销
- [x] 补齐新增界面的 en、vi、zh、ja 文案
- [x] 完成单元测试、format、typecheck、test、build 和浏览器验收

---

# TaoMenu MVP 实施计划

本计划将 [PRD](docs/PRD.md) 和 [TECH_SPEC](docs/TECH_SPEC.md) 拆成可以连续交付的开发阶段。每个阶段完成后独立提交，并保持主分支可构建、可测试。

仓库前台拆为 `apps/website`（营销/SEO）与 `apps/app`（PWA 产品面）；决策见 [DEV_NOTE.md](DEV_NOTE.md)。

## 0. 工程基线

- [x] 初始化 pnpm workspace、TypeScript、Biome 和共享配置
- [x] 创建 `apps/website`、`apps/app`、`packages/config`、`packages/shared`、`packages/ui`
- [x] 配置 Next.js / OpenNext 骨架与本地端口（website:3000，app:3001）
- [x] 建立 Vitest smoke
- [x] 添加 `TESTING.md`、`DEV_NOTE.md`；更新 README
- [ ] 后续：GitHub Actions CI、Playwright
- [ ] 后续：需要时再加 `apps/realtime`

完成标准：空应用能在本地启动，format / typecheck / test / build 通过。

## 1. 身份、租户与门店

- [x] Better Auth Google OAuth（可选）+ 邮箱 OTP；account linking 信任 Google
- [x] `packages/db`：auth / stores / store_members schema + migration
- [x] 创建门店 + mobile-first onboarding
- [x] 强制 `StoreContext` 的 repository
- [x] 租户隔离单测
- [x] 真邮件发送 OTP（Cloudflare Email Sending binding，见 `lib/email.ts` + DEPLOYMENT.md）
- [ ] 后续：Playwright 双店主 e2e

## 2. 菜单与多语言数据模型

- [x] 分类、菜品、规格表 schema + migration `0002_menu`
- [x] 菜单编辑、售罄、发布流程（owner API + mobile UI）
- [x] 发布完整性校验与 `menu_version`
- [x] Free 单菜单语言权益检查（publish + 写翻译）
- [x] Free 手工录入：保存并继续、售罄切换
- [x] R2 菜品图片上传（MEDIA binding + 上传校验 + 公开读 + 店主/顾客 UI）
- [x] 规格 modifier：owner CRUD UI + 公开菜单 + 顾客选规格 + 服务端重算加价
- [x] 复制菜品 / 批量上下架 UI 增强（copy API + 多选批量售罄/显隐 + 保存并继续）

完成标准：Free 店主只用手机手工创建并发布一份越南语菜单。

## 3. 桌台、取餐点、二维码与顾客下单

- [x] 桌台 token 生成/轮换（只存 hash）
- [x] 公共取餐点 token
- [x] 顾客菜单 + 购物车 + 提交订单（堂食/外带）
- [x] table session 自动创建和复用
- [x] 外带取餐号按门店时区营业日分配
- [x] 服务端价格重算、幂等下单、订单 public token
- [x] 桌码 QR 展示 + 分享/复制（PDF 导出后续）
- [x] 呼叫服务员 / 请求结账 + 同类合并
- [x] 暂停/恢复公开接单
- [x] 顾客状态：visibility / pageshow / 手动刷新（无后台轮询）
- [ ] 限流与 token 滥用细化自动化

完成标准：顾客可扫码下单；幂等键防重复。

## 4. 单员工终端闭环

- [x] 员工工作台查看活跃订单并推进状态（MVP 暂用店主 session）
- [x] 堂食/外带状态机校验
- [x] PWA Service Worker + Web Push（VAPID / outbox / 测试验证）
- [x] 安装引导 + 能力检测（iOS 需加主屏幕）
- [x] 现金付款记录 + 关台（余额为 0）
- [x] 服务请求在终端处理
- [x] [ACCEPTANCE.md](ACCEPTANCE.md) 人工验收清单
- [x] Staff 设备登录后通过一次性 QR 配对（二维码 + 配对码确认 + 终端凭证）
- [x] Staff 席位：Free 1 个、Pro 4 个，额外席位通过 Stripe 订阅购买
- [ ] 审计日志
- [ ] Cloudflare Queue 替代 setTimeout 投递（生产强化）

## 5～7

见历史计划：多终端 realtime、Pro/AI、上线加固。

## 暂不实施

- 完整套餐订阅升级、原生 App、打印机、餐厅发现、代收款等（同 PRD）
