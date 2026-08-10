import { describe, expect, it } from 'vitest';
import {
  parsePaidInvoice,
  readInvoiceSubscriptionId,
  resolveAgentRevenueKind,
} from './stripe-invoice-attribution';

const store = {
  stripePlanSubscriptionId: 'sub_plan',
  stripeStaffSeatSubscriptionId: 'sub_seats',
};

describe('readInvoiceSubscriptionId', () => {
  it('读顶层 subscription', () => {
    expect(readInvoiceSubscriptionId({ subscription: 'sub_plan' })).toBe('sub_plan');
  });

  it('读新版 parent.subscription_details.subscription', () => {
    expect(
      readInvoiceSubscriptionId({
        parent: { subscription_details: { subscription: 'sub_seats' } },
      }),
    ).toBe('sub_seats');
  });

  it('顶层优先于 parent', () => {
    expect(
      readInvoiceSubscriptionId({
        subscription: 'sub_plan',
        parent: { subscription_details: { subscription: 'sub_seats' } },
      }),
    ).toBe('sub_plan');
  });

  it('字段缺失或形状不符时返回 null', () => {
    expect(readInvoiceSubscriptionId({})).toBeNull();
    expect(readInvoiceSubscriptionId({ subscription: null })).toBeNull();
    expect(readInvoiceSubscriptionId({ subscription: { id: 'sub_plan' } })).toBeNull();
    expect(readInvoiceSubscriptionId({ parent: 'x' })).toBeNull();
    expect(readInvoiceSubscriptionId({ parent: {} })).toBeNull();
    expect(readInvoiceSubscriptionId({ parent: { subscription_details: {} } })).toBeNull();
  });
});

describe('resolveAgentRevenueKind', () => {
  it('与门店订阅 id 比对定性', () => {
    expect(resolveAgentRevenueKind('sub_plan', store)).toBe('pro_plan');
    expect(resolveAgentRevenueKind('sub_seats', store)).toBe('staff_seats');
  });

  it('对不上或没有订阅 id 时记 unknown', () => {
    expect(resolveAgentRevenueKind('sub_other', store)).toBe('unknown');
    expect(resolveAgentRevenueKind(null, store)).toBe('unknown');
  });

  it('门店订阅 id 为空时不会被 null 误匹配', () => {
    expect(
      resolveAgentRevenueKind(null, {
        stripePlanSubscriptionId: null,
        stripeStaffSeatSubscriptionId: null,
      }),
    ).toBe('unknown');
  });
});

describe('parsePaidInvoice', () => {
  const invoice = {
    id: 'in_1',
    customer: 'cus_1',
    currency: 'usd',
    amount_paid: 1900,
    subscription: 'sub_plan',
  };

  it('解析出记账所需字段', () => {
    expect(parsePaidInvoice(invoice)).toEqual({
      stripeInvoiceId: 'in_1',
      stripeCustomerId: 'cus_1',
      currency: 'usd',
      amountMinor: 1900,
      subscriptionId: 'sub_plan',
    });
  });

  it('金额 ≤ 0 的 trial / 0 元发票跳过', () => {
    expect(parsePaidInvoice({ ...invoice, amount_paid: 0 })).toBeNull();
    expect(parsePaidInvoice({ ...invoice, amount_paid: -100 })).toBeNull();
    expect(parsePaidInvoice({ ...invoice, amount_paid: '1900' })).toBeNull();
    expect(parsePaidInvoice({ ...invoice, amount_paid: undefined })).toBeNull();
  });

  it('缺 id / customer / currency 一律跳过', () => {
    expect(parsePaidInvoice({ ...invoice, id: undefined })).toBeNull();
    expect(parsePaidInvoice({ ...invoice, customer: null })).toBeNull();
    expect(parsePaidInvoice({ ...invoice, customer: { id: 'cus_1' } })).toBeNull();
    expect(parsePaidInvoice({ ...invoice, currency: '' })).toBeNull();
  });

  it('没有订阅信息时 subscriptionId 为 null，仍然记账', () => {
    const parsed = parsePaidInvoice({ ...invoice, subscription: undefined });
    expect(parsed?.subscriptionId).toBeNull();
    expect(parsed?.amountMinor).toBe(1900);
  });
});
