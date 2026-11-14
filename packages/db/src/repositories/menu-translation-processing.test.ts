import { describe, expect, it } from 'vitest';
import { user } from '../schema/auth';
import { menuTranslationJobs } from '../schema/menu-translation';
import { createTestDb } from '../testing/memory-d1';
import type { StoreContext } from '../types';
import { getMenuTranslationUsage } from './menu-translation';
import {
  failMenuTranslation,
  markMenuTranslationProcessing,
  saveMenuTranslationResult,
} from './menu-translation-processing';
import { createStoreForOwner } from './stores';

const ENTITY_ID = '00000000-0000-4000-8000-000000000001';
const ENTITIES = [
  {
    entityType: 'item' as const,
    entityId: ENTITY_ID,
    name: 'Phở bò tái',
    description: null,
  },
];

async function setup() {
  const db = createTestDb();
  await db.insert(user).values({
    id: 'owner-1',
    name: 'Owner',
    email: 'owner@example.com',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const store = await createStoreForOwner(db, 'owner-1', {
    name: 'Test store',
    serviceMode: 'table_service',
    baseLocale: 'vi',
  });
  const ctx: StoreContext = {
    storeId: store.id,
    userId: 'owner-1',
    role: 'owner',
    plan: 'free',
    staffSeatAddons: 0,
  };
  return { db, ctx };
}

async function insertJob(
  db: ReturnType<typeof createTestDb>,
  ctx: StoreContext,
  status: 'queued' | 'failed' | 'applied' = 'queued',
) {
  const jobId = crypto.randomUUID();
  await db.insert(menuTranslationJobs).values({
    id: jobId,
    storeId: ctx.storeId,
    status,
    sourceLocale: 'vi',
    targetLocale: 'en',
    inputJson: JSON.stringify(ENTITIES),
    progress: status === 'queued' ? 5 : 100,
    errorCode: status === 'failed' ? 'AI_UNTRANSLATED_OUTPUT' : null,
    usageJson: null,
    createdByUserId: ctx.userId,
    createdAt: new Date(),
    startedAt: null,
    completedAt: status === 'queued' ? null : new Date(),
  });
  return jobId;
}

describe('saveMenuTranslationResult', () => {
  it('模型几乎原样回写原文时拒绝落库草稿', async () => {
    const { db, ctx } = await setup();
    const jobId = await insertJob(db, ctx);
    await markMenuTranslationProcessing(db, jobId);
    await expect(
      saveMenuTranslationResult(
        db,
        jobId,
        {
          translations: [
            {
              entityType: 'item',
              entityId: ENTITY_ID,
              name: 'Phở bò tái',
              description: null,
            },
          ],
        },
        null,
      ),
    ).rejects.toMatchObject({ code: 'AI_UNTRANSLATED_OUTPUT' });
  });

  it('真正译出目标语言时写入待审核草稿', async () => {
    const { db, ctx } = await setup();
    const jobId = await insertJob(db, ctx);
    await markMenuTranslationProcessing(db, jobId);
    await saveMenuTranslationResult(
      db,
      jobId,
      {
        translations: [
          {
            entityType: 'item',
            entityId: ENTITY_ID,
            name: 'Phở bò tái (Rare beef noodle soup)',
            description: null,
          },
        ],
      },
      { total_tokens: 10 },
    );
    const job = await db.select().from(menuTranslationJobs);
    expect(job[0]?.status).toBe('needs_review');
  });
});

describe('getMenuTranslationUsage', () => {
  it('失败的翻译任务不占月度额度', async () => {
    const { db, ctx } = await setup();
    await insertJob(db, ctx, 'applied');
    const failedId = await insertJob(db, ctx, 'failed');
    expect(await getMenuTranslationUsage(ctx, db)).toEqual({ used: 1, limit: 10 });
    await failMenuTranslation(db, failedId, 'AI_UNTRANSLATED_OUTPUT');
    expect(await getMenuTranslationUsage(ctx, db)).toEqual({ used: 1, limit: 10 });
  });
});
