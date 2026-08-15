import 'next/headers';
import { getAuth } from '@/lib/auth';
import { handleAuthRequest } from '@/lib/auth-runtime';

export async function GET(request: Request) {
  return handleAuthRequest(request, async (req) => (await getAuth()).handler(req));
}

export async function POST(request: Request) {
  return handleAuthRequest(request, async (req) => (await getAuth()).handler(req));
}
