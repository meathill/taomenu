import { getOrderByPublicToken } from '@taomenu/db';
import { notFound } from '@/lib/api-error';
import { getDb } from '@/lib/db';

type RouteContext = { params: Promise<{ publicToken: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { publicToken } = await context.params;
  const result = await getOrderByPublicToken(getDb(), publicToken);
  if (!result) return notFound();

  return Response.json(
    {
      id: result.order.id,
      status: result.order.status,
      displayNumber: result.order.displayNumber,
      pickupNumber: result.order.pickupNumber,
      subtotalAmount: result.order.subtotalAmount,
      fulfillmentMode: result.order.fulfillmentMode,
      updatedAt: result.order.updatedAt,
      items: result.items.map((item) => ({
        name: item.nameSnapshot,
        quantity: item.quantity,
        unitPriceAmount: item.unitPriceAmount,
        lineTotalAmount: item.lineTotalAmount,
      })),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
