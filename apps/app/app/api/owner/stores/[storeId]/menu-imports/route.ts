import {
  createMenuImport,
  getLatestMenuImport,
  getMenuImportUsage,
  MenuImportError,
} from '@taomenu/db';
import { getPlanLimits } from '@taomenu/shared';
import { badRequest } from '@/lib/api-error';
import { getEnv } from '@/lib/cf';
import { buildMenuImportKey, validateMenuImportFile } from '@/lib/menu-import-file';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';

type RouteContext = { params: Promise<{ storeId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) return owner;
  if (!getPlanLimits(owner.storeCtx.plan).canUseAiMenuImport) {
    return Response.json({ error: 'PRO_REQUIRED' }, { status: 403 });
  }
  const [view, usage] = await Promise.all([
    getLatestMenuImport(owner.storeCtx, owner.db),
    getMenuImportUsage(owner.storeCtx, owner.db),
  ]);
  return Response.json({ view, usage });
}

export async function POST(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) return owner;
  if (!getPlanLimits(owner.storeCtx.plan).canUseAiMenuImport) {
    return Response.json({ error: 'PRO_REQUIRED' }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return badRequest('INVALID_MULTIPART');
  }
  const file = form.get('file');
  if (!(file instanceof File)) return badRequest('MISSING_FILE');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const validated = validateMenuImportFile({
    mimeType: file.type || 'application/octet-stream',
    bytes,
  });
  if (!validated.ok) return badRequest(validated.error);

  const env = getEnv();
  const importId = crypto.randomUUID();
  const r2Key = buildMenuImportKey(storeId, importId, validated.mimeType);
  await env.MEDIA.put(r2Key, bytes, {
    httpMetadata: { contentType: validated.mimeType },
    customMetadata: { storeId, purpose: 'menu-import' },
  });
  try {
    const result = await createMenuImport(owner.storeCtx, owner.db, {
      importId,
      r2Key,
      mimeType: validated.mimeType,
      sizeBytes: bytes.byteLength,
    });
    return Response.json(result, { status: 201 });
  } catch (error) {
    await env.MEDIA.delete(r2Key).catch(() => undefined);
    if (error instanceof MenuImportError) {
      return Response.json(
        { error: error.code },
        { status: error.code === 'MONTHLY_LIMIT_REACHED' ? 429 : 403 },
      );
    }
    throw error;
  }
}
