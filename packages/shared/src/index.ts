export {
  type BatchItemAvailabilityBody,
  batchItemAvailabilitySchema,
  type CreateCategoryBody,
  type CreateItemBody,
  type CreateModifierBody,
  type CreateModifierGroupBody,
  createCategorySchema,
  createItemSchema,
  createModifierGroupSchema,
  createModifierSchema,
  formatVnd,
  type UpdateCategoryBody,
  type UpdateItemBody,
  type UpdateModifierBody,
  type UpdateModifierGroupBody,
  updateCategorySchema,
  updateItemSchema,
  updateModifierGroupSchema,
  updateModifierSchema,
} from './menu';
export {
  type CreateOrderBody,
  createOrderSchema,
  createPickupPointSchema,
  createTableSchema,
} from './order';
export { getPlanLimits, PLAN_IDS, PLAN_LIMITS, type PlanId, type PlanLimits } from './plans';
export {
  type CreateServiceRequestBody,
  createServiceRequestSchema,
  type RecordPaymentBody,
  recordPaymentSchema,
} from './service';
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
