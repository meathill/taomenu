import { describe, expect, it } from 'vitest';
import { safeNextPath } from './safe-next';

describe('safeNextPath', () => {
  it('接受站内路径（含查询串）', () => {
    expect(safeNextPath('/app/settings?upgrade=pro', '/app')).toBe('/app/settings?upgrade=pro');
    expect(safeNextPath(['/app/menu'], '/app')).toBe('/app/menu');
  });

  it('拒绝外部地址与空值', () => {
    expect(safeNextPath('https://evil.com', '/app')).toBe('/app');
    expect(safeNextPath('//evil.com', '/app')).toBe('/app');
    expect(safeNextPath('/\\evil.com', '/app')).toBe('/app');
    expect(safeNextPath(undefined, '/app')).toBe('/app');
    expect(safeNextPath('', '/app')).toBe('/app');
  });
});
