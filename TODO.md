# 产品待办

## Pro 订阅生产验收

Stripe 对接与 VND/USD/JPY/CNY 多币种计费已实现并配置完成（issue #1 已关闭）：
两个订阅 Product/Price 已创建，四币种 `currency_options` 已推送并与代码配置校验一致，
`STRIPE_PRO_PRICE_ID` 已写入 `apps/app/wrangler.jsonc`，webhook 已补事件幂等去重。

- [ ] 真实支付方式走通 Checkout → Webhook 开通 Pro → Billing Portal → 取消订阅回落的生产回归
      （由测试人员另行验证，发现问题另开 issue）

## 工程与上线加固

- [ ] GitHub Actions CI（lint / typecheck / test / build）
- [ ] Playwright e2e（含双店主隔离场景）
- [ ] 限流与桌码 token 滥用细化自动化
- [ ] 审计日志（订单、菜单、设置变更）
- [ ] Cloudflare Queue 替代 setTimeout 投递 push 通知（生产强化）
- [ ] 需要时再加 `apps/realtime`（多终端实时协作）
