import { describe, expect, it } from 'vitest';
import { getMenuImportFailureKey } from './menu-import-failure';

describe('getMenuImportFailureKey', () => {
  it.each(['OPENAI_HTTP_401', 'OPENAI_HTTP_403'])(
    '把服务鉴权错误转换为普通用户可理解的提示：%s',
    (errorCode) => {
      expect(getMenuImportFailureKey(errorCode)).toBe('importServiceUnavailable');
    },
  );

  it.each(['MIMO_NOT_CONFIGURED', 'MIMO_HTTP_401'])('MiMo 未配置或鉴权失败：%s', (errorCode) => {
    expect(getMenuImportFailureKey(errorCode)).toBe('importServiceUnavailable');
  });

  it('MiMo 限流与扫描版 PDF（issue #25）', () => {
    expect(getMenuImportFailureKey('MIMO_HTTP_429')).toBe('importRateLimited');
    expect(getMenuImportFailureKey('MIMO_PDF_NO_TEXT')).toBe('importPdfNoText');
  });

  it('把限流错误转换为稍后重试提示', () => {
    expect(getMenuImportFailureKey('OPENAI_HTTP_429')).toBe('importRateLimited');
  });

  it('不向用户暴露其他内部错误码', () => {
    expect(getMenuImportFailureKey('OPENAI_INVALID_OUTPUT')).toBe('importUnexpectedFailure');
    expect(getMenuImportFailureKey(null)).toBe('importUnexpectedFailure');
  });
});
