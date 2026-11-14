import { describe, expect, it } from 'vitest';
import { CUSTOMER_UI_MESSAGES, resolveCustomerUiLocale } from './customer-ui-messages';

describe('resolveCustomerUiLocale', () => {
  it('有界面译文的菜单语言直接采用', () => {
    expect(resolveCustomerUiLocale('en', 'vi')).toBe('en');
    expect(resolveCustomerUiLocale('ja', 'vi')).toBe('ja');
  });

  it('没有界面译文时回退到当前界面语言', () => {
    expect(resolveCustomerUiLocale('fr', 'vi')).toBe('vi');
    expect(resolveCustomerUiLocale('fr', 'not-a-locale')).toBe('en');
  });

  it('四种语言都有顾客页和 Powered by 文案', () => {
    expect(CUSTOMER_UI_MESSAGES.en.shell).toMatchObject({ poweredBy: 'Powered by {app}' });
    expect(CUSTOMER_UI_MESSAGES.vi.shell).toMatchObject({ poweredBy: 'Vận hành bởi {app}' });
    expect(CUSTOMER_UI_MESSAGES.en.customer).toMatchObject({ menuLanguage: 'Menu language' });
    expect(CUSTOMER_UI_MESSAGES.zh.customer).toBeTruthy();
    expect(CUSTOMER_UI_MESSAGES.ja.customer).toBeTruthy();
  });
});
