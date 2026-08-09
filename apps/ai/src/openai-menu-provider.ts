import {
  MENU_IMPORT_JSON_SCHEMA,
  type MenuImportOutput,
  menuImportOutputSchema,
} from '@taomenu/shared';
import { z } from 'zod';

export type MenuImportAssetInput = {
  mimeType: string;
  bytes: Uint8Array;
};

export type MenuAiProvider = {
  extractMenu(input: {
    assets: MenuImportAssetInput[];
    expectedLocale?: string | null;
  }): Promise<{ output: MenuImportOutput; usage: unknown }>;
};

type OpenAiMenuProviderOptions = {
  apiKey: string;
  model: string;
  fetcher?: typeof fetch;
};

const openAiResponseSchema = z.object({
  status: z.string(),
  output: z.array(
    z.object({
      type: z.string(),
      content: z
        .array(
          z.object({
            type: z.string(),
            text: z.string().optional(),
            refusal: z.string().optional(),
          }),
        )
        .optional(),
    }),
  ),
  usage: z.unknown().optional(),
  incomplete_details: z.object({ reason: z.string().optional() }).nullish(),
});

function toDataUrl(mimeType: string, bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

function buildAssetContent(asset: MenuImportAssetInput, index: number) {
  const dataUrl = toDataUrl(asset.mimeType, asset.bytes);
  if (asset.mimeType === 'application/pdf') {
    return {
      type: 'input_file',
      filename: `menu-${index + 1}.pdf`,
      file_data: dataUrl,
      detail: 'high',
    } as const;
  }
  return { type: 'input_image', image_url: dataUrl, detail: 'original' } as const;
}

function extractOutputText(response: z.infer<typeof openAiResponseSchema>): string {
  if (response.status !== 'completed') {
    throw new Error(`OPENAI_INCOMPLETE:${response.incomplete_details?.reason ?? response.status}`);
  }
  for (const output of response.output) {
    for (const content of output.content ?? []) {
      if (content.type === 'refusal') throw new Error('OPENAI_REFUSAL');
      if (content.type === 'output_text' && content.text) return content.text;
    }
  }
  throw new Error('OPENAI_EMPTY_OUTPUT');
}

export function createOpenAiMenuProvider(options: OpenAiMenuProviderOptions): MenuAiProvider {
  const fetcher = options.fetcher ?? fetch;
  return {
    async extractMenu(input) {
      const content = [
        ...input.assets.map(buildAssetContent),
        {
          type: 'input_text' as const,
          text: [
            'Extract only menu content that is visibly present in these assets.',
            'Preserve category and item order. Never invent names, descriptions, prices, or options.',
            'For Vietnamese shorthand such as 35k, return the integer VND amount 35000.',
            'Use null for an unreadable item price and add a concise warning.',
            'Confidence must reflect visual certainty, especially for prices and modifier rules.',
            `Expected source locale when known: ${input.expectedLocale ?? 'detect from the asset'}.`,
          ].join('\n'),
        },
      ];
      const response = await fetcher('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options.model,
          store: false,
          max_output_tokens: 16_000,
          input: [{ role: 'user', content }],
          text: {
            format: {
              type: 'json_schema',
              name: 'taomenu_menu_import',
              strict: true,
              schema: MENU_IMPORT_JSON_SCHEMA,
            },
          },
        }),
        signal: AbortSignal.timeout(120_000),
      });
      if (!response.ok) {
        throw new Error(`OPENAI_HTTP_${response.status}`);
      }
      const parsedResponse = openAiResponseSchema.parse(await response.json());
      const output = menuImportOutputSchema.parse(JSON.parse(extractOutputText(parsedResponse)));
      return { output, usage: parsedResponse.usage ?? null };
    },
  };
}
