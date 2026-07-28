import { APP_NAME } from '@taomenu/shared';
import { Suspense } from 'react';
import { LoginForm } from './login-form';

export const metadata = {
  title: 'Đăng nhập',
};

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <p className="text-sm font-bold tracking-wide text-jade-600 uppercase">{APP_NAME}</p>
      <h1 className="mt-2 text-2xl font-extrabold text-ink-900">Đăng nhập cửa hàng</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Dùng Google hoặc email OTP. Không cần mật khẩu.
      </p>
      <div className="mt-8 rounded-2xl border border-border bg-white p-5 shadow-sm">
        <Suspense
          fallback={
            <div className="min-h-12 rounded-xl bg-muted text-center text-sm leading-[3rem] text-muted-foreground">
              …
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
