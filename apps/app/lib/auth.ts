import { schema } from '@taomenu/db';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { emailOTP } from 'better-auth/plugins';
import { getEnv } from '@/lib/cf';
import { getDb } from '@/lib/db';
import { sendOtpEmail } from '@/lib/email';

function hasGoogleOAuth(env: CloudflareEnv): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

/** 按请求构建 Better Auth（D1 绑定来自 Cloudflare 运行时，不能模块级单例）。 */
export function getAuth() {
  const env = getEnv();
  const db = getDb();

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
    baseURL: env.BETTER_AUTH_URL || env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001',
    secret: env.BETTER_AUTH_SECRET,
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
    },
    plugins: [
      emailOTP({
        async sendVerificationOTP({ email, otp, type }) {
          await sendOtpEmail({ email, otp, type });
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
