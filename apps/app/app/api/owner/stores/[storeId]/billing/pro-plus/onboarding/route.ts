import { getStore, getStoreSocialOnboarding, upsertStoreSocialOnboarding } from '@taomenu/db';
import { hasProEntitlements } from '@taomenu/shared';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';

type RouteContext = { params: Promise<{ storeId: string }> };

const URL_MAX = 500;
const NOTES_MAX = 1000;

function readString(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

export async function GET(_request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) return owner;
  const store = await getStore(owner.storeCtx, owner.db);
  if (!store) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
  const onboarding = await getStoreSocialOnboarding(owner.db, store.id);
  return Response.json({ onboarding, plan: store.plan });
}

export async function POST(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) return owner;

  const store = await getStore(owner.storeCtx, owner.db);
  if (!store) return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
  // 刚付款时 webhook 可能尚未把 plan 写成 pro_plus，只要已有套餐订阅也允许提交。
  if (!hasProEntitlements(store.plan) && !store.stripePlanSubscriptionId) {
    return Response.json({ error: 'PRO_PLUS_REQUIRED' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const onboarding = await upsertStoreSocialOnboarding(owner.db, store.id, {
    googleMapsUrl: readString(Reflect.get(body, 'googleMapsUrl'), URL_MAX),
    tripadvisorUrl: readString(Reflect.get(body, 'tripadvisorUrl'), URL_MAX),
    instagramUrl: readString(Reflect.get(body, 'instagramUrl'), URL_MAX),
    tiktokUrl: readString(Reflect.get(body, 'tiktokUrl'), URL_MAX),
    facebookUrl: readString(Reflect.get(body, 'facebookUrl'), URL_MAX),
    notes: readString(Reflect.get(body, 'notes'), NOTES_MAX),
  });
  return Response.json({ onboarding }, { status: 200 });
}
