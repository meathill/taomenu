import { createDb, type Db } from '@taomenu/db';
import { getEnv } from '@/lib/cf';

export function getDb(): Db {
  return createDb(getEnv().DB);
}
