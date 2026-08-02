import { notFound } from '@/lib/api-error';
import { getEnv } from '@/lib/cf';
import { contentTypeForKey, isValidMenuImageKey } from '@/lib/menu-image';

type RouteContext = { params: Promise<{ path: string[] }> };

/** 公开读菜品图：仅允许 `menu/{storeId}/{itemId}/{file}` 形态的 key。 */
export async function GET(_request: Request, context: RouteContext) {
  const { path } = await context.params;
  const key = path.map(decodeURIComponent).join('/');
  if (!isValidMenuImageKey(key)) {
    return notFound();
  }

  const env = getEnv();
  if (!env.MEDIA) {
    return notFound();
  }

  const object = await env.MEDIA.get(key);
  if (!object) {
    return notFound();
  }

  const headers = new Headers();
  headers.set('Content-Type', object.httpMetadata?.contentType || contentTypeForKey(key));
  headers.set('Cache-Control', 'public, max-age=86400, immutable');
  if (object.httpEtag) {
    headers.set('ETag', object.httpEtag);
  }

  return new Response(object.body, { status: 200, headers });
}
