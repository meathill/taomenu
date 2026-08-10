import { createAgent, listAgents } from '@taomenu/db';
import { requireAdmin } from '@/lib/admin';
import { createAgentSchema } from '@/lib/admin-access';
import { badRequest, jsonError, notFound } from '@/lib/api-error';
import { getDb } from '@/lib/db';

/** 非 admin 一律 404：401 会暴露「这里有个 admin 接口」。 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return notFound();
  }

  const agents = await listAgents(getDb());
  return Response.json({ agents });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return notFound();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }

  const parsed = createAgentSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body');
  }

  const result = await createAgent(getDb(), parsed.data);
  if (result.error) {
    // 前端据此展示「邮箱已被占用」，不要改成通用 400
    return jsonError('EMAIL_TAKEN', 409);
  }

  return Response.json({ agent: result.agent }, { status: 201 });
}
