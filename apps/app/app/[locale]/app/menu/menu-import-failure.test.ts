import { describe, expect, it } from 'vitest';
import {
  getMenuImportFailureKey,
  getMenuImportUploadErrorKey,
  isRetryableMenuImportFailure,
} from './menu-import-failure';

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

  it('自动作废的旧版语言不一致草稿只能重新上传（issue #29）', () => {
    expect(getMenuImportFailureKey('LOCALE_MISMATCH')).toBe('importLegacyMismatchRetired');
    expect(isRetryableMenuImportFailure('LOCALE_MISMATCH')).toBe(false);
    expect(isRetryableMenuImportFailure('MIMO_HTTP_429')).toBe(true);
  });

  it('上传错误码映射到文案', () => {
    expect(getMenuImportUploadErrorKey('TOO_LARGE')).toBe('importTooLarge');
    expect(getMenuImportUploadErrorKey('EMPTY')).toBe('importInvalidFile');
    expect(getMenuImportUploadErrorKey('MONTHLY_LIMIT_REACHED')).toBe('importMonthlyLimitReached');
    expect(getMenuImportUploadErrorKey(undefined)).toBe('importUploadFailed');
  });
});
