import { describe, expect, it, vi } from 'vitest';
import { buildPriceInstructions, createOpenAiMenuProvider } from './openai-menu-provider';

const EXTRACT_RESPONSE = {
  status: 'completed',
  output: [
    {
      type: 'message',
      content: [
        {
          type: 'output_text',
          text: JSON.stringify({
            detectedLocale: 'vi',
            currency: 'VND',
            categories: [{ name: 'Món chính', description: null, confidence: 1, items: [] }],
            warnings: [],
          }),
        },
      ],
    },
  ],
};

/** 跑一次识别，返回发给模型的提示词文本 */
async function captureExtractPrompt(currency?: string | null): Promise<string> {
  let prompt = '';
  const provider = createOpenAiMenuProvider({
    apiKey: 'test-key',
    model: 'gpt-5.6-luna',
    fetcher: (async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {
        input: Array<{ content: Array<{ type: string; text?: string }> }>;
      };
      prompt = body.input[0]?.content.find((part) => part.type === 'input_text')?.text ?? '';
      return Response.json(EXTRACT_RESPONSE);
    }) as typeof fetch,
  });
  await provider.extractMenu({ assets: [], expectedLocale: 'vi', currency });
  return prompt;
}

describe('OpenAI Luna 菜单 provider', () => {
  it('图片使用 original，PDF 使用 high，并要求 structured output', async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {
        model: string;
        input: Array<{ content: Array<Record<string, unknown>> }>;
        text: { format: { type: string; strict: boolean } };
      };
      expect(body.model).toBe('gpt-5.6-luna');
      expect(body.input[0]?.content[0]).toMatchObject({ type: 'input_image', detail: 'original' });
      expect(body.input[0]?.content[1]).toMatchObject({ type: 'input_file', detail: 'high' });
      expect(body.text.format).toMatchObject({ type: 'json_schema', strict: true });
      return Response.json({
        status: 'completed',
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: JSON.stringify({
                  detectedLocale: 'vi',
                  currency: 'VND',
                  categories: [{ name: 'Món chính', description: null, confidence: 1, items: [] }],
                  warnings: [],
                }),
              },
            ],
          },
        ],
        usage: { input_tokens: 10, output_tokens: 5 },
      });
    });
    const provider = createOpenAiMenuProvider({
      apiKey: 'test-key',
      model: 'gpt-5.6-luna',
      fetcher: fetcher as typeof fetch,
    });
    const result = await provider.extractMenu({
      assets: [
        { mimeType: 'image/png', bytes: new Uint8Array([1, 2, 3]) },
        { mimeType: 'application/pdf', bytes: new Uint8Array([4, 5, 6]) },
      ],
      expectedLocale: 'vi',
    });
    expect(result.output.detectedLocale).toBe('vi');
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('按币种小数位生成金额指令', () => {
    expect(buildPriceInstructions('VND').join('\n')).toContain('integer VND value');
    expect(buildPriceInstructions('JPY').join('\n')).toContain('integer JPY value');
    expect(buildPriceInstructions('JPY').join('\n')).toContain('35k');

    const usd = buildPriceInstructions('USD').join('\n');
    expect(usd).toContain('minor unit (1 USD = 100 minor units)');
    expect(usd).toContain('5.99 USD must be returned as 599');
    expect(usd).not.toContain('35k');

    expect(buildPriceInstructions('CNY').join('\n')).toContain('1 CNY = 100 minor units');
  });

  it('识别提示词跟随门店币种，缺失币种回落 VND', async () => {
    const usdPrompt = await captureExtractPrompt('USD');
    expect(usdPrompt).toContain('5.99 USD must be returned as 599');
    expect(usdPrompt).toContain('the store currency is USD');
    expect(usdPrompt).not.toContain('VND');

    // 旧队列消息/历史数据没有币种时不能失败，按 VND 处理
    const legacyPrompt = await captureExtractPrompt(undefined);
    expect(legacyPrompt).toContain('integer VND value');
    expect(legacyPrompt).toContain('35k');
  });

  it('拒绝不完整响应，避免写入半份草稿', async () => {
    const provider = createOpenAiMenuProvider({
      apiKey: 'test-key',
      model: 'gpt-5.6-luna',
      fetcher: async () =>
        Response.json({
          status: 'incomplete',
          output: [],
          incomplete_details: { reason: 'max_output_tokens' },
        }),
    });
    await expect(provider.extractMenu({ assets: [] })).rejects.toThrow('OPENAI_INCOMPLETE');
  });

  it('翻译时保留实体 id 并使用 structured output', async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {
        text: { format: { name: string; strict: boolean } };
      };
      expect(body.text.format).toMatchObject({
        name: 'taomenu_menu_translation',
        strict: true,
      });
      return Response.json({
        status: 'completed',
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: JSON.stringify({
                  translations: [
                    {
                      entityType: 'item',
                      entityId: '00000000-0000-4000-8000-000000000001',
                      name: 'Beef pho',
                      description: null,
                    },
                  ],
                }),
              },
            ],
          },
        ],
      });
    });
    const provider = createOpenAiMenuProvider({
      apiKey: 'test-key',
      model: 'gpt-5.6-luna',
      fetcher: fetcher as typeof fetch,
    });
    const result = await provider.translateMenu({
      sourceLocale: 'vi',
      targetLocale: 'en',
      entities: [
        {
          entityType: 'item',
          entityId: '00000000-0000-4000-8000-000000000001',
          name: 'Phở bò',
          description: null,
        },
      ],
    });
    expect(result.output.translations[0]?.name).toBe('Beef pho');
  });
});
