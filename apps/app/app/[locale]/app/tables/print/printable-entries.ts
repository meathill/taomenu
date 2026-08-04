import type { QrEntryType } from '../customer-url';

export type PrintableEntry = {
  /** 勾选状态用的稳定 key，避免 table/point 的 id 冲突 */
  key: string;
  name: string;
  type: QrEntryType;
  token: string;
};

type EntryInput = {
  id: string;
  name: string;
  token: string;
  isActive: boolean;
};

/** 仅 active 入口可打印；已停用入口的旧贴码已失效，不应再出现在打印纸上 */
export function toPrintableEntries(tables: EntryInput[], points: EntryInput[]): PrintableEntry[] {
  const map = (type: QrEntryType) => (entry: EntryInput) => ({
    key: `${type}:${entry.id}`,
    name: entry.name,
    type,
    token: entry.token,
  });
  return [
    ...tables.filter((entry) => entry.isActive).map(map('table')),
    ...points.filter((entry) => entry.isActive).map(map('point')),
  ];
}

export function defaultSelectedKeys(entries: PrintableEntry[]): Set<string> {
  return new Set(entries.map((entry) => entry.key));
}
