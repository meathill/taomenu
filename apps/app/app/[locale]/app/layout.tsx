import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { PageMessages } from '@/components/page-messages';
import { getOwnerStoreSelection } from '@/lib/active-store';
import { getHelpUrl } from '@/lib/public-url';
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
    if (selection.hasStaffMembership) {
      redirect('/terminal/pair');
    }
    return children;
  }

  const helpUrl = getHelpUrl(await getLocale());
  return (
    <PageMessages namespaces={['owner']}>
      <OwnerShell stores={selection.stores} user={selection.user} helpUrl={helpUrl}>
        {children}
      </OwnerShell>
    </PageMessages>
  );
}
