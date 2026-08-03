import { cn } from '@taomenu/ui';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from '@/components/spinner';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** 异步进行中：禁用并显示 spinner */
  pending?: boolean;
  /**
   * icon-only 按钮：pending 时只显示 spinner（不叠在图标旁）。
   * 默认 false：spinner + 原 children（适合带文案的按钮）。
   */
  iconOnly?: boolean;
  children: ReactNode;
};

export function Button({
  pending = false,
  iconOnly = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const isDisabled = Boolean(disabled || pending);

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={pending || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 disabled:pointer-events-none disabled:opacity-60',
        className,
      )}
      {...rest}
    >
      {pending ? (
        <>
          <Spinner className={iconOnly ? 'size-5' : 'size-4'} />
          {iconOnly ? <span className="sr-only">{children}</span> : children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
