import { Skeleton } from '@/components/ui/skeleton';

function CustomerItemSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-white p-3.5">
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="size-4" />
    </div>
  );
}

function CustomerCategorySkeleton({ extraItem = false }: { extraItem?: boolean }) {
  return (
    <div>
      <Skeleton className="mb-3 h-5 w-28" />
      <div className="space-y-3">
        <CustomerItemSkeleton />
        {extraItem ? <CustomerItemSkeleton /> : null}
      </div>
    </div>
  );
}

export function CustomerMenuSkeleton({ label }: { label: string }) {
  return (
    <div
      className="mx-auto min-h-dvh w-full min-w-0 max-w-lg"
      aria-busy="true"
      aria-label={label}
      role="status"
    >
      <header className="sticky top-0 z-10 border-b border-border bg-paper-50/95 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-36" />
          </div>
          <Skeleton className="h-8 w-16 rounded-xl" />
        </div>
        <div className="mt-3 flex gap-2">
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-10 flex-1 rounded-xl" />
        </div>
      </header>
      <div className="space-y-8 px-4 py-5">
        <CustomerCategorySkeleton extraItem />
        <CustomerCategorySkeleton />
      </div>
    </div>
  );
}
