import { schema } from '@taomenu/db';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { emailOTP } from 'better-auth/plugins';
import { getEnv } from '@/lib/cf';
import { getDb } from '@/lib/db';
import { sendOtpEmail } from '@/lib/email';
import { getAuthBaseUrl } from '@/lib/public-url';

function hasGoogleOAuth(env: CloudflareEnv): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

/** better-auth emailOTP 第二参是 endpoint ctx，从中取请求头用于邮件语言。 */
function extractRequestHeaders(ctx: unknown): Headers | null {
  if (!ctx || typeof ctx !== 'object') {
    return null;
  }
  const record = ctx as Record<string, unknown>;
  if (record.request instanceof Request) {
    return record.request.headers;
  }
  if (record.headers instanceof Headers) {
    return record.headers;
  }
  return null;
}

/** 按请求构建 Better Auth（D1 绑定来自 Cloudflare 运行时，不能模块级单例）。 */
export function getAuth() {
  const env = getEnv();
  const db = getDb();
  const baseURL = getAuthBaseUrl();

  const socialProviders = hasGoogleOAuth(env)
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID as string,
          clientSecret: env.GOOGLE_CLIENT_SECRET as string,
        },
      }
    : undefined;

  return betterAuth({
    appName: 'TaoMenu',
    // baseURL 只读 process.env，不要从 getCloudflareContext 取 NEXT_PUBLIC_*
    baseURL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [baseURL],
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    emailAndPassword: {
      enabled: false,
    },
    socialProviders,
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ['google'],
      },
    },
    advanced: {
      ipAddress: {
        ipAddressHeaders: ['cf-connecting-ip', 'x-forwarded-for'],
      },
      // 生产 HTTPS 必须 secure，否则浏览器可能不存 session cookie
      useSecureCookies: baseURL.startsWith('https://'),
      defaultCookieAttributes: {
        sameSite: 'lax',
        path: '/',
        secure: baseURL.startsWith('https://'),
      },
    },
    plugins: [
      emailOTP({
        async sendVerificationOTP({ email, otp, type }, ctx) {
          const headers = extractRequestHeaders(ctx);
          await sendOtpEmail({
            email,
            otp,
            type,
            cookieHeader: headers?.get('cookie'),
            acceptLanguage: headers?.get('accept-language'),
          });
        },
        otpLength: 6,
        expiresIn: 300,
        allowedAttempts: 5,
      }),
      nextCookies(),
    ],
  });
}

export type Auth = ReturnType<typeof getAuth>;
