import '@/lib/auth-runtime';
import { createDb, schema } from '@taomenu/db';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { emailOTP } from 'better-auth/plugins';
import { getEnvAsync } from '@/lib/cf';
import { sendOtpEmail } from '@/lib/email';
import { getAuthBaseUrl } from '@/lib/public-url';
import { attributeSignupFromCookie } from '@/lib/referral';
import { extractRequestHeaders } from '@/lib/request-headers';

function hasGoogleOAuth(env: CloudflareEnv): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

/** 按请求构建 Better Auth（D1 绑定来自 Cloudflare 运行时，不能模块级单例）。 */
export async function getAuth() {
  const env = await getEnvAsync();
  const db = createDb(env.DB);
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
    onAPIError: {
      // 错误直接带回登录页（?error=xxx），避免经过 /api/auth/error → / → /login 丢失错误信息
      errorURL: `${baseURL}/login`,
    },
    telemetry: { enabled: false },
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
    databaseHooks: {
      user: {
        create: {
          // emailOTP 与 Google OAuth 两条注册路径都会走到这里；内部整体 try/catch，不阻断注册
          after: (user, ctx) => attributeSignupFromCookie(user.id, ctx),
        },
      },
    },
    advanced: {
      // 与主站 dyqr better-auth 隔离，避免 .dyqr.me 同名 cookie 抢 session
      cookiePrefix: 'taomenu',
      ipAddress: {
        ipAddressHeaders: ['cf-connecting-ip', 'x-forwarded-for'],
      },
      // 生产 HTTPS 必须 secure；不要开 crossSubDomainCookies（只写 app.menu.dyqr.me host-only）
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

export type Auth = Awaited<ReturnType<typeof getAuth>>;
