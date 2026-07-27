export const PLAN_IDS = ['free', 'pro'] as const;

export type PlanId = (typeof PLAN_IDS)[number];

export type PlanLimits = {
  maxStaffTerminals: number;
  maxMenuLocales: number;
  canUseAiMenuImport: boolean;
  canUseAiTranslation: boolean;
  canUseVoiceAssistant: boolean;
};

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    maxStaffTerminals: 1,
    maxMenuLocales: 1,
    canUseAiMenuImport: false,
    canUseAiTranslation: false,
    canUseVoiceAssistant: false,
  },
  pro: {
    maxStaffTerminals: 5,
    maxMenuLocales: 5,
    canUseAiMenuImport: true,
    canUseAiTranslation: true,
    canUseVoiceAssistant: true,
  },
};

export function getPlanLimits(planId: PlanId): PlanLimits {
  return PLAN_LIMITS[planId];
}
