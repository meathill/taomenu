import { describe, expect, it } from 'vitest';

function needsOpenSession(type: string, hasSession: boolean): boolean {
  return type === 'request_bill' && !hasSession;
}

describe('service request rules', () => {
  it('request_bill 需要 open session', () => {
    expect(needsOpenSession('request_bill', false)).toBe(true);
  });

  it('call_staff 允许无 session', () => {
    expect(needsOpenSession('call_staff', false)).toBe(false);
  });
});
