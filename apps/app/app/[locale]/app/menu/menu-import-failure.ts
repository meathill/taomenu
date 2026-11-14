export type MenuImportFailureKey =
  | 'importServiceUnavailable'
  | 'importRateLimited'
  | 'importPdfNoText'
  | 'importUnexpectedFailure';

const SERVICE_UNAVAILABLE = new Set([
  'OPENAI_HTTP_401',
  'OPENAI_HTTP_403',
  'MIMO_HTTP_401',
  'MIMO_HTTP_403',
  // Free 导入的 MiMo key 尚未配置（issue #25）
  'MIMO_NOT_CONFIGURED',
]);

export function getMenuImportFailureKey(errorCode: string | null): MenuImportFailureKey {
  if (errorCode && SERVICE_UNAVAILABLE.has(errorCode)) return 'importServiceUnavailable';
  if (errorCode === 'OPENAI_HTTP_429' || errorCode === 'MIMO_HTTP_429') return 'importRateLimited';
  // 纯扫描 PDF 没有文字可提取：提示改传照片
  if (errorCode === 'MIMO_PDF_NO_TEXT') return 'importPdfNoText';
  return 'importUnexpectedFailure';
}
