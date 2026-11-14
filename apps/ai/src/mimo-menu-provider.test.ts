import { describe, expect, it, vi } from 'vitest';
import { createMimoMenuProvider, extractJsonText } from './mimo-menu-provider';

const OUTPUT = {
  detectedLocale: 'fr',
  currency: 'EUR',
  categories: [{ name: 'Boulangerie', description: null, confidence: 0.9, items: [] }],
  warnings: [],
};

function reply(content: string, finishReason = 'stop') {
  return Response.json({
    choices: [{ finish_reason: finishReason, message: { role: 'assistant', content } }],
    usage: { total_tokens: 10 },
  });
}

const IMAGE = { mimeType: 'image/jpeg', bytes: new Uint8Array([0xff, 0xd8, 0xff]) };
const PDF = { mimeType: 'application/pdf', bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]) };

describe('MiMo 菜单 provider（issue #25 / #28）', () => {
  it('调用 OpenAI 兼容 Chat Completions，图片转 data URL，PDF 转文本，JSON 模式', async () => {
    const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toBe('https://api.xiaomimimo.com/v1/chat/completions');
      expect(new Headers(init?.headers).get('api-key')).toBe('k');
      const body = JSON.parse(String(init?.body)) as {
        model: string;
        response_format: { type: string };
        messages: Array<{ role: string; content: unknown }>;
      };
      expect(body.model).toBe('mimo-v2.6-flash');
      expect(body.response_format).toEqual({ type: 'json_object' });
      const parts = body.messages[1]?.content as Array<Record<string, unknown>>;
      expect(parts[0]).toMatchObject({ type: 'image_url' });
      expect(String((parts[0]?.image_url as { url?: string } | undefined)?.url)).toMatch(
        /^data:image\/jpeg;base64,/,
      );
      expect(parts[1]).toMatchObject({ type: 'text' });
      expect(String(parts[1]?.text)).toContain('Croissant 1,20');
      expect(String(parts[2]?.text)).toContain('store currency is EUR');
      return reply(`\`\`\`json\n${JSON.stringify(OUTPUT)}\n\`\`\``);
    });
    const provider = createMimoMenuProvider({
      apiKey: 'k',
      model: 'mimo-v2.6-flash',
      fetcher: fetcher as unknown as typeof fetch,
      pdfToText: async () => 'Croissant 1,20',
    });
    const result = await provider.extractMenu({ assets: [IMAGE, PDF], currency: 'EUR' });
    expect(result.output.currency).toBe('EUR');
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('纯扫描 PDF 没有文字时报 MIMO_PDF_NO_TEXT，不调用模型', async () => {
    const fetcher = vi.fn();
    const provider = createMimoMenuProvider({
      apiKey: 'k',
      model: 'm',
      fetcher: fetcher as unknown as typeof fetch,
      pdfToText: async () => '  ',
    });
    await expect(provider.extractMenu({ assets: [PDF] })).rejects.toThrow('MIMO_PDF_NO_TEXT');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('HTTP 错误、截断与不符合 schema 都给出明确错误码', async () => {
    const make = (response: Response) =>
      createMimoMenuProvider({
        apiKey: 'k',
        model: 'm',
        baseUrl: 'https://token-plan-cn.xiaomimimo.com/v1/',
        fetcher: (async () => response) as unknown as typeof fetch,
        pdfToText: async () => '',
      });
    await expect(
      make(new Response('', { status: 401 })).extractMenu({ assets: [IMAGE] }),
    ).rejects.toThrow('MIMO_HTTP_401');
    await expect(make(reply('{}', 'length')).extractMenu({ assets: [IMAGE] })).rejects.toThrow(
      'MIMO_INCOMPLETE',
    );
    await expect(make(reply('{"foo":1}')).extractMenu({ assets: [IMAGE] })).rejects.toThrow(
      'MIMO_SCHEMA_MISMATCH',
    );
    await expect(make(reply('not json')).extractMenu({ assets: [IMAGE] })).rejects.toThrow(
      'MIMO_INVALID_JSON',
    );
  });

  it('extractJsonText 去掉代码块', () => {
    expect(extractJsonText('```json\n{"a":1}\n```')).toBe('{"a":1}');
    expect(extractJsonText(' {"a":1} ')).toBe('{"a":1}');
  });

  it('缺少门店币种时回落 VND 指令，兼容旧队列消息', async () => {
    let prompt = '';
    const provider = createMimoMenuProvider({
      apiKey: 'k',
      model: 'm',
      fetcher: (async (_url: string | URL | Request, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as {
          messages: Array<{ content: Array<{ type: string; text?: string }> }>;
        };
        prompt = body.messages[1]?.content.at(-1)?.text ?? '';
        return reply(JSON.stringify({ ...OUTPUT, currency: 'VND' }));
      }) as unknown as typeof fetch,
      pdfToText: async () => '',
    });
    await provider.extractMenu({ assets: [IMAGE] });
    expect(prompt).toContain('integer VND value');
  });

  it('翻译：JSON 模式、schema 写进系统提示词、保留实体 id', async () => {
    const entityId = '00000000-0000-4000-8000-000000000001';
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {
        response_format: { type: string };
        messages: Array<{ role: string; content: string }>;
      };
      expect(body.response_format).toEqual({ type: 'json_object' });
      expect(body.messages[0]?.content).toContain('"translations"');
      expect(body.messages[1]?.content).toContain('from Vietnamese (vi) to English (en)');
      expect(body.messages[1]?.content).toContain('"sourceName":"Phở bò"');
      expect(body.messages[1]?.content).not.toContain('"name":"Phở bò"');
      expect(body.messages[1]?.content).toContain(entityId);
      return reply(
        JSON.stringify({
          translations: [{ entityType: 'item', entityId, name: 'Beef pho', description: null }],
        }),
      );
    });
    const provider = createMimoMenuProvider({
      apiKey: 'k',
      model: 'mimo-v2.6-flash',
      fetcher: fetcher as unknown as typeof fetch,
      pdfToText: async () => '',
    });
    const result = await provider.translateMenu({
      sourceLocale: 'vi',
      targetLocale: 'en',
      entities: [{ entityType: 'item', entityId, name: 'Phở bò', description: null }],
    });
    expect(result.output.translations[0]?.name).toBe('Beef pho');
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('翻译结果不符合 schema 时报 MIMO_SCHEMA_MISMATCH', async () => {
    const provider = createMimoMenuProvider({
      apiKey: 'k',
      model: 'm',
      fetcher: (async () => reply('{"translations":[{"name":1}]}')) as unknown as typeof fetch,
      pdfToText: async () => '',
    });
    await expect(
      provider.translateMenu({ sourceLocale: 'vi', targetLocale: 'en', entities: [] }),
    ).rejects.toThrow('MIMO_SCHEMA_MISMATCH');
  });
});
