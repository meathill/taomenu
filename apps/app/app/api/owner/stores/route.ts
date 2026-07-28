import { createStoreForOwner, listStoresForUser } from '@taomenu/db';
import { createStoreSchema } from '@taomenu/shared';
import { badRequest, unauthorized } from '@/lib/api-error';
import { getDb } from '@/lib/db';
import { requireUserId } from '@/lib/session';

export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return unauthorized();
  }

  const stores = await listStoresForUser(getDb(), userId);
  return Response.json({ stores });
}

export async function POST(request: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return unauthorized();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }

  const parsed = createStoreSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body');
  }

  const store = await createStoreForOwner(getDb(), userId, parsed.data);
  return Response.json({ store }, { status: 201 });
}
