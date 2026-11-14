import { describe, expect, it } from 'vitest';
import { getClarityId } from './clarity';

describe('getClarityId', () => {
  it('未配置或空串时不注入', () => {
    expect(getClarityId(undefined)).toBeNull();
    expect(getClarityId('')).toBeNull();
    expect(getClarityId('   ')).toBeNull();
  });

  it('只接受字母数字 ID', () => {
    expect(getClarityId(' abc123xyz ')).toBe('abc123xyz');
    expect(getClarityId('abc";alert(1);//')).toBeNull();
  });
});
