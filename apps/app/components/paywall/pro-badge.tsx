import { CrownIcon } from '@phosphor-icons/react/dist/ssr';
import { cn } from '@taomenu/ui';

type ProBadgeProps = {
  className?: string;
};

/** 统一的付费信号：皇冠 + Pro（issue #26，参考 dyqr） */
export function ProBadge({ className }: ProBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-600 px-2 py-0.5 text-[11px] font-black leading-4 text-white',
        className,
      )}
    >
      <CrownIcon className="size-3" weight="fill" aria-hidden />
      Pro
    </span>
  );
}
