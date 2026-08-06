import { createStoreForOwner, hasStaffStoreMembership, listStoresForUser } from '@taomenu/db';
import { createStoreSchema } from '@taomenu/shared';
import { badRequest, unauthorized } from '@/lib/api-error';
import { getDb } from '@/lib/db';
import { requireUserId } from '@/lib/session';

export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return unauthorized();
  }

  const db = getDb();
  const stores = await listStoresForUser(db, userId);
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

  const db = getDb();
  const ownerStores = await listStoresForUser(db, userId);
  if (ownerStores.length === 0 && (await hasStaffStoreMembership(db, userId))) {
    return Response.json({ error: 'Staff accounts cannot create stores.' }, { status: 403 });
  }

  const store = await createStoreForOwner(db, userId, parsed.data);
  return Response.json({ store }, { status: 201 });
}
