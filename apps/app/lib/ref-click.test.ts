import { describe, expect, it } from 'vitest';
import {
  buildVisitorFingerprint,
  computeVisitorHash,
  normalizeRefCode,
  readClientIp,
  toUtcDay,
} from './ref-click';

// code 校验的完整用例在 packages/shared/src/ref.test.ts，这里只确认转出没断
describe('normalizeRefCode 转出', () => {
  it('仍可从 @/lib/ref-click 取到', () => {
    expect(normalizeRefCode(' ab3k9xyz ')).toBe('AB3K9XYZ');
    expect(normalizeRefCode('AB3K-9XY')).toBeNull();
  });
});

describe('toUtcDay', () => {
  it('按 UTC 而非本地时区取 YYYY-MM-DD', () => {
    expect(toUtcDay(new Date('2026-08-10T00:00:00.000Z'))).toBe('2026-08-10');
    expect(toUtcDay(new Date('2026-08-10T23:59:59.999Z'))).toBe('2026-08-10');
    expect(toUtcDay(new Date('2026-08-11T00:00:00.000Z'))).toBe('2026-08-11');
  });
});

describe('readClientIp', () => {
  it('优先用 cf-connecting-ip', () => {
    const headers = new Headers({
      'cf-connecting-ip': '203.0.113.7',
      'x-forwarded-for': '198.51.100.1, 10.0.0.1',
    });
    expect(readClientIp(headers)).toBe('203.0.113.7');
  });

  it('回退到 x-forwarded-for 的第一个值', () => {
    const headers = new Headers({ 'x-forwarded-for': ' 198.51.100.1 , 10.0.0.1' });
    expect(readClientIp(headers)).toBe('198.51.100.1');
  });

  it('都取不到时用占位值', () => {
    expect(readClientIp(new Headers())).toBe('unknown');
    expect(readClientIp(new Headers({ 'x-forwarded-for': ' ' }))).toBe('unknown');
  });
});

describe('visitor hash', () => {
  const base = { ip: '203.0.113.7', userAgent: 'Mozilla/5.0', day: '2026-08-10', code: 'AB3K9XYZ' };

  it('指纹按 ip|ua|day|code 顺序拼接', () => {
    expect(buildVisitorFingerprint(base)).toBe('203.0.113.7|Mozilla/5.0|2026-08-10|AB3K9XYZ');
  });

  it('同输入稳定输出 64 位 hex', async () => {
    const first = await computeVisitorHash(base);
    const second = await computeVisitorHash({ ...base });
    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
  });

  it('换天、换 code、换访客都得到不同哈希', async () => {
    const origin = await computeVisitorHash(base);
    expect(await computeVisitorHash({ ...base, day: '2026-08-11' })).not.toBe(origin);
    expect(await computeVisitorHash({ ...base, code: 'ZZ3K9XYZ' })).not.toBe(origin);
    expect(await computeVisitorHash({ ...base, ip: '203.0.113.8' })).not.toBe(origin);
    expect(await computeVisitorHash({ ...base, userAgent: 'curl/8' })).not.toBe(origin);
  });
});
