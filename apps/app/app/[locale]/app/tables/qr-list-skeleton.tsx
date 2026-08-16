import { Skeleton } from '@/components/ui/skeleton';

function QrRowSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <Skeleton className="size-24 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-7 w-16" />
      </div>
    </div>
  );
}

export function QrListSkeleton({ label, rows = 2 }: { label: string; rows?: number }) {
  return (
    <li aria-busy="true" aria-label={label} role="status">
      <QrRowSkeleton />
      {rows > 1 ? <QrRowSkeleton /> : null}
    </li>
  );
}
