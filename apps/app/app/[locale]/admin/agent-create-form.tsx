'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/button';
import { fieldClassName } from '@/components/ui/field';

const INPUT_CLASS = `flex-1 ${fieldClassName}`;

/** 创建代理商。成功后 router.refresh() 让 RSC 重新拉取汇总表。 */
export function AgentCreateForm() {
  const t = useTranslations('admin');
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      if (!res.ok) {
        // 409 是 email 唯一冲突，值得给出可操作的提示
        setError(res.status === 409 ? t('emailTaken') : t('createFailed'));
        return;
      }
      setName('');
      setEmail('');
      router.refresh();
    } catch {
      setError(t('createFailed'));
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="rounded-2xl border border-border bg-white p-4"
    >
      <p className="text-sm font-bold text-ink-900">{t('createTitle')}</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={name}
          disabled={pending}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('namePlaceholder')}
          aria-label={t('nameLabel')}
          maxLength={100}
          className={INPUT_CLASS}
        />
        <input
          value={email}
          type="email"
          disabled={pending}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t('emailPlaceholder')}
          aria-label={t('emailLabel')}
          maxLength={200}
          className={INPUT_CLASS}
        />
        <Button
          type="submit"
          variant="default"
          size="lg"
          pending={pending}
          disabled={!name.trim() || !email.trim()}
        >
          {t('create')}
        </Button>
      </div>
      {error ? <p className="mt-2 text-xs font-bold text-brand-600">{error}</p> : null}
    </form>
  );
}
