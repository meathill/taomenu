import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { agentLinkClicks, agentReferrals, agentRevenueEvents, agents } from '../schema/agents';
import { createAgentTestDb, seedMember, seedStore, seedUser } from '../testing/agent-fixtures';
import type { Db } from '../types';
import {
  attributeUserToAgent,
  createAgent,
  findActiveAgentByCode,
  findActiveAgentByEmail,
  generateAgentCode,
  getAgentById,
  listAgents,
  recordAgentClick,
  recordAgentRevenueForStore,
  setAgentStatus,
} from './agents';

describe('generateAgentCode', () => {
  it('固定 8 位，只用大写字母与数字', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateAgentCode();
      expect(code).toHaveLength(8);
      expect(code).toMatch(/^[A-Z2-9]{8}$/);
    }
  });

  it('不含易混淆的 0 / O / 1 / I', () => {
    for (let i = 0; i < 200; i++) {
      expect(generateAgentCode()).not.toMatch(/[0O1I]/);
    }
  });

  it('随机而非常量', () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateAgentCode()));
    expect(codes.size).toBeGreaterThan(40);
  });
});

describe('createAgent', () => {
  let db: Db;

  beforeEach(() => {
    db = createAgentTestDb();
  });

  it('正常创建：email 归一化小写、name trim、默认 active', async () => {
    const result = await createAgent(db, { name: '  阿海  ', email: '  Hai@Example.COM ' });

    expect(result.error).toBeUndefined();
    expect(result.agent?.email).toBe('hai@example.com');
    expect(result.agent?.name).toBe('阿海');
    expect(result.agent?.status).toBe('active');
    expect(result.agent?.code).toMatch(/^[A-Z2-9]{8}$/);
  });

  it('email 已存在（大小写不同）返回 EMAIL_TAKEN 且不重复落库', async () => {
    await createAgent(db, { name: '阿海', email: 'hai@example.com' });
    const second = await createAgent(db, { name: '另一个阿海', email: 'HAI@example.com' });

    expect(second.error).toBe('EMAIL_TAKEN');
    expect(second.agent).toBeUndefined();

    const rows = await db.select().from(agents);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe('阿海');
  });

  it('不同 email 各自创建，code 互不相同', async () => {
    const a = await createAgent(db, { name: 'A', email: 'a@example.com' });
    const b = await createAgent(db, { name: 'B', email: 'b@example.com' });

    expect(a.agent?.code).not.toBe(b.agent?.code);
    expect(await listAgents(db)).toHaveLength(2);
  });
});

describe('代理商查询与状态', () => {
  let db: Db;
  let agentId: string;
  let agentCode: string;

  beforeEach(async () => {
    db = createAgentTestDb();
    const created = await createAgent(db, { name: '阿海', email: 'hai@example.com' });
    if (!created.agent) {
      throw new Error('夹具创建失败');
    }
    agentId = created.agent.id;
    agentCode = created.agent.code;
  });

  it('getAgentById 命中与落空', async () => {
    expect((await getAgentById(db, agentId))?.email).toBe('hai@example.com');
    expect(await getAgentById(db, 'nope')).toBeNull();
  });

  it('按 email / code 查找大小写不敏感', async () => {
    expect((await findActiveAgentByEmail(db, ' HAI@Example.com '))?.id).toBe(agentId);
    expect((await findActiveAgentByCode(db, ` ${agentCode.toLowerCase()} `))?.id).toBe(agentId);
  });

  it('禁用后按 email / code 都查不到，且 updated_at 前进', async () => {
    const before = await getAgentById(db, agentId);
    const disabled = await setAgentStatus(db, agentId, 'disabled');

    expect(disabled?.status).toBe('disabled');
    expect(disabled?.updatedAt.getTime()).toBeGreaterThanOrEqual(
      before?.updatedAt.getTime() ?? Number.POSITIVE_INFINITY,
    );
    expect(await findActiveAgentByEmail(db, 'hai@example.com')).toBeNull();
    expect(await findActiveAgentByCode(db, agentCode)).toBeNull();
    // 但按 id 仍能读到，admin 后台要能把它改回来
    expect((await getAgentById(db, agentId))?.status).toBe('disabled');
  });

  it('setAgentStatus 对不存在的 id 返回 null', async () => {
    expect(await setAgentStatus(db, 'nope', 'disabled')).toBeNull();
  });
});

describe('attributeUserToAgent 首触归因', () => {
  let db: Db;
  let firstCode: string;
  let secondCode: string;
  let firstAgentId: string;

  beforeEach(async () => {
    db = createAgentTestDb();
    const first = await createAgent(db, { name: '甲', email: 'first@example.com' });
    const second = await createAgent(db, { name: '乙', email: 'second@example.com' });
    if (!first.agent || !second.agent) {
      throw new Error('夹具创建失败');
    }
    firstAgentId = first.agent.id;
    firstCode = first.agent.code;
    secondCode = second.agent.code;
    await seedUser(db, 'user-1', 'shop@example.com');
  });

  it('首次归因落库，ref_code 存代理商当前 code 快照', async () => {
    expect(
      await attributeUserToAgent(db, { userId: 'user-1', code: firstCode.toLowerCase() }),
    ).toBe(true);

    const rows = await db.select().from(agentReferrals);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.agentId).toBe(firstAgentId);
    expect(rows[0]?.refCode).toBe(firstCode);
  });

  it('第二次用不同 code 不覆盖首触', async () => {
    await attributeUserToAgent(db, { userId: 'user-1', code: firstCode });
    expect(await attributeUserToAgent(db, { userId: 'user-1', code: secondCode })).toBe(false);

    const rows = await db.select().from(agentReferrals);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.agentId).toBe(firstAgentId);
  });

  it('已禁用的代理商不产生归因', async () => {
    const disabled = await createAgent(db, { name: '丙', email: 'third@example.com' });
    if (!disabled.agent) {
      throw new Error('夹具创建失败');
    }
    await setAgentStatus(db, disabled.agent.id, 'disabled');
    await seedUser(db, 'user-2', 'shop2@example.com');

    expect(await attributeUserToAgent(db, { userId: 'user-2', code: disabled.agent.code })).toBe(
      false,
    );
    expect(await db.select().from(agentReferrals)).toHaveLength(0);
  });

  it('无效 code 静默跳过而不是抛错', async () => {
    await expect(attributeUserToAgent(db, { userId: 'user-1', code: 'NOTREAL9' })).resolves.toBe(
      false,
    );
    expect(await db.select().from(agentReferrals)).toHaveLength(0);
  });
});

describe('recordAgentClick 点击去重', () => {
  let db: Db;
  let code: string;
  let agentId: string;

  beforeEach(async () => {
    db = createAgentTestDb();
    const created = await createAgent(db, { name: '甲', email: 'first@example.com' });
    if (!created.agent) {
      throw new Error('夹具创建失败');
    }
    code = created.agent.code;
    agentId = created.agent.id;
  });

  it('同 (agent, day, hash) 只落一行', async () => {
    const input = { code, source: 'website' as const, visitorHash: 'hash-a', day: '2026-08-10' };
    expect(await recordAgentClick(db, input)).toBe(true);
    // website 与 app 各上报一次，被唯一索引去重成 1 次
    expect(await recordAgentClick(db, { ...input, source: 'app' })).toBe(false);

    const rows = await db
      .select()
      .from(agentLinkClicks)
      .where(eq(agentLinkClicks.agentId, agentId));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.source).toBe('website');
  });

  it('换 day 或换 visitorHash 各计一次', async () => {
    const base = { code, source: 'website' as const, visitorHash: 'hash-a', day: '2026-08-10' };
    await recordAgentClick(db, base);
    expect(await recordAgentClick(db, { ...base, day: '2026-08-11' })).toBe(true);
    expect(await recordAgentClick(db, { ...base, visitorHash: 'hash-b' })).toBe(true);

    expect(await db.select().from(agentLinkClicks)).toHaveLength(3);
  });

  it('无效 code 与已禁用代理商都不落库且不抛错', async () => {
    await expect(
      recordAgentClick(db, {
        code: 'NOTREAL9',
        source: 'app',
        visitorHash: 'hash-a',
        day: '2026-08-10',
      }),
    ).resolves.toBe(false);

    await setAgentStatus(db, agentId, 'disabled');
    expect(
      await recordAgentClick(db, {
        code,
        source: 'app',
        visitorHash: 'hash-a',
        day: '2026-08-10',
      }),
    ).toBe(false);

    expect(await db.select().from(agentLinkClicks)).toHaveLength(0);
  });
});

describe('recordAgentRevenueForStore', () => {
  let db: Db;
  let agentId: string;
  let code: string;

  beforeEach(async () => {
    db = createAgentTestDb();
    const created = await createAgent(db, { name: '甲', email: 'first@example.com' });
    if (!created.agent) {
      throw new Error('夹具创建失败');
    }
    agentId = created.agent.id;
    code = created.agent.code;

    await seedUser(db, 'owner-1', 'owner1@example.com');
    await seedStore(db, 'store-1', { plan: 'pro' });
    await seedMember(db, 'store-1', 'owner-1', 'owner');
    await attributeUserToAgent(db, { userId: 'owner-1', code });
  });

  const invoice = {
    storeId: 'store-1',
    stripeInvoiceId: 'in_1',
    amountMinor: 29900,
    currency: 'usd',
    kind: 'pro_plan' as const,
  };

  it('归因商家的 invoice 落到对应代理商名下', async () => {
    expect(await recordAgentRevenueForStore(db, invoice)).toBe(true);

    const rows = await db.select().from(agentRevenueEvents);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.agentId).toBe(agentId);
    expect(rows[0]?.userId).toBe('owner-1');
    expect(rows[0]?.amountMinor).toBe(29900);
  });

  it('同一 invoice id 重放只落一行', async () => {
    expect(await recordAgentRevenueForStore(db, invoice)).toBe(true);
    expect(await recordAgentRevenueForStore(db, invoice)).toBe(false);
    expect(await db.select().from(agentRevenueEvents)).toHaveLength(1);
  });

  it('无归因商家静默跳过', async () => {
    await seedUser(db, 'owner-2', 'owner2@example.com');
    await seedStore(db, 'store-2');
    await seedMember(db, 'store-2', 'owner-2', 'owner');

    expect(
      await recordAgentRevenueForStore(db, {
        ...invoice,
        storeId: 'store-2',
        stripeInvoiceId: 'in_2',
      }),
    ).toBe(false);
    expect(await db.select().from(agentRevenueEvents)).toHaveLength(0);
  });

  it('多成员门店取 role=owner 的归因，而不是 staff 的', async () => {
    const other = await createAgent(db, { name: '乙', email: 'second@example.com' });
    if (!other.agent) {
      throw new Error('夹具创建失败');
    }
    await seedUser(db, 'staff-1', 'staff1@example.com');
    await seedMember(db, 'store-1', 'staff-1', 'staff');
    await attributeUserToAgent(db, { userId: 'staff-1', code: other.agent.code });

    await recordAgentRevenueForStore(db, invoice);

    const rows = await db.select().from(agentRevenueEvents);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.agentId).toBe(agentId);
    expect(rows[0]?.userId).toBe('owner-1');
  });

  it('代理商被禁用后名下商家续费仍然记账', async () => {
    await setAgentStatus(db, agentId, 'disabled');

    expect(await recordAgentRevenueForStore(db, invoice)).toBe(true);
    const rows = await db.select().from(agentRevenueEvents);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.agentId).toBe(agentId);
  });
});
