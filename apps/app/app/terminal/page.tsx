import { APP_NAME } from '@taomenu/shared';

export const metadata = {
  title: 'Terminal',
};

export default function TerminalPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 py-6">
      <header>
        <p className="text-sm font-semibold text-jade-600">{APP_NAME}</p>
        <h1 className="mt-1 text-2xl font-extrabold text-ink-900">Terminal nhân viên</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Khung PWA nhận order — realtime, push và máy trạng thái sẽ nối ở giai đoạn 4–5.
        </p>
      </header>
      <div className="mt-8 flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white p-8 text-center">
        <p className="text-4xl font-extrabold tabular-nums text-gold-600">0</p>
        <p className="mt-2 text-sm font-semibold text-ink-900">Chưa có order mới</p>
      </div>
    </div>
  );
}
