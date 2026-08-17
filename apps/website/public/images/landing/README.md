# landing 页面图片

- `images/landing/{slug}/hero.webp` — 每页顶部场景图（AI 生成，1248×832 WebP，暖色调纪实摄影，无可读文字）
- `screenshots/{slug}/*.webp` — 真实 app 截图。手机竖屏（780×1688）套手机框；桌面横屏（1280×800，如 `staff` / `menu-editor` / `qr-tables` / `payment`）全宽展示。点击可放大。

接入新图时同步更新 `lib/landing.ts` 的 `LANDING_HERO` 与对应 MDX。