import { minorAmountToInput } from '@taomenu/shared';

/** 识别原文：识别语言与菜单语言不同、已自动翻译时才有（issue #29） */
export type SuggestionOriginal = { locale: string; name: string; description: string | null };

export type Suggestion = {
  id: string;
  entityType: 'category' | 'item';
  temporaryEntityKey: string;
  locale: string;
  confidence: number;
  decision: 'pending' | 'accepted' | 'edited' | 'rejected';
  value: {
    categoryTemporaryKey?: string;
    name: string;
    description: string | null;
    priceAmount?: number | null;
    modifierGroups?: Array<{
      name: string;
      minSelected: number;
      maxSelected: number;
      isRequired: boolean;
      confidence: number;
      modifiers: Array<{ name: string; priceDeltaAmount: number; confidence: number }>;
    }>;
    original?: SuggestionOriginal | null;
  };
};

export type SuggestionGroup = { category: Suggestion; items: Suggestion[] };

export type ImportView = {
  menuImport: {
    id: string;
    status: 'draft' | 'queued' | 'processing' | 'needs_review' | 'applied' | 'failed';
    progress: number;
    errorCode: string | null;
  };
  suggestions: Suggestion[];
  hasExistingCategories: boolean;
};

export type ReviewDraft = Record<
  string,
  {
    selected: boolean;
    name: string;
    description: string;
    priceAmount: string;
    value: Suggestion['value'];
  }
>;

/** AI 返回的价格是最小单位整数，回填成当前币种主单位字符串供店主编辑 */
export function createReviewDraft(suggestions: Suggestion[], currency: string): ReviewDraft {
  return Object.fromEntries(
    suggestions.map((suggestion) => [
      suggestion.id,
      {
        selected: suggestion.decision !== 'rejected' && suggestion.value.priceAmount !== null,
        name: suggestion.value.name,
        description: suggestion.value.description ?? '',
        priceAmount:
          suggestion.value.priceAmount === undefined || suggestion.value.priceAmount === null
            ? ''
            : minorAmountToInput(suggestion.value.priceAmount, currency),
        value: suggestion.value,
      },
    ]),
  );
}

/** 审核列表里任一条带原文，说明这次导入做过翻译；返回原文语言 */
export function getTranslatedFromLocale(suggestions: Suggestion[]): string | null {
  return (
    suggestions.find((suggestion) => suggestion.value.original)?.value.original?.locale ?? null
  );
}
