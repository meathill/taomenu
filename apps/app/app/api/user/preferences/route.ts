import { getUserPreferences, updateUserPreferences } from '@taomenu/db';
import { z } from 'zod';
import { badRequest, unauthorized } from '@/lib/api-error';
import { getDb } from '@/lib/db';
import { requireUserId } from '@/lib/session';

const updatePreferencesSchema = z
  .object({
    hideMenuProTools: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'No preference supplied');

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  return Response.json({ preferences: await getUserPreferences(getDb(), userId) });
}

export async function PATCH(request: Request) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }
  const parsed = updatePreferencesSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Invalid body');

  const preferences = await updateUserPreferences(getDb(), userId, parsed.data);
  return Response.json({ preferences });
}
