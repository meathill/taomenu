'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import {
  Drawer,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
} from '@/components/ui/drawer';

type ResponsiveDrawerProps = {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onOpenChange: (open: boolean) => void;
};

export function ResponsiveDrawer({
  open,
  title,
  description,
  children,
  footer,
  onOpenChange,
}: ResponsiveDrawerProps) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)');
    function update() {
      setIsDesktop(media.matches);
    }
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} position={isDesktop ? 'right' : 'bottom'}>
      <DrawerPopup
        showCloseButton
        showBar={!isDesktop}
        className={isDesktop ? undefined : 'max-h-[min(92dvh,52rem)]'}
      >
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          {description ? <DrawerDescription>{description}</DrawerDescription> : null}
        </DrawerHeader>
        <DrawerPanel className="min-h-0">{children}</DrawerPanel>
        {footer ? <DrawerFooter>{footer}</DrawerFooter> : null}
      </DrawerPopup>
    </Drawer>
  );
}
