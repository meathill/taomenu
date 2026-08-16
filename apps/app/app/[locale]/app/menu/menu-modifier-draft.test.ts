import { describe, expect, it } from 'vitest';
import {
  buildGroupSavePayload,
  createGroupDraft,
  createOptionDraft,
  hydrateGroupDraft,
  moveDraft,
  persistedOrderIds,
  priceDeltaToInput,
  reconcileModifierDrafts,
  type ServerModifierGroup,
} from './menu-modifier-draft';

const spice: ServerModifierGroup = {
  id: '11111111-1111-4111-8111-111111111111',
  isRequired: true,
  translations: [{ locale: 'zh', name: '辣度' }],
  options: [
    {
      id: '22222222-2222-4222-8222-222222222222',
      priceDeltaAmount: 0,
      translations: [{ locale: 'zh', name: '不辣' }],
    },
    {
      id: '33333333-3333-4333-8333-333333333333',
      priceDeltaAmount: 5000,
      translations: [{ locale: 'zh', name: '中辣' }],
    },
  ],
};

describe('规格组草稿', () => {
  it('新建选项的加价为空，不预填 0', () => {
    expect(createOptionDraft().delta).toBe('');
    expect(priceDeltaToInput(0, 'VND')).toBe('');
    expect(priceDeltaToInput(599, 'USD')).toBe('5.99');
    expect(createGroupDraft().options[0]?.delta).toBe('');
  });

  it('灌入已有规格时，0 加价仍显示为空以便露出 placeholder', () => {
    const draft = hydrateGroupDraft(spice, 'zh', 'VND');
    expect(draft.name).toBe('辣度');
    expect(draft.options.map((option) => option.delta)).toEqual(['', '5000']);
  });

  it('整组一次保存：空加价视为 0，空白行丢弃', () => {
    const draft = hydrateGroupDraft(spice, 'zh', 'VND');
    draft.options.push({ clientId: 'tmp', name: '', delta: '' });
    const result = buildGroupSavePayload(draft, 'zh', 'VND');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.body.minSelected).toBe(1);
    expect(result.body.maxSelected).toBe(1);
    expect(result.body.options).toEqual([
      {
        id: '22222222-2222-4222-8222-222222222222',
        name: '不辣',
        priceDeltaAmount: 0,
      },
      {
        id: '33333333-3333-4333-8333-333333333333',
        name: '中辣',
        priceDeltaAmount: 5000,
      },
    ]);
  });

  it('只有加价没有名称时拒绝保存', () => {
    const draft = createGroupDraft();
    draft.name = '辣度';
    draft.options = [{ clientId: 'a', name: '', delta: '1000' }];
    expect(buildGroupSavePayload(draft, 'zh', 'VND').ok).toBe(false);
  });

  it('刷新菜单树时保留未保存的新建组，且不覆盖正在编辑的组', () => {
    const dirty = hydrateGroupDraft(spice, 'zh', 'VND');
    dirty.dirty = true;
    dirty.name = '辣度（改）';
    const unsaved = createGroupDraft();
    unsaved.name = '甜度';

    const next = reconcileModifierDrafts([dirty, unsaved], [spice], 'zh', 'VND');
    expect(next).toHaveLength(2);
    expect(next[0]?.name).toBe('辣度（改）');
    expect(next[1]?.name).toBe('甜度');
    expect(next[1]?.serverId).toBeUndefined();
  });

  it('未编辑的组随服务端数据更新', () => {
    const clean = hydrateGroupDraft(spice, 'zh', 'VND');
    const renamed = {
      ...spice,
      translations: [{ locale: 'zh', name: '辣度等级' }],
    };
    const next = reconcileModifierDrafts([clean], [renamed], 'zh', 'VND');
    expect(next[0]?.name).toBe('辣度等级');
    expect(next[0]?.dirty).toBe(false);
  });

  it('组排序只移动相邻项，并只提交已落库的 id', () => {
    const drafts = [
      { ...createGroupDraft(), serverId: 'a', name: 'A' },
      { ...createGroupDraft(), name: 'B' },
      { ...createGroupDraft(), serverId: 'c', name: 'C' },
    ];
    const moved = moveDraft(drafts, 2, -1);
    expect(moved.map((draft) => draft.name)).toEqual(['A', 'C', 'B']);
    expect(persistedOrderIds(moved)).toEqual(['a', 'c']);
    expect(moveDraft(drafts, 0, -1)).toEqual(drafts);
  });
});
