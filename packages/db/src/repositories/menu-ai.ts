import {
  getPlanLimits,
  type MenuImportItem,
  menuImportCategorySchema,
  menuImportItemSchema,
  type ReviewMenuImportBody,
} from '@taomenu/shared';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import { z } from 'zod';
import {
  menuCategories,
  menuCategoryTranslations,
  menuItems,
  menuItemTranslations,
  modifierGroups,
  modifierGroupTranslations,
  modifiers,
  modifierTranslations,
} from '../schema/menu';
import { menuImportAssets, menuImportSuggestions, menuImports } from '../schema/menu-ai';
import { stores } from '../schema/stores';
import type { Db, StoreContext } from '../types';
import { ensureStoreMenu } from './menu';
import {
  MENU_AI_MODEL,
  MENU_AI_PROMPT_VERSION,
  MENU_AI_PROVIDER,
  MENU_AI_SCHEMA_VERSION,
  MenuImportError,
} from './menu-ai-config';
import { resolveMenuImportTargetLocale } from './menu-ai-locale';

const categorySuggestionSchema = menuImportCategorySchema.omit({ items: true, confidence: true });
const itemSuggestionSchema = menuImportItemSchema.omit({ confidence: true }).extend({
  categoryTemporaryKey: z.string().uuid(),
});

export type MenuImportSuggestionView = {
  id: string;
  entityType: 'category' | 'item';
  temporaryEntityKey: string;
  locale: string;
  value: z.infer<typeof categorySuggestionSchema> | z.infer<typeof itemSuggestionSchema>;
  confidence: number;
  decision: 'pending' | 'accepted' | 'edited' | 'rejected';
};

function assertAiImportAllowed(ctx: StoreContext) {
  if (!getPlanLimits(ctx.plan).canUseAiMenuImport) {
    throw new MenuImportError('PRO_REQUIRED', 'AI menu import requires Pro');
  }
}

export async function createMenuImport(
  ctx: StoreContext,
  db: Db,
  input: { importId?: string; r2Key: string; mimeType: string; sizeBytes: number },
) {
  assertAiImportAllowed(ctx);
  const importId = input.importId ?? crypto.randomUUID();
  const createdAt = new Date();
  await db.batch([
    db.insert(menuImports).values({
      id: importId,
      storeId: ctx.storeId,
      status: 'draft',
      sourceLocale: null,
      targetLocalesJson: '[]',
      provider: MENU_AI_PROVIDER,
      model: MENU_AI_MODEL,
      promptVersion: MENU_AI_PROMPT_VERSION,
      schemaVersion: MENU_AI_SCHEMA_VERSION,
      progress: 0,
      errorCode: null,
      usageJson: null,
      estimatedCostUsdTicks: null,
      createdByUserId: ctx.userId,
      createdAt,
      startedAt: null,
      completedAt: null,
    }),
    db.insert(menuImportAssets).values({
      id: crypto.randomUUID(),
      storeId: ctx.storeId,
      importId,
      r2Key: input.r2Key,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      pageOrder: 0,
    }),
  ]);
  return { importId };
}

export async function queueMenuImport(ctx: StoreContext, db: Db, importId: string) {
  assertAiImportAllowed(ctx);
  const rows = await db
    .select({ id: menuImports.id, status: menuImports.status })
    .from(menuImports)
    .where(and(eq(menuImports.id, importId), eq(menuImports.storeId, ctx.storeId)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.status !== 'draft' && row.status !== 'failed') {
    throw new MenuImportError('INVALID_STATUS', 'Import cannot be queued from this status');
  }
  await db
    .update(menuImports)
    .set({ status: 'queued', progress: 5, errorCode: null, startedAt: null, completedAt: null })
    .where(and(eq(menuImports.id, importId), eq(menuImports.storeId, ctx.storeId)));
  return { importId };
}

export async function getLatestMenuImport(ctx: StoreContext, db: Db) {
  assertAiImportAllowed(ctx);
  const imports = await db
    .select()
    .from(menuImports)
    .where(eq(menuImports.storeId, ctx.storeId))
    .orderBy(desc(menuImports.createdAt))
    .limit(1);
  const menuImport = imports[0];
  if (!menuImport) return null;
  const rows = await db
    .select()
    .from(menuImportSuggestions)
    .where(
      and(
        eq(menuImportSuggestions.storeId, ctx.storeId),
        eq(menuImportSuggestions.importId, menuImport.id),
      ),
    )
    .orderBy(asc(menuImportSuggestions.entityType), asc(menuImportSuggestions.id));
  const suggestions = rows.map(parseSuggestionRow);
  const existingCategories = await db
    .select({ id: menuCategories.id })
    .from(menuCategories)
    .where(eq(menuCategories.storeId, ctx.storeId))
    .limit(1);
  return { menuImport, suggestions, hasExistingCategories: existingCategories.length > 0 };
}

function parseSuggestionRow(
  row: typeof menuImportSuggestions.$inferSelect,
): MenuImportSuggestionView {
  const value = JSON.parse(row.suggestedValueJson) as unknown;
  const parsed =
    row.entityType === 'category'
      ? categorySuggestionSchema.parse(value)
      : itemSuggestionSchema.parse(value);
  return {
    id: row.id,
    entityType: row.entityType,
    temporaryEntityKey: row.temporaryEntityKey,
    locale: row.locale,
    value: parsed,
    confidence: row.confidence,
    decision: row.decision,
  };
}

export async function reviewMenuImport(
  ctx: StoreContext,
  db: Db,
  importId: string,
  input: ReviewMenuImportBody,
) {
  assertAiImportAllowed(ctx);
  const rows = await db
    .select()
    .from(menuImportSuggestions)
    .where(
      and(
        eq(menuImportSuggestions.storeId, ctx.storeId),
        eq(menuImportSuggestions.importId, importId),
        inArray(
          menuImportSuggestions.id,
          input.suggestions.map((suggestion) => suggestion.id),
        ),
      ),
    );
  if (rows.length !== input.suggestions.length) {
    throw new MenuImportError('SUGGESTION_NOT_FOUND', 'Suggestion not found');
  }
  const rowById = new Map(rows.map((row) => [row.id, row]));
  const decidedAt = new Date();
  const statements: BatchItem<'sqlite'>[] = input.suggestions.map((suggestion) => {
    const row = rowById.get(suggestion.id);
    if (!row) throw new MenuImportError('SUGGESTION_NOT_FOUND', 'Suggestion not found');
    let valueJson = row.suggestedValueJson;
    if (suggestion.decision === 'edited') {
      const parsed =
        row.entityType === 'category'
          ? categorySuggestionSchema.parse(suggestion.value)
          : itemSuggestionSchema.parse(suggestion.value);
      valueJson = JSON.stringify(parsed);
    }
    return db
      .update(menuImportSuggestions)
      .set({
        decision: suggestion.decision,
        suggestedValueJson: valueJson,
        decidedByUserId: ctx.userId,
        decidedAt,
      })
      .where(
        and(
          eq(menuImportSuggestions.id, suggestion.id),
          eq(menuImportSuggestions.storeId, ctx.storeId),
        ),
      );
  });
  const [first, ...rest] = statements;
  if (!first) throw new MenuImportError('INVALID_REVIEW', 'No suggestions to review');
  await db.batch([first, ...rest]);
}

export async function applyMenuImport(ctx: StoreContext, db: Db, importId: string) {
  assertAiImportAllowed(ctx);
  const importRows = await db
    .select()
    .from(menuImports)
    .where(and(eq(menuImports.id, importId), eq(menuImports.storeId, ctx.storeId)))
    .limit(1);
  const menuImport = importRows[0];
  if (menuImport?.status !== 'needs_review') {
    throw new MenuImportError('INVALID_STATUS', 'Import is not ready to apply');
  }
  const suggestions = await db
    .select()
    .from(menuImportSuggestions)
    .where(
      and(
        eq(menuImportSuggestions.storeId, ctx.storeId),
        eq(menuImportSuggestions.importId, importId),
      ),
    );
  if (suggestions.some((suggestion) => suggestion.decision === 'pending')) {
    throw new MenuImportError('REVIEW_REQUIRED', 'Review every suggestion before applying');
  }
  const accepted = suggestions.filter(
    (suggestion) => suggestion.decision === 'accepted' || suggestion.decision === 'edited',
  );
  if (accepted.length === 0) {
    throw new MenuImportError('NOTHING_ACCEPTED', 'Accept at least one suggestion');
  }

  const menu = await ensureStoreMenu(ctx, db);
  const currentCategoryCount = await db
    .select({ id: menuCategories.id })
    .from(menuCategories)
    .where(and(eq(menuCategories.storeId, ctx.storeId), eq(menuCategories.menuId, menu.id)));
  const categoryRows = accepted.filter((row) => row.entityType === 'category');
  const detectedLocale = categoryRows[0]?.locale ?? menuImport.sourceLocale;
  if (!detectedLocale) {
    throw new MenuImportError('LOCALE_REQUIRED', 'Import has no detected locale');
  }
  const storeRows = await db
    .select({ baseLocale: stores.baseLocale })
    .from(stores)
    .where(eq(stores.id, ctx.storeId))
    .limit(1);
  const baseLocale = storeRows[0]?.baseLocale ?? 'vi';
  const localeResolution = resolveMenuImportTargetLocale({
    baseLocale,
    detectedLocale,
    hasExistingCategories: currentCategoryCount.length > 0,
  });
  if (!localeResolution) {
    throw new MenuImportError(
      'LOCALE_MISMATCH',
      'Import language does not match the existing menu language',
    );
  }
  const acceptedCategoryKeys = new Set(categoryRows.map((row) => row.temporaryEntityKey));
  const now = new Date();
  const statements: BatchItem<'sqlite'>[] = [];

  if (localeResolution.shouldAdoptAsBaseLocale) {
    statements.push(
      db
        .update(stores)
        .set({ baseLocale: localeResolution.targetLocale, updatedAt: now })
        .where(eq(stores.id, ctx.storeId)),
    );
  }

  categoryRows.forEach((row, categoryIndex) => {
    const category = categorySuggestionSchema.parse(JSON.parse(row.suggestedValueJson));
    statements.push(
      db.insert(menuCategories).values({
        id: row.temporaryEntityKey,
        storeId: ctx.storeId,
        menuId: menu.id,
        sortOrder: currentCategoryCount.length + categoryIndex,
        isAvailable: true,
        createdAt: now,
        updatedAt: now,
      }),
      db.insert(menuCategoryTranslations).values({
        id: crypto.randomUUID(),
        storeId: ctx.storeId,
        categoryId: row.temporaryEntityKey,
        locale: localeResolution.targetLocale,
        name: category.name,
        description: category.description,
        source: 'ai',
        reviewStatus: 'reviewed',
        sourceGenerationId: importId,
        reviewedByUserId: ctx.userId,
        reviewedAt: now,
      }),
    );
  });

  const itemCounts = new Map<string, number>();
  for (const row of accepted.filter((suggestion) => suggestion.entityType === 'item')) {
    const item = itemSuggestionSchema.parse(JSON.parse(row.suggestedValueJson));
    if (!acceptedCategoryKeys.has(item.categoryTemporaryKey)) {
      throw new MenuImportError(
        'CATEGORY_REQUIRED',
        'Accepted item belongs to a rejected category',
      );
    }
    if (item.priceAmount === null) {
      throw new MenuImportError('PRICE_REQUIRED', 'Accepted item has an unconfirmed price');
    }
    const itemSortOrder = itemCounts.get(item.categoryTemporaryKey) ?? 0;
    itemCounts.set(item.categoryTemporaryKey, itemSortOrder + 1);
    statements.push(
      db.insert(menuItems).values({
        id: row.temporaryEntityKey,
        storeId: ctx.storeId,
        categoryId: item.categoryTemporaryKey,
        priceAmount: item.priceAmount,
        imageKey: null,
        sortOrder: itemSortOrder,
        isAvailable: true,
        isSoldOut: false,
        createdAt: now,
        updatedAt: now,
      }),
      db.insert(menuItemTranslations).values({
        id: crypto.randomUUID(),
        storeId: ctx.storeId,
        itemId: row.temporaryEntityKey,
        locale: localeResolution.targetLocale,
        name: item.name,
        description: item.description,
        source: 'ai',
        reviewStatus: 'reviewed',
        sourceGenerationId: importId,
        reviewedByUserId: ctx.userId,
        reviewedAt: now,
      }),
    );
    item.modifierGroups.forEach((group: MenuImportItem['modifierGroups'][number], groupIndex) => {
      const groupId = crypto.randomUUID();
      statements.push(
        db.insert(modifierGroups).values({
          id: groupId,
          storeId: ctx.storeId,
          itemId: row.temporaryEntityKey,
          minSelected: group.minSelected,
          maxSelected: group.maxSelected,
          sortOrder: groupIndex,
          isRequired: group.isRequired,
        }),
        db.insert(modifierGroupTranslations).values({
          id: crypto.randomUUID(),
          storeId: ctx.storeId,
          modifierGroupId: groupId,
          locale: localeResolution.targetLocale,
          name: group.name,
        }),
      );
      group.modifiers.forEach((option, optionIndex) => {
        const modifierId = crypto.randomUUID();
        statements.push(
          db.insert(modifiers).values({
            id: modifierId,
            storeId: ctx.storeId,
            modifierGroupId: groupId,
            priceDeltaAmount: option.priceDeltaAmount,
            sortOrder: optionIndex,
            isAvailable: true,
          }),
          db.insert(modifierTranslations).values({
            id: crypto.randomUUID(),
            storeId: ctx.storeId,
            modifierId,
            locale: localeResolution.targetLocale,
            name: option.name,
            source: 'ai',
            reviewStatus: 'reviewed',
            sourceGenerationId: importId,
            reviewedByUserId: ctx.userId,
            reviewedAt: now,
          }),
        );
      });
    });
  }
  statements.push(
    db
      .update(menuImports)
      .set({ status: 'applied', completedAt: now })
      .where(and(eq(menuImports.id, importId), eq(menuImports.storeId, ctx.storeId))),
  );
  await db.batch(statements as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]]);
  return { applied: accepted.length };
}
