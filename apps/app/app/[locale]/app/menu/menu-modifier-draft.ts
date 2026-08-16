import { minorAmountToInput, parseCurrencyInput } from '@taomenu/shared';

export type ModifierOptionDraft = {
  clientId: string;
  serverId?: string;
  name: string;
  delta: string;
};

export type ModifierGroupDraft = {
  clientId: string;
  serverId?: string;
  name: string;
  isRequired: boolean;
  dirty: boolean;
  options: ModifierOptionDraft[];
};

export type ServerModifierOption = {
  id: string;
  priceDeltaAmount: number;
  translations: Array<{ locale: string; name: string }>;
};

export type ServerModifierGroup = {
  id: string;
  isRequired: boolean;
  translations: Array<{ locale: string; name: string }>;
  options: ServerModifierOption[];
};

export type ModifierGroupSaveBody = {
  name: string;
  isRequired: boolean;
  minSelected: number;
  maxSelected: number;
  locale: string;
  options: Array<{
    id?: string;
    name: string;
    priceDeltaAmount: number;
  }>;
};

function pickName(translations: Array<{ locale: string; name: string }>, locale: string) {
  return translations.find((entry) => entry.locale === locale)?.name || translations[0]?.name || '';
}

export function createOptionDraft(): ModifierOptionDraft {
  return { clientId: crypto.randomUUID(), name: '', delta: '' };
}

export function createGroupDraft(): ModifierGroupDraft {
  return {
    clientId: crypto.randomUUID(),
    name: '',
    isRequired: true,
    dirty: true,
    options: [createOptionDraft()],
  };
}

export function priceDeltaToInput(amount: number, currency: string): string {
  return amount === 0 ? '' : minorAmountToInput(amount, currency);
}

export function hydrateGroupDraft(
  group: ServerModifierGroup,
  locale: string,
  currency: string,
  clientId = crypto.randomUUID(),
): ModifierGroupDraft {
  return {
    clientId,
    serverId: group.id,
    name: pickName(group.translations, locale),
    isRequired: group.isRequired,
    dirty: false,
    options: group.options.map((option) => ({
      clientId: crypto.randomUUID(),
      serverId: option.id,
      name: pickName(option.translations, locale),
      delta: priceDeltaToInput(option.priceDeltaAmount, currency),
    })),
  };
}

export function reconcileModifierDrafts(
  current: ModifierGroupDraft[],
  server: ServerModifierGroup[],
  locale: string,
  currency: string,
): ModifierGroupDraft[] {
  if (current.length === 0) {
    return server.map((group) => hydrateGroupDraft(group, locale, currency));
  }

  const serverById = new Map(server.map((group) => [group.id, group]));
  const seen = new Set<string>();
  const next: ModifierGroupDraft[] = [];

  for (const draft of current) {
    if (!draft.serverId) {
      next.push(draft);
      continue;
    }
    const remote = serverById.get(draft.serverId);
    if (!remote) continue;
    seen.add(draft.serverId);
    next.push(draft.dirty ? draft : hydrateGroupDraft(remote, locale, currency, draft.clientId));
  }

  for (const group of server) {
    if (seen.has(group.id)) continue;
    next.push(hydrateGroupDraft(group, locale, currency));
  }

  return next;
}

export function moveDraft<T>(items: T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  if (index < 0 || target < 0 || target >= items.length) return items;
  const next = items.slice();
  const [row] = next.splice(index, 1);
  if (!row) return items;
  next.splice(target, 0, row);
  return next;
}

export function persistedOrderIds(drafts: ModifierGroupDraft[]): string[] {
  return drafts.flatMap((draft) => (draft.serverId ? [draft.serverId] : []));
}

export function markGroupDirty(
  draft: ModifierGroupDraft,
  patch: Partial<Pick<ModifierGroupDraft, 'name' | 'isRequired' | 'options'>>,
): ModifierGroupDraft {
  return { ...draft, ...patch, dirty: true };
}

export function buildGroupSavePayload(
  draft: ModifierGroupDraft,
  locale: string,
  currency: string,
): { ok: true; body: ModifierGroupSaveBody } | { ok: false } {
  const name = draft.name.trim();
  if (!name) return { ok: false };

  const options: ModifierGroupSaveBody['options'] = [];
  for (const option of draft.options) {
    const optionName = option.name.trim();
    const deltaRaw = option.delta.trim();
    if (!optionName && !deltaRaw) continue;
    if (!optionName) return { ok: false };
    const priceDeltaAmount = deltaRaw ? parseCurrencyInput(deltaRaw, currency) : 0;
    if (priceDeltaAmount === null) return { ok: false };
    options.push({
      id: option.serverId,
      name: optionName,
      priceDeltaAmount,
    });
  }

  return {
    ok: true,
    body: {
      name,
      isRequired: draft.isRequired,
      minSelected: draft.isRequired ? 1 : 0,
      maxSelected: draft.isRequired ? 1 : 3,
      locale,
      options,
    },
  };
}
