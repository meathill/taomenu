import Link from 'next/link';

type RangeTabsProps = {
  current: '7d' | '30d' | '90d';
  base: string;
  labels: { '7d': string; '30d': string; '90d': string };
  extra?: Record<string, string | undefined>;
};

function hrefFor(base: string, range: string, extra?: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  params.set('range', range);
  for (const [key, value] of Object.entries(extra ?? {})) {
    if (value) params.set(key, value);
  }
  return `${base}?${params.toString()}`;
}

/** 时间范围切换。服务端渲染的普通链接，无客户端 JS。 */
export function RangeTabs({ current, base, labels, extra }: RangeTabsProps) {
  const ranges = ['7d', '30d', '90d'] as const;
  return (
    <div className="flex gap-1 rounded-full border border-border bg-white p-1">
      {ranges.map((range) => {
        const active = range === current;
        return (
          <Link
            key={range}
            href={hrefFor(base, range, extra)}
            aria-current={active ? 'page' : undefined}
            className={`rounded-full px-3 py-1.5 text-sm font-bold ${
              active ? 'bg-ink-900 text-white' : 'text-muted-foreground hover:text-ink-900'
            }`}
          >
            {labels[range]}
          </Link>
        );
      })}
    </div>
  );
}
