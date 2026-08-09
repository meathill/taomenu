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

export function createReviewDraft(suggestions: Suggestion[]): ReviewDraft {
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
            : String(suggestion.value.priceAmount),
        value: suggestion.value,
      },
    ]),
  );
}
