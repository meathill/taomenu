# TaoMenu

TaoMenu 是面向越南中小餐饮门店的轻量二维码点餐 SaaS。它同时支持桌边堂食和柜台取餐，适用于餐厅、咖啡店、饮品店、法棍店以及无座/少座街边店。它帮助门店减少手写点单、重复沟通、结账排队和取餐混乱；不提供餐厅发现、交易撮合、代收款或跨店消费者服务。

产品以手机为唯一必需设备：没有电脑的店主也能完成注册、手工建菜单、生成并分享桌码、配对员工终端和管理订阅；Pro 进一步提供拍照/PDF 建菜单、AI 翻译和越南语语音输入与操作。

## 仓库结构

```text
apps/
  website/   # 营销站与 SEO（localhost:3000）
  app/       # PWA 产品面：登录、店主/员工、顾客扫码（localhost:3001）
packages/
  config/    # 共享 tsconfig
  shared/    # 跨端常量、Zod schema
  ui/        # 设计 token 与工具
  db/        # Drizzle schema、migration、repository
```

## 开发

需要 Node.js ≥ 24 与 pnpm 11。

```bash
pnpm install
# app 本地密钥与 D1（含 VAPID，用于员工 Push）
cp apps/app/.dev.vars.example apps/app/.dev.vars
pnpm --filter @taomenu/app db:migrate:local
pnpm dev:website   # http://localhost:3000
pnpm dev:app       # http://localhost:3001
```

员工终端：打开 `/terminal` → 安装 PWA → **Bật thông báo** → **Gửi thử** → 点击通知完成验证。  
新订单约 2s 后推送（仅订单仍为 `submitted`）；顾客页 `/m/*` 不申请通知。

```bash
pnpm format
pnpm typecheck
pnpm test
pnpm build
```

## 当前文档

- [产品需求文档](docs/PRD.md)
- [设计系统与移动端交互基线](docs/DESIGN_SYSTEM.md)
- [技术规格](docs/TECH_SPEC.md)
- [越南关键词研究](docs/KEYWORD_RESEARCH.md)
- [实施计划](WIP.md)
- [测试指南](TESTING.md)
- [开发笔记](DEV_NOTE.md)
- [AI 行为准则](AGENTS.md)

## MVP 定位

- 顾客无需注册，扫描桌码后查看菜单并提交订单。
- 无座/少座店可放置一张公共取餐码；每笔订单获得当日唯一取餐号，员工在手机上标记可取并口头叫号。
- 取餐顾客无需常驻点餐页、不申请 Push；切回页面或下拉刷新时同步最新进度。
- 顾客可呼叫服务员或请求结账；这些是免费核心能力，不触及支付处理。
- 门店直接收取现金或使用自己的收款二维码，TaoMenu 不接触餐费。
- 免费版允许一个员工终端处理订单；付费版允许多个员工终端实时协作。
- 免费版发布一种菜单语言；付费版发布多语言菜单。
- 免费版菜单只能逐项手工录入；拍照/PDF 识别、AI 翻译和越南语语音助手只属于 Pro。
- 菜单数据从第一天保持结构化；所有 AI 草稿和语音写操作都必须人工确认。
- 员工端使用前台 WebSocket 和后台 Web Push 接收新订单提醒。
- 第一版交付为可安装 PWA，不开发原生 App、打印机或后厨硬件集成。
