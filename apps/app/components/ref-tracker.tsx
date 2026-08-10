'use client';

import { useEffect } from 'react';
import { normalizeRefCode, REF_QUERY_PARAM } from '@/lib/ref-click';

/**
 * 落在 app 上的推广链接点击上报。
 * 刻意用 window.location 而不是 useSearchParams：后者会让整棵 layout 变成动态渲染。
 * website 与 app 各报一次，DB 侧靠 (agent, day, visitor) 唯一索引去重成 1 次。
 */
export function RefTracker() {
  useEffect(() => {
    const code = normalizeRefCode(new URLSearchParams(window.location.search).get(REF_QUERY_PARAM));
    if (!code) {
      return;
    }

    // 按 code 区分，防止同一会话内翻页重复上报
    const flag = `tm_ref_click:${code}`;
    try {
      if (sessionStorage.getItem(flag)) {
        return;
      }
      sessionStorage.setItem(flag, '1');
    } catch {
      // 隐私模式下 sessionStorage 不可用，放弃上报好过重复上报
      return;
    }

    void fetch('/api/public/ref-click', {
      method: 'POST',
      headers: { 'content-type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ code, source: 'app' }),
      keepalive: true,
    }).catch(() => undefined);
  }, []);

  return null;
}
