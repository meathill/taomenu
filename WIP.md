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
- [ ] 后续：需要时再加 `apps/realtime`、`apps/ai`

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
- [ ] 一次性配对码和终端凭证（当前 subscription 挂 owner）
- [ ] 审计日志
- [ ] Cloudflare Queue 替代 setTimeout 投递（生产强化）

## 5～7

见历史计划：多终端 realtime、Pro/AI、上线加固。

## 暂不实施

- Stripe 自动订阅、原生 App、打印机、餐厅发现、代收款等（同 PRD）
