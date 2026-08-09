import { describe, expect, it, vi } from 'vitest';
import { createOpenAiMenuProvider } from './openai-menu-provider';

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
});
