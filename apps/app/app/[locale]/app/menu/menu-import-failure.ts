export type MenuImportFailureKey =
  | 'importServiceUnavailable'
  | 'importRateLimited'
  | 'importPdfNoText'
  | 'importUnexpectedFailure';

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
  return 'importUnexpectedFailure';
}
