'use client';

import type { AgentStatus } from '@taomenu/db';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/button';

type AgentStatusToggleProps = {
  agentId: string;
  status: AgentStatus;
};

/** 启用 / 禁用代理商。禁用后其推广链接立即失效（db 层只认 active）。 */
export function AgentStatusToggle({ agentId, status }: AgentStatusToggleProps) {
  const t = useTranslations('admin');
  const router = useRouter();
  const [current, setCurrent] = useState<AgentStatus>(status);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const isActive = current === 'active';

  async function toggle() {
    setPending(true);
    setFailed(false);
    const next: AgentStatus = isActive ? 'disabled' : 'active';
    try {
      const res = await fetch(`/api/admin/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        setFailed(true);
        return;
      }
      setCurrent(next);
      router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <span
        className={
          isActive
            ? 'rounded-full bg-jade-50 px-2.5 py-1 text-xs font-bold text-jade-600'
            : 'rounded-full bg-paper-50 px-2.5 py-1 text-xs font-bold text-muted-foreground'
        }
      >
        {isActive ? t('statusActive') : t('statusDisabled')}
      </span>
      <Button
        type="button"
        pending={pending}
        onClick={() => void toggle()}
        className="min-h-9 rounded-xl border border-border px-2.5 text-xs font-bold text-ink-900"
      >
        {isActive ? t('disable') : t('enable')}
      </Button>
      {failed ? (
        <span className="text-xs font-bold text-brand-600">{t('statusFailed')}</span>
      ) : null}
    </div>
  );
}
