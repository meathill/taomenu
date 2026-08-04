import { getPlanLimits, type PlanId } from '@taomenu/shared';
import { and, desc, eq, inArray, isNull, lt } from 'drizzle-orm';
import { generateToken, hashToken, tokensMatch } from '../crypto-token';
import { pushSubscriptions, stores, terminalDevices, terminalPairingCodes } from '../schema';
import type { Db, StoreContext } from '../types';

const PAIRING_CODE_TTL_MS = 10 * 60 * 1000;
const MAX_PAIRING_ATTEMPTS = 5;

export type TerminalDeviceView = {
  id: string;
  name: string;
  pairedAt: Date;
  lastSeenAt: Date | null;
  revokedAt: Date | null;
  status: 'active' | 'revoked';
  pushEnabled: boolean;
};

export type PairingCodeResult = { code: string; expiresAt: Date } | { error: 'TERMINAL_LIMIT' };

function nowMs(): Date {
  return new Date();
}

function generatePairingCode(): string {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(values[0]! % 100_000_000).padStart(8, '0');
}

export function normalizePairingCode(value: string): string {
  return value.replace(/\s/g, '').replace(/-/g, '').trim();
}

export function isPairingCodeExpired(expiresAt: Date, now = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export async function createTerminalPairingCode(
  ctx: StoreContext,
  db: Db,
): Promise<PairingCodeResult> {
  const active = await db
    .select({ id: terminalDevices.id })
    .from(terminalDevices)
    .where(and(eq(terminalDevices.storeId, ctx.storeId), isNull(terminalDevices.revokedAt)));
  const limit = getPlanLimits(ctx.plan as PlanId).maxStaffTerminals;
  if (active.length >= limit) {
    return { error: 'TERMINAL_LIMIT' };
  }

  const code = generatePairingCode();
  const expiresAt = new Date(Date.now() + PAIRING_CODE_TTL_MS);
  await db.insert(terminalPairingCodes).values({
    id: crypto.randomUUID(),
    storeId: ctx.storeId,
    createdByUserId: ctx.userId,
    codeHintHash: await hashToken(code.slice(0, 2)),
    codeHash: await hashToken(code),
    expiresAt,
    attempts: 0,
    usedAt: null,
    createdAt: nowMs(),
  });
  return { code, expiresAt };
}

export async function pairTerminalWithCode(
  db: Db,
  input: { code: string; name: string },
): Promise<
  | {
      credential: string;
      device: TerminalDeviceView;
    }
  | { error: 'INVALID_CODE' | 'EXPIRED_CODE' | 'CODE_LOCKED' | 'TERMINAL_LIMIT' }
> {
  const code = normalizePairingCode(input.code);
  if (!/^\d{8}$/.test(code)) {
    return { error: 'INVALID_CODE' };
  }

  const now = nowMs();
  const candidates = await db
    .select()
    .from(terminalPairingCodes)
    .where(eq(terminalPairingCodes.codeHintHash, await hashToken(code.slice(0, 2))))
    .orderBy(desc(terminalPairingCodes.createdAt));

  let pairingCode: (typeof candidates)[number] | undefined;
  for (const candidate of candidates) {
    if (await tokensMatch(code, candidate.codeHash)) {
      pairingCode = candidate;
      break;
    }
  }
  if (!pairingCode) {
    for (const candidate of candidates) {
      if (
        !candidate.usedAt &&
        candidate.expiresAt > now &&
        candidate.attempts < MAX_PAIRING_ATTEMPTS
      ) {
        await db
          .update(terminalPairingCodes)
          .set({ attempts: candidate.attempts + 1 })
          .where(eq(terminalPairingCodes.id, candidate.id));
      }
    }
    return { error: 'INVALID_CODE' };
  }
  if (pairingCode.usedAt) return { error: 'INVALID_CODE' };
  if (isPairingCodeExpired(pairingCode.expiresAt, now)) return { error: 'EXPIRED_CODE' };
  if (pairingCode.attempts >= MAX_PAIRING_ATTEMPTS) {
    return { error: 'CODE_LOCKED' };
  }

  const active = await db
    .select({ id: terminalDevices.id })
    .from(terminalDevices)
    .where(
      and(eq(terminalDevices.storeId, pairingCode.storeId), isNull(terminalDevices.revokedAt)),
    );
  const storeRows = await db
    .select({ plan: stores.plan })
    .from(stores)
    .where(eq(stores.id, pairingCode.storeId))
    .limit(1);
  const plan = storeRows[0]?.plan ?? 'free';
  if (active.length >= getPlanLimits(plan as PlanId).maxStaffTerminals) {
    return { error: 'TERMINAL_LIMIT' };
  }

  const pairedAt = nowMs();
  const claimResult = await db
    .update(terminalPairingCodes)
    .set({ usedAt: pairedAt, attempts: pairingCode.attempts + 1 })
    .where(
      and(
        eq(terminalPairingCodes.id, pairingCode.id),
        isNull(terminalPairingCodes.usedAt),
        lt(terminalPairingCodes.attempts, MAX_PAIRING_ATTEMPTS),
      ),
    );
  if (claimResult.meta.changes === 0) {
    return { error: 'INVALID_CODE' };
  }

  const credential = generateToken(32);
  const device = {
    id: crypto.randomUUID(),
    storeId: pairingCode.storeId,
    name: input.name.trim(),
    credentialHash: await hashToken(credential),
    pairedByUserId: pairingCode.createdByUserId,
    pairedAt,
    lastSeenAt: pairedAt,
    revokedAt: null,
    createdAt: pairedAt,
  };

  await db.insert(terminalDevices).values(device);

  return {
    credential,
    device: {
      id: device.id,
      name: device.name,
      pairedAt,
      lastSeenAt: pairedAt,
      revokedAt: null,
      status: 'active',
      pushEnabled: false,
    },
  };
}

export async function listTerminalDevices(
  ctx: StoreContext,
  db: Db,
): Promise<TerminalDeviceView[]> {
  const rows = await db
    .select({
      id: terminalDevices.id,
      name: terminalDevices.name,
      pairedAt: terminalDevices.pairedAt,
      lastSeenAt: terminalDevices.lastSeenAt,
      revokedAt: terminalDevices.revokedAt,
    })
    .from(terminalDevices)
    .where(eq(terminalDevices.storeId, ctx.storeId))
    .orderBy(desc(terminalDevices.createdAt));
  const ids = rows.map((row) => row.id);
  const subscriptions =
    ids.length === 0
      ? []
      : await db
          .select({ terminalId: pushSubscriptions.terminalId })
          .from(pushSubscriptions)
          .where(
            and(inArray(pushSubscriptions.terminalId, ids), isNull(pushSubscriptions.disabledAt)),
          );
  const pushIds = new Set(subscriptions.map((subscription) => subscription.terminalId));
  return rows.map((row) => ({
    ...row,
    status: row.revokedAt ? 'revoked' : 'active',
    pushEnabled: pushIds.has(row.id),
  }));
}

export async function getTerminalByCredential(db: Db, credential: string) {
  const credentialHash = await hashToken(credential);
  const rows = await db
    .select()
    .from(terminalDevices)
    .where(
      and(eq(terminalDevices.credentialHash, credentialHash), isNull(terminalDevices.revokedAt)),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function touchTerminalDevice(db: Db, terminalId: string): Promise<void> {
  await db
    .update(terminalDevices)
    .set({ lastSeenAt: nowMs() })
    .where(and(eq(terminalDevices.id, terminalId), isNull(terminalDevices.revokedAt)));
}

export async function revokeTerminalDevice(
  ctx: StoreContext,
  db: Db,
  terminalId: string,
): Promise<boolean> {
  const result = await db
    .update(terminalDevices)
    .set({ revokedAt: nowMs() })
    .where(
      and(
        eq(terminalDevices.id, terminalId),
        eq(terminalDevices.storeId, ctx.storeId),
        isNull(terminalDevices.revokedAt),
      ),
    );
  return result.meta.changes > 0;
}
