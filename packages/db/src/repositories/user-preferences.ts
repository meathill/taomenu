import { eq } from 'drizzle-orm';
import { userPreferences } from '../schema/user-preferences';
import { nowMs } from '../time';
import type { Db } from '../types';

export type UserPreferences = {
  hideMenuProTools: boolean;
};

const DEFAULT_USER_PREFERENCES: UserPreferences = {
  hideMenuProTools: false,
};

export async function getUserPreferences(db: Db, userId: string): Promise<UserPreferences> {
  const rows = await db
    .select({ hideMenuProTools: userPreferences.hideMenuProTools })
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);
  return rows[0] ?? DEFAULT_USER_PREFERENCES;
}

export async function updateUserPreferences(
  db: Db,
  userId: string,
  input: Partial<UserPreferences>,
): Promise<UserPreferences> {
  const current = await getUserPreferences(db, userId);
  const next = { ...current, ...input };
  await db
    .insert(userPreferences)
    .values({ userId, ...next, updatedAt: nowMs() })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { ...next, updatedAt: nowMs() },
    });
  return next;
}
