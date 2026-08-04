import { describe, expect, it } from 'vitest';
import { defaultSelectedKeys, toPrintableEntries } from './printable-entries';

const tables = [
  { id: 't1', name: 'Table 1', token: 'token-t1', isActive: true },
  { id: 't2', name: 'Table 2', token: 'token-t2', isActive: false },
];
const points = [{ id: 'p1', name: 'Counter', token: 'token-p1', isActive: true }];

describe('toPrintableEntries', () => {
  it('只保留 active 入口并带上类型前缀 key', () => {
    const entries = toPrintableEntries(tables, points);
    expect(entries).toEqual([
      { key: 'table:t1', name: 'Table 1', type: 'table', token: 'token-t1' },
      { key: 'point:p1', name: 'Counter', type: 'point', token: 'token-p1' },
    ]);
  });

  it('空列表返回空数组', () => {
    expect(toPrintableEntries([], [])).toEqual([]);
  });
});

describe('defaultSelectedKeys', () => {
  it('默认全选所有可打印入口', () => {
    const entries = toPrintableEntries(tables, points);
    expect(defaultSelectedKeys(entries)).toEqual(new Set(['table:t1', 'point:p1']));
  });
});
