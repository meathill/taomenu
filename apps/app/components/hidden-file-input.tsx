'use client';

import type { ComponentProps } from 'react';

type HiddenFileInputProps = Omit<ComponentProps<'input'>, 'type' | 'className' | 'children'>;

/**
 * 原生 file input 在部分浏览器（尤其是套 sr-only / 放在 label 里时）
 * 仍会露出系统文案 “Choose File”。始终 display:none，由自定义按钮触发。
 */
export function HiddenFileInput({ tabIndex = -1, ...props }: HiddenFileInputProps) {
  return <input {...props} type="file" tabIndex={tabIndex} className="hidden" />;
}
