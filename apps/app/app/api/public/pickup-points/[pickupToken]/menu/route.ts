import { findPickupPointByToken, getPublishedMenuForStore } from '@taomenu/db';
import { notFound } from '@/lib/api-error';
import { getDb } from '@/lib/db';

type RouteContext = { params: Promise<{ pickupToken: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { pickupToken } = await context.params;
  const db = getDb();
  const point = await findPickupPointByToken(db, pickupToken);
  if (!point) return notFound();

  const locale = new URL(request.url).searchParams.get('locale') ?? undefined;
  const menu = await getPublishedMenuForStore(db, point.storeId, locale);
  if (!menu) return notFound();

  return Response.json({
    ...menu,
    pickupPoint: { id: point.id, name: point.name },
  });
}
