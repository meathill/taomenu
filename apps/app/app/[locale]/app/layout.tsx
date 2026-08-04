import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { PageMessages } from '@/components/page-messages';
import { getOwnerStoreSelection } from '@/lib/active-store';
import { OwnerShell } from './owner-shell';

type OwnerLayoutProps = {
  children: ReactNode;
};

export default async function OwnerLayout({ children }: OwnerLayoutProps) {
  const selection = await getOwnerStoreSelection();
  if (!selection) {
    redirect('/login?next=/app');
  }

  if (selection.stores.length === 0) {
    return children;
  }

  return (
    <PageMessages namespaces={['owner']}>
      <OwnerShell stores={selection.stores} user={selection.user}>
        {children}
      </OwnerShell>
    </PageMessages>
  );
}
