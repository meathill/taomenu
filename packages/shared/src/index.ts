export { getPlanLimits, PLAN_IDS, PLAN_LIMITS, type PlanId, type PlanLimits } from './plans';
export {
  type CreateStoreBody,
  createStoreSchema,
  SERVICE_MODES,
  type UpdateStoreBody,
  updateStoreSchema,
} from './store';

export const APP_NAME = 'TaoMenu';

export const LOCALES = ['vi', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'vi';
