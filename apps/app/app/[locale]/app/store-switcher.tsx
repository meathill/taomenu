'use client';

import { CaretDownIcon, CheckIcon, StorefrontIcon } from '@phosphor-icons/react';
import type { StoreRow } from '@taomenu/db';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { withStore } from '@/lib/active-store-utils';

type StoreSwitcherProps = {
  stores: StoreRow[];
  activeStore: StoreRow;
  onStoreChange: (storeSlug: string) => void;
  onNavigate?: () => void;
};

export function StoreSwitcher({
  stores,
  activeStore,
  onStoreChange,
  onNavigate,
}: StoreSwitcherProps) {
  const t = useTranslations('owner');
  const [open, setOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);
  const mode = getStoreMode(activeStore, t);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function handleSelect(storeSlug: string) {
    setOpen(false);
    onStoreChange(storeSlug);
    onNavigate?.();
  }

  function handleManageStores() {
    setOpen(false);
    onNavigate?.();
  }

  return (
    <div ref={switcherRef} className="relative mt-5">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {t('switchStore')}
      </p>
      <button
        type="button"
        id="store-switcher"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="mt-2 flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-border bg-white px-4 text-left outline-none ring-jade-600 transition-shadow hover:border-jade-600 focus:ring-2"
      >
        <span className="min-w-0">
          <span className="block truncate text-base font-extrabold text-ink-900">
            {activeStore.name}
          </span>
          <span className="mt-1 block truncate text-xs font-semibold text-muted-foreground">
            {mode} · {t('plan', { plan: activeStore.plan })}
          </span>
        </span>
        <CaretDownIcon
          className={[
            'size-5 shrink-0 text-ink-900 transition-transform',
            open ? 'rotate-180' : '',
          ].join(' ')}
          weight="bold"
        />
      </button>

      {open ? (
        <div
          role="menu"
          aria-labelledby="store-switcher"
          className="absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-border bg-white p-2 shadow-xl"
        >
          <div className="space-y-1">
            {stores.map((store) => {
              const selected = store.id === activeStore.id;
              return (
                <button
                  key={store.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  onClick={() => handleSelect(store.slug)}
                  className="flex min-h-14 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-jade-50 focus:bg-jade-50 focus:outline-none"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-extrabold text-ink-900">
                      {store.name}
                    </span>
                    <span className="mt-1 block truncate text-xs font-semibold text-muted-foreground">
                      {getStoreMode(store, t)} · {t('plan', { plan: store.plan })}
                    </span>
                  </span>
                  {selected ? (
                    <CheckIcon className="size-5 shrink-0 text-jade-600" weight="bold" />
                  ) : null}
                </button>
              );
            })}
          </div>
          <Link
            href={withStore('/app/stores', activeStore.slug)}
            onClick={handleManageStores}
            className="mt-2 flex min-h-12 items-center gap-3 border-t border-border px-3 pt-3 text-sm font-bold text-jade-600 hover:text-jade-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-jade-600"
          >
            <StorefrontIcon className="size-5 shrink-0" weight="duotone" />
            {t('manageStores')}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function getStoreMode(
  store: StoreRow,
  t: (key: 'modeCounter' | 'modeHybrid' | 'modeDineIn') => string,
): string {
  if (store.serviceMode === 'counter_pickup') return t('modeCounter');
  if (store.serviceMode === 'hybrid') return t('modeHybrid');
  return t('modeDineIn');
}
