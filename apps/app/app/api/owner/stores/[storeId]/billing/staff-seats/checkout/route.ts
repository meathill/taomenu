import { getStore, updateStaffSeatBilling } from '@taomenu/db';
import { z } from 'zod';
import { badRequest, notFound, unauthorized } from '@/lib/api-error';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';
import { getSession } from '@/lib/session';
import {
  createStaffSeatCheckoutSession,
  getStripeConfig,
  StripeRequestError,
  updateStaffSeatSubscriptionItem,
} from '@/lib/stripe';

type RouteContext = { params: Promise<{ storeId: string }> };

const checkoutSchema = z.object({
  quantity: z.number().int().min(1).max(20),
});

export async function POST(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) return owner;

  const session = await getSession();
  if (!session?.user) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest('Choose between 1 and 20 additional staff seats.');
  }

  const config = getStripeConfig();
  if (!config?.staffSeatPriceId) {
    return Response.json({ error: 'BILLING_NOT_CONFIGURED' }, { status: 503 });
  }

  const store = await getStore(owner.storeCtx, owner.db);
  if (!store) return notFound();

  const additionalSeats = parsed.data.quantity;
  if (store.stripeStaffSeatItemId && store.stripeStaffSeatSubscriptionId) {
    const nextQuantity = store.staffSeatAddons + additionalSeats;
    try {
      await updateStaffSeatSubscriptionItem(config, store.stripeStaffSeatItemId, nextQuantity);
    } catch (error) {
      if (error instanceof StripeRequestError) {
        return Response.json({ error: 'BILLING_REQUEST_FAILED' }, { status: 502 });
      }
      throw error;
    }
    await updateStaffSeatBilling(owner.db, store.id, { staffSeatAddons: nextQuantity });
    return Response.json({ updated: true, staffSeatAddons: nextQuantity });
  }

  if (store.staffSeatAddons > 0) {
    return Response.json({ error: 'BILLING_SYNC_PENDING' }, { status: 409 });
  }

  try {
    const checkout = await createStaffSeatCheckoutSession(config, {
      storeId: store.id,
      storeSlug: store.slug,
      ownerEmail: session.user.email,
      stripeCustomerId: store.stripeCustomerId,
      quantity: additionalSeats,
    });
    return Response.json(checkout, { status: 201 });
  } catch (error) {
    if (error instanceof StripeRequestError) {
      return Response.json({ error: 'BILLING_REQUEST_FAILED' }, { status: 502 });
    }
    throw error;
  }
}
