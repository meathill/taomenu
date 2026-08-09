import { describe, expect, it } from 'vitest';
import { getMenuImportFailureKey } from './menu-import-failure';

describe('getMenuImportFailureKey', () => {
  it.each(['OPENAI_HTTP_401', 'OPENAI_HTTP_403'])(
    '把服务鉴权错误转换为普通用户可理解的提示：%s',
    (errorCode) => {
      expect(getMenuImportFailureKey(errorCode)).toBe('importServiceUnavailable');
    },
  );

  it('把限流错误转换为稍后重试提示', () => {
    expect(getMenuImportFailureKey('OPENAI_HTTP_429')).toBe('importRateLimited');
  });

  it('不向用户暴露其他内部错误码', () => {
    expect(getMenuImportFailureKey('OPENAI_INVALID_OUTPUT')).toBe('importUnexpectedFailure');
    expect(getMenuImportFailureKey(null)).toBe('importUnexpectedFailure');
  });
});
