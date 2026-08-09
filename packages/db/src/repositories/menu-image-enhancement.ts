import { getPlanLimits } from '@taomenu/shared';
import { and, count, desc, eq, gte, inArray } from 'drizzle-orm';
import { menuItems } from '../schema/menu';
import { menuImageEnhancementJobs } from '../schema/menu-image-enhancement';
import type { Db, StoreContext } from '../types';
import { MenuImportError } from './menu-ai-config';

function assertImageEnhancementAllowed(ctx: StoreContext) {
  if (!getPlanLimits(ctx.plan).canUseAiImageEnhancement) {
    throw new MenuImportError('PRO_REQUIRED', 'AI image enhancement requires Pro');
  }
}

function currentUtcMonthStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function getMenuImageEnhancementUsage(ctx: StoreContext, db: Db) {
  assertImageEnhancementAllowed(ctx);
  const limit = getPlanLimits(ctx.plan).maxAiImageEnhancementsPerMonth;
  const rows = await db
    .select({ value: count() })
    .from(menuImageEnhancementJobs)
    .where(
      and(
        eq(menuImageEnhancementJobs.storeId, ctx.storeId),
        gte(menuImageEnhancementJobs.createdAt, currentUtcMonthStart()),
      ),
    );
  return { used: rows[0]?.value ?? 0, limit };
}

export async function getLatestMenuImageEnhancement(ctx: StoreContext, db: Db, itemId: string) {
  assertImageEnhancementAllowed(ctx);
  const jobs = await db
    .select()
    .from(menuImageEnhancementJobs)
    .where(
      and(
        eq(menuImageEnhancementJobs.storeId, ctx.storeId),
        eq(menuImageEnhancementJobs.itemId, itemId),
      ),
    )
    .orderBy(desc(menuImageEnhancementJobs.createdAt))
    .limit(1);
  return jobs[0] ?? null;
}

export async function createMenuImageEnhancement(ctx: StoreContext, db: Db, itemId: string) {
  assertImageEnhancementAllowed(ctx);
  const usage = await getMenuImageEnhancementUsage(ctx, db);
  if (usage.used >= usage.limit) {
    throw new MenuImportError(
      'MONTHLY_LIMIT_REACHED',
      'Monthly AI image enhancement limit reached',
    );
  }

  const items = await db
    .select({ imageKey: menuItems.imageKey })
    .from(menuItems)
    .where(and(eq(menuItems.storeId, ctx.storeId), eq(menuItems.id, itemId)))
    .limit(1);
  const imageKey = items[0]?.imageKey;
  if (!imageKey) {
    throw new MenuImportError('SOURCE_IMAGE_MISSING', 'Upload a dish photo first');
  }

  const active = await db
    .select({ id: menuImageEnhancementJobs.id })
    .from(menuImageEnhancementJobs)
    .where(
      and(
        eq(menuImageEnhancementJobs.storeId, ctx.storeId),
        eq(menuImageEnhancementJobs.itemId, itemId),
        inArray(menuImageEnhancementJobs.status, ['queued', 'processing', 'needs_review']),
      ),
    )
    .limit(1);
  if (active[0]) {
    throw new MenuImportError('ACTIVE_JOB_EXISTS', 'An image enhancement is already active');
  }

  const jobId = crypto.randomUUID();
  await db.insert(menuImageEnhancementJobs).values({
    id: jobId,
    storeId: ctx.storeId,
    itemId,
    status: 'queued',
    sourceImageKey: imageKey,
    previewImageKey: null,
    errorCode: null,
    usageJson: null,
    createdByUserId: ctx.userId,
    createdAt: new Date(),
    startedAt: null,
    completedAt: null,
  });
  return { jobId };
}

export async function getMenuImageEnhancementJob(db: Db, jobId: string) {
  const rows = await db
    .select()
    .from(menuImageEnhancementJobs)
    .where(eq(menuImageEnhancementJobs.id, jobId))
    .limit(1);
  return rows[0] ?? null;
}

export async function markMenuImageEnhancementProcessing(db: Db, jobId: string) {
  const rows = await db
    .update(menuImageEnhancementJobs)
    .set({ status: 'processing', startedAt: new Date(), errorCode: null })
    .where(
      and(eq(menuImageEnhancementJobs.id, jobId), eq(menuImageEnhancementJobs.status, 'queued')),
    )
    .returning({ id: menuImageEnhancementJobs.id });
  return rows.length > 0;
}

export async function saveMenuImageEnhancementResult(
  db: Db,
  jobId: string,
  previewImageKey: string,
  usage: unknown,
) {
  const rows = await db
    .update(menuImageEnhancementJobs)
    .set({
      status: 'needs_review',
      previewImageKey,
      usageJson: JSON.stringify(usage),
      completedAt: new Date(),
    })
    .where(
      and(
        eq(menuImageEnhancementJobs.id, jobId),
        eq(menuImageEnhancementJobs.status, 'processing'),
      ),
    )
    .returning({ id: menuImageEnhancementJobs.id });
  if (rows.length === 0) {
    throw new MenuImportError('INVALID_STATUS', 'Image enhancement is not processing');
  }
}

export async function failMenuImageEnhancement(db: Db, jobId: string, errorCode: string) {
  await db
    .update(menuImageEnhancementJobs)
    .set({ status: 'failed', errorCode, completedAt: new Date() })
    .where(eq(menuImageEnhancementJobs.id, jobId));
}

async function getOwnedJob(ctx: StoreContext, db: Db, itemId: string, jobId: string) {
  const rows = await db
    .select()
    .from(menuImageEnhancementJobs)
    .where(
      and(
        eq(menuImageEnhancementJobs.id, jobId),
        eq(menuImageEnhancementJobs.itemId, itemId),
        eq(menuImageEnhancementJobs.storeId, ctx.storeId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function applyMenuImageEnhancement(
  ctx: StoreContext,
  db: Db,
  itemId: string,
  jobId: string,
) {
  assertImageEnhancementAllowed(ctx);
  const job = await getOwnedJob(ctx, db, itemId, jobId);
  if (job?.status !== 'needs_review' || !job.previewImageKey) {
    throw new MenuImportError('INVALID_STATUS', 'Image enhancement is not ready for review');
  }
  const changed = await db
    .update(menuItems)
    .set({ imageKey: job.previewImageKey, updatedAt: new Date() })
    .where(
      and(
        eq(menuItems.id, itemId),
        eq(menuItems.storeId, ctx.storeId),
        eq(menuItems.imageKey, job.sourceImageKey),
      ),
    )
    .returning({ id: menuItems.id });
  if (changed.length === 0) {
    throw new MenuImportError('SOURCE_IMAGE_CHANGED', 'The dish photo changed during enhancement');
  }
  await db
    .update(menuImageEnhancementJobs)
    .set({ status: 'applied', completedAt: new Date() })
    .where(eq(menuImageEnhancementJobs.id, jobId));
  return { imageKey: job.previewImageKey };
}

export async function cancelMenuImageEnhancement(
  ctx: StoreContext,
  db: Db,
  itemId: string,
  jobId: string,
) {
  assertImageEnhancementAllowed(ctx);
  const job = await getOwnedJob(ctx, db, itemId, jobId);
  if (job?.status !== 'needs_review') {
    throw new MenuImportError('INVALID_STATUS', 'Image enhancement cannot be cancelled');
  }
  await db
    .update(menuImageEnhancementJobs)
    .set({ status: 'cancelled', completedAt: new Date() })
    .where(eq(menuImageEnhancementJobs.id, jobId));
  return { previewImageKey: job.previewImageKey };
}

export async function restoreMenuImageEnhancement(
  ctx: StoreContext,
  db: Db,
  itemId: string,
  jobId: string,
) {
  assertImageEnhancementAllowed(ctx);
  const job = await getOwnedJob(ctx, db, itemId, jobId);
  if (job?.status !== 'applied' || !job.previewImageKey) {
    throw new MenuImportError('INVALID_STATUS', 'Enhanced image is not currently applied');
  }
  const changed = await db
    .update(menuItems)
    .set({ imageKey: job.sourceImageKey, updatedAt: new Date() })
    .where(
      and(
        eq(menuItems.id, itemId),
        eq(menuItems.storeId, ctx.storeId),
        eq(menuItems.imageKey, job.previewImageKey),
      ),
    )
    .returning({ id: menuItems.id });
  if (changed.length === 0) {
    throw new MenuImportError('IMAGE_ALREADY_CHANGED', 'The dish photo has already changed');
  }
  await db
    .update(menuImageEnhancementJobs)
    .set({ status: 'cancelled', completedAt: new Date() })
    .where(eq(menuImageEnhancementJobs.id, jobId));
  return { imageKey: job.sourceImageKey, previewImageKey: job.previewImageKey };
}
