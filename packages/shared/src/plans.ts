export const PLAN_IDS = ['free', 'pro'] as const;

export type PlanId = (typeof PLAN_IDS)[number];

export type PlanLimits = {
  /** Base staff seats; the owner seat is not included. */
  maxStaffTerminals: number;
  maxMenuLocales: number;
  canUseAiMenuImport: boolean;
  canUseAiTranslation: boolean;
  canUseVoiceAssistant: boolean;
  canUseProQrTemplates: boolean;
  maxAiMenuImportsPerMonth: number;
};

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    maxStaffTerminals: 1,
    maxMenuLocales: 1,
    canUseAiMenuImport: false,
    canUseAiTranslation: false,
    canUseVoiceAssistant: false,
    canUseProQrTemplates: false,
    maxAiMenuImportsPerMonth: 0,
  },
  pro: {
    maxStaffTerminals: 4,
    maxMenuLocales: 5,
    canUseAiMenuImport: true,
    canUseAiTranslation: true,
    canUseVoiceAssistant: true,
    canUseProQrTemplates: true,
    maxAiMenuImportsPerMonth: 20,
  },
};

export function getPlanLimits(planId: PlanId): PlanLimits {
  return PLAN_LIMITS[planId];
}

export function getStaffSeatLimit(planId: PlanId, additionalSeats = 0): number {
  return getPlanLimits(planId).maxStaffTerminals + Math.max(0, Math.floor(additionalSeats));
}
