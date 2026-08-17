/** 营销站文档 slug（URL 路径）。MDX 正文经 lib/content-sources.ts 编译进 bundle。 */
export const DOC_SLUGS = ['about', 'contact-us', 'privacy', 'terms'] as const;
export type DocSlug = (typeof DOC_SLUGS)[number];

export function isDocSlug(value: string): value is DocSlug {
  return (DOC_SLUGS as readonly string[]).includes(value);
}
