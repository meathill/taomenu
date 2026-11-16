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

type PricedPlan = PlanCard & {
  monthlyPrice: string;
  yearlyPrice: string;
  yearlyHint?: string;
};

type PricingPlansProps = {
  comingSoonLabel: string;
  intervalLabels: {
    monthly: string;
    yearly: string;
    yearlyBadge: string;
    groupLabel: string;
  };
  free: PlanCard;
  freePrice: string;
  pro: PricedPlan;
  proPlus: PricedPlan;
};

export function PricingPlans({
  comingSoonLabel,
  intervalLabels,
  free,
  freePrice,
  pro,
  proPlus,
}: PricingPlansProps) {
  const [interval, setInterval] = useState<BillingInterval>('year');
  const priced = (plan: PricedPlan) => ({
    ...plan,
    price: interval === 'year' ? plan.yearlyPrice : plan.monthlyPrice,
    hint: interval === 'year' ? plan.yearlyHint : undefined,
  });
  const plans: Array<PlanCard & { price: string; hint?: string }> = [
    { ...free, price: freePrice },
    priced(pro),
    priced(proPlus),
  ];

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

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <article
            key={plan.id}
            className={
              plan.highlight
                ? 'rounded-2xl border-2 border-brand-600 bg-white p-6 shadow-sm'
                : 'rounded-2xl border border-border bg-white p-6 shadow-sm'
            }
          >
            <h2 className="text-xl font-bold text-ink-900">{plan.name}</h2>
            <p className="mt-2 text-3xl font-extrabold tabular-nums text-ink-900">{plan.price}</p>
            {plan.hint ? (
              <p className="mt-1 text-sm font-medium text-jade-700">{plan.hint}</p>
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
