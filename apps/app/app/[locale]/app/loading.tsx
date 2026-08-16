import { Skeleton } from '@/components/ui/skeleton';

export default function OwnerLoading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <header className="space-y-3 border-b border-border/80 pb-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-56 max-w-full" />
        <Skeleton className="h-4 w-[28rem] max-w-full" />
      </header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {['orders', 'value', 'payments', 'requests'].map((key) => (
          <div key={key} className="rounded-2xl border border-border bg-white p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-4 h-8 w-20" />
          </div>
        ))}
      </div>
      <div className="space-y-3 rounded-2xl border border-border bg-white p-5">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    </div>
  );
}
