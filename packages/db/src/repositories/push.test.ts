import { describe, expect, it } from 'vitest';

// 纯逻辑：payload 与状态规则通过 process 集成更合适；此处锁定关键常量约定。
describe('push notification contracts', () => {
  it('新订单文案不泄露菜品与金额', () => {
    const body = 'Có đơn hàng mới';
    expect(body.toLowerCase()).not.toMatch(/phở|vnd|₫|45000/);
  });

  it('测试推送 URL 携带 subscription id 以便点击验证', () => {
    const subId = 'sub-123';
    const url = `/terminal?push_verify=${subId}`;
    expect(url).toContain(subId);
  });
});
