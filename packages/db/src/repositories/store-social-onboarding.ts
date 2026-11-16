import { eq } from 'drizzle-orm';
import { storeSocialOnboarding } from '../schema/store-social-onboarding';
import { nowMs } from '../time';
import type { Db } from '../types';

export type StoreSocialOnboarding = {
  googleMapsUrl: string;
  tripadvisorUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  facebookUrl: string;
  notes: string;
  submittedAt: Date | null;
};

const EMPTY_ONBOARDING: StoreSocialOnboarding = {
  googleMapsUrl: '',
  tripadvisorUrl: '',
  instagramUrl: '',
  tiktokUrl: '',
  facebookUrl: '',
  notes: '',
  submittedAt: null,
};

function isMissingSchemaError(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current instanceof Error; depth += 1) {
    if (/no such table/i.test(current.message)) return true;
    current = current.cause;
  }
  return false;
}

function trimUrl(value: string | null | undefined): string {
  return (value ?? '').trim();
}

export async function getStoreSocialOnboarding(
  db: Db,
  storeId: string,
): Promise<StoreSocialOnboarding> {
  try {
    const rows = await db
      .select()
      .from(storeSocialOnboarding)
      .where(eq(storeSocialOnboarding.storeId, storeId))
      .limit(1);
    const row = rows[0];
    if (!row) return EMPTY_ONBOARDING;
    return {
      googleMapsUrl: row.googleMapsUrl ?? '',
      tripadvisorUrl: row.tripadvisorUrl ?? '',
      instagramUrl: row.instagramUrl ?? '',
      tiktokUrl: row.tiktokUrl ?? '',
      facebookUrl: row.facebookUrl ?? '',
      notes: row.notes ?? '',
      submittedAt: row.submittedAt ?? null,
    };
  } catch (error) {
    if (isMissingSchemaError(error)) return EMPTY_ONBOARDING;
    throw error;
  }
}

export async function upsertStoreSocialOnboarding(
  db: Db,
  storeId: string,
  input: {
    googleMapsUrl: string;
    tripadvisorUrl: string;
    instagramUrl: string;
    tiktokUrl: string;
    facebookUrl: string;
    notes: string;
  },
): Promise<StoreSocialOnboarding> {
  const now = nowMs();
  const values = {
    storeId,
    googleMapsUrl: trimUrl(input.googleMapsUrl) || null,
    tripadvisorUrl: trimUrl(input.tripadvisorUrl) || null,
    instagramUrl: trimUrl(input.instagramUrl) || null,
    tiktokUrl: trimUrl(input.tiktokUrl) || null,
    facebookUrl: trimUrl(input.facebookUrl) || null,
    notes: trimUrl(input.notes) || null,
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  await db
    .insert(storeSocialOnboarding)
    .values(values)
    .onConflictDoUpdate({
      target: storeSocialOnboarding.storeId,
      set: {
        googleMapsUrl: values.googleMapsUrl,
        tripadvisorUrl: values.tripadvisorUrl,
        instagramUrl: values.instagramUrl,
        tiktokUrl: values.tiktokUrl,
        facebookUrl: values.facebookUrl,
        notes: values.notes,
        submittedAt: now,
        updatedAt: now,
      },
    });
  return getStoreSocialOnboarding(db, storeId);
}
