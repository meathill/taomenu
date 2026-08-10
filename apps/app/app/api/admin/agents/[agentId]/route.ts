import { setAgentStatus } from '@taomenu/db';
import { requireAdmin } from '@/lib/admin';
import { agentStatusSchema } from '@/lib/admin-access';
import { badRequest, notFound } from '@/lib/api-error';
import { getDb } from '@/lib/db';

type RouteContext = { params: Promise<{ agentId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return notFound();
  }

  const { agentId } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }

  const parsed = agentStatusSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body');
  }

  const agent = await setAgentStatus(getDb(), agentId, parsed.data.status);
  if (!agent) {
    return notFound();
  }

  return Response.json({ agent });
}
