type PickupMenuPageProps = {
  params: Promise<{ storeSlug: string; pickupToken: string }>;
};

export async function generateMetadata({ params }: PickupMenuPageProps) {
  const { storeSlug } = await params;
  return {
    title: `Lấy món · ${storeSlug}`,
    robots: { index: false, follow: false },
  };
}

export default async function PickupMenuPage({ params }: PickupMenuPageProps) {
  const { storeSlug, pickupToken } = await params;

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 py-6">
      <p className="text-sm font-semibold text-brand-600">Mã lấy món</p>
      <h1 className="mt-1 text-2xl font-extrabold text-ink-900">{storeSlug}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Order mang đi và số lấy món sẽ có ở giai đoạn 3. Token (rút gọn):{' '}
        <span className="font-mono text-ink-900">{pickupToken.slice(0, 8)}…</span>
      </p>
    </div>
  );
}
