# landing 页面图片

- `images/landing/{slug}/hero.webp` — 每页顶部场景图（AI 生成，1248×832 WebP，暖色调纪实摄影，无可读文字）
- `screenshots/{slug}/*.webp` — 真实 app 截图（本会话截图管线产出），命名：`menu.webp` / `modifiers.webp` / `cart.webp` / `order.webp` / `staff.webp` / `terminal.webp` / `bill.webp` 等

接入新图时同步更新 `lib/landing.ts` 的 `LANDING_HERO` 与对应 MDX。