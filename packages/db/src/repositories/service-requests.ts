import { and, desc, eq, inArray } from 'drizzle-orm';
import { generateToken, hashToken } from '../crypto-token';
import { stores } from '../schema/stores';
import type { ServiceRequestStatus, ServiceRequestType } from '../schema/tables-orders';
import { diningTables, serviceRequests, tableSessions } from '../schema/tables-orders';
import type { Db, StoreContext } from '../types';
import { enqueueNotification } from './push';

function nowMs(): Date {
  return new Date();
}

export type CreateServiceRequestInput = {
  storeId: string;
  tableId: string;
  type: ServiceRequestType;
  idempotencyKey: string;
};

export async function createServiceRequest(db: Db, input: CreateServiceRequestInput) {
  const existing = await db
    .select()
    .from(serviceRequests)
    .where(
      and(
        eq(serviceRequests.storeId, input.storeId),
        eq(serviceRequests.idempotencyKey, input.idempotencyKey),
      ),
    )
    .limit(1);
  if (existing[0]) {
    return {
      ok: true as const,
      reused: true as const,
      id: existing[0].id,
      publicToken: '',
      status: existing[0].status,
      type: existing[0].type,
    };
  }

  const storeRows = await db
    .select()
    .from(stores)
    .where(and(eq(stores.id, input.storeId), eq(stores.isActive, true)))
    .limit(1);
  const store = storeRows[0];
  if (!store) {
    return { ok: false as const, status: 404, error: 'Store not found' };
  }
  if (!store.acceptingPublicRequests) {
    return { ok: false as const, status: 403, error: 'Store paused', code: 'PAUSED' };
  }

  // 同类 open/acknowledged 合并
  const openSame = await db
    .select()
    .from(serviceRequests)
    .where(
      and(
        eq(serviceRequests.storeId, input.storeId),
        eq(serviceRequests.tableId, input.tableId),
        eq(serviceRequests.type, input.type),
        inArray(serviceRequests.status, ['open', 'acknowledged']),
      ),
    )
    .limit(1);
  if (openSame[0]) {
    return {
      ok: true as const,
      reused: true as const,
      id: openSame[0].id,
      publicToken: '',
      status: openSame[0].status,
      type: openSame[0].type,
    };
  }

  let tableSessionId: string | null = null;
  const openSession = await db
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
  tableSessionId = openSession[0]?.id ?? null;

  if (input.type === 'request_bill' && !tableSessionId) {
    return {
      ok: false as const,
      status: 400,
      error: 'No open table session for bill request',
      code: 'NO_SESSION',
    };
  }

  const id = crypto.randomUUID();
  const publicToken = generateToken();
  const publicTokenHash = await hashToken(publicToken);
  const createdAt = nowMs();

  await db.insert(serviceRequests).values({
    id,
    publicTokenHash,
    storeId: input.storeId,
    tableId: input.tableId,
    tableSessionId,
    type: input.type,
    status: 'open',
    idempotencyKey: input.idempotencyKey,
    createdAt,
    acknowledgedAt: null,
    resolvedAt: null,
  });

  try {
    await enqueueNotification(db, {
      storeId: input.storeId,
      eventType: 'service_request.created',
      entityId: id,
      delayMs: 0,
      payload: {
        type: 'service_request.created',
        title: 'TaoMenu',
        body: input.type === 'request_bill' ? 'Khách gọi tính tiền' : 'Khách gọi nhân viên',
        url: '/terminal',
        tag: `svc-${id}`,
      },
    });
  } catch {
    // 通知失败不阻断请求
  }

  return {
    ok: true as const,
    reused: false as const,
    id,
    publicToken,
    status: 'open' as const,
    type: input.type,
  };
}

export async function getServiceRequestByPublicToken(db: Db, publicToken: string) {
  const hash = await hashToken(publicToken);
  const rows = await db
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.publicTokenHash, hash))
    .limit(1);
  return rows[0] ?? null;
}

export async function listOpenServiceRequests(ctx: StoreContext, db: Db) {
  const rows = await db
    .select({
      id: serviceRequests.id,
      type: serviceRequests.type,
      status: serviceRequests.status,
      tableId: serviceRequests.tableId,
      tableName: diningTables.name,
      createdAt: serviceRequests.createdAt,
    })
    .from(serviceRequests)
    .innerJoin(diningTables, eq(diningTables.id, serviceRequests.tableId))
    .where(
      and(
        eq(serviceRequests.storeId, ctx.storeId),
        inArray(serviceRequests.status, ['open', 'acknowledged']),
      ),
    )
    .orderBy(desc(serviceRequests.createdAt));
  return rows;
}

export async function transitionServiceRequest(
  ctx: StoreContext,
  db: Db,
  requestId: string,
  next: Extract<ServiceRequestStatus, 'acknowledged' | 'resolved' | 'cancelled'>,
) {
  const rows = await db
    .select()
    .from(serviceRequests)
    .where(and(eq(serviceRequests.id, requestId), eq(serviceRequests.storeId, ctx.storeId)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  if (next === 'acknowledged' && row.status !== 'open') {
    return { error: 'INVALID_TRANSITION' as const };
  }
  if (next === 'resolved' && row.status !== 'open' && row.status !== 'acknowledged') {
    return { error: 'INVALID_TRANSITION' as const };
  }
  if (next === 'cancelled' && (row.status === 'resolved' || row.status === 'cancelled')) {
    return { error: 'INVALID_TRANSITION' as const };
  }

  const now = nowMs();
  await db
    .update(serviceRequests)
    .set({
      status: next,
      acknowledgedAt: next === 'acknowledged' ? now : row.acknowledgedAt,
      resolvedAt: next === 'resolved' || next === 'cancelled' ? now : row.resolvedAt,
    })
    .where(and(eq(serviceRequests.id, requestId), eq(serviceRequests.storeId, ctx.storeId)));

  return { ok: true as const, status: next };
}
