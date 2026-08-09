import { getStore } from '@taomenu/db';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';
import { createBillingPortalSession, getStripeConfig, StripeRequestError } from '@/lib/stripe';

type RouteContext = { params: Promise<{ storeId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) return owner;

  const config = getStripeConfig();
  if (!config) return Response.json({ error: 'BILLING_NOT_CONFIGURED' }, { status: 503 });

  const store = await getStore(owner.storeCtx, owner.db);
  if (!store) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
  if (!store.stripeCustomerId) {
    return Response.json({ error: 'BILLING_CUSTOMER_MISSING' }, { status: 409 });
  }

  try {
    const portal = await createBillingPortalSession(config, {
      stripeCustomerId: store.stripeCustomerId,
      storeSlug: store.slug,
    });
    return Response.json(portal, { status: 201 });
  } catch (error) {
    if (error instanceof StripeRequestError) {
      return Response.json({ error: 'BILLING_REQUEST_FAILED' }, { status: 502 });
    }
    throw error;
  }
}
