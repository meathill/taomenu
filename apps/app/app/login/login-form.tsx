'use client';

import { cn } from '@taomenu/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';
import { authClient } from '@/lib/auth-client';

type Providers = {
  google: boolean;
  emailOtp: boolean;
};

type Step = 'email' | 'otp';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [providers, setProviders] = useState<Providers>({ google: false, emailOtp: true });
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    function loadProviders() {
      fetch('/api/auth/providers')
        .then((res) => res.json())
        .then((data: Providers) => setProviders(data))
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

  async function handleGoogle() {
    setError(null);
    setIsPending(true);
    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: nextPath(),
      });
    } catch {
      setError('Google đăng nhập thất bại.');
      setIsPending(false);
    }
  }

  async function handleSendOtp(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email: email.trim(),
        type: 'sign-in',
      });
      if (result.error) {
        setError(result.error.message || 'Không gửi được mã OTP.');
        return;
      }
      setStep('otp');
    } catch {
      setError('Không gửi được mã OTP.');
    } finally {
      setIsPending(false);
    }
  }

  async function handleVerifyOtp(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const result = await authClient.signIn.emailOtp({
        email: email.trim(),
        otp: otp.trim(),
      });
      if (result.error) {
        setError(result.error.message || 'Mã OTP không đúng.');
        return;
      }
      router.push(nextPath());
      router.refresh();
    } catch {
      setError('Mã OTP không đúng.');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-4">
      {providers.google ? (
        <button
          type="button"
          disabled={isPending}
          onClick={handleGoogle}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-border bg-white px-4 py-3 text-sm font-bold text-ink-900 hover:bg-muted disabled:opacity-60"
        >
          Tiếp tục với Google
        </button>
      ) : null}

      {providers.google && providers.emailOtp ? (
        <p className="text-center text-xs text-muted-foreground">hoặc dùng email</p>
      ) : null}

      {step === 'email' ? (
        <form onSubmit={handleSendOtp} className="space-y-3">
          <label className="block text-sm font-semibold text-ink-900" htmlFor="email">
            Email
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
            placeholder="ban@email.com"
          />
          <button
            type="submit"
            disabled={isPending}
            className={cn(
              'inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-jade-600 px-4 py-3 text-sm font-bold text-white hover:bg-[#265c4e]',
              isPending && 'opacity-60',
            )}
          >
            Gửi mã OTP
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Đã gửi mã tới <span className="font-semibold text-ink-900">{email}</span>
          </p>
          <label className="block text-sm font-semibold text-ink-900" htmlFor="otp">
            Mã OTP
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
          <button
            type="submit"
            disabled={isPending}
            className={cn(
              'inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-jade-600 px-4 py-3 text-sm font-bold text-white hover:bg-[#265c4e]',
              isPending && 'opacity-60',
            )}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            className="w-full py-2 text-sm font-semibold text-jade-600"
            onClick={() => {
              setStep('email');
              setOtp('');
              setError(null);
            }}
          >
            Đổi email
          </button>
        </form>
      )}

      {error ? <p className="text-sm font-medium text-brand-600">{error}</p> : null}

      <p className="text-xs leading-relaxed text-muted-foreground">
        Dev: mã OTP in ra terminal log (`[taomenu-otp]`). Google chỉ hiện khi đã cấu hình client
        id/secret.
      </p>
    </div>
  );
}
