export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export function unauthorized() {
  return jsonError('Unauthorized', 401);
}

export function notFound() {
  return jsonError('Not found', 404);
}

export function badRequest(message: string) {
  return jsonError(message, 400);
}
