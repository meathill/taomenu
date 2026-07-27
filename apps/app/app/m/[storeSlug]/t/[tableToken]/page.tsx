type TableMenuPageProps = {
  params: Promise<{ storeSlug: string; tableToken: string }>;
};

export async function generateMetadata({ params }: TableMenuPageProps) {
  const { storeSlug } = await params;
  return {
    title: `Menu · ${storeSlug}`,
    robots: { index: false, follow: false },
  };
}

export default async function TableMenuPage({ params }: TableMenuPageProps) {
  const { storeSlug, tableToken } = await params;

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 py-6">
      <p className="text-sm font-semibold text-brand-600">Quét mã bàn</p>
      <h1 className="mt-1 text-2xl font-extrabold text-ink-900">{storeSlug}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Menu khách và giỏ hàng sẽ có ở giai đoạn 3. Token bàn (rút gọn):{' '}
        <span className="font-mono text-ink-900">{tableToken.slice(0, 8)}…</span>
      </p>
    </div>
  );
}
