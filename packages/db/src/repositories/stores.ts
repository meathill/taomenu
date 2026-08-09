import type { PlanId } from '@taomenu/shared';
import { and, eq } from 'drizzle-orm';
import { storeMembers, stores } from '../schema';
import type { ServiceMode } from '../schema/stores';
import { slugifyStoreName, withSlugSuffix } from '../slug';
import type { Db, StoreContext } from '../types';

export type StoreRow = typeof stores.$inferSelect;

export type CreateStoreInput = {
  name: string;
  serviceMode: ServiceMode;
  timezone?: string;
  baseLocale?: string;
  currency?: string;
};

function nowMs(): Date {
  return new Date();
}

async function allocateUniqueSlug(db: Db, name: string): Promise<string> {
  const base = slugifyStoreName(name);
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = withSlugSuffix(base, attempt);
    const existing = await db
      .select({ id: stores.id })
      .from(stores)
      .where(eq(stores.slug, candidate))
      .limit(1);
    if (!existing[0]) {
      return candidate;
    }
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

/** 创建门店并写入 owner membership。不走 StoreContext（尚无门店）。 */
export async function createStoreForOwner(
  db: Db,
  userId: string,
  input: CreateStoreInput,
): Promise<StoreRow> {
  const id = crypto.randomUUID();
  const memberId = crypto.randomUUID();
  const slug = await allocateUniqueSlug(db, input.name);
  const createdAt = nowMs();

  const row: typeof stores.$inferInsert = {
    id,
    slug,
    name: input.name.trim(),
    timezone: input.timezone ?? 'Asia/Ho_Chi_Minh',
    currency: input.currency ?? 'VND',
    baseLocale: input.baseLocale ?? 'vi',
    serviceMode: input.serviceMode,
    acceptingPublicRequests: true,
    plan: 'free' satisfies PlanId,
    planExpiresAt: null,
    staffSeatAddons: 0,
    stripeCustomerId: null,
    stripePlanSubscriptionId: null,
    stripePlanItemId: null,
    stripeStaffSeatSubscriptionId: null,
    stripeStaffSeatItemId: null,
    menuVersion: 0,
    orderVersion: 0,
    isActive: true,
    createdAt,
    updatedAt: createdAt,
  };

  await db.insert(stores).values(row);
  await db.insert(storeMembers).values({
    id: memberId,
    storeId: id,
    userId,
    role: 'owner',
    createdAt,
  });

  return row as StoreRow;
}

/** 仅返回当前上下文门店；跨租户 id 必然 miss → null。 */
export async function getStore(ctx: StoreContext, db: Db): Promise<StoreRow | null> {
  const rows = await db
    .select()
    .from(stores)
    .where(and(eq(stores.id, ctx.storeId), eq(stores.isActive, true)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * 按任意 storeId 查询门店详情：必须与 ctx.storeId 一致，否则 null。
 * 用于 API 路径参数与上下文对账。
 */
export async function getStoreIfMatches(
  ctx: StoreContext,
  db: Db,
  storeId: string,
): Promise<StoreRow | null> {
  if (storeId !== ctx.storeId) {
    return null;
  }
  return getStore(ctx, db);
}

export type UpdateStoreInput = {
  name?: string;
  serviceMode?: ServiceMode;
  timezone?: string;
  acceptingPublicRequests?: boolean;
  currency?: string;
};

export async function updateStore(
  ctx: StoreContext,
  db: Db,
  input: UpdateStoreInput,
): Promise<StoreRow | null> {
  const current = await getStore(ctx, db);
  if (!current) {
    return null;
  }

  const updatedAt = nowMs();
  await db
    .update(stores)
    .set({
      name: input.name?.trim() ?? current.name,
      serviceMode: input.serviceMode ?? current.serviceMode,
      timezone: input.timezone ?? current.timezone,
      acceptingPublicRequests: input.acceptingPublicRequests ?? current.acceptingPublicRequests,
      currency: input.currency ?? current.currency,
      updatedAt,
    })
    .where(eq(stores.id, ctx.storeId));

  return getStore(ctx, db);
}

export async function listStoresForUser(db: Db, userId: string): Promise<StoreRow[]> {
  return db
    .select({
      id: stores.id,
      slug: stores.slug,
      name: stores.name,
      timezone: stores.timezone,
      currency: stores.currency,
      baseLocale: stores.baseLocale,
      serviceMode: stores.serviceMode,
      acceptingPublicRequests: stores.acceptingPublicRequests,
      plan: stores.plan,
      planExpiresAt: stores.planExpiresAt,
      staffSeatAddons: stores.staffSeatAddons,
      stripeCustomerId: stores.stripeCustomerId,
      stripePlanSubscriptionId: stores.stripePlanSubscriptionId,
      stripePlanItemId: stores.stripePlanItemId,
      stripeStaffSeatSubscriptionId: stores.stripeStaffSeatSubscriptionId,
      stripeStaffSeatItemId: stores.stripeStaffSeatItemId,
      menuVersion: stores.menuVersion,
      orderVersion: stores.orderVersion,
      isActive: stores.isActive,
      createdAt: stores.createdAt,
      updatedAt: stores.updatedAt,
    })
    .from(storeMembers)
    .innerJoin(stores, eq(stores.id, storeMembers.storeId))
    .where(
      and(
        eq(storeMembers.userId, userId),
        eq(storeMembers.role, 'owner'),
        eq(stores.isActive, true),
      ),
    );
}

export async function hasStaffStoreMembership(db: Db, userId: string): Promise<boolean> {
  const rows = await db
    .select({ id: storeMembers.id })
    .from(storeMembers)
    .innerJoin(stores, eq(stores.id, storeMembers.storeId))
    .where(
      and(
        eq(storeMembers.userId, userId),
        eq(storeMembers.role, 'staff'),
        eq(stores.isActive, true),
      ),
    )
    .limit(1);
  return Boolean(rows[0]);
}

export type StaffSeatBillingUpdate = {
  staffSeatAddons: number;
  stripeCustomerId?: string | null;
  stripeStaffSeatSubscriptionId?: string | null;
  stripeStaffSeatItemId?: string | null;
};

export async function updateStaffSeatBilling(
  db: Db,
  storeId: string,
  input: StaffSeatBillingUpdate,
): Promise<void> {
  const patch: {
    staffSeatAddons: number;
    stripeCustomerId?: string | null;
    stripeStaffSeatSubscriptionId?: string | null;
    stripeStaffSeatItemId?: string | null;
    updatedAt: Date;
  } = {
    staffSeatAddons: Math.max(0, Math.floor(input.staffSeatAddons)),
    updatedAt: nowMs(),
  };
  if (input.stripeCustomerId !== undefined) patch.stripeCustomerId = input.stripeCustomerId;
  if (input.stripeStaffSeatSubscriptionId !== undefined) {
    patch.stripeStaffSeatSubscriptionId = input.stripeStaffSeatSubscriptionId;
  }
  if (input.stripeStaffSeatItemId !== undefined) {
    patch.stripeStaffSeatItemId = input.stripeStaffSeatItemId;
  }

  await db.update(stores).set(patch).where(eq(stores.id, storeId));
}

export type PlanBillingUpdate = {
  plan: PlanId;
  stripeCustomerId?: string | null;
  stripePlanSubscriptionId?: string | null;
  stripePlanItemId?: string | null;
};

export async function updatePlanBilling(
  db: Db,
  storeId: string,
  input: PlanBillingUpdate,
): Promise<void> {
  const patch: {
    plan: PlanId;
    stripeCustomerId?: string | null;
    stripePlanSubscriptionId?: string | null;
    stripePlanItemId?: string | null;
    updatedAt: Date;
  } = {
    plan: input.plan,
    updatedAt: nowMs(),
  };
  if (input.stripeCustomerId !== undefined) patch.stripeCustomerId = input.stripeCustomerId;
  if (input.stripePlanSubscriptionId !== undefined) {
    patch.stripePlanSubscriptionId = input.stripePlanSubscriptionId;
  }
  if (input.stripePlanItemId !== undefined) patch.stripePlanItemId = input.stripePlanItemId;

  await db.update(stores).set(patch).where(eq(stores.id, storeId));
}
