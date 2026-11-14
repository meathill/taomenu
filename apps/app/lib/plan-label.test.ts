import { describe, expect, it } from 'vitest';
import { planLabelKey } from './plan-label';

describe('planLabelKey', () => {
  it('maps plan ids to translated common keys, not raw free/pro', () => {
    expect(planLabelKey('free')).toBe('planFree');
    expect(planLabelKey('pro')).toBe('planPro');
  });
});
