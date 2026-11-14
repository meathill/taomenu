import { describe, expect, it } from 'vitest';
import { buildExtractInstructions, buildPriceInstructions } from './menu-prompts';

describe('菜单识别提示词', () => {
  it('按币种小数位生成金额指令', () => {
    expect(buildPriceInstructions('VND').join('\n')).toContain('integer VND value');
    expect(buildPriceInstructions('JPY').join('\n')).toContain('integer JPY value');
    expect(buildPriceInstructions('JPY').join('\n')).toContain('35k');

    const usd = buildPriceInstructions('USD').join('\n');
    expect(usd).toContain('minor unit (1 USD = 100 minor units)');
    expect(usd).toContain('5.99 USD must be returned as 599');
    expect(usd).not.toContain('35k');

    expect(buildPriceInstructions('CNY').join('\n')).toContain('1 CNY = 100 minor units');
  });

  it('识别指令跟随门店币种与期望语言', () => {
    const prompt = buildExtractInstructions('USD', 'en');
    expect(prompt).toContain('the store currency is USD');
    expect(prompt).toContain('Expected source locale when known: en');
    expect(buildExtractInstructions('VND')).toContain('detect from the asset');
  });
});
