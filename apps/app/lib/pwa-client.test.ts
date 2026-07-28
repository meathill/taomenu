import { describe, expect, it } from 'vitest';

// Node 环境无 window：检测应安全降级
import { detectPushCapability } from './pwa-client';

describe('detectPushCapability', () => {
  it('在无 window 时返回 unsupported 形态', () => {
    const cap = detectPushCapability();
    expect(cap.serviceWorker).toBe(false);
    expect(cap.permission).toBe('unsupported');
  });
});
