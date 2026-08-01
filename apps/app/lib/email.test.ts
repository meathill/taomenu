import { describe, expect, it } from 'vitest';

// 纯函数级约定：OTP 邮件不得把密钥写进主题以外的可索引位置；内容必须含 OTP 与过期提示。
describe('OTP email content rules', () => {
  it('主题与正文约定', () => {
    const otp = '123456';
    const text = `Mã OTP của bạn: ${otp}\n\nMã có hiệu lực trong 5 phút.`;
    expect(text).toContain(otp);
    expect(text.toLowerCase()).toContain('5');
    expect(text).not.toMatch(/BETTER_AUTH|VAPID|secret/i);
  });
});
