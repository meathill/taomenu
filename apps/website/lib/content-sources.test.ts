import { LOCALES } from '@taomenu/shared';
import { describe, expect, it } from 'vitest';
import { docContentLoaders, landingContentLoaders } from '@/lib/content-sources';
import { DOC_SLUGS } from '@/lib/docs';
import { LANDING_SLUGS } from '@/lib/landing';

describe('content-sources', () => {
  it('每个 doc slug 都覆盖全部 locale', () => {
    for (const slug of DOC_SLUGS) {
      for (const locale of LOCALES) {
        expect(docContentLoaders[slug][locale], `${slug}/${locale}`).toBeTypeOf('function');
      }
    }
  });

  it('每个 landing slug 都覆盖全部 locale', () => {
    for (const slug of LANDING_SLUGS) {
      for (const locale of LOCALES) {
        expect(landingContentLoaders[slug][locale], `${slug}/${locale}`).toBeTypeOf('function');
      }
    }
  });
});
