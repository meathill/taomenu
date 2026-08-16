# 升级 SEO + 丰富首页 + 7 个越南语落地页（2026-08-16）

依据 `docs/KEYWORD_RESEARCH.md`，落地首页定位、结构化数据与高意图落地页。

## 任务分解

- [ ] 阶段 0：起草 FAQ（首页 6 条 + 每落地页 2-3 条），用户确认
- [ ] 阶段 1：SEO 基建 — metadataBase、OG/Twitter、canonical helper、WebSite/Organization JSON-LD、OG 图
- [ ] 阶段 2：首页丰富 — Hero 关键词优化、差异点条、如何运作、场景卡（内链落地页）、FAQ + FAQPage JSON-LD、最终 CTA
- [ ] 阶段 3：落地页基建 — lib/landing.ts、app/[locale]/[slug]/page.tsx、sitemap 扩展、messages
- [ ] 阶段 4：7 个落地页内容（content/landing/{slug}/{locale}.mdx × 28）
- [ ] 回归：format / typecheck / test / build，浏览器验收
- [ ] 更新 DEV_NOTE.md、清理 WIP.md

## 关键决策

- 落地页 URL 直接 `/{locale}/{slug}`，与 docs slug 不冲突；非法 slug → notFound
- FAQ 只写真实产品事实（免费/Pro 边界、5 语言、20 次 AI 导入等），不编造评价/数据
- 内容页 force-static，与现有 doc 页一致
- 不伪造评分型 JSON-LD；不做 llms.txt（可后置实验）
