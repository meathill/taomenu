import { getStore, updatePlanBilling } from '@taomenu/db';
import { getBillingCurrencyForStore, isProPlusPlan, parseBillingInterval } from '@taomenu/shared';
import { resolveCheckoutLocale } from '@/lib/checkout-locale';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';
import { getPublicAppUrl, joinPublicUrl } from '@/lib/public-url';
import { getSession } from '@/lib/session';
import {
  createProPlusCheckoutSession,
  getProPlusCheckoutPriceId,
  getStripeConfig,
  StripeRequestError,
  updatePlanSubscriptionPrice,
} from '@/lib/stripe';

type RouteContext = { params: Promise<{ storeId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) return owner;

  const session = await getSession();
  if (!session?.user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const requestedLocale = body && typeof body === 'object' && 'locale' in body ? body.locale : null;
  const interval = parseBillingInterval(
    body && typeof body === 'object' && 'interval' in body ? body.interval : undefined,
  );

  const config = getStripeConfig();
  const priceId = config ? getProPlusCheckoutPriceId(config, interval) : undefined;
  if (!config || !priceId) {
    return Response.json({ error: 'BILLING_NOT_CONFIGURED' }, { status: 503 });
  }

  const store = await getStore(owner.storeCtx, owner.db);
  if (!store) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
  if (isProPlusPlan(store.plan)) {
    return Response.json({ error: 'ALREADY_PRO_PLUS' }, { status: 409 });
  }

  const locale = await resolveCheckoutLocale(
    typeof requestedLocale === 'string' ? requestedLocale : null,
  );

  try {
    // 已有 Pro 订阅：改当前订阅的 Price，避免再开一份订阅重复扣款。
    if (store.stripePlanSubscriptionId && store.stripePlanItemId) {
      await updatePlanSubscriptionPrice(config, {
        subscriptionId: store.stripePlanSubscriptionId,
        itemId: store.stripePlanItemId,
        priceId,
        kind: 'pro_plus_plan',
      });
      await updatePlanBilling(owner.db, store.id, { plan: 'pro_plus' });
      const encodedStore = encodeURIComponent(store.slug);
      return Response.json(
        {
          url: joinPublicUrl(
            getPublicAppUrl(),
            `/app/settings?store=${encodedStore}&billing=success&plan=pro-plus`,
          ),
        },
        { status: 201 },
      );
    }

    if (store.stripePlanSubscriptionId) {
      return Response.json({ error: 'BILLING_FAILED' }, { status: 502 });
    }

    const checkout = await createProPlusCheckoutSession(config, {
      storeId: store.id,
      storeSlug: store.slug,
      ownerEmail: session.user.email,
      stripeCustomerId: store.stripeCustomerId,
      currency: getBillingCurrencyForStore(store.currency),
      locale,
      interval,
    });
    return Response.json(checkout, { status: 201 });
  } catch (error) {
    if (error instanceof StripeRequestError) {
      return Response.json({ error: 'BILLING_REQUEST_FAILED' }, { status: 502 });
    }
    throw error;
  }
}
