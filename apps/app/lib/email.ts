import { getEnv } from '@/lib/cf';

export type OtpEmailType = 'sign-in' | 'email-verification' | 'forget-password' | string;

/**
 * 通过 Cloudflare Email Sending binding（env.EMAIL）发送 OTP。
 * 本地未配置 binding 时回退到 console，便于开发。
 */
export async function sendOtpEmail(input: {
  email: string;
  otp: string;
  type: OtpEmailType;
}): Promise<void> {
  const env = getEnv();
  const { email, otp, type } = input;

  // 开发兜底：无 EMAIL binding 或显式要求日志
  if (!env.EMAIL || env.EMAIL_DEV_LOG_ONLY === '1') {
    console.info(`[taomenu-otp] type=${type} email=${email} otp=${otp}`);
    return;
  }

  // 发件域名须已在 Cloudflare Email Sending onboard；无 taomenu 域名时可用已有域名（如 meathill.com）
  const fromAddress = env.EMAIL_FROM || 'noreply@meathill.com';
  const fromName = env.EMAIL_FROM_NAME || 'TaoMenu';

  const subjects: Record<string, string> = {
    'sign-in': 'Mã đăng nhập TaoMenu',
    'email-verification': 'Xác minh email TaoMenu',
    'forget-password': 'Đặt lại mật khẩu TaoMenu',
  };
  const subject = subjects[type] || 'Mã xác minh TaoMenu';

  const text = [
    `Mã OTP của bạn: ${otp}`,
    '',
    'Mã có hiệu lực trong 5 phút.',
    'Nếu bạn không yêu cầu mã này, hãy bỏ qua email.',
    '',
    '— TaoMenu',
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html lang="vi">
<body style="font-family:system-ui,-apple-system,sans-serif;background:#FFF9F2;margin:0;padding:24px;color:#211A18;">
  <div style="max-width:420px;margin:0 auto;background:#fff;border-radius:16px;padding:24px;border:1px solid #e6d9cb;">
    <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#2E6F5E;">TaoMenu</p>
    <h1 style="margin:0 0 12px;font-size:20px;">${escapeHtml(subject)}</h1>
    <p style="margin:0 0 16px;color:#5c524e;font-size:14px;">Nhập mã sau để tiếp tục. Mã hết hạn sau 5 phút.</p>
    <div style="background:#FFF1F0;border-radius:12px;padding:16px;text-align:center;letter-spacing:0.35em;font-size:28px;font-weight:800;color:#211A18;">
      ${escapeHtml(otp)}
    </div>
    <p style="margin:16px 0 0;font-size:12px;color:#999;">Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
  </div>
</body>
</html>`.trim();

  try {
    await env.EMAIL.send({
      to: email,
      from: { email: fromAddress, name: fromName },
      subject,
      text,
      html,
    });
  } catch (error) {
    console.error('[taomenu-email] send failed', error);
    // 本地 remote binding 失败时仍打日志，避免完全卡死开发
    if (env.EMAIL_FALLBACK_LOG === '1') {
      console.info(`[taomenu-otp-fallback] type=${type} email=${email} otp=${otp}`);
      return;
    }
    throw new Error('Không gửi được email OTP. Thử lại sau.');
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
