import { describe, expect, it } from 'vitest';
import { badRequest, notFound, unauthorized } from './api-error';

describe('api-error helpers', () => {
  it('unauthorized 返回 401', async () => {
    const res = unauthorized();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('notFound 返回 404', async () => {
    const res = notFound();
    expect(res.status).toBe(404);
  });

  it('badRequest 带消息', async () => {
    const res = badRequest('Invalid body');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid body' });
  });
});
