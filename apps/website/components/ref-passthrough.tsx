'use client';

import {
  appendRefToAppLink,
  buildRefCookie,
  normalizeRefCode,
  REF_QUERY_PARAM,
  readRefCookie,
} from '@taomenu/shared/ref';
import { useEffect } from 'react';

type RefPassthroughProps = {
  /**
   * app 的公开地址。由 layout（服务端）用 getPublicAppUrl() 读好传进来，
   * 避免客户端 bundle 里动态读 process.env 拿不到值。
   */
  appUrl: string;
};

/**
 * 营销站落地页的推广码中转：
 * 1. `?ref=CODE` 首触写 30 天 cookie（已有不覆盖），供用户逛完站再点 CTA 时仍带得走；
 * 2. 点击指向 app 的链接时自动补 ref 参数，站内所有 CTA（含未来新增的）无需各自改造；
 * 3. 带 ref 打开页面时上报一次点击，DB 侧按 (agent, day, visitor) 唯一索引去重。
 *
 * 渲染 null、逻辑全在 useEffect：不读 useSearchParams，避免整棵 layout 退化成动态渲染。
 */
export function RefPassthrough({ appUrl }: RefPassthroughProps) {
  useEffect(() => {
    const urlCode = normalizeRefCode(
      new URLSearchParams(window.location.search).get(REF_QUERY_PARAM),
    );
    const cookieCode = readRefCookie(document.cookie);

    // 首触优先：已经有归因 cookie 就不被后来的推广码覆盖
    if (urlCode && !cookieCode) {
      // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API 是异步的且 Safari 不支持，这里只写一条中转 cookie
      document.cookie = buildRefCookie(urlCode, {
        secure: window.location.protocol === 'https:',
      });
    }

    // 仅 URL 带 ref 时上报，点击量口径即「带 ref 打开页面的独立访客·天」
    if (urlCode) {
      reportRefClick(appUrl, urlCode);
    }

    const code = urlCode ?? cookieCode;
    if (!code) {
      return;
    }

    const handleClick = createRefLinkHandler(appUrl, code);
    // capture 阶段监听，避免中途有人 stopPropagation 就漏掉
    document.addEventListener('click', handleClick, true);
    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [appUrl]);

  return null;
}

/**
 * 点击委托处理器：点中指向 app 的 `<a>` 时补上 ref 参数。
 * 只改写跨域到 app 的链接，next/link 的站内客户端导航不受影响。
 */
function createRefLinkHandler(appUrl: string, code: string) {
  return function handleClick(event: MouseEvent) {
    if (event.defaultPrevented || !(event.target instanceof Element)) {
      return;
    }
    const anchor = event.target.closest('a');
    if (!anchor) {
      return;
    }
    // 直接改 href 而不是 preventDefault + location.assign：
    // 浏览器在事件派发结束后才按当前 href 导航，新标签页 / 中键打开也一并生效。
    const next = appendRefToAppLink(anchor.href, appUrl, code);
    if (next) {
      anchor.href = next;
    }
  };
}

/** 跨域上报：no-cors + text/plain body 免 preflight，响应恒为 204 且不需要读取。 */
function reportRefClick(appUrl: string, code: string): void {
  // 按 code 区分，防止同一会话内翻页重复上报
  const flag = `tm_ref_click:${code}`;
  try {
    if (sessionStorage.getItem(flag)) {
      return;
    }
    sessionStorage.setItem(flag, '1');
  } catch {
    // 隐私模式下 sessionStorage 不可用，放弃上报好过每页重发
    return;
  }

  void fetch(`${appUrl}/api/public/ref-click`, {
    method: 'POST',
    mode: 'no-cors',
    keepalive: true,
    headers: { 'content-type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify({ code, source: 'website' }),
  }).catch(() => undefined);
}
