import {
  DEFAULT_LOCALE,
  isLocale,
  type Locale,
  matchLocaleFromAcceptLanguage,
} from '@taomenu/shared';

export type OtpEmailType = 'sign-in' | 'email-verification' | 'forget-password' | string;

type OtpEmailCopy = {
  subject: string;
  heading: string;
  intro: string;
  bodyLine: string;
  expires: string;
  ignore: string;
  footer: string;
};

const COPY: Record<
  Locale,
  Record<'sign-in' | 'email-verification' | 'forget-password' | 'default', OtpEmailCopy>
> = {
  en: {
    'sign-in': {
      subject: 'Your TaoMenu sign-in code',
      heading: 'Your TaoMenu sign-in code',
      intro: 'Enter this code to continue. It expires in 5 minutes.',
      bodyLine: 'Your OTP code:',
      expires: 'This code is valid for 5 minutes.',
      ignore: 'If you did not request this code, you can ignore this email.',
      footer: '— TaoMenu',
    },
    'email-verification': {
      subject: 'Verify your TaoMenu email',
      heading: 'Verify your email',
      intro: 'Enter this code to verify your email. It expires in 5 minutes.',
      bodyLine: 'Your verification code:',
      expires: 'This code is valid for 5 minutes.',
      ignore: 'If you did not request this code, you can ignore this email.',
      footer: '— TaoMenu',
    },
    'forget-password': {
      subject: 'Reset your TaoMenu password',
      heading: 'Password reset code',
      intro: 'Enter this code to reset your password. It expires in 5 minutes.',
      bodyLine: 'Your reset code:',
      expires: 'This code is valid for 5 minutes.',
      ignore: 'If you did not request this code, you can ignore this email.',
      footer: '— TaoMenu',
    },
    default: {
      subject: 'Your TaoMenu verification code',
      heading: 'Your verification code',
      intro: 'Enter this code to continue. It expires in 5 minutes.',
      bodyLine: 'Your OTP code:',
      expires: 'This code is valid for 5 minutes.',
      ignore: 'If you did not request this code, you can ignore this email.',
      footer: '— TaoMenu',
    },
  },
  zh: {
    'sign-in': {
      subject: 'TaoMenu 登录验证码',
      heading: 'TaoMenu 登录验证码',
      intro: '请输入以下验证码以继续。验证码 5 分钟内有效。',
      bodyLine: '您的验证码：',
      expires: '验证码有效期为 5 分钟。',
      ignore: '如非本人操作，请忽略此邮件。',
      footer: '— TaoMenu',
    },
    'email-verification': {
      subject: '验证您的 TaoMenu 邮箱',
      heading: '验证邮箱',
      intro: '请输入以下验证码完成邮箱验证。验证码 5 分钟内有效。',
      bodyLine: '您的验证码：',
      expires: '验证码有效期为 5 分钟。',
      ignore: '如非本人操作，请忽略此邮件。',
      footer: '— TaoMenu',
    },
    'forget-password': {
      subject: '重置 TaoMenu 密码',
      heading: '密码重置验证码',
      intro: '请输入以下验证码以重置密码。验证码 5 分钟内有效。',
      bodyLine: '您的验证码：',
      expires: '验证码有效期为 5 分钟。',
      ignore: '如非本人操作，请忽略此邮件。',
      footer: '— TaoMenu',
    },
    default: {
      subject: 'TaoMenu 验证码',
      heading: '验证码',
      intro: '请输入以下验证码以继续。验证码 5 分钟内有效。',
      bodyLine: '您的验证码：',
      expires: '验证码有效期为 5 分钟。',
      ignore: '如非本人操作，请忽略此邮件。',
      footer: '— TaoMenu',
    },
  },
  ja: {
    'sign-in': {
      subject: 'TaoMenu ログインコード',
      heading: 'TaoMenu ログインコード',
      intro: '続行するにはこのコードを入力してください。有効期限は 5 分です。',
      bodyLine: 'OTP コード：',
      expires: 'このコードは 5 分間有効です。',
      ignore: '心当たりがない場合はこのメールを無視してください。',
      footer: '— TaoMenu',
    },
    'email-verification': {
      subject: 'TaoMenu メール確認',
      heading: 'メール確認コード',
      intro: 'メール確認のためこのコードを入力してください。有効期限は 5 分です。',
      bodyLine: '確認コード：',
      expires: 'このコードは 5 分間有効です。',
      ignore: '心当たりがない場合はこのメールを無視してください。',
      footer: '— TaoMenu',
    },
    'forget-password': {
      subject: 'TaoMenu パスワード再設定',
      heading: 'パスワード再設定コード',
      intro: 'パスワード再設定のためこのコードを入力してください。有効期限は 5 分です。',
      bodyLine: '再設定コード：',
      expires: 'このコードは 5 分間有効です。',
      ignore: '心当たりがない場合はこのメールを無視してください。',
      footer: '— TaoMenu',
    },
    default: {
      subject: 'TaoMenu 確認コード',
      heading: '確認コード',
      intro: '続行するにはこのコードを入力してください。有効期限は 5 分です。',
      bodyLine: 'OTP コード：',
      expires: 'このコードは 5 分間有効です。',
      ignore: '心当たりがない場合はこのメールを無視してください。',
      footer: '— TaoMenu',
    },
  },
  vi: {
    'sign-in': {
      subject: 'Mã đăng nhập TaoMenu',
      heading: 'Mã đăng nhập TaoMenu',
      intro: 'Nhập mã sau để tiếp tục. Mã hết hạn sau 5 phút.',
      bodyLine: 'Mã OTP của bạn:',
      expires: 'Mã có hiệu lực trong 5 phút.',
      ignore: 'Nếu bạn không yêu cầu mã này, hãy bỏ qua email.',
      footer: '— TaoMenu',
    },
    'email-verification': {
      subject: 'Xác minh email TaoMenu',
      heading: 'Xác minh email',
      intro: 'Nhập mã sau để xác minh email. Mã hết hạn sau 5 phút.',
      bodyLine: 'Mã xác minh của bạn:',
      expires: 'Mã có hiệu lực trong 5 phút.',
      ignore: 'Nếu bạn không yêu cầu mã này, hãy bỏ qua email.',
      footer: '— TaoMenu',
    },
    'forget-password': {
      subject: 'Đặt lại mật khẩu TaoMenu',
      heading: 'Mã đặt lại mật khẩu',
      intro: 'Nhập mã sau để đặt lại mật khẩu. Mã hết hạn sau 5 phút.',
      bodyLine: 'Mã OTP của bạn:',
      expires: 'Mã có hiệu lực trong 5 phút.',
      ignore: 'Nếu bạn không yêu cầu mã này, hãy bỏ qua email.',
      footer: '— TaoMenu',
    },
    default: {
      subject: 'Mã xác minh TaoMenu',
      heading: 'Mã xác minh',
      intro: 'Nhập mã sau để tiếp tục. Mã hết hạn sau 5 phút.',
      bodyLine: 'Mã OTP của bạn:',
      expires: 'Mã có hiệu lực trong 5 phút.',
      ignore: 'Nếu bạn không yêu cầu mã này, hãy bỏ qua email.',
      footer: '— TaoMenu',
    },
  },
};

export function resolveEmailLocale(input: {
  locale?: string | null;
  cookieHeader?: string | null;
  acceptLanguage?: string | null;
}): Locale {
  if (isLocale(input.locale)) {
    return input.locale;
  }
  const fromCookie = parseLocaleCookie(input.cookieHeader);
  if (fromCookie) {
    return fromCookie;
  }
  return matchLocaleFromAcceptLanguage(input.acceptLanguage) ?? DEFAULT_LOCALE;
}

function parseLocaleCookie(cookieHeader: string | null | undefined): Locale | null {
  if (!cookieHeader) {
    return null;
  }
  const match = /(?:^|;\s*)NEXT_LOCALE=([^;]+)/.exec(cookieHeader);
  const value = match?.[1] ? decodeURIComponent(match[1].trim()) : null;
  return isLocale(value) ? value : null;
}

export function getOtpEmailCopy(locale: Locale, type: OtpEmailType): OtpEmailCopy {
  const pack = COPY[locale] ?? COPY[DEFAULT_LOCALE];
  if (type === 'sign-in' || type === 'email-verification' || type === 'forget-password') {
    return pack[type];
  }
  return pack.default;
}
