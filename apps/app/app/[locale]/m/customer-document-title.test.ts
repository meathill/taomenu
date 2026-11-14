import { describe, expect, it } from 'vitest';
import { buildCustomerDocumentTitle, buildCustomerMetadataTitle } from './customer-document-title';

describe('customer document title', () => {
  it('metadata 用页面名和门店显示名，完整标题再加上产品名', () => {
    expect(buildCustomerMetadataTitle('Pickup', 'QA Phở Chị Mai Hội An')).toBe(
      'Pickup · QA Phở Chị Mai Hội An',
    );
    expect(buildCustomerDocumentTitle('Pickup', 'QA Phở Chị Mai Hội An')).toBe(
      'Pickup · QA Phở Chị Mai Hội An · TaoMenu',
    );
    expect(buildCustomerDocumentTitle('Menu', 'QA Phở Chị Mai Hội An')).not.toContain(
      'qa-pho-chi-mai-hoi-an',
    );
  });
});
