# TaoMenu MVP 实施计划

本计划将 [PRD](docs/PRD.md) 和 [TECH_SPEC](docs/TECH_SPEC.md) 拆成可以连续交付的开发阶段。每个阶段完成后独立提交，并保持主分支可构建、可测试。

## 0. 工程基线

- [ ] 初始化 pnpm workspace、TypeScript、Biome 和共享配置。
- [ ] 创建 `apps/web`、`apps/realtime`、`apps/ai`、`packages/db`、`packages/shared`、`packages/ai`、`packages/ui`。
- [ ] 配置 Next.js/OpenNext、Hono Worker、Wrangler 和本地 Cloudflare 资源。
- [ ] 建立 Vitest、Workers pool、Playwright 和 GitHub Actions。
- [ ] 添加 `AGENTS.md`、`TESTING.md`、`DEPLOYMENT.md`。

完成标准：空应用能在本地启动，三个 Worker 能构建，CI 全部通过。

## 1. 身份、租户与门店

- [ ] Better Auth Google OAuth + 邮箱 OTP，并覆盖账号合并和恢复流程。
- [ ] `stores`、`store_members` 和认证 schema migration。
- [ ] 创建门店和 mobile-first 首次引导，360px 竖屏可完成全部步骤。
- [ ] 经营模式选择：桌边堂食、柜台取餐、混合模式；无座店引导不要求创建桌号。
- [ ] 建立手机表单自动保存、软键盘/safe-area 和 Web Share 回退基线。
- [ ] 建立强制 `StoreContext` 的 repository 层。
- [ ] 两租户隔离测试。

完成标准：两个店主只能访问自己的门店，跨租户实体 ID 返回 `404`。

## 2. 菜单与多语言数据模型

- [ ] 分类、菜品、规格和翻译 schema。
- [ ] 菜单编辑、排序、售罄和发布流程。
- [ ] 服务端发布完整性校验与 `menu_version`。
- [ ] R2 菜品图片上传。
- [ ] Free 单菜单语言权益检查。
- [ ] Free 手工录入加速：保存并继续、复制菜品、沿用分类/规格、数字键盘、批量上下架。

完成标准：Free 店主只用手机手工创建并发布一份越南语菜单，不触发任何 AI 服务。

## 3. 桌台、取餐点、二维码与顾客下单

- [ ] 桌台和 token 轮换。
- [ ] 公共取餐点和 token 轮换，与桌码共用安全/限流组件。
- [ ] 单张二维码和 A4 PDF 导出。
- [ ] 调用系统分享面板分享二维码/短链接，提供下载和复制回退。
- [ ] 顾客菜单、购物车、规格选择和订单确认页。
- [ ] table session 自动创建和复用。
- [ ] 外带订单不创建 table session；按门店时区原子分配当日唯一取餐号。
- [ ] 服务端价格重算、幂等下单和订单 public token。
- [ ] 呼叫服务员/请求结账、同类请求合并和顾客状态查询。
- [ ] 每桌频率/待处理上限、取消冷却、一键暂停和桌码 token 轮换。

完成标准：两台顾客手机可以向同一桌追加订单，重复请求不会创建重复订单；顾客可发起服务请求，滥用保护不阻塞正常桌码；20 笔并发外带订单产生 20 个不重复取餐号。

## 4. 单员工终端闭环

- [ ] 一次性配对码和终端凭证。
- [ ] 员工工作台及订单声音提示。
- [ ] PWA manifest、Service Worker、安装引导和通知能力检测。
- [ ] VAPID、Push subscription API 和测试通知。
- [ ] D1 notification outbox、Cloudflare Queue、重试去重和 DLQ。
- [ ] 新订单后台 Push、角标和点击后订单跳转。
- [ ] 服务请求的员工端提醒、确认/完成状态和顾客端回显。
- [ ] 堂食 `submitted → accepted → served/cancelled` 与外带 `submitted → accepted → ready_for_pickup → picked_up/cancelled` 状态机。
- [ ] 取餐队列、大字取餐号、再次叫号和员工代客创建外带订单。
- [ ] 现金/转账/其他付款记录和冲正。
- [ ] 外带付款直接关联单笔订单，不与公共取餐点的其他顾客合并。
- [ ] 余额计算、关闭和重新开启桌台。
- [ ] 关键操作审计日志。

完成标准：Free 门店可用一台员工终端完成一次完整堂食营业流程；Android/iOS 真机在后台和锁屏状态下收到测试订单通知。

外带补充标准：Free 无座门店可用一台员工终端完成扫码/代建订单、取餐号、可取餐、口头叫号、已取餐和单笔付款闭环。顾客页面后台不轮询、不申请 Push，切回或下拉时刷新最新状态。

## 5. 多终端实时协作

- [ ] `StoreRoom` Durable Object 和 migration。
- [ ] realtime ticket、WebSocket Hibernation 和事件协议。
- [ ] 终端租约、heartbeat、过期清理和主动撤销。
- [ ] version gap 检测、snapshot 重同步和轮询兜底。
- [ ] 乐观并发冲突 UI。
- [ ] Free 1 台、Pro 5 台权益测试。

完成标准：五台 Pro 员工终端实时一致；断网重连后恢复；Free 第二台被可靠拒绝。

## 6. Pro、多语言和试点工具

- [ ] Pro 最多五种菜单语言发布。
- [ ] 服务端 AI/STT 布尔权益；Free 绕过 UI 调用任务 API 也不会进入 Queue。
- [ ] 手机相机/相册/PDF 多文件上传、逐文件进度和失败重试。
- [ ] `menu_imports`、素材、字段建议和 AI 来源/审核 schema。
- [ ] `apps/ai` Queue consumer、版本化结构化输出和 provider adapter。
- [ ] 图片/PDF → 结构化菜单草稿；低置信度价格强制核对。
- [ ] AI 草稿接受/修改/拒绝 UI，未经确认不能发布。
- [ ] AI 多语言翻译草稿、基础语言并排审核和来源追踪。
- [ ] 越南语短语音录制、上传、STT provider adapter 和动态菜名词表。
- [ ] 结构化语音 command schema、确认卡、幂等执行和审计记录。
- [ ] 北/中/南真实餐馆语音评测，按关键字段错误率选择 STT provider。
- [ ] 管理员手工 entitlement override。
- [ ] 终端和语言额度升级提示。
- [ ] 激活漏斗和隐私友好的核心指标。
- [ ] 越南语/英语界面校对。
- [ ] 以 `149.000 ₫/月`、`1.490.000 ₫/年` 配置首个定价实验，但封闭试点仍使用手工 Pro 授权。

完成标准：可以为 5～10 家封闭试点门店开通和回收 Pro；Free 只可手工录入，Pro 才能使用拍照导入、AI 翻译和越南语语音助手。

## 7. 上线加固

- [ ] PWA 图标、缓存和断网只读状态加固。
- [ ] 落实 `docs/DESIGN_SYSTEM.md` 的色彩 token、应用端/营销端主色分工、48px 主触控目标和越南语排版。
- [ ] Push 失效订阅清理、投递指标、营业准备检查和未接单升级提醒。
- [ ] 限流、配对码防爆破、CSP 和上传校验。
- [ ] Workers Observability、结构化日志和告警。
- [ ] staging/production 独立资源与迁移流程。
- [ ] 完整 Playwright 闭环和真实手机验收。
- [ ] 360px Android/iOS 店主全流程验收：Free 手工建菜单；Pro 拍照/语音建菜单和审核；以及建桌、分享桌码、终端管理、升级/取消订阅和数据导出。
- [ ] 隐私政策、服务条款和门店数据删除流程。
- [ ] 越南语 SEO/AEO 页面、canonical、hreflang、JSON-LD、robots 和 sitemap。
- [ ] 接入 Search Console/Bing Webmaster Tools，建立关键词 → 注册 → 首份菜单发布漏斗。

完成标准：达到 PRD 的“MVP 完成定义”，可进入封闭试点。

## 暂不实施

- Stripe 自动订阅：先用 manual entitlement 验证付费意愿。
- payOS/VietQR 自动回调：先支持门店直接收款和员工人工确认。
- 原生 App、自定义原生警报声、打印机、POS 和厨房屏。
- 餐厅搜索、推荐、会员、储值、广告和任何平台代收。
- 面向顾客的 AI 聊天/推荐、AI 自动发布和批量生成薄 SEO 内容。
