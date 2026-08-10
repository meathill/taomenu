import { and, eq, inArray } from 'drizzle-orm';
import { getBusinessDate } from '../business-date';
import { generateToken, hashToken } from '../crypto-token';
import { type ModifierGroupInput, resolveModifierSelection } from '../modifier-select';
import { priceOrderLines } from '../order-price';
import { menuItems, menuItemTranslations, menus } from '../schema/menu';
import { stores } from '../schema/stores';
import {
  type FulfillmentMode,
  orderItems,
  orders,
  pickupNumberSequences,
  tableSessions,
} from '../schema/tables-orders';
import { nowMs } from '../time';
import type { Db } from '../types';
import { loadModifierGroupsForItems } from './modifiers';
import { enqueueOrderSubmittedNotification } from './push';

export type CreateCustomerOrderInput = {
  storeId: string;
  fulfillmentMode: FulfillmentMode;
  tableId?: string;
  pickupPointId?: string;
  locale?: string;
  note?: string;
  idempotencyKey: string;
  lines: Array<{ menuItemId: string; quantity: number; modifierIds?: string[] }>;
};

export type CreateOrderResult =
  | {
      ok: true;
      orderId: string;
      publicToken: string;
      displayNumber: number;
      pickupNumber: number | null;
      subtotalAmount: number;
      status: string;
      reused: boolean;
      outboxId?: string | null;
    }
  | { ok: false; status: number; error: string; code?: string };

export async function createCustomerOrder(
  db: Db,
  input: CreateCustomerOrderInput,
): Promise<CreateOrderResult> {
  const existing = await db
    .select()
    .from(orders)
    .where(and(eq(orders.storeId, input.storeId), eq(orders.idempotencyKey, input.idempotencyKey)))
    .limit(1);
  if (existing[0]) {
    return {
      ok: true,
      orderId: existing[0].id,
      publicToken: '',
      displayNumber: existing[0].displayNumber,
      pickupNumber: existing[0].pickupNumber,
      subtotalAmount: existing[0].subtotalAmount,
      status: existing[0].status,
      reused: true,
    };
  }

  const storeRows = await db
    .select()
    .from(stores)
    .where(and(eq(stores.id, input.storeId), eq(stores.isActive, true)))
    .limit(1);
  const store = storeRows[0];
  if (!store) {
    return { ok: false, status: 404, error: 'Store not found' };
  }
  if (!store.acceptingPublicRequests) {
    return { ok: false, status: 403, error: 'Store is not accepting orders', code: 'PAUSED' };
  }

  const published = await db
    .select({ id: menus.id })
    .from(menus)
    .where(and(eq(menus.storeId, input.storeId), eq(menus.status, 'published')))
    .limit(1);
  if (!published[0]) {
    return { ok: false, status: 409, error: 'Menu not published', code: 'MENU_NOT_PUBLISHED' };
  }

  const itemIds = [...new Set(input.lines.map((l) => l.menuItemId))];
  if (itemIds.length === 0) {
    return { ok: false, status: 400, error: 'EMPTY_CART', code: 'EMPTY_CART' };
  }

  const dbItems = await db
    .select()
    .from(menuItems)
    .where(and(eq(menuItems.storeId, input.storeId), inArray(menuItems.id, itemIds)));

  const itemsById = new Map(dbItems.map((i) => [i.id, i]));
  const locale = input.locale || store.baseLocale;
  const translations = await db
    .select()
    .from(menuItemTranslations)
    .where(
      and(
        eq(menuItemTranslations.storeId, input.storeId),
        inArray(menuItemTranslations.itemId, itemIds),
      ),
    );

  const modifiersByItem = await loadModifierGroupsForItems(db, input.storeId, itemIds);

  const pricedInputs = [];
  for (const line of input.lines) {
    const item = itemsById.get(line.menuItemId);
    if (!item) {
      return { ok: false, status: 400, error: 'Unknown menu item', code: 'UNKNOWN_ITEM' };
    }
    const tr =
      translations.find((t) => t.itemId === item.id && t.locale === locale) ||
      translations.find((t) => t.itemId === item.id && t.locale === store.baseLocale);
    const baseName = tr?.name ?? 'Item';
    const rawGroups = modifiersByItem.get(item.id) ?? [];
    const groups: ModifierGroupInput[] = rawGroups.map((g) => ({
      id: g.id,
      name:
        g.translations.find((t) => t.locale === locale)?.name ||
        g.translations.find((t) => t.locale === store.baseLocale)?.name ||
        g.translations[0]?.name ||
        '—',
      minSelected: g.minSelected,
      maxSelected: g.maxSelected,
      isRequired: g.isRequired,
      options: g.options.map((o) => ({
        id: o.id,
        groupId: g.id,
        name:
          o.translations.find((t) => t.locale === locale)?.name ||
          o.translations.find((t) => t.locale === store.baseLocale)?.name ||
          o.translations[0]?.name ||
          '—',
        priceDeltaAmount: o.priceDeltaAmount,
        isAvailable: o.isAvailable,
      })),
    }));

    const resolved = resolveModifierSelection({
      baseName,
      basePriceAmount: item.priceAmount,
      groups,
      selectedIds: line.modifierIds ?? [],
    });
    if (!resolved.ok) {
      return {
        ok: false,
        status: 400,
        error: resolved.error.code,
        code: resolved.error.code,
      };
    }

    pricedInputs.push({
      menuItemId: item.id,
      quantity: line.quantity,
      unitPriceAmount: resolved.unitPriceAmount,
      name: resolved.nameSnapshot,
      isAvailable: item.isAvailable,
      isSoldOut: item.isSoldOut,
    });
  }

  const priced = priceOrderLines(pricedInputs);
  if (!priced.ok) {
    return { ok: false, status: 400, error: priced.error.code, code: priced.error.code };
  }

  let tableSessionId: string | null = null;
  if (input.fulfillmentMode === 'dine_in') {
    if (!input.tableId) {
      return { ok: false, status: 400, error: 'tableId required' };
    }
    const openSessions = await db
      .select()
      .from(tableSessions)
      .where(
        and(
          eq(tableSessions.storeId, input.storeId),
          eq(tableSessions.tableId, input.tableId),
          eq(tableSessions.status, 'open'),
        ),
      )
      .limit(1);
    if (openSessions[0]) {
      tableSessionId = openSessions[0].id;
    } else {
      tableSessionId = crypto.randomUUID();
      await db.insert(tableSessions).values({
        id: tableSessionId,
        storeId: input.storeId,
        tableId: input.tableId,
        status: 'open',
        openedAt: nowMs(),
        closedAt: null,
        closedByTerminalId: null,
      });
    }
  }

  let pickupNumber: number | null = null;
  let businessDate: string | null = null;
  if (input.fulfillmentMode === 'pickup') {
    businessDate = getBusinessDate(store.timezone);
    pickupNumber = await allocatePickupNumber(db, input.storeId, businessDate);
  }

  const orderId = crypto.randomUUID();
  const publicToken = generateToken();
  const publicTokenHash = await hashToken(publicToken);
  const createdAt = nowMs();
  const displayNumber = (store.orderVersion % 9999) + 1;

  await db.insert(orders).values({
    id: orderId,
    publicTokenHash,
    storeId: input.storeId,
    fulfillmentMode: input.fulfillmentMode,
    tableId: input.tableId ?? null,
    tableSessionId,
    pickupPointId: input.pickupPointId ?? null,
    displayNumber,
    pickupNumber,
    businessDate,
    status: 'submitted',
    locale,
    subtotalAmount: priced.subtotalAmount,
    note: input.note?.trim() || null,
    createdByActorType: 'customer',
    createdByTerminalId: null,
    idempotencyKey: input.idempotencyKey,
    createdAt,
    updatedAt: createdAt,
  });

  for (const line of priced.lines) {
    await db.insert(orderItems).values({
      id: crypto.randomUUID(),
      orderId,
      menuItemId: line.menuItemId,
      quantity: line.quantity,
      nameSnapshot: line.nameSnapshot,
      unitPriceAmount: line.unitPriceAmount,
      lineTotalAmount: line.lineTotalAmount,
    });
  }

  await db
    .update(stores)
    .set({ orderVersion: store.orderVersion + 1, updatedAt: createdAt })
    .where(eq(stores.id, input.storeId));

  // 与订单同路径写入 outbox；失败不回滚订单（尽力而为）
  let outboxId: string | null = null;
  try {
    outboxId = await enqueueOrderSubmittedNotification(db, input.storeId, orderId);
  } catch {
    outboxId = null;
  }

  return {
    ok: true,
    orderId,
    publicToken,
    displayNumber,
    pickupNumber,
    subtotalAmount: priced.subtotalAmount,
    status: 'submitted',
    reused: false,
    outboxId,
  };
}

async function allocatePickupNumber(
  db: Db,
  storeId: string,
  businessDate: string,
): Promise<number> {
  const existing = await db
    .select()
    .from(pickupNumberSequences)
    .where(
      and(
        eq(pickupNumberSequences.storeId, storeId),
        eq(pickupNumberSequences.businessDate, businessDate),
      ),
    )
    .limit(1);

  if (!existing[0]) {
    await db.insert(pickupNumberSequences).values({
      storeId,
      businessDate,
      nextValue: 2,
      updatedAt: nowMs(),
    });
    return 1;
  }

  const value = existing[0].nextValue;
  await db
    .update(pickupNumberSequences)
    .set({ nextValue: value + 1, updatedAt: nowMs() })
    .where(
      and(
        eq(pickupNumberSequences.storeId, storeId),
        eq(pickupNumberSequences.businessDate, businessDate),
      ),
    );
  return value;
}

export async function getOrderByPublicToken(db: Db, publicToken: string) {
  const publicTokenHash = await hashToken(publicToken);
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.publicTokenHash, publicTokenHash))
    .limit(1);
  const order = rows[0];
  if (!order) return null;

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  return { order, items };
}
