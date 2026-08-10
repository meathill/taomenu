import { describe, expect, it } from 'vitest';
import {
  agentStatusSchema,
  createAgentSchema,
  isAdminEmail,
  normalizeAdminEmail,
} from './admin-access';

describe('normalizeAdminEmail', () => {
  it('trim + 小写', () => {
    expect(normalizeAdminEmail('  Root@Example.COM ')).toBe('root@example.com');
  });

  it('空值归一成空串', () => {
    expect(normalizeAdminEmail(null)).toBe('');
    expect(normalizeAdminEmail(undefined)).toBe('');
  });
});

describe('isAdminEmail', () => {
  it('忽略大小写与空格', () => {
    expect(isAdminEmail(' Root@Example.com ', 'root@example.com')).toBe(true);
  });

  it('不同邮箱返回 false', () => {
    expect(isAdminEmail('someone@example.com', 'root@example.com')).toBe(false);
  });

  it('ADMIN_EMAIL 未配置时恒 false（不能人人都是 admin）', () => {
    expect(isAdminEmail('root@example.com', undefined)).toBe(false);
    expect(isAdminEmail('root@example.com', '')).toBe(false);
    expect(isAdminEmail('root@example.com', '   ')).toBe(false);
  });

  it('session 无 email 时返回 false', () => {
    expect(isAdminEmail(null, 'root@example.com')).toBe(false);
    expect(isAdminEmail('', '')).toBe(false);
  });
});

describe('createAgentSchema', () => {
  it('接受合法入参并 trim 名称', () => {
    const parsed = createAgentSchema.safeParse({ name: '  Alice  ', email: 'a@example.com' });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.name).toBe('Alice');
  });

  it('拒绝空名称与非法邮箱', () => {
    expect(createAgentSchema.safeParse({ name: '   ', email: 'a@example.com' }).success).toBe(
      false,
    );
    expect(createAgentSchema.safeParse({ name: 'Alice', email: 'not-an-email' }).success).toBe(
      false,
    );
  });

  it('拒绝超长名称', () => {
    expect(createAgentSchema.safeParse({ name: 'a'.repeat(101), email: 'a@b.com' }).success).toBe(
      false,
    );
  });
});

describe('agentStatusSchema', () => {
  it('只接受 active / disabled', () => {
    expect(agentStatusSchema.safeParse({ status: 'active' }).success).toBe(true);
    expect(agentStatusSchema.safeParse({ status: 'disabled' }).success).toBe(true);
    expect(agentStatusSchema.safeParse({ status: 'deleted' }).success).toBe(false);
  });
});
