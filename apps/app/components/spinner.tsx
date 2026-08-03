import { CircleNotchIcon } from '@phosphor-icons/react';
import { cn } from '@taomenu/ui';

type SpinnerProps = {
  className?: string;
};

/** 异步加载指示；配合 Button pending 使用 */
export function Spinner({ className }: SpinnerProps) {
  return (
    <CircleNotchIcon
      className={cn('size-4 shrink-0 animate-spin', className)}
      weight="bold"
      aria-hidden
    />
  );
}
