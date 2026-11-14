'use client';

import type { StoreRow } from '@taomenu/db';
import { createContext, type ReactNode, useContext, useState } from 'react';
import { PaywallDialog } from './paywall-dialog';
import type { PaywallFeature } from './paywall-features';

type PaywallContextValue = {
  isPro: boolean;
  openPaywall: (feature: PaywallFeature) => void;
};

const PaywallContext = createContext<PaywallContextValue | null>(null);

type PaywallProviderProps = {
  store: StoreRow;
  children: ReactNode;
};

/** 后台全局付费墙：任何 Pro 功能入口都调用 openPaywall，而不是各自跳设置页 */
export function PaywallProvider({ store, children }: PaywallProviderProps) {
  const [feature, setFeature] = useState<PaywallFeature | null>(null);

  function handleOpenChange(open: boolean) {
    if (!open) {
      setFeature(null);
    }
  }

  return (
    <PaywallContext.Provider value={{ isPro: store.plan === 'pro', openPaywall: setFeature }}>
      {children}
      <PaywallDialog store={store} feature={feature} onOpenChange={handleOpenChange} />
    </PaywallContext.Provider>
  );
}

/** 没有 Provider 时（理论上不会出现）退回设置页的升级区块 */
export function usePaywall(): PaywallContextValue {
  const context = useContext(PaywallContext);
  if (context) {
    return context;
  }
  return {
    isPro: false,
    openPaywall: () => window.location.assign('/app/settings?upgrade=pro#upgrade'),
  };
}
