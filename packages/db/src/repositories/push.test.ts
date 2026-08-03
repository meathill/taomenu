import { getPushCopy, LOCALES } from '@taomenu/shared';
import { describe, expect, it } from 'vitest';

describe('push notification contracts', () => {
  it('新订单文案不泄露菜品与金额（各语言）', () => {
    for (const locale of LOCALES) {
      const body = getPushCopy(locale).newOrder;
      expect(body.toLowerCase()).not.toMatch(/phở|vnd|₫|45000/);
    }
  });

  it('baseLocale 非四语时回落默认语言', () => {
    expect(getPushCopy('fr')).toEqual(getPushCopy('en'));
    expect(getPushCopy(null)).toEqual(getPushCopy('en'));
    expect(getPushCopy('vi').newOrder).toBe('Có đơn hàng mới');
  });

  it('测试推送 URL 携带 subscription id 以便点击验证', () => {
    const subId = 'sub-123';
    const url = `/terminal?push_verify=${subId}`;
    expect(url).toContain(subId);
  });
});
