'use client';

import { CheckIcon } from '@phosphor-icons/react';
import type { BillingInterval } from '@taomenu/shared';
import { useState } from 'react';
import { BillingIntervalToggle } from '@/components/billing-interval-toggle';

type PlanFeature = {
  label: string;
  status: 'available' | 'comingSoon';
};

type PlanCard = {
  id: 'free' | 'pro' | 'pro_plus';
  name: string;
  desc: string;
  features: PlanFeature[];
  highlight: boolean;
  ctaLabel: string;
  ctaHref: string;
  ctaNote?: string;
};

export type PromoBadge = {
  title: string;
  note: string;
  tone: 'brand' | 'jade';
};

type PricedPlan = PlanCard & {
  monthlyBadge?: PromoBadge;
  yearlyBadge?: PromoBadge;
  monthlyPrice: string;
  yearlyPrice: string;
  yearlyHint?: string;
  monthlyOfferLabel?: string;
  yearlyOfferLabel?: string;
  yearlyListPrice?: string;
  monthlyListPrice?: string;
  thenMonthlyLabel?: string;
  thenYearlyLabel?: string;
};

type PricingPlansProps = {
  comingSoonLabel: string;
  intervalLabels: {
    monthly: string;
    yearly: string;
    yearlyBadge: string;
    groupLabel: string;
  };
  banner?: string;
  free: PlanCard;
  freePrice: string;
  pro: PricedPlan;
  proPlus: PricedPlan;
};

export function PricingPlans({
  comingSoonLabel,
  intervalLabels,
  banner,
  free,
  freePrice,
  pro,
  proPlus,
}: PricingPlansProps) {
  const [interval, setInterval] = useState<BillingInterval>('year');

  const priced = (plan: PricedPlan) => {
    const isYear = interval === 'year';
    const price = isYear ? plan.yearlyPrice : plan.monthlyPrice;
    const listPrice = isYear ? plan.yearlyListPrice : plan.monthlyListPrice;
    const offerLabel = isYear ? plan.yearlyOfferLabel : plan.monthlyOfferLabel;
    const thenLabel = isYear ? plan.thenYearlyLabel : plan.thenMonthlyLabel;
    const badge = isYear ? plan.yearlyBadge : plan.monthlyBadge;
    return {
      ...plan,
      price,
      listPrice: listPrice && listPrice !== price ? listPrice : undefined,
      hint: isYear && !offerLabel && !badge ? plan.yearlyHint : undefined,
      // 价签已经写明优惠，就不再在价格下重复一行
      offerLabel: badge ? undefined : offerLabel,
      thenLabel,
      badge,
    };
  };

  const plans: Array<
    PlanCard & {
      price: string;
      hint?: string;
      listPrice?: string;
      offerLabel?: string;
      thenLabel?: string;
      badge?: PromoBadge;
    }
  > = [{ ...free, price: freePrice }, priced(pro), priced(proPlus)];

  return (
    <>
      <div className="mt-8 flex justify-center">
        <BillingIntervalToggle
          value={interval}
          onChange={setInterval}
          monthlyLabel={intervalLabels.monthly}
          yearlyLabel={intervalLabels.yearly}
          yearlyBadge={intervalLabels.yearlyBadge}
          groupLabel={intervalLabels.groupLabel}
        />
      </div>
      {banner ? (
        <p className="mx-auto mt-5 max-w-3xl rounded-xl bg-brand-50 px-4 py-3 text-center text-sm font-medium leading-6 text-ink-900">
          {banner}
        </p>
      ) : null}

      <div className="mt-10 grid gap-10 lg:grid-cols-3 lg:gap-4">
        {plans.map((plan) => (
          <article
            key={plan.id}
            className={
              plan.highlight
                ? 'relative rounded-2xl border-2 border-brand-600 bg-white p-6 shadow-sm'
                : 'relative rounded-2xl border border-border bg-white p-6 shadow-sm'
            }
          >
            {plan.badge ? <PromoTag badge={plan.badge} /> : null}
            <h2 className="text-xl font-bold text-ink-900">{plan.name}</h2>
            {plan.listPrice ? (
              <p className="mt-2 text-sm text-muted-foreground line-through tabular-nums">
                {plan.listPrice}
              </p>
            ) : null}
            <p className="mt-2 text-3xl font-extrabold tabular-nums text-ink-900">{plan.price}</p>
            {plan.offerLabel ? (
              <p className="mt-1 text-sm font-semibold text-jade-700">{plan.offerLabel}</p>
            ) : null}
            {plan.hint ? (
              <p className="mt-1 text-sm font-medium text-jade-700">{plan.hint}</p>
            ) : null}
            {plan.thenLabel ? (
              <p className="mt-1 text-xs text-muted-foreground">{plan.thenLabel}</p>
            ) : null}
            <p className="mt-2 text-sm text-muted-foreground">{plan.desc}</p>
            <ul className="mt-6 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature.label} className="flex items-start gap-2 text-sm text-ink-900">
                  <CheckIcon className="mt-0.5 size-5 shrink-0 text-jade-600" weight="bold" />
                  <span>
                    {feature.label}
                    {feature.status === 'comingSoon' ? (
                      <span className="ml-2 inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-[0.6875rem] font-bold text-indigo-700">
                        {comingSoonLabel}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
            <a
              href={plan.ctaHref}
              className={
                plan.highlight
                  ? 'mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white hover:bg-brand-700'
                  : 'mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-brand-600 bg-white px-4 py-3 text-sm font-bold text-brand-600 hover:bg-brand-50'
              }
            >
              {plan.ctaLabel}
            </a>
            {plan.ctaNote ? (
              <p className="mt-2 text-center text-xs text-muted-foreground">{plan.ctaNote}</p>
            ) : null}
          </article>
        ))}
      </div>
    </>
  );
}

const TAG_TONES: Record<PromoBadge['tone'], string> = {
  brand: 'bg-brand-600',
  jade: 'bg-jade-600',
};

/**
 * 挂在付费卡片右上角的「价签」：左端尖角 + 打孔 + 细绳，略微倾斜。
 * 参考 Dribbble 上的吊牌/丝带价签（见 PR 说明），配色沿用站点的深红 / 翠绿。
 */
function PromoTag({ badge }: { badge: PromoBadge }) {
  const tone = TAG_TONES[badge.tone];
  return (
    <div className="pointer-events-none absolute -top-5 right-3 z-10 max-w-[calc(100%-4.5rem)] rotate-[2.5deg] sm:right-4">
      {/* 绳子：从孔里穿出，搭到卡片上沿 */}
      <svg
        aria-hidden="true"
        viewBox="0 0 24 28"
        className="absolute -top-3 left-0 h-7 w-6 text-ink-900/45"
        fill="none"
      >
        <path
          d="M11 22 C 4 14, 8 4, 20 1"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <div className="flex drop-shadow-[0_6px_10px_rgba(80,20,20,0.22)]">
        <span
          aria-hidden="true"
          className={`w-3.5 shrink-0 ${tone} [clip-path:polygon(100%_0,100%_100%,0_50%)]`}
        />
        <div className={`relative rounded-r-lg ${tone} py-1.5 pr-3.5 pl-3 text-white`}>
          <span
            aria-hidden="true"
            className="absolute top-1/2 -left-1 size-2 -translate-y-1/2 rounded-full bg-paper-50 shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)]"
          />
          <span className="pointer-events-none absolute inset-[3px] rounded-r-md border border-dashed border-white/35" />
          <p className="relative text-[0.8125rem] leading-tight font-extrabold">{badge.title}</p>
          <p className="relative mt-0.5 text-[0.6875rem] leading-tight font-medium text-white/90 tabular-nums">
            {badge.note}
          </p>
        </div>
      </div>
    </div>
  );
}
