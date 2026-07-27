import { APP_NAME } from '@taomenu/shared';
import { Suspense } from 'react';
import { SignInButton } from './sign-in-button';

export const metadata = {
  title: 'Đăng nhập',
};

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <p className="text-sm font-bold tracking-wide text-jade-600 uppercase">{APP_NAME}</p>
      <h1 className="mt-2 text-2xl font-extrabold text-ink-900">Đăng nhập cửa hàng</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Giai đoạn 0: đăng nhập thật (Google / email OTP) sẽ có ở giai đoạn sau. Hiện tại dùng nút
        dưới để mô phỏng phiên dev.
      </p>
      <div className="mt-8 rounded-2xl border border-border bg-white p-5 shadow-sm">
        <Suspense
          fallback={
            <div className="min-h-12 rounded-xl bg-muted text-center text-sm leading-[3rem] text-muted-foreground">
              …
            </div>
          }
        >
          <SignInButton />
        </Suspense>
      </div>
    </div>
  );
}
