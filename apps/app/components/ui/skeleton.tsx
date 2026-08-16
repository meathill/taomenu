import { cn } from '@taomenu/ui';
import type * as React from 'react';

export function Skeleton({ className, ...props }: React.ComponentProps<'div'>): React.ReactElement {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted motion-reduce:animate-none', className)}
      data-slot="skeleton"
      {...props}
    />
  );
}
