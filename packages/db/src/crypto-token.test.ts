import { describe, expect, it } from 'vitest';
import { generateToken, hashToken, tokensMatch } from './crypto-token';

describe('crypto-token', () => {
  it('生成非空 token 且哈希可验证', async () => {
    const token = generateToken();
    expect(token.length).toBeGreaterThan(20);
    const hash = await hashToken(token);
    expect(hash).toHaveLength(64);
    expect(await tokensMatch(token, hash)).toBe(true);
    expect(await tokensMatch(`${token}x`, hash)).toBe(false);
  });

  it('相同 token 哈希稳定', async () => {
    const token = 'fixed-token-for-test';
    expect(await hashToken(token)).toBe(await hashToken(token));
  });
});
