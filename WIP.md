# #6 越南落地页真实感升级（2026-08-17）

依据 issue #6，把越南落地页从「纯文字」升级为「真实感」：hero 场景图（用户 GPT+/Grok 生成）+ 真实 app 截图（本会话产出）+ 菜品图（免费图库下载）。

## 阶段 A：落地页图片基建

- [ ] mdx-components.tsx 新增 `Image`（next/image）与 `Screenshot`（手机框 mockup）组件
- [ ] landing-page.tsx 加 hero 图槽；lib/landing.ts 加 `LANDING_HERO` 清单
- [ ] public/images/landing/{slug}/ 目录 + 命名规范 README

## 阶段 B：截图管线

- [ ] 造数脚本 scripts/seed-demo-stores.ts：写本地 D1，建 6 个演示门店（面包/咖啡外带/早餐/快餐/chè/通用餐厅），含 modifier、多语言、餐桌/取餐码、预置各状态订单
- [ ] 菜品图：免费图库下载 → image-converter 工具转 WebP（480-640px q80）→ 本地 R2
- [ ] 本地起 app，OTP 登录，Chrome DevTools 截全流程：顾客菜单/修改器/购物车/订单状态/请求结账 + 员工菜单编辑器/订单看板/收款 + 多语言游客场景
- [ ] 截图转 WebP 存 public/screenshots/{slug}/

## 阶段 C：#6 内容

- [ ] 5 新垂直页：phan-mem-order-tiem-banh / quan-cafe-takeaway / quan-an-sang / quan-do-an-nhanh / quan-che
- [ ] 4 核心页优化：phan-mem-order-nha-hang / menu-qr-cho-quan-an / phan-mem-order-tren-dien-thoai / menu-da-ngon-ngu
- [ ] 每页内嵌截图 + hero 槽；4 语言 messages + MDX

## 阶段 D：图片 prompt

- [ ] issue #6 comments：每页 hero 场景图 prompt + 菜品图 prompt + 输出规格

## 阶段 E：回归收尾

- [ ] format / typecheck / test / build
- [ ] 浏览器验证页面 200、图片渲染、sitemap 含新 URL
- [ ] 更新 docs/KEYWORD_RESEARCH.md §3.2；按阶段 commit；清理 WIP.md

## 关键决策

- 图片处理统一走 https://tools.meathill.com/tools/image-converter（浏览器本地转换，支持批量/WebP/尺寸/质量），不引入 sharp
- hero 图用户产出后放 public/images/landing/{slug}/，本会话先留槽位与 prompt
- 造数走 @taomenu/db repo 函数直写本地 D1（miniflare state），不走 UI e2e