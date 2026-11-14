import { StoreBrandingError, setStoreCoverImage } from '@taomenu/db';
import { badRequest } from '@/lib/api-error';
import { getEnv } from '@/lib/cf';
import { buildStoreCoverKey, publicMediaPath, validateMenuImageBytes } from '@/lib/menu-image';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';

type RouteContext = { params: Promise<{ storeId: string }> };

async function handleBrandingError(error: unknown) {
  if (error instanceof StoreBrandingError) {
    const status = error.code === 'PRO_REQUIRED' ? 403 : 503;
    return Response.json({ error: error.code }, { status });
  }
  throw error;
}

export async function POST(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) return owner;

  const env = getEnv();
  if (!env.MEDIA) {
    return Response.json({ error: 'MEDIA binding not configured' }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return badRequest('Invalid multipart body');
  }
  const file = form.get('file');
  if (!(file instanceof File)) {
    return badRequest('Missing file field');
  }

  const mime = file.type || 'application/octet-stream';
  const buffer = new Uint8Array(await file.arrayBuffer());
  const validated = validateMenuImageBytes({ mime, bytes: buffer });
  if (!validated.ok) {
    return badRequest(validated.error);
  }

  const key = buildStoreCoverKey(storeId, validated.mime);
  await env.MEDIA.put(key, buffer, {
    httpMetadata: { contentType: validated.mime },
    customMetadata: { storeId, kind: 'cover' },
  });

  try {
    const updated = await setStoreCoverImage(owner.storeCtx, owner.db, key);
    if (updated.previousKey && updated.previousKey !== key) {
      await env.MEDIA.delete(updated.previousKey).catch(() => undefined);
    }
    return Response.json({
      coverImageKey: key,
      coverImageUrl: publicMediaPath(key),
    });
  } catch (error) {
    await env.MEDIA.delete(key).catch(() => undefined);
    return handleBrandingError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) return owner;

  try {
    const updated = await setStoreCoverImage(owner.storeCtx, owner.db, null);
    const env = getEnv();
    if (updated.previousKey && env.MEDIA) {
      await env.MEDIA.delete(updated.previousKey).catch(() => undefined);
    }
    return Response.json({ ok: true });
  } catch (error) {
    return handleBrandingError(error);
  }
}
