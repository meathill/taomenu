import type { MenuTranslationInputEntity, MenuTranslationOutput } from '@taomenu/shared';
import { and, eq } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import { menuTranslationJobs, menuTranslationSuggestions } from '../schema/menu-translation';
import type { Db } from '../types';
import { MenuImportError } from './menu-ai-config';

export async function getMenuTranslationJob(db: Db, jobId: string) {
  const jobs = await db.select().from(menuTranslationJobs).where(eq(menuTranslationJobs.id, jobId));
  const job = jobs[0];
  if (!job) return null;
  return {
    job,
    entities: JSON.parse(job.inputJson) as MenuTranslationInputEntity[],
  };
}

export async function markMenuTranslationProcessing(db: Db, jobId: string) {
  const rows = await db
    .update(menuTranslationJobs)
    .set({ status: 'processing', progress: 20, startedAt: new Date(), errorCode: null })
    .where(and(eq(menuTranslationJobs.id, jobId), eq(menuTranslationJobs.status, 'queued')))
    .returning({ id: menuTranslationJobs.id });
  return rows.length > 0;
}

export async function saveMenuTranslationResult(
  db: Db,
  jobId: string,
  output: MenuTranslationOutput,
  usage: unknown,
) {
  const current = await getMenuTranslationJob(db, jobId);
  if (current?.job.status !== 'processing') {
    throw new MenuImportError('INVALID_STATUS', 'Translation is not processing');
  }
  const inputById = new Map(current.entities.map((entity) => [entity.entityId, entity]));
  const outputIds = new Set(output.translations.map((translation) => translation.entityId));
  if (
    outputIds.size !== current.entities.length ||
    output.translations.length !== current.entities.length
  ) {
    throw new MenuImportError('OPENAI_INVALID_OUTPUT', 'Translation output is incomplete');
  }

  const statements: BatchItem<'sqlite'>[] = [
    db.delete(menuTranslationSuggestions).where(eq(menuTranslationSuggestions.jobId, jobId)),
  ];
  for (const translation of output.translations) {
    const source = inputById.get(translation.entityId);
    if (!source || source.entityType !== translation.entityType) {
      throw new MenuImportError('OPENAI_INVALID_OUTPUT', 'Translation entity does not match input');
    }
    statements.push(
      db.insert(menuTranslationSuggestions).values({
        id: crypto.randomUUID(),
        storeId: current.job.storeId,
        jobId,
        entityType: source.entityType,
        entityId: source.entityId,
        sourceName: source.name,
        sourceDescription: source.description,
        suggestedName: translation.name,
        suggestedDescription: source.description === null ? null : translation.description,
        decision: 'pending',
        decidedByUserId: null,
        decidedAt: null,
      }),
    );
  }
  statements.push(
    db
      .update(menuTranslationJobs)
      .set({
        status: 'needs_review',
        progress: 100,
        usageJson: JSON.stringify(usage),
        completedAt: new Date(),
      })
      .where(eq(menuTranslationJobs.id, jobId)),
  );
  await db.batch(statements as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]]);
}

export async function failMenuTranslation(db: Db, jobId: string, errorCode: string) {
  await db
    .update(menuTranslationJobs)
    .set({ status: 'failed', progress: 100, errorCode, completedAt: new Date() })
    .where(eq(menuTranslationJobs.id, jobId));
}
