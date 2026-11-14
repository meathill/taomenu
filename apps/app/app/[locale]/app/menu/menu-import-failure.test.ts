import { describe, expect, it } from 'vitest';
import { getMenuImportFailureKey } from './menu-import-failure';

describe('getMenuImportFailureKey', () => {
  it.each(['MIMO_NOT_CONFIGURED', 'MIMO_HTTP_401', 'MIMO_HTTP_403'])(
    'MiMo 未配置或鉴权失败时显示「服务暂不可用」：%s',
    (errorCode) => {
      expect(getMenuImportFailureKey(errorCode)).toBe('importServiceUnavailable');
    },
  );

  it('MiMo 限流与扫描版 PDF（issue #25）', () => {
    expect(getMenuImportFailureKey('MIMO_HTTP_429')).toBe('importRateLimited');
    expect(getMenuImportFailureKey('MIMO_PDF_NO_TEXT')).toBe('importPdfNoText');
  });

  it('不向用户暴露其他内部错误码', () => {
    expect(getMenuImportFailureKey('MIMO_SCHEMA_MISMATCH')).toBe('importUnexpectedFailure');
    expect(getMenuImportFailureKey('AI_INVALID_OUTPUT')).toBe('importUnexpectedFailure');
    expect(getMenuImportFailureKey(null)).toBe('importUnexpectedFailure');
  });
});
