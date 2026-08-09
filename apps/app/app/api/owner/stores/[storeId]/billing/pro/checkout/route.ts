import { getStore } from '@taomenu/db';
import { toBillingCurrency } from '@taomenu/shared';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';
import { getSession } from '@/lib/session';
import { createProCheckoutSession, getStripeConfig, StripeRequestError } from '@/lib/stripe';

type RouteContext = { params: Promise<{ storeId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) return owner;

  const session = await getSession();
  if (!session?.user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const config = getStripeConfig();
  if (!config?.proPriceId) {
    return Response.json({ error: 'BILLING_NOT_CONFIGURED' }, { status: 503 });
  }

  const store = await getStore(owner.storeCtx, owner.db);
  if (!store) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
  if (store.plan === 'pro' || store.stripePlanSubscriptionId) {
    return Response.json({ error: 'ALREADY_PRO' }, { status: 409 });
  }

  try {
    const checkout = await createProCheckoutSession(config, {
      storeId: store.id,
      storeSlug: store.slug,
      ownerEmail: session.user.email,
      stripeCustomerId: store.stripeCustomerId,
      currency: toBillingCurrency(store.currency),
    });
    return Response.json(checkout, { status: 201 });
  } catch (error) {
    if (error instanceof StripeRequestError) {
      return Response.json({ error: 'BILLING_REQUEST_FAILED' }, { status: 502 });
    }
    throw error;
  }
}
