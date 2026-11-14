export type MenuImportFailureKey =
  | 'importServiceUnavailable'
  | 'importRateLimited'
  | 'importPdfNoText'
  | 'importLegacyMismatchRetired'
  | 'importUnexpectedFailure';

/** 自动作废的旧版语言不一致草稿（issue #29），源文件已删除，不能重试 */
const LEGACY_LOCALE_MISMATCH = 'LOCALE_MISMATCH';

export function isRetryableMenuImportFailure(errorCode: string | null): boolean {
  return errorCode !== LEGACY_LOCALE_MISMATCH;
}

const SERVICE_UNAVAILABLE = new Set([
  'MIMO_HTTP_401',
  'MIMO_HTTP_403',
  // taomenu-ai 的 MiMo key 尚未配置（issue #25 / #28）
  'MIMO_NOT_CONFIGURED',
]);

export function getMenuImportFailureKey(errorCode: string | null): MenuImportFailureKey {
  if (errorCode && SERVICE_UNAVAILABLE.has(errorCode)) return 'importServiceUnavailable';
  if (errorCode === 'MIMO_HTTP_429') return 'importRateLimited';
  // 纯扫描 PDF 没有文字可提取：提示改传照片
  if (errorCode === 'MIMO_PDF_NO_TEXT') return 'importPdfNoText';
  if (errorCode === LEGACY_LOCALE_MISMATCH) return 'importLegacyMismatchRetired';
  return 'importUnexpectedFailure';
}

export type MenuImportUploadErrorKey =
  | 'importTooLarge'
  | 'importUnsupported'
  | 'importInvalidFile'
  | 'importMonthlyLimitReached'
  | 'importUploadFailed';

/** 上传接口错误码 → 文案 key */
export function getMenuImportUploadErrorKey(code?: string): MenuImportUploadErrorKey {
  if (code === 'TOO_LARGE') return 'importTooLarge';
  if (code === 'UNSUPPORTED_TYPE') return 'importUnsupported';
  if (code === 'BAD_MAGIC' || code === 'EMPTY') return 'importInvalidFile';
  if (code === 'MONTHLY_LIMIT_REACHED') return 'importMonthlyLimitReached';
  return 'importUploadFailed';
}
