# TaoMenu MVP 实施计划

本计划将 [PRD](docs/PRD.md) 和 [TECH_SPEC](docs/TECH_SPEC.md) 拆成可以连续交付的开发阶段。每个阶段完成后独立提交，并保持主分支可构建、可测试。

仓库前台拆为 `apps/website`（营销/SEO）与 `apps/app`（PWA 产品面）；决策见 [DEV_NOTE.md](DEV_NOTE.md)。

## 0. 工程基线

- [x] 初始化 pnpm workspace、TypeScript、Biome 和共享配置
- [x] 创建 `apps/website`、`apps/app`、`packages/config`、`packages/shared`、`packages/ui`
- [x] 配置 Next.js / OpenNext 骨架与本地端口（website:3000，app:3001）
- [x] 建立 Vitest smoke（shared / ui / app auth-stub）
- [x] 添加 `TESTING.md`、`DEV_NOTE.md`；更新 README
- [ ] 后续：GitHub Actions CI、Playwright
- [ ] 后续：需要时再加 `apps/realtime`、`apps/ai`、`packages/db`

完成标准：空应用能在本地启动，format / typecheck / test / build 通过。

## 1. 身份、租户与门店

- [x] Better Auth Google OAuth（可选）+ 邮箱 OTP；account linking 信任 Google
- [x] `packages/db`：auth / stores / store_members schema + migration
- [x] 创建门店 + mobile-first onboarding（店名 → 经营模式；counter 不要求桌号）
- [x] 表单 localStorage 自动保存草稿 + safe-area 底部留白
- [x] 强制 `StoreContext` 的 repository；`getStoreIfMatches` 跨租户短路
- [x] 租户隔离单测 + slug 单测
- [ ] 后续：真邮件发送 OTP、Web Share 基线、Playwright 双店主 e2e

完成标准：两个店主只能访问自己的门店，跨租户实体 ID 返回 `404`。

## 2. 菜单与多语言数据模型

- [ ] 分类、菜品、规格和翻译 schema
- [ ] 菜单编辑、排序、售罄和发布流程
- [ ] 服务端发布完整性校验与 `menu_version`
- [ ] R2 菜品图片上传
- [ ] Free 单菜单语言权益检查
- [ ] Free 手工录入加速：保存并继续、复制菜品、沿用分类/规格、数字键盘、批量上下架

完成标准：Free 店主只用手机手工创建并发布一份越南语菜单，不触发任何 AI 服务。

## 3. 桌台、取餐点、二维码与顾客下单

- [ ] 桌台和 token 轮换
- [ ] 公共取餐点和 token 轮换，与桌码共用安全/限流组件
- [ ] 单张二维码和 A4 PDF 导出
- [ ] 调用系统分享面板分享二维码/短链接，提供下载和复制回退
- [ ] 顾客菜单、购物车、规格选择和订单确认页
- [ ] table session 自动创建和复用
- [ ] 外带订单不创建 table session；按门店时区原子分配当日唯一取餐号
- [ ] 服务端价格重算、幂等下单和订单 public token
- [ ] 呼叫服务员/请求结账、同类请求合并和顾客状态查询
- [ ] 每桌频率/待处理上限、取消冷却、一键暂停和桌码 token 轮换

完成标准：两台顾客手机可以向同一桌追加订单，重复请求不会创建重复订单；顾客可发起服务请求，滥用保护不阻塞正常桌码；20 笔并发外带订单产生 20 个不重复取餐号。

## 4. 单员工终端闭环

- [ ] 一次性配对码和终端凭证
- [ ] 员工工作台及订单声音提示
- [ ] PWA Service Worker、安装引导和通知能力检测
- [ ] VAPID、Push subscription API 和测试通知
- [ ] D1 notification outbox、Cloudflare Queue、重试去重和 DLQ
- [ ] 新订单后台 Push、角标和点击后订单跳转
- [ ] 服务请求的员工端提醒、确认/完成状态和顾客端回显
- [ ] 堂食与外带状态机
- [ ] 取餐队列、大字取餐号、再次叫号和员工代客创建外带订单
- [ ] 现金/转账/其他付款记录和冲正
- [ ] 余额计算、关闭和重新开启桌台
- [ ] 关键操作审计日志

完成标准：Free 门店可用一台员工终端完成一次完整堂食/外带营业流程；真机后台收到测试订单通知。

## 5. 多终端实时协作

- [ ] `StoreRoom` Durable Object
- [ ] realtime ticket、WebSocket 与事件协议
- [ ] 终端租约、heartbeat、过期清理和主动撤销
- [ ] version gap 检测、snapshot 重同步和轮询兜底
- [ ] 乐观并发冲突 UI
- [ ] Free 1 台、Pro 5 台权益测试

## 6. Pro、多语言和试点工具

- [ ] Pro 多语言、AI 导入/翻译、越南语语音
- [ ] 管理员手工 entitlement override
- [ ] 激活漏斗指标

## 7. 上线加固

- [ ] PWA/安全/观测/Playwright/SEO 闭环（详见 PRD MVP 完成定义）

## 暂不实施

- Stripe 自动订阅：先用 manual entitlement 验证付费意愿
- payOS/VietQR 自动回调：先支持门店直接收款和员工人工确认
- 原生 App、自定义原生警报声、打印机、POS 和厨房屏
- 餐厅搜索、推荐、会员、储值、广告和任何平台代收
- 面向顾客的 AI 聊天/推荐、AI 自动发布和批量生成薄 SEO 内容
