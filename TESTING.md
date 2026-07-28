# 测试指南

## 运行

```bash
pnpm test
```

按包：

```bash
pnpm --filter @taomenu/shared test
pnpm --filter @taomenu/ui test
pnpm --filter @taomenu/db test
pnpm --filter @taomenu/app test
```

租户隔离：`packages/db` 中 `getStoreIfMatches` 在 `storeId` 与 `StoreContext` 不一致时不得触库并返回 `null`。

菜单发布：`validateMenuForPublish` 覆盖空菜单、缺基础语言、Free 多语言、无可用菜。

订单：`priceOrderLines` 拒绝售罄/非法数量；`canTransition` 覆盖堂食/外带状态机。

token：`hashToken` / `tokensMatch` 对错误 token 必须失败。

Push：文案不含菜品/金额；测试推送 URL 含 subscription id 供点击验证。本地需配置 VAPID 后真机测锁屏收单。

## 约定

- 单元/集成测试用 Vitest
- 修 bug 时先固化可复现用例，再改代码
- 业务状态机、金额、取餐号、租户隔离等后续阶段必须有测
- 浏览器闭环（Playwright）在后续阶段再加

## 覆盖率

当前阶段 0 只要求关键 pure function 有 smoke；不设强制覆盖率门槛。业务模块落地后再定阈值。
