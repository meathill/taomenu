export const WEBSITE_URL = process.env.NEXT_PUBLIC_WEBSITE_URL ?? 'http://localhost:3000';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';

export function getAppLoginUrl(): string {
  return `${APP_URL}/login`;
}

export function getAppSignupUrl(): string {
  return `${APP_URL}/login`;
}
