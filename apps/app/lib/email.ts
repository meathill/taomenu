import { getEnv } from '@/lib/cf';
import { getOtpEmailCopy, type OtpEmailType, resolveEmailLocale } from '@/lib/otp-email-copy';

export type { OtpEmailType };

/**
 * 通过 Cloudflare Email Sending binding（env.EMAIL）发送 OTP。
 * 本地未配置 binding 时回退到 console，便于开发。
 * 文案语言：优先 explicit locale → NEXT_LOCALE cookie → Accept-Language → en。
 */
export async function sendOtpEmail(input: {
  email: string;
  otp: string;
  type: OtpEmailType;
  locale?: string | null;
  cookieHeader?: string | null;
  acceptLanguage?: string | null;
}): Promise<void> {
  const env = getEnv();
  const { email, otp, type } = input;
  const locale = resolveEmailLocale({
    locale: input.locale,
    cookieHeader: input.cookieHeader,
    acceptLanguage: input.acceptLanguage,
  });
  const copy = getOtpEmailCopy(locale, type);

  // 开发兜底：无 EMAIL binding 或显式要求日志
  if (!env.EMAIL || env.EMAIL_DEV_LOG_ONLY === '1') {
    console.info(`[taomenu-otp] locale=${locale} type=${type} email=${email} otp=${otp}`);
    return;
  }

  const fromAddress = env.EMAIL_FROM || 'noreply@dyqr.me';
  const fromName = env.EMAIL_FROM_NAME || 'TaoMenu';

  const text = [copy.bodyLine, otp, '', copy.expires, copy.ignore, '', copy.footer].join('\n');

  const html = `
<!DOCTYPE html>
<html lang="${locale}">
<body style="font-family:system-ui,-apple-system,sans-serif;background:#FFF9F2;margin:0;padding:24px;color:#211A18;">
  <div style="max-width:420px;margin:0 auto;background:#fff;border-radius:16px;padding:24px;border:1px solid #e6d9cb;">
    <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#2E6F5E;">TaoMenu</p>
    <h1 style="margin:0 0 12px;font-size:20px;">${escapeHtml(copy.heading)}</h1>
    <p style="margin:0 0 16px;color:#5c524e;font-size:14px;">${escapeHtml(copy.intro)}</p>
    <div style="background:#FFF1F0;border-radius:12px;padding:16px;text-align:center;letter-spacing:0.35em;font-size:28px;font-weight:800;color:#211A18;">
      ${escapeHtml(otp)}
    </div>
    <p style="margin:16px 0 0;font-size:12px;color:#999;">${escapeHtml(copy.ignore)}</p>
  </div>
</body>
</html>`.trim();

  try {
    await env.EMAIL.send({
      to: email,
      from: { email: fromAddress, name: fromName },
      subject: copy.subject,
      text,
      html,
    });
  } catch (error) {
    console.error('[taomenu-email] send failed', error);
    if (env.EMAIL_FALLBACK_LOG === '1') {
      console.info(
        `[taomenu-otp-fallback] locale=${locale} type=${type} email=${email} otp=${otp}`,
      );
      return;
    }
    throw new Error('Failed to send OTP email. Please try again.');
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
