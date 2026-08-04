import { getPlanLimits, type PlanId } from '@taomenu/shared';

export const QR_CARD_TEMPLATE_IDS = ['standard', 'minimal', 'banner', 'elegant'] as const;
export type QrCardTemplateId = (typeof QR_CARD_TEMPLATE_IDS)[number];

export type QrCardTemplate = {
  id: QrCardTemplateId;
  /** tables.json 中的模版名 key */
  nameKey: string;
  pro: boolean;
};

export const QR_CARD_TEMPLATES: readonly QrCardTemplate[] = [
  { id: 'standard', nameKey: 'templateStandard', pro: false },
  { id: 'minimal', nameKey: 'templateMinimal', pro: true },
  { id: 'banner', nameKey: 'templateBanner', pro: true },
  { id: 'elegant', nameKey: 'templateElegant', pro: true },
];

export function isTemplateAvailable(template: QrCardTemplate, plan: PlanId): boolean {
  return !template.pro || getPlanLimits(plan).canUseProQrTemplates;
}

/** free plan 请求 Pro 模版时回退到 standard */
export function resolveTemplateId(
  requested: string | null | undefined,
  plan: PlanId,
): QrCardTemplateId {
  const match = QR_CARD_TEMPLATES.find((template) => template.id === requested);
  return match && isTemplateAvailable(match, plan) ? match.id : 'standard';
}
