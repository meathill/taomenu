import { updatePlanBilling, updateStaffSeatBilling } from '@taomenu/db';
import { badRequest } from '@/lib/api-error';
import { getDb } from '@/lib/db';
import { getStripeConfig, isSubscriptionUsable, verifyStripeWebhookSignature } from '@/lib/stripe';

type StripeObject = Record<string, unknown>;

type StripeEvent = {
  type: string;
  data?: { object?: StripeObject };
};

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function readMetadata(object: StripeObject): Record<string, string> {
  const metadata = object.metadata;
  if (!metadata || typeof metadata !== 'object') return {};
  return Object.fromEntries(
    Object.entries(metadata).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
}

function readSubscriptionItem(object: StripeObject): {
  id: string | null;
  quantity: number;
} {
  const items = object.items;
  if (!items || typeof items !== 'object') return { id: null, quantity: 0 };
  const data = (items as { data?: unknown }).data;
  if (!Array.isArray(data) || !data[0] || typeof data[0] !== 'object') {
    return { id: null, quantity: 0 };
  }
  const item = data[0] as StripeObject;
  const quantity = typeof item.quantity === 'number' ? Math.floor(item.quantity) : 0;
  return { id: readString(item.id), quantity: Math.max(0, quantity) };
}

async function handleCheckoutCompleted(object: StripeObject): Promise<void> {
  const metadata = readMetadata(object);
  if (!metadata.storeId) return;

  if (metadata.kind === 'pro_plan') {
    const subscriptionId = readString(object.subscription);
    const customerId = readString(object.customer);
    if (!subscriptionId) return;
    await updatePlanBilling(getDb(), metadata.storeId, {
      plan: 'pro',
      stripeCustomerId: customerId,
      stripePlanSubscriptionId: subscriptionId,
    });
    return;
  }

  if (metadata.kind !== 'staff_seats') return;

  const quantity = Number(metadata.staffSeatQuantity);
  const subscriptionId = readString(object.subscription);
  const customerId = readString(object.customer);
  if (!subscriptionId || !Number.isInteger(quantity) || quantity < 1) return;

  await updateStaffSeatBilling(getDb(), metadata.storeId, {
    staffSeatAddons: quantity,
    stripeCustomerId: customerId,
    stripeStaffSeatSubscriptionId: subscriptionId,
  });
}

async function handleSubscriptionEvent(object: StripeObject, deleted: boolean): Promise<void> {
  const metadata = readMetadata(object);
  if (!metadata.storeId) return;

  const subscriptionItem = readSubscriptionItem(object);
  const customerId = readString(object.customer);
  const subscriptionId = readString(object.id);
  if (!subscriptionId) return;

  if (metadata.kind === 'pro_plan') {
    const status = readString(object.status);
    await updatePlanBilling(getDb(), metadata.storeId, {
      plan: !deleted && isSubscriptionUsable(status) ? 'pro' : 'free',
      stripeCustomerId: customerId,
      stripePlanSubscriptionId: deleted ? null : subscriptionId,
      stripePlanItemId: deleted ? null : subscriptionItem.id,
    });
    return;
  }

  if (metadata.kind !== 'staff_seats') return;

  if (deleted) {
    await updateStaffSeatBilling(getDb(), metadata.storeId, {
      staffSeatAddons: 0,
      stripeCustomerId: customerId,
      stripeStaffSeatSubscriptionId: null,
      stripeStaffSeatItemId: null,
    });
    return;
  }

  const status = readString(object.status);
  const usable = isSubscriptionUsable(status);
  await updateStaffSeatBilling(getDb(), metadata.storeId, {
    staffSeatAddons: usable ? subscriptionItem.quantity : 0,
    stripeCustomerId: customerId,
    stripeStaffSeatSubscriptionId: subscriptionId,
    stripeStaffSeatItemId: subscriptionItem.id,
  });
}

export async function POST(request: Request) {
  const config = getStripeConfig();
  if (!config) {
    return Response.json({ error: 'BILLING_NOT_CONFIGURED' }, { status: 503 });
  }

  const payload = await request.text();
  const signature = request.headers.get('stripe-signature');
  if (!signature) return badRequest('Missing Stripe signature');

  const valid = await verifyStripeWebhookSignature(payload, signature, config.webhookSecret);
  if (!valid) return badRequest('Invalid Stripe signature');

  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return badRequest('Invalid Stripe event');
  }

  const object = event.data?.object;
  if (!object) return Response.json({ received: true });

  if (event.type === 'checkout.session.completed') {
    await handleCheckoutCompleted(object);
  } else if (event.type === 'customer.subscription.created') {
    await handleSubscriptionEvent(object, false);
  } else if (event.type === 'customer.subscription.updated') {
    await handleSubscriptionEvent(object, false);
  } else if (event.type === 'customer.subscription.deleted') {
    await handleSubscriptionEvent(object, true);
  }

  return Response.json({ received: true });
}
