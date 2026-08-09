import { describe, expect, it, vi } from 'vitest';
import { createOpenAiImageProvider } from './openai-image-provider';

describe('OpenAI image provider', () => {
  it('sends one high-fidelity dish edit and decodes the JPEG result', async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const form = init?.body as FormData;
      expect(form.get('model')).toBe('gpt-image-2');
      expect(form.get('quality')).toBe('low');
      expect(form.get('output_format')).toBe('jpeg');
      expect(form.getAll('image[]')).toHaveLength(1);
      expect(String(form.get('prompt'))).toContain('Preserve the exact dish');
      return Response.json({ data: [{ b64_json: btoa('jpeg') }], usage: { total_tokens: 12 } });
    });
    const provider = createOpenAiImageProvider({
      apiKey: 'test-key',
      model: 'gpt-image-2',
      fetchImpl: fetchImpl as typeof fetch,
    });

    const result = await provider.enhanceDishPhoto({
      mimeType: 'image/jpeg',
      bytes: new Uint8Array([1, 2, 3]),
    });

    expect(new TextDecoder().decode(result.bytes)).toBe('jpeg');
    expect(result.usage).toEqual({ total_tokens: 12 });
  });

  it('maps upstream failures to a stable error code', async () => {
    const provider = createOpenAiImageProvider({
      apiKey: 'test-key',
      model: 'gpt-image-2',
      fetchImpl: vi.fn(async () => new Response('no', { status: 403 })) as typeof fetch,
    });

    await expect(
      provider.enhanceDishPhoto({ mimeType: 'image/png', bytes: new Uint8Array([1]) }),
    ).rejects.toThrow('OPENAI_IMAGE_HTTP_403');
  });
});
