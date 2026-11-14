import { describe, expect, it } from 'vitest';
import {
  buildExtractInstructions,
  buildPriceInstructions,
  buildTranslateInstructions,
} from './menu-prompts';

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

describe('菜单翻译提示词', () => {
  it('写明源/目标语言全称，并要求保留本地菜名加目标语言释义', () => {
    const prompt = buildTranslateInstructions('vi', 'en');
    expect(prompt).toContain('from Vietnamese (vi) to English (en)');
    expect(prompt).not.toContain('from vi to en.');
    expect(prompt).toContain('SOURCE TEXT only');
    expect(prompt).toContain('Phở bò tái (Rare beef noodle soup)');
    expect(prompt).toContain('Bánh mì thịt (Pork baguette sandwich)');
    expect(prompt).toContain('Đồ uống');
    expect(prompt).toContain('Drinks');
    expect(prompt).toContain('failed translation');
  });

  it('任意语言对都使用英语语言名', () => {
    const prompt = buildTranslateInstructions('zh', 'ja');
    expect(prompt).toContain('from Chinese (zh) to Japanese (ja)');
    expect(prompt).toContain('short Japanese gloss');
    expect(prompt).toContain('fully into Japanese');
  });
});
