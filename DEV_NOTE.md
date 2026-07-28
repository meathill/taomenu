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
