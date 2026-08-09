type ImageEditResponse = {
  data?: Array<{ b64_json?: string }>;
  usage?: unknown;
};

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function createOpenAiImageProvider({
  apiKey,
  model,
  fetchImpl = fetch,
}: {
  apiKey: string;
  model: string;
  fetchImpl?: typeof fetch;
}) {
  return {
    async enhanceDishPhoto(input: { mimeType: string; bytes: Uint8Array }) {
      const form = new FormData();
      form.set('model', model);
      const imageBuffer = new ArrayBuffer(input.bytes.byteLength);
      new Uint8Array(imageBuffer).set(input.bytes);
      form.append(
        'image[]',
        new File([imageBuffer], 'dish-photo', { type: input.mimeType || 'image/jpeg' }),
      );
      form.set(
        'prompt',
        [
          'Enhance this real restaurant dish photo for a digital menu.',
          'Preserve the exact dish, ingredients, portion, plate, and camera angle.',
          'Improve only lighting, white balance, contrast, sharpness, and background neatness.',
          'Do not add, remove, replace, or rearrange food, garnish, tableware, text, logos, or people.',
          'Keep the result photorealistic and honest to what the guest will receive.',
        ].join(' '),
      );
      form.set('size', '1024x1024');
      form.set('quality', 'low');
      form.set('output_format', 'jpeg');
      form.set('output_compression', '82');

      const response = await fetchImpl('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });
      if (!response.ok) {
        throw new Error(`OPENAI_IMAGE_HTTP_${response.status}`);
      }
      const body = (await response.json()) as ImageEditResponse;
      const encoded = body.data?.[0]?.b64_json;
      if (!encoded) throw new Error('OPENAI_IMAGE_INVALID_OUTPUT');
      return { bytes: decodeBase64(encoded), usage: body.usage ?? null };
    },
  };
}
