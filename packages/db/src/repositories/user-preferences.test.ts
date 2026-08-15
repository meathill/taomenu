import { describe, expect, it } from 'vitest';
import { user } from '../schema/auth';
import { createTestDb } from '../testing/memory-d1';
import { getUserPreferences, updateUserPreferences } from './user-preferences';

describe('用户偏好', () => {
  it('默认显示 Pro tools，保存后可跨请求读取隐藏状态', async () => {
    const db = createTestDb();
    await db.insert(user).values({
      id: 'user-1',
      name: 'Owner',
      email: 'owner@example.com',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(getUserPreferences(db, 'user-1')).resolves.toEqual({
      hideMenuProTools: false,
    });
    await updateUserPreferences(db, 'user-1', { hideMenuProTools: true });
    await expect(getUserPreferences(db, 'user-1')).resolves.toEqual({
      hideMenuProTools: true,
    });
  });
});
