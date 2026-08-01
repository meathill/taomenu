/**
 * 与 `wrangler types` 生成的 CloudflareEnv 做接口合并。
 * 密钥与可选配置不手写 binding 形状；EMAIL / DB / ASSETS 等以 typegen 为准。
 */
interface CloudflareEnv {
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_JWK?: string;
  VAPID_SUBJECT?: string;
  CRON_SECRET?: string;
  EMAIL_FROM?: string;
  EMAIL_FROM_NAME?: string;
  /** 设为 "1" 时强制只打 OTP 日志，不真正发信 */
  EMAIL_DEV_LOG_ONLY?: string;
  /** 发信失败时回退日志（开发用） */
  EMAIL_FALLBACK_LOG?: string;
  NEXT_PUBLIC_APP_URL?: string;
  NEXT_PUBLIC_WEBSITE_URL?: string;
}
