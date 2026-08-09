# 产品待办

## Pro 订阅生产配置

Pro 权益预览、使用额度、菜单识别、菜单翻译、越南语语音录入、菜品图片美化和定价说明均已实现并完成生产验收。

- [ ] 在 Stripe 创建 Pro 月付 Price（默认币种建议 VND），将 ID 填入 `apps/app/wrangler.jsonc`
      的 `STRIPE_PRO_PRICE_ID`（当前为空串占位）
- [ ] 跑 `pnpm stripe:prices:check` / `pnpm stripe:prices:sync` 把四币种价格推送到两个 Price
      的 `currency_options`（流程见 DEPLOYMENT.md「多币种价格维护」）
- [ ] 用测试支付方式完成 Checkout、Webhook 开通 Pro、Billing Portal 和取消订阅回归

配置完成前，应用内升级入口会明确提示 Billing 尚未配置，不伪装成可购买。
