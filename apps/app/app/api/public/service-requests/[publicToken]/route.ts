import { getServiceRequestByPublicToken } from '@taomenu/db';
import { notFound } from '@/lib/api-error';
import { getDb } from '@/lib/db';

type RouteContext = { params: Promise<{ publicToken: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { publicToken } = await context.params;
  const row = await getServiceRequestByPublicToken(getDb(), publicToken);
  if (!row) return notFound();

  return Response.json(
    {
      id: row.id,
      type: row.type,
      status: row.status,
      createdAt: row.createdAt,
      acknowledgedAt: row.acknowledgedAt,
      resolvedAt: row.resolvedAt,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
