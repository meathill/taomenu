import { findDiningTableByToken, getPublishedMenuForStore } from '@taomenu/db';
import { notFound } from '@/lib/api-error';
import { getDb } from '@/lib/db';

type RouteContext = { params: Promise<{ tableToken: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { tableToken } = await context.params;
  const db = getDb();
  const table = await findDiningTableByToken(db, tableToken);
  if (!table) return notFound();

  const locale = new URL(request.url).searchParams.get('locale') ?? undefined;
  const menu = await getPublishedMenuForStore(db, table.storeId, locale);
  if (!menu) return notFound();

  return Response.json({
    ...menu,
    table: { id: table.id, name: table.name },
  });
}
