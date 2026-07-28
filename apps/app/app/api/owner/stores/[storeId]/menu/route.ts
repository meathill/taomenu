import { getMenuTree, MenuValidationError, publishMenu } from '@taomenu/db';
import { badRequest } from '@/lib/api-error';
import { isErrorResponse, requireOwnerStore } from '@/lib/owner-context';

type RouteContext = { params: Promise<{ storeId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) {
    return owner;
  }

  const tree = await getMenuTree(owner.storeCtx, owner.db);
  return Response.json(tree);
}

export async function POST(request: Request, context: RouteContext) {
  const { storeId } = await context.params;
  const owner = await requireOwnerStore(storeId);
  if (isErrorResponse(owner)) {
    return owner;
  }

  let body: { action?: string } = {};
  try {
    body = (await request.json()) as { action?: string };
  } catch {
    return badRequest('Invalid JSON');
  }

  if (body.action !== 'publish') {
    return badRequest('Unsupported action');
  }

  try {
    const result = await publishMenu(owner.storeCtx, owner.db);
    return Response.json(result);
  } catch (error) {
    if (error instanceof MenuValidationError) {
      return Response.json({ error: error.message, issues: error.issues }, { status: 422 });
    }
    throw error;
  }
}
