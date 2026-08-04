import { describe, expect, it } from 'vitest';
import { isPairingCodeExpired, normalizePairingCode } from './terminals';

describe('terminal pairing primitives', () => {
  it('normalizes the human-entered code without storing the plaintext', () => {
    expect(normalizePairingCode('12 34-5678')).toBe('12345678');
    expect(normalizePairingCode(' 12345678 ')).toBe('12345678');
  });

  it('expires at the exact expiry boundary', () => {
    const expiresAt = new Date('2026-08-04T10:10:00Z');
    expect(isPairingCodeExpired(expiresAt, new Date('2026-08-04T10:09:59Z'))).toBe(false);
    expect(isPairingCodeExpired(expiresAt, expiresAt)).toBe(true);
  });
});
