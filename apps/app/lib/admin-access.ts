/**
 * admin（root）判定与 admin API 的入参校验。
 * 本文件刻意只依赖 zod：不引 next / cloudflare / db，所以可以被 vitest 直接单测。
 * 真正取 session、读环境变量的部分在 lib/admin.ts。
 */

import { z } from 'zod';

/** email 统一 trim + 小写；null/undefined 归一成空串。 */
export function normalizeAdminEmail(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

/**
 * 是否 root 管理员。
 * ADMIN_EMAIL 未配置（undefined / 空串 / 纯空白）时恒 false——
 * 漏配环境变量的部署必须是「admin 不可用」，而不是「人人都是 admin」。
 */
export function isAdminEmail(
  sessionEmail: string | null | undefined,
  adminEmail: string | null | undefined,
): boolean {
  const expected = normalizeAdminEmail(adminEmail);
  if (!expected) {
    return false;
  }
  const actual = normalizeAdminEmail(sessionEmail);
  return actual !== '' && actual === expected;
}

/** 创建代理商入参。email 大小写与空格由 db 层的 normalizeAgentEmail 归一。 */
export const createAgentSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email().max(200),
});

export type CreateAgentBody = z.infer<typeof createAgentSchema>;

/** 状态字面量与 packages/db 的 AgentStatus 保持一致；此处不 import db，避免把 drizzle 拖进测试。 */
export const agentStatusSchema = z.object({
  status: z.enum(['active', 'disabled']),
});
