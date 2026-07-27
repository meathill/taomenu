# DEV_NOTE

长期有效的工程决策与踩坑记录。

## Monorepo 拆分（2026-07-28）

- `apps/website`：营销站与 SEO（`taomenu.app`，本地 :3000）
- `apps/app`：PWA 产品面——店主/员工登录能力 + 顾客扫码公开页（`app.taomenu.app`，本地 :3001）
- 顾客 `/m/*` 放在 `app` 并 `noindex`，不做门店发现 SEO
- 不预建空的 realtime/ai/db 包；需要时再加
- `packages/*` 直接导出 TypeScript 源码（`workspace:*` + Next `transpilePackages`），不强制 Vite 出 dist，减少双构建

## 本地开发会话

- 阶段 0 用 cookie `taomenu_dev_session=1` 模拟登录；阶段 1 接 Better Auth 后删除 `apps/app/lib/auth-stub.ts`
