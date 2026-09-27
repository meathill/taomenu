import Link from 'next/link';

type PaginationProps = {
  page: number;
  total: number;
  pageSize: number;
  base: string;
  params?: Record<string, string | undefined>;
  labels: { info: string; prev: string; next: string };
};

function hrefFor(base: string, page: number, params?: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value) search.set(key, value);
  }
  search.set('page', String(page));
  return `${base}?${search.toString()}`;
}

/** 上一页 / 下一页。服务端渲染链接，无客户端 JS。 */
export function Pagination({ page, total, pageSize, base, params, labels }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground">{labels.info}</p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={hrefFor(base, page - 1, params)}
            className="rounded-full border border-border bg-white px-3 py-1.5 text-sm font-bold text-ink-900"
          >
            {labels.prev}
          </Link>
        ) : null}
        {page < pages ? (
          <Link
            href={hrefFor(base, page + 1, params)}
            className="rounded-full border border-border bg-white px-3 py-1.5 text-sm font-bold text-ink-900"
          >
            {labels.next}
          </Link>
        ) : null}
      </div>
      <span className="sr-only">
        Page {page} of {pages}
      </span>
    </div>
  );
}
