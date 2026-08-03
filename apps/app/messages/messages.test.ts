import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOCALES } from '@taomenu/shared';
import { describe, expect, it } from 'vitest';
import { MESSAGE_NAMESPACES } from '../i18n/namespaces';

const messagesDir = dirname(fileURLToPath(import.meta.url));

function loadNamespace(locale: string, ns: string): Record<string, string> {
  const raw = readFileSync(join(messagesDir, locale, `${ns}.json`), 'utf8');
  return JSON.parse(raw) as Record<string, string>;
}

/** 提取 ICU 占位符集合，如 {count} {name} */
function placeholders(value: string): string[] {
  return [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1] as string).sort();
}

describe('messages 字典一致性', () => {
  const otherLocales = LOCALES.filter((l) => l !== 'en');

  for (const ns of MESSAGE_NAMESPACES) {
    describe(ns, () => {
      const en = loadNamespace('en', ns);

      for (const locale of otherLocales) {
        it(`${locale} 的 key 集合与 en 一致`, () => {
          const other = loadNamespace(locale, ns);
          expect(Object.keys(other).sort()).toEqual(Object.keys(en).sort());
        });

        it(`${locale} 的占位符集合与 en 一致`, () => {
          const other = loadNamespace(locale, ns);
          for (const [key, enValue] of Object.entries(en)) {
            expect(placeholders(other[key] ?? ''), `${locale}/${ns}.${key}`).toEqual(
              placeholders(enValue),
            );
          }
        });
      }
    });
  }
});
