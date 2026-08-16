# 升级 SEO + 丰富首页 + 7 个越南语落地页（2026-08-16）

依据 `docs/KEYWORD_RESEARCH.md`，落地首页定位、结构化数据与高意图落地页。

## 内容方向（2026-08-16 用户确认）

- **核心痛点 = 外国游客语言障碍**：游客看不懂菜单、服务员口语难交流 → 扫码点单的必要性
- **保留差异点**：手机管理 / 顾客免装 App / 免费开始 / 无需 POS
- **付款口径**：不把"不代收餐费"当卖点；表述为"目前顾客直接付款，在线收款正在开发中"
- **增值功能**：AI 菜品照片美化（Pro 已上线）+ 促销套餐 / 会员系统（规划中，Coming soon）

## 任务分解

- [x] 阶段 1：SEO 基建 — metadataBase、OG/Twitter、canonical helper、WebSite/Organization JSON-LD、OG 图（commit 4973f9b）
- [x] 阶段 3：落地页基建 — lib/landing.ts、app/[locale]/[slug]/page.tsx、sitemap 扩展（commit c98fbbe）
- [x] 阶段 2：首页内容 — 4 语言 messages + page.tsx 区块（痛点区/差异点/如何运作/场景/增值功能/FAQ/CTA）+ FAQPage JSON-LD（commit c98fbbe）
- [x] 阶段 4：7 个落地页内容（content/landing/{slug}/{locale}.mdx × 28，commit 815c446）
- [x] 回归：format / typecheck / test（210 例）/ build 全绿；浏览器验证 HTML/OG/canonical/sitemap
- [x] 更新 DEV_NOTE.md、清理 WIP.md

## 关键决策

- 落地页 URL 直接 `/{locale}/{slug}`，与 docs slug 不冲突；非法 slug → notFound
- FAQ 只写真实产品事实；"规划中"功能明确标注 Coming soon，不编造已上线
- 内容页 force-static，与现有 doc 页一致
- 不伪造评分型 JSON-LD；不做 llms.txt
