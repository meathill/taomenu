import { describe, expect, it } from 'vitest';
import {
  getPlanLimits,
  getStaffSeatLimit,
  hasProEntitlements,
  isMenuLocaleAllowed,
  isProPlusPlan,
  PLAN_IDS,
  shouldShowPoweredBy,
} from './plans';

describe('getPlanLimits', () => {
  it('free 只有 1 个 staff 席位，菜单语言为基础语言 + 1 种，且可用每月额度内的 AI 翻译', () => {
    const free = getPlanLimits('free');
    expect(free.maxStaffTerminals).toBe(1);
    expect(free.maxMenuLocales).toBe(2);
    expect(free.canUseAiMenuImport).toBe(true);
    expect(free.canUseAiTranslation).toBe(true);
    expect(free.canUseProQrTemplates).toBe(false);
    expect(free.maxAiMenuImportsPerMonth).toBe(10);
    expect(free.maxAiTranslationsPerMonth).toBe(10);
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

  it('PLAN_IDS 覆盖 free、pro 与 pro_plus', () => {
    expect(PLAN_IDS).toEqual(['free', 'pro', 'pro_plus']);
  });

  it('Pro+ 继承全部 Pro 权益，并增加社交运营协助', () => {
    const pro = getPlanLimits('pro');
    const plus = getPlanLimits('pro_plus');
    expect(plus.maxStaffTerminals).toBe(pro.maxStaffTerminals);
    expect(plus.maxMenuLocales).toBe(pro.maxMenuLocales);
    expect(plus.canUseAiImageEnhancement).toBe(true);
    expect(plus.canRemovePoweredBy).toBe(true);
    expect(plus.canUseManagedSocialOps).toBe(true);
    expect(pro.canUseManagedSocialOps).toBe(false);
    expect(hasProEntitlements('pro')).toBe(true);
    expect(hasProEntitlements('pro_plus')).toBe(true);
    expect(hasProEntitlements('free')).toBe(false);
    expect(isProPlusPlan('pro_plus')).toBe(true);
    expect(isProPlusPlan('pro')).toBe(false);
  });
});

describe('shouldShowPoweredBy', () => {
  it('只有 Pro 且商家主动关闭时才隐藏 Powered by', () => {
    expect(shouldShowPoweredBy('pro', true)).toBe(false);
    expect(shouldShowPoweredBy('pro', false)).toBe(true);
    expect(shouldShowPoweredBy('pro_plus', true)).toBe(false);
  });

  it('Free（包括降级后残留的开关）始终显示 Powered by', () => {
    expect(shouldShowPoweredBy('free', true)).toBe(true);
    expect(shouldShowPoweredBy('free', false)).toBe(true);
  });
});

describe('isMenuLocaleAllowed', () => {
  it('Free 允许基础语言加 1 种，拒绝第 3 种', () => {
    expect(
      isMenuLocaleAllowed({
        plan: 'free',
        baseLocale: 'vi',
        locale: 'en',
        existingLocales: ['vi'],
      }),
    ).toBe(true);
    expect(
      isMenuLocaleAllowed({
        plan: 'free',
        baseLocale: 'vi',
        locale: 'zh',
        existingLocales: ['vi', 'en'],
      }),
    ).toBe(false);
    expect(
      isMenuLocaleAllowed({
        plan: 'free',
        baseLocale: 'vi',
        locale: 'en',
        existingLocales: ['vi', 'en'],
      }),
    ).toBe(true);
  });
});
