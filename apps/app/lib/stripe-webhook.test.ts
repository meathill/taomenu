import { describe, expect, it } from 'vitest';
import { handleStripeEventOnce, type StripeEventDeduper } from './stripe-webhook';

function createDeduper(): StripeEventDeduper & { claimed: Set<string>; releases: string[] } {
  const claimed = new Set<string>();
  const releases: string[] = [];
  return {
    claimed,
    releases,
    async claim(eventId) {
      if (claimed.has(eventId)) return false;
      claimed.add(eventId);
      return true;
    },
    async release(eventId) {
      releases.push(eventId);
      claimed.delete(eventId);
    },
  };
}

describe('handleStripeEventOnce', () => {
  it('首次投递执行处理逻辑', async () => {
    const deduper = createDeduper();
    let calls = 0;
    const processed = await handleStripeEventOnce('evt_1', deduper, async () => {
      calls += 1;
    });
    expect(processed).toBe(true);
    expect(calls).toBe(1);
  });

  it('重复投递不再执行处理逻辑', async () => {
    const deduper = createDeduper();
    let calls = 0;
    const handler = async () => {
      calls += 1;
    };
    await handleStripeEventOnce('evt_1', deduper, handler);
    const processed = await handleStripeEventOnce('evt_1', deduper, handler);
    expect(processed).toBe(false);
    expect(calls).toBe(1);
    expect(deduper.releases).toEqual([]);
  });

  it('处理失败释放占位并抛出原错误，重投可以再次处理', async () => {
    const deduper = createDeduper();
    const failure = new Error('写库失败');
    await expect(
      handleStripeEventOnce('evt_1', deduper, async () => {
        throw failure;
      }),
    ).rejects.toBe(failure);
    expect(deduper.releases).toEqual(['evt_1']);

    let calls = 0;
    const processed = await handleStripeEventOnce('evt_1', deduper, async () => {
      calls += 1;
    });
    expect(processed).toBe(true);
    expect(calls).toBe(1);
  });

  it('释放本身失败不掩盖原错误', async () => {
    const deduper: StripeEventDeduper = {
      async claim() {
        return true;
      },
      async release() {
        throw new Error('释放失败');
      },
    };
    const failure = new Error('写库失败');
    await expect(
      handleStripeEventOnce('evt_1', deduper, async () => {
        throw failure;
      }),
    ).rejects.toBe(failure);
  });
});
