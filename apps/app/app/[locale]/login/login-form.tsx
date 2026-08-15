'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/button';
import { authClient } from '@/lib/auth-client';

type Providers = {
  google: boolean;
  emailOtp: boolean;
};

type Step = 'email' | 'otp';

export function LoginForm() {
  const t = useTranslations('login');
  const searchParams = useSearchParams();
  const oauthError = searchParams.get('error');
  const oauthErrorDescription = searchParams.get('error_description');
  const [providers, setProviders] = useState<Providers>({ google: false, emailOtp: true });
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  useEffect(() => {
    function loadProviders() {
      fetch('/api/auth/providers')
        .then((res) => res.json() as Promise<Providers>)
        .then((data) => setProviders(data))
        .catch(() => {
          setProviders({ google: false, emailOtp: true });
        });
    }
    loadProviders();
  }, []);

  function nextPath(): string {
    const next = searchParams.get('next');
    return next?.startsWith('/') ? next : '/app';
  }

  /** 登录成功后用整页跳转，确保刚写入的 session cookie 一定带上下一页请求。 */
  function goAfterLogin() {
    window.location.assign(nextPath());
  }

  async function handleGoogle() {
    setError(null);
    setBusyAction('google');
    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: nextPath(),
      });
    } catch {
      setError(t('errorGoogle'));
      setBusyAction(null);
    }
  }

  async function handleSendOtp(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusyAction('sendOtp');
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email: email.trim(),
        type: 'sign-in',
      });
      if (result.error) {
        setError(result.error.message || t('errorSendOtp'));
        return;
      }
      setStep('otp');
    } catch {
      setError(t('errorSendOtp'));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleVerifyOtp(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusyAction('verifyOtp');
    try {
      const trimmedEmail = email.trim();
      const result = await authClient.signIn.emailOtp({
        email: trimmedEmail,
        otp: otp.trim(),
        // 首次注册时 better-auth 需要 name；用邮箱本地部分兜底
        name: trimmedEmail.split('@')[0] || 'Owner',
      });
      if (result.error) {
        setError(result.error.message || t('errorBadOtp'));
        setBusyAction(null);
        return;
      }
      // 不要用 SPA router.push：cookie 刚 Set 时 soft 导航可能读不到 session，会弹回 /login
      goAfterLogin();
    } catch {
      setError(t('errorBadOtp'));
      setBusyAction(null);
    }
  }

  return (
    <div className="space-y-4">
      {providers.google ? (
        <Button
          type="button"
          pending={busyAction === 'google'}
          busy={busyAction !== null}
          onClick={handleGoogle}
          className="min-h-12 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm font-bold text-ink-900 hover:bg-muted"
        >
          {t('continueGoogle')}
        </Button>
      ) : null}

      {providers.google && providers.emailOtp ? (
        <p className="text-center text-xs text-muted-foreground">{t('orEmail')}</p>
      ) : null}

      {step === 'email' ? (
        <form onSubmit={handleSendOtp} className="space-y-3">
          <label className="block text-sm font-semibold text-ink-900" htmlFor="email">
            {t('email')}
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="min-h-12 w-full rounded-xl border border-border bg-white px-3 text-base text-ink-900 outline-none ring-jade-600 focus:ring-2"
            placeholder={t('emailPlaceholder')}
          />
          <Button
            type="submit"
            pending={busyAction === 'sendOtp'}
            busy={busyAction !== null}
            className="min-h-12 w-full rounded-xl bg-jade-600 px-4 py-3 text-sm font-bold text-white hover:bg-[#265c4e]"
          >
            {t('sendOtp')}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-3">
          <p className="text-sm text-muted-foreground">{t('otpSent', { email })}</p>
          <label className="block text-sm font-semibold text-ink-900" htmlFor="otp">
            {t('otp')}
          </label>
          <input
            id="otp"
            type="text"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            value={otp}
            onChange={(event) => setOtp(event.target.value)}
            className="min-h-12 w-full rounded-xl border border-border bg-white px-3 text-center text-2xl font-bold tracking-[0.4em] text-ink-900 outline-none ring-jade-600 focus:ring-2"
            placeholder="••••••"
          />
          <Button
            type="submit"
            pending={busyAction === 'verifyOtp'}
            busy={busyAction !== null}
            className="min-h-12 w-full rounded-xl bg-jade-600 px-4 py-3 text-sm font-bold text-white hover:bg-[#265c4e]"
          >
            {t('signIn')}
          </Button>
          <button
            type="button"
            disabled={busyAction !== null}
            className="w-full py-2 text-sm font-semibold text-jade-600 disabled:opacity-60"
            onClick={() => {
              setStep('email');
              setOtp('');
              setError(null);
            }}
          >
            {t('changeEmail')}
          </button>
        </form>
      )}

      {error || oauthError ? (
        <p className="text-sm font-medium text-brand-600">
          {error ?? `${t('authError')}${oauthError ? ` (${oauthError})` : ''}`}
          {!error && oauthErrorDescription ? `: ${oauthErrorDescription}` : null}
        </p>
      ) : null}

      <p className="text-xs leading-relaxed text-muted-foreground">{t('hint')}</p>
    </div>
  );
}
