import { describe, expect, it } from 'vitest';
import { getPlanLimits, PLAN_IDS } from './plans';

describe('getPlanLimits', () => {
  it('free 只有 1 个员工终端和 1 种菜单语言', () => {
    const free = getPlanLimits('free');
    expect(free.maxStaffTerminals).toBe(1);
    expect(free.maxMenuLocales).toBe(1);
    expect(free.canUseAiMenuImport).toBe(false);
  });

  it('pro 开放多终端、多语言与 AI 能力', () => {
    const pro = getPlanLimits('pro');
    expect(pro.maxStaffTerminals).toBe(5);
    expect(pro.maxMenuLocales).toBe(5);
    expect(pro.canUseAiMenuImport).toBe(true);
    expect(pro.canUseVoiceAssistant).toBe(true);
  });

  it('PLAN_IDS 覆盖 free 与 pro', () => {
    expect(PLAN_IDS).toEqual(['free', 'pro']);
  });
});
