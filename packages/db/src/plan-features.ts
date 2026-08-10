import { getPlanLimits, type PlanLimits } from '@taomenu/shared';
import { MenuImportError } from './repositories/menu-ai-config';
import type { StoreContext } from './types';

/** 校验 Pro 权益位，未开通时抛 PRO_REQUIRED。 */
export function assertPlanFeature(
  ctx: StoreContext,
  featureKey: Extract<keyof PlanLimits, `canUse${string}`>,
  message: string,
) {
  if (!getPlanLimits(ctx.plan)[featureKey]) {
    throw new MenuImportError('PRO_REQUIRED', message);
  }
}
