import { APP_NAME } from '@taomenu/shared';
import { OnboardingForm } from './onboarding-form';

export const metadata = {
  title: 'Tạo cửa hàng',
};

export default function OnboardingPage() {
  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <p className="text-sm font-semibold text-jade-600">{APP_NAME}</p>
      <h1 className="mt-1 text-2xl font-extrabold text-ink-900">Mở cửa hàng</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Chỉ cần điện thoại. Hoàn tất trong vài phút — menu và mã QR sẽ ở bước sau.
      </p>
      <div className="mt-8 rounded-2xl border border-border bg-white p-5 shadow-sm">
        <OnboardingForm />
      </div>
    </div>
  );
}
