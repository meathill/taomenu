import { getEnv } from '@/lib/cf';

/** 前端判断是否展示 Google 登录按钮。 */
export async function GET() {
  try {
    const env = getEnv();
    return Response.json({
      google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
      emailOtp: true,
    });
  } catch {
    return Response.json({ google: false, emailOtp: true });
  }
}
