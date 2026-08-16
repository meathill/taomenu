import { describe, expect, it } from 'vitest';
import {
  amountToInput,
  buildItemFormValues,
  selectCreatedCategory,
  shouldHydrateItemForm,
} from './menu-item-form';

describe('菜品抽屉表单灌入', () => {
  it('打开抽屉时灌入空草稿或已有菜品', () => {
    expect(
      shouldHydrateItemForm({
        open: true,
        wasOpen: false,
        itemId: null,
        previousItemId: null,
      }),
    ).toBe(true);
    expect(
      shouldHydrateItemForm({
        open: true,
        wasOpen: false,
        itemId: 'item-1',
        previousItemId: null,
      }),
    ).toBe(true);
  });

  it('抽屉保持打开时，分类列表刷新不得重新灌表', () => {
    expect(
      shouldHydrateItemForm({
        open: true,
        wasOpen: true,
        itemId: null,
        previousItemId: null,
      }),
    ).toBe(false);
    expect(
      shouldHydrateItemForm({
        open: true,
        wasOpen: true,
        itemId: 'item-1',
        previousItemId: 'item-1',
      }),
    ).toBe(false);
  });

  it('抽屉打开期间切换到另一道菜时重新灌表', () => {
    expect(
      shouldHydrateItemForm({
        open: true,
        wasOpen: true,
        itemId: 'item-2',
        previousItemId: 'item-1',
      }),
    ).toBe(true);
  });

  it('关闭抽屉不灌表', () => {
    expect(
      shouldHydrateItemForm({
        open: false,
        wasOpen: true,
        itemId: null,
        previousItemId: null,
      }),
    ).toBe(false);
  });

  it('新建分类后保留已填菜品并选中新分类', () => {
    const draft = buildItemFormValues({
      item: null,
      currency: 'VND',
      initialCategoryId: 'cat-mains',
      fallbackCategoryId: 'cat-mains',
    });
    const filled = {
      ...draft,
      name: 'Pho bo',
      description: 'beef noodle',
      price: '55000',
    };

    expect(
      shouldHydrateItemForm({
        open: true,
        wasOpen: true,
        itemId: null,
        previousItemId: null,
      }),
    ).toBe(false);

    expect(selectCreatedCategory(filled, 'cat-noodles')).toEqual({
      ...filled,
      categoryId: 'cat-noodles',
    });
  });

  it('新建菜品优先用传入分类，否则回落到第一个分类', () => {
    expect(
      buildItemFormValues({
        item: null,
        currency: 'VND',
        initialCategoryId: 'cat-from-card',
        fallbackCategoryId: 'cat-first',
      }).categoryId,
    ).toBe('cat-from-card');
    expect(
      buildItemFormValues({
        item: null,
        currency: 'VND',
        fallbackCategoryId: 'cat-first',
      }).categoryId,
    ).toBe('cat-first');
  });

  it('编辑菜品时灌入已有名称、价格和状态', () => {
    expect(
      buildItemFormValues({
        item: { priceAmount: 599, isAvailable: true, isSoldOut: false },
        translation: { name: 'Pho', description: 'beef' },
        currency: 'USD',
        initialCategoryId: 'cat-1',
      }),
    ).toEqual({
      name: 'Pho',
      description: 'beef',
      price: '5.99',
      categoryId: 'cat-1',
      isAvailable: true,
      isSoldOut: false,
    });
  });

  it('整数币种去掉多余小数', () => {
    expect(amountToInput(55000, 'VND')).toBe('55000');
  });
});
