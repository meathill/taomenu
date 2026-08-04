import { describe, expect, it } from 'vitest';
import { isTemplateAvailable, QR_CARD_TEMPLATES, resolveTemplateId } from './qr-templates';

describe('QR 模版权益', () => {
  it('standard 模版对所有套餐可用', () => {
    const standard = QR_CARD_TEMPLATES.find((template) => template.id === 'standard');
    expect(standard).toBeDefined();
    expect(isTemplateAvailable(standard!, 'free')).toBe(true);
    expect(isTemplateAvailable(standard!, 'pro')).toBe(true);
  });

  it('Pro 模版仅 pro 可用', () => {
    const proTemplates = QR_CARD_TEMPLATES.filter((template) => template.pro);
    expect(proTemplates.length).toBeGreaterThanOrEqual(3);
    for (const template of proTemplates) {
      expect(isTemplateAvailable(template, 'free')).toBe(false);
      expect(isTemplateAvailable(template, 'pro')).toBe(true);
    }
  });

  it('free 请求 Pro 模版时回退 standard', () => {
    expect(resolveTemplateId('elegant', 'free')).toBe('standard');
    expect(resolveTemplateId('elegant', 'pro')).toBe('elegant');
  });

  it('未知模版回退 standard', () => {
    expect(resolveTemplateId('nonexistent', 'pro')).toBe('standard');
    expect(resolveTemplateId(null, 'pro')).toBe('standard');
  });
});
