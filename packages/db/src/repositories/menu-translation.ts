import {
  doLocalesShareLanguage,
  getPlanLimits,
  type MenuTranslationInputEntity,
  type ReviewMenuTranslationBody,
} from '@taomenu/shared';
import { and, asc, count, desc, eq, gte, inArray } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import {
  menuCategoryTranslations,
  menuItemTranslations,
  modifierGroupTranslations,
  modifierTranslations,
} from '../schema/menu';
import { menuTranslationJobs, menuTranslationSuggestions } from '../schema/menu-translation';
import type { Db, StoreContext } from '../types';
import { getMenuTree, listMenuLocales } from './menu';
import { MenuImportError } from './menu-ai-config';

function assertTranslationAllowed(ctx: StoreContext) {
  if (!getPlanLimits(ctx.plan).canUseAiTranslation) {
    throw new MenuImportError('PRO_REQUIRED', 'AI translation requires Pro');
  }
}

function currentUtcMonthStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function getMenuTranslationUsage(ctx: StoreContext, db: Db) {
  assertTranslationAllowed(ctx);
  const limit = getPlanLimits(ctx.plan).maxAiTranslationsPerMonth;
  const rows = await db
    .select({ value: count() })
    .from(menuTranslationJobs)
    .where(
      and(
        eq(menuTranslationJobs.storeId, ctx.storeId),
        gte(menuTranslationJobs.createdAt, currentUtcMonthStart()),
      ),
    );
  return { used: rows[0]?.value ?? 0, limit };
}

function sourceTranslation<T extends { locale: string; name: string }>(
  translations: T[],
  locale: string,
): T | null {
  return translations.find((translation) => translation.locale === locale) ?? null;
}

function hasTargetTranslation(
  translations: Array<{ locale: string }>,
  targetLocale: string,
): boolean {
  return translations.some((translation) => translation.locale === targetLocale);
}

export async function buildMenuTranslationInput(
  ctx: StoreContext,
  db: Db,
  targetLocale: string,
): Promise<{ sourceLocale: string; entities: MenuTranslationInputEntity[] }> {
  const tree = await getMenuTree(ctx, db);
  const sourceLocale = tree.menu.baseLocale;
  if (doLocalesShareLanguage(sourceLocale, targetLocale)) {
    throw new MenuImportError('SAME_LANGUAGE', 'Target language must differ from source');
  }

  const locales = await listMenuLocales(ctx, db);
  if (!locales.includes(targetLocale) && locales.length >= getPlanLimits(ctx.plan).maxMenuLocales) {
    throw new MenuImportError('LOCALE_LIMIT_REACHED', 'Menu language limit reached');
  }

  const entities: MenuTranslationInputEntity[] = [];
  for (const category of tree.categories) {
    const sourceCategory = sourceTranslation(category.translations, sourceLocale);
    if (sourceCategory && !hasTargetTranslation(category.translations, targetLocale)) {
      entities.push({
        entityType: 'category',
        entityId: category.id,
        name: sourceCategory.name,
        description: sourceCategory.description,
      });
    }
    for (const item of category.items) {
      const sourceItem = sourceTranslation(item.translations, sourceLocale);
      if (sourceItem && !hasTargetTranslation(item.translations, targetLocale)) {
        entities.push({
          entityType: 'item',
          entityId: item.id,
          name: sourceItem.name,
          description: sourceItem.description,
        });
      }
      for (const group of item.modifierGroups) {
        const sourceGroup = sourceTranslation(group.translations, sourceLocale);
        if (sourceGroup && !hasTargetTranslation(group.translations, targetLocale)) {
          entities.push({
            entityType: 'modifier_group',
            entityId: group.id,
            name: sourceGroup.name,
            description: null,
          });
        }
        for (const option of group.options) {
          const sourceOption = sourceTranslation(option.translations, sourceLocale);
          if (sourceOption && !hasTargetTranslation(option.translations, targetLocale)) {
            entities.push({
              entityType: 'modifier',
              entityId: option.id,
              name: sourceOption.name,
              description: null,
            });
          }
        }
      }
    }
  }
  if (entities.length === 0) {
    throw new MenuImportError('NOTHING_TO_TRANSLATE', 'No missing source content to translate');
  }
  if (entities.length > 400) {
    throw new MenuImportError('MENU_TOO_LARGE', 'Menu has more than 400 translatable entries');
  }
  return { sourceLocale, entities };
}

export async function createMenuTranslation(ctx: StoreContext, db: Db, targetLocale: string) {
  assertTranslationAllowed(ctx);
  const usage = await getMenuTranslationUsage(ctx, db);
  if (usage.used >= usage.limit) {
    throw new MenuImportError('MONTHLY_LIMIT_REACHED', 'Monthly AI translation limit reached');
  }
  const input = await buildMenuTranslationInput(ctx, db, targetLocale);
  const jobId = crypto.randomUUID();
  await db.insert(menuTranslationJobs).values({
    id: jobId,
    storeId: ctx.storeId,
    status: 'queued',
    sourceLocale: input.sourceLocale,
    targetLocale,
    inputJson: JSON.stringify(input.entities),
    progress: 5,
    errorCode: null,
    usageJson: null,
    createdByUserId: ctx.userId,
    createdAt: new Date(),
    startedAt: null,
    completedAt: null,
  });
  return { jobId };
}

export async function getLatestMenuTranslation(ctx: StoreContext, db: Db) {
  assertTranslationAllowed(ctx);
  const jobs = await db
    .select()
    .from(menuTranslationJobs)
    .where(eq(menuTranslationJobs.storeId, ctx.storeId))
    .orderBy(desc(menuTranslationJobs.createdAt))
    .limit(1);
  const job = jobs[0];
  if (!job) return null;
  const suggestions = await db
    .select()
    .from(menuTranslationSuggestions)
    .where(
      and(
        eq(menuTranslationSuggestions.storeId, ctx.storeId),
        eq(menuTranslationSuggestions.jobId, job.id),
      ),
    )
    .orderBy(asc(menuTranslationSuggestions.id));
  return { job, suggestions };
}

export async function reviewMenuTranslation(
  ctx: StoreContext,
  db: Db,
  jobId: string,
  input: ReviewMenuTranslationBody,
) {
  assertTranslationAllowed(ctx);
  const jobs = await db
    .select({ id: menuTranslationJobs.id, status: menuTranslationJobs.status })
    .from(menuTranslationJobs)
    .where(and(eq(menuTranslationJobs.id, jobId), eq(menuTranslationJobs.storeId, ctx.storeId)))
    .limit(1);
  if (jobs[0]?.status !== 'needs_review') {
    throw new MenuImportError('INVALID_STATUS', 'Translation is not ready for review');
  }
  const ids = input.suggestions.map((suggestion) => suggestion.id);
  const existing = await db
    .select({ id: menuTranslationSuggestions.id })
    .from(menuTranslationSuggestions)
    .where(
      and(
        eq(menuTranslationSuggestions.jobId, jobId),
        eq(menuTranslationSuggestions.storeId, ctx.storeId),
        inArray(menuTranslationSuggestions.id, ids),
      ),
    );
  if (existing.length !== input.suggestions.length) {
    throw new MenuImportError('SUGGESTION_NOT_FOUND', 'Translation suggestion not found');
  }

  const now = new Date();
  const statements: BatchItem<'sqlite'>[] = input.suggestions.map((suggestion) =>
    db
      .update(menuTranslationSuggestions)
      .set({
        suggestedName: suggestion.name,
        suggestedDescription: suggestion.description,
        decision: suggestion.selected ? 'edited' : 'rejected',
        decidedByUserId: ctx.userId,
        decidedAt: now,
      })
      .where(
        and(
          eq(menuTranslationSuggestions.id, suggestion.id),
          eq(menuTranslationSuggestions.storeId, ctx.storeId),
        ),
      ),
  );
  if (statements.length > 0) {
    await db.batch(statements as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]]);
  }
  return { reviewed: statements.length };
}

export async function applyMenuTranslation(ctx: StoreContext, db: Db, jobId: string) {
  assertTranslationAllowed(ctx);
  const jobs = await db
    .select()
    .from(menuTranslationJobs)
    .where(and(eq(menuTranslationJobs.id, jobId), eq(menuTranslationJobs.storeId, ctx.storeId)))
    .limit(1);
  const job = jobs[0];
  if (job?.status !== 'needs_review') {
    throw new MenuImportError('INVALID_STATUS', 'Translation is not ready to apply');
  }
  const suggestions = await db
    .select()
    .from(menuTranslationSuggestions)
    .where(
      and(
        eq(menuTranslationSuggestions.jobId, jobId),
        eq(menuTranslationSuggestions.storeId, ctx.storeId),
        inArray(menuTranslationSuggestions.decision, ['accepted', 'edited']),
      ),
    );
  if (suggestions.length === 0) {
    throw new MenuImportError('NOTHING_SELECTED', 'No translations selected');
  }

  const statements: BatchItem<'sqlite'>[] = [];
  for (const suggestion of suggestions) {
    const common = {
      id: crypto.randomUUID(),
      storeId: suggestion.storeId,
      locale: job.targetLocale,
      name: suggestion.suggestedName,
    };
    if (suggestion.entityType === 'category') {
      statements.push(
        db
          .insert(menuCategoryTranslations)
          .values({
            ...common,
            categoryId: suggestion.entityId,
            description: suggestion.suggestedDescription,
            source: 'ai',
            reviewStatus: 'reviewed',
            sourceGenerationId: suggestion.jobId,
            reviewedByUserId: ctx.userId,
            reviewedAt: new Date(),
          })
          .onConflictDoNothing(),
      );
    } else if (suggestion.entityType === 'item') {
      statements.push(
        db
          .insert(menuItemTranslations)
          .values({
            ...common,
            itemId: suggestion.entityId,
            description: suggestion.suggestedDescription,
            source: 'ai',
            reviewStatus: 'reviewed',
            sourceGenerationId: suggestion.jobId,
            reviewedByUserId: ctx.userId,
            reviewedAt: new Date(),
          })
          .onConflictDoNothing(),
      );
    } else if (suggestion.entityType === 'modifier_group') {
      statements.push(
        db
          .insert(modifierGroupTranslations)
          .values({ ...common, modifierGroupId: suggestion.entityId })
          .onConflictDoNothing(),
      );
    } else {
      statements.push(
        db
          .insert(modifierTranslations)
          .values({
            ...common,
            modifierId: suggestion.entityId,
            source: 'ai',
            reviewStatus: 'reviewed',
            sourceGenerationId: suggestion.jobId,
            reviewedByUserId: ctx.userId,
            reviewedAt: new Date(),
          })
          .onConflictDoNothing(),
      );
    }
  }
  statements.push(
    db
      .update(menuTranslationJobs)
      .set({ status: 'applied', progress: 100, completedAt: new Date() })
      .where(and(eq(menuTranslationJobs.id, jobId), eq(menuTranslationJobs.storeId, ctx.storeId))),
  );
  await db.batch(statements as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]]);
  return { applied: suggestions.length, targetLocale: job.targetLocale };
}
