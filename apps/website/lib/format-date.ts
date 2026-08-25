import dayjs from 'dayjs';

export function formatDate(value: string): string {
  const parsed = dayjs(value);
  if (!parsed.isValid()) {
    return value;
  }
  return parsed.format('MMM D, YYYY');
}
