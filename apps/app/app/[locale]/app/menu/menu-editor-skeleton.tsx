import { Skeleton } from '@/components/ui/skeleton';

function ItemRowSkeleton() {
  return (
    <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-2">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-7 w-14" />
        <Skeleton className="h-7 w-24" />
        <Skeleton className="size-7" />
        <Skeleton className="size-7" />
      </div>
    </div>
  );
}

function CategorySkeleton({ extraRow = false }: { extraRow?: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <Skeleton className="h-6 w-20" />
        <div className="flex gap-2">
          <Skeleton className="h-7 w-14" />
          <Skeleton className="h-7 w-20" />
        </div>
      </div>
      <div className="divide-y divide-border px-4">
        <ItemRowSkeleton />
        {extraRow ? <ItemRowSkeleton /> : null}
      </div>
    </div>
  );
}

export function MenuEditorSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-5 pb-24 lg:pb-0" aria-busy="true" aria-label={label} role="status">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-5 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="space-y-4">
        <CategorySkeleton extraRow />
        <CategorySkeleton />
      </div>
    </div>
  );
}
