export const PLAN_IDS = ['free', 'pro'] as const;

export type PlanId = (typeof PLAN_IDS)[number];

export type PlanLimits = {
  /** Base staff seats; the owner seat is not included. */
  maxStaffTerminals: number;
  maxMenuLocales: number;
  canUseAiMenuImport: boolean;
  canUseAiTranslation: boolean;
  canUseAiImageEnhancement: boolean;
  canUseVoiceAssistant: boolean;
  canUseProQrTemplates: boolean;
  /** 能否在顾客点单页隐藏「Powered by TaoMenu」（issue #26） */
  canRemovePoweredBy: boolean;
  maxAiMenuImportsPerMonth: number;
  maxAiTranslationsPerMonth: number;
  maxAiImageEnhancementsPerMonth: number;
};

/** Free 每店每月可用的照片/PDF 导入次数（issue #25 引入，#28 由 2 次放宽到 10 次） */
export const FREE_AI_MENU_IMPORTS_PER_MONTH = 10;

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    maxStaffTerminals: 1,
    maxMenuLocales: 1,
    canUseAiMenuImport: true,
    canUseAiTranslation: false,
    canUseAiImageEnhancement: false,
    canUseVoiceAssistant: false,
    canUseProQrTemplates: false,
    canRemovePoweredBy: false,
    maxAiMenuImportsPerMonth: FREE_AI_MENU_IMPORTS_PER_MONTH,
    maxAiTranslationsPerMonth: 0,
    maxAiImageEnhancementsPerMonth: 0,
  },
  pro: {
    maxStaffTerminals: 4,
    maxMenuLocales: 5,
    canUseAiMenuImport: true,
    canUseAiTranslation: true,
    canUseAiImageEnhancement: true,
    canUseVoiceAssistant: true,
    canUseProQrTemplates: true,
    canRemovePoweredBy: true,
    maxAiMenuImportsPerMonth: 20,
    maxAiTranslationsPerMonth: 20,
    maxAiImageEnhancementsPerMonth: 10,
  },
};

export function getPlanLimits(planId: PlanId): PlanLimits {
  return PLAN_LIMITS[planId];
}

export function getStaffSeatLimit(planId: PlanId, additionalSeats = 0): number {
  return getPlanLimits(planId).maxStaffTerminals + Math.max(0, Math.floor(additionalSeats));
}

/** 顾客点单页是否显示「Powered by TaoMenu」：只有当前套餐允许且商家主动关闭时才隐藏 */
export function shouldShowPoweredBy(planId: PlanId, hidePoweredBy: boolean): boolean {
  return !(getPlanLimits(planId).canRemovePoweredBy && hidePoweredBy);
}
