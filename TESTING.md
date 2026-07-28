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

## 约定

- 单元/集成测试用 Vitest
- 修 bug 时先固化可复现用例，再改代码
- 业务状态机、金额、取餐号、租户隔离等后续阶段必须有测
- 浏览器闭环（Playwright）在后续阶段再加

## 覆盖率

当前阶段 0 只要求关键 pure function 有 smoke；不设强制覆盖率门槛。业务模块落地后再定阈值。
