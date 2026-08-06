import { pairTerminalWithCode } from '@taomenu/db';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { badRequest } from '@/lib/api-error';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/session';
import { TERMINAL_CREDENTIAL_COOKIE } from '@/lib/terminal-session';

const pairSchema = z.object({
  code: z.string().trim().min(1).max(16),
  name: z.string().trim().min(1).max(80),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }
  const parsed = pairSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest('Enter the pairing code and a device name.');
  }

  const session = await getSession();
  if (!session?.user) {
    return Response.json({ error: 'LOGIN_REQUIRED' }, { status: 401 });
  }

  const result = await pairTerminalWithCode(getDb(), {
    ...parsed.data,
    staffUserId: session.user.id,
  });
  if ('error' in result) {
    return badRequest(result.error);
  }

  const response = NextResponse.json({ device: result.device });
  response.cookies.set(TERMINAL_CREDENTIAL_COOKIE, result.credential, {
    httpOnly: true,
    secure: request.url.startsWith('https://'),
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
