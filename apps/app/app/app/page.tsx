import { ForkKnifeIcon, QrCodeIcon, StorefrontIcon } from '@phosphor-icons/react/dist/ssr';
import { APP_NAME } from '@taomenu/shared';
import Link from 'next/link';

export const metadata = {
  title: 'Chủ quán',
};

const links = [
  { href: '/app/menu', label: 'Menu', icon: ForkKnifeIcon },
  { href: '/app/tables', label: 'Bàn / QR', icon: QrCodeIcon },
  { href: '/terminal', label: 'Terminal nhân viên', icon: StorefrontIcon },
] as const;

export default function OwnerHomePage() {
  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 py-6 pb-safe">
      <header className="mb-6">
        <p className="text-sm font-semibold text-jade-600">{APP_NAME}</p>
        <h1 className="mt-1 text-2xl font-extrabold text-ink-900">Bảng điều khiển</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Khung chủ quán — menu, bàn và terminal sẽ được nối ở các giai đoạn sau.
        </p>
      </header>
      <ul className="space-y-3">
        {links.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 font-semibold text-ink-900 shadow-sm"
            >
              <Icon className="size-6 text-jade-600" weight="duotone" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
