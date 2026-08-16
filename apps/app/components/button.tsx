'use client';

import { cn } from '@taomenu/ui';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Button as UiButton, type ButtonProps as UiButtonProps } from '@/components/ui/button';

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> &
  Pick<UiButtonProps, 'render' | 'size' | 'variant'> & {
    /** 异步进行中：禁用并显示 spinner */
    pending?: boolean;
    /**
     * 同组其他按钮异步进行中：禁用但不显示 spinner。
     * 配合 pending 使用：一组按钮共享一个进行中状态时，
     * 只有被点击的那个传 pending，其余传 busy。
     */
    busy?: boolean;
    /**
     * icon-only 按钮：pending 时只显示 spinner（不叠在图标旁）。
     * 默认 false：spinner + 原 children（适合带文案的按钮）。
     */
    iconOnly?: boolean;
    children: ReactNode;
  };

export function Button({
  pending = false,
  busy = false,
  iconOnly = false,
  variant,
  size,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const resolvedSize = iconOnly ? (size ?? 'icon') : size;

  return (
    <UiButton
      type={type}
      variant={variant ?? 'bare'}
      size={resolvedSize ?? 'default'}
      loading={pending}
      disabled={Boolean(disabled || busy)}
      className={cn(variant == null && resolvedSize == null && 'h-auto', className)}
      {...rest}
    >
      {children}
    </UiButton>
  );
}
