import {
  MENU_IMPORT_JSON_SCHEMA,
  type MenuImportOutput,
  menuImportOutputSchema,
  toStoreCurrency,
} from '@taomenu/shared';
import { z } from 'zod';
import { buildPriceInstructions, type MenuImportAssetInput } from './openai-menu-provider';

/**
 * 小米 MiMo（OpenAI 兼容 Chat Completions）菜单识别 provider，用于 Free 套餐（issue #25）。
 * - 文档：https://mimo.mi.com/docs/en-US/api/chat/openai-api
 * - MiMo 只支持 json_object（不支持 json_schema），所以把 schema 写进提示词，返回后再用 zod 严格校验。
 * - MiMo 不接受 PDF 输入：PDF 由调用方先转成文本（Workers AI toMarkdown）再传入。
 */

export const MIMO_DEFAULT_BASE_URL = 'https://api.xiaomimimo.com/v1';

type MimoMenuProviderOptions = {
  apiKey: string;
  model: string;
  baseUrl?: string;
  fetcher?: typeof fetch;
  /** PDF → 纯文本；返回空串表示没有可提取的文字（如纯扫描件） */
  pdfToText: (bytes: Uint8Array) => Promise<string>;
};

const mimoResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        finish_reason: z.string().nullish(),
        message: z.object({ content: z.string().nullish() }),
      }),
    )
    .min(1),
  usage: z.unknown().optional(),
});

/** PDF 转出的文本上限，避免超长 PDF 撑爆上下文与费用 */
export const MIMO_PDF_TEXT_MAX_CHARS = 60_000;

function toDataUrl(mimeType: string, bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

/** 去掉模型偶尔包裹的 ```json 代码块 */
export function extractJsonText(content: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(content);
  return (fenced?.[1] ?? content).trim();
}

export function createMimoMenuProvider(options: MimoMenuProviderOptions) {
  const fetcher = options.fetcher ?? fetch;
  const baseUrl = (options.baseUrl || MIMO_DEFAULT_BASE_URL).replace(/\/+$/, '');

  return {
    async extractMenu(input: {
      assets: MenuImportAssetInput[];
      expectedLocale?: string | null;
      currency?: string | null;
    }): Promise<{ output: MenuImportOutput; usage: unknown }> {
      const currency = toStoreCurrency(input.currency);
      type Part =
        | { type: 'image_url'; image_url: { url: string } }
        | { type: 'text'; text: string };
      const parts: Part[] = [];
      for (const [index, asset] of input.assets.entries()) {
        if (asset.mimeType === 'application/pdf') {
          const text = (await options.pdfToText(asset.bytes)).trim();
          if (!text) throw new Error('MIMO_PDF_NO_TEXT');
          parts.push({
            type: 'text',
            text: `Menu document ${index + 1} (text extracted from a PDF):\n${text.slice(0, MIMO_PDF_TEXT_MAX_CHARS)}`,
          });
        } else {
          parts.push({
            type: 'image_url',
            image_url: { url: toDataUrl(asset.mimeType, asset.bytes) },
          });
        }
      }
      parts.push({
        type: 'text',
        text: [
          'Extract only menu content that is visibly present in these assets.',
          'Preserve category and item order. Never invent names, descriptions, prices, or options.',
          ...buildPriceInstructions(currency),
          'Use null for an unreadable item price and add a concise warning.',
          `Set currency to the currency actually printed on the assets; the store currency is ${currency}.`,
          'Confidence must reflect visual certainty, especially for prices and modifier rules.',
          `Expected source locale when known: ${input.expectedLocale ?? 'detect from the asset'}.`,
        ].join('\n'),
      });

      const response = await fetcher(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'api-key': options.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: options.model,
          messages: [
            {
              role: 'system',
              content: [
                'You convert restaurant menus into JSON for a menu editor.',
                'Return only one JSON object, no prose and no code fences.',
                'It must match this JSON Schema exactly (every property is required; use null where allowed):',
                JSON.stringify(MENU_IMPORT_JSON_SCHEMA),
              ].join('\n'),
            },
            { role: 'user', content: parts },
          ],
          response_format: { type: 'json_object' },
          max_completion_tokens: 16_000,
          temperature: 0.2,
          stream: false,
          thinking: { type: 'disabled' },
        }),
        signal: AbortSignal.timeout(120_000),
      });
      if (!response.ok) throw new Error(`MIMO_HTTP_${response.status}`);
      const parsed = mimoResponseSchema.parse(await response.json());
      const choice = parsed.choices[0];
      if (choice?.finish_reason === 'length') throw new Error('MIMO_INCOMPLETE:length');
      const content = choice?.message.content;
      if (!content) throw new Error('MIMO_EMPTY_OUTPUT');
      let json: unknown;
      try {
        json = JSON.parse(extractJsonText(content));
      } catch {
        throw new Error('MIMO_INVALID_JSON');
      }
      const output = menuImportOutputSchema.safeParse(json);
      if (!output.success) throw new Error('MIMO_SCHEMA_MISMATCH');
      return { output: output.data, usage: parsed.usage ?? null };
    },
  };
}
