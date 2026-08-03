import { setItemImageKey } from '@taomenu/db';
import { badRequest, notFound } from '@/lib/api-error';
import { getEnv } from '@/lib/cf';
import { buildMenuImageKey, publicMediaPath, validateMenuImageBytes } from '@/lib/menu-image';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';

type RouteContext = { params: Promise<{ storeId: string; itemId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { storeId, itemId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) {
    return owner;
  }

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
    // 只返回错误码，文案由前端按 UI 语言映射
    return badRequest(validated.error);
  }

  const key = buildMenuImageKey(storeId, itemId, validated.mime);
  await env.MEDIA.put(key, buffer, {
    httpMetadata: { contentType: validated.mime },
    customMetadata: { storeId, itemId },
  });

  const updated = await setItemImageKey(owner.storeCtx, owner.db, itemId, key);
  if (!updated) {
    await env.MEDIA.delete(key).catch(() => undefined);
    return notFound();
  }

  if (updated.previousKey && updated.previousKey !== key) {
    await env.MEDIA.delete(updated.previousKey).catch(() => undefined);
  }

  return Response.json({
    imageKey: key,
    imageUrl: publicMediaPath(key),
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { storeId, itemId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) {
    return owner;
  }

  const updated = await setItemImageKey(owner.storeCtx, owner.db, itemId, null);
  if (!updated) {
    return notFound();
  }

  const env = getEnv();
  if (updated.previousKey && env.MEDIA) {
    await env.MEDIA.delete(updated.previousKey).catch(() => undefined);
  }

  return Response.json({ ok: true });
}
