import { APP_NAME } from '@taomenu/shared';

export function buildCustomerMetadataTitle(pageLabel: string, storeName: string): string {
  return `${pageLabel} · ${storeName}`;
}

export function buildCustomerDocumentTitle(pageLabel: string, storeName: string): string {
  return `${buildCustomerMetadataTitle(pageLabel, storeName)} · ${APP_NAME}`;
}
