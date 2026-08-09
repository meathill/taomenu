export type MenuImportFailureKey =
  | 'importServiceUnavailable'
  | 'importRateLimited'
  | 'importUnexpectedFailure';

export function getMenuImportFailureKey(errorCode: string | null): MenuImportFailureKey {
  if (errorCode === 'OPENAI_HTTP_401' || errorCode === 'OPENAI_HTTP_403') {
    return 'importServiceUnavailable';
  }
  if (errorCode === 'OPENAI_HTTP_429') return 'importRateLimited';
  return 'importUnexpectedFailure';
}
