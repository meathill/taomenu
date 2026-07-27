'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { DEV_SESSION_COOKIE } from '@/lib/auth-stub';

export function SignInButton() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleDevSignIn() {
    const maxAge = 60 * 60 * 24 * 7;
    // 阶段 0 开发会话占位；阶段 1 改用 Better Auth，不再直接写 cookie
    // biome-ignore lint/suspicious/noDocumentCookie: 临时 dev session stub
    document.cookie = `${DEV_SESSION_COOKIE}=1; path=/; max-age=${maxAge}; samesite=lax`;
    const next = searchParams.get('next') || '/app';
    router.push(next.startsWith('/') ? next : '/app');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDevSignIn}
      className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-jade-600 px-4 py-3 text-sm font-bold text-white hover:bg-[#265c4e]"
    >
      Tiếp tục (dev session)
    </button>
  );
}
