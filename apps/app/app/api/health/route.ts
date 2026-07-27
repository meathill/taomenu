import { APP_NAME } from '@taomenu/shared';

export function GET() {
  return Response.json({
    ok: true,
    service: 'taomenu-app',
    name: APP_NAME,
  });
}
