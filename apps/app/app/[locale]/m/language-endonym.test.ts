import { describe, expect, it } from 'vitest';
import { languageEndonym } from './language-endonym';

describe('languageEndonym', () => {
  it('四种产品语言都用自称', () => {
    expect(languageEndonym('en')).toBe('English');
    expect(languageEndonym('vi')).toBe('Tiếng Việt');
    expect(languageEndonym('ja')).toBe('日本語');
    expect(languageEndonym('zh')).toBe('中文');
  });

  it('区域标签回退到语言本身的自称', () => {
    expect(languageEndonym('en-US')).toBe('English');
  });
});
