import { describe, expect, it } from 'vitest';
import { getPlanLimits, getStaffSeatLimit, PLAN_IDS, shouldShowPoweredBy } from './plans';

describe('getPlanLimits', () => {
  it('free 只有 1 个 staff 席位和 1 种菜单语言', () => {
    const free = getPlanLimits('free');
    expect(free.maxStaffTerminals).toBe(1);
    expect(free.maxMenuLocales).toBe(1);
    expect(free.canUseAiMenuImport).toBe(true);
    expect(free.canUseProQrTemplates).toBe(false);
    expect(free.maxAiMenuImportsPerMonth).toBe(10);
    expect(free.maxAiTranslationsPerMonth).toBe(0);
    expect(free.canUseAiImageEnhancement).toBe(false);
    expect(free.maxAiImageEnhancementsPerMonth).toBe(0);
  });

  it('pro 包含 4 个 staff 席位（加上店主共 5 个席位）', () => {
    const pro = getPlanLimits('pro');
    expect(pro.maxStaffTerminals).toBe(4);
    expect(pro.maxMenuLocales).toBe(5);
    expect(pro.canUseAiMenuImport).toBe(true);
    expect(pro.canUseVoiceAssistant).toBe(true);
    expect(pro.canUseProQrTemplates).toBe(true);
    expect(pro.maxAiMenuImportsPerMonth).toBe(20);
    expect(pro.maxAiTranslationsPerMonth).toBe(20);
    expect(pro.canUseAiImageEnhancement).toBe(true);
    expect(pro.maxAiImageEnhancementsPerMonth).toBe(10);
  });

  it('额外购买席位叠加在套餐基础席位上', () => {
    expect(getStaffSeatLimit('free', 2)).toBe(3);
    expect(getStaffSeatLimit('pro', 1)).toBe(5);
    expect(getStaffSeatLimit('free', -1)).toBe(1);
  });

  it('PLAN_IDS 覆盖 free 与 pro', () => {
    expect(PLAN_IDS).toEqual(['free', 'pro']);
  });
});

describe('shouldShowPoweredBy', () => {
  it('只有 Pro 且商家主动关闭时才隐藏 Powered by', () => {
    expect(shouldShowPoweredBy('pro', true)).toBe(false);
    expect(shouldShowPoweredBy('pro', false)).toBe(true);
  });

  it('Free（包括降级后残留的开关）始终显示 Powered by', () => {
    expect(shouldShowPoweredBy('free', true)).toBe(true);
    expect(shouldShowPoweredBy('free', false)).toBe(true);
  });
});
