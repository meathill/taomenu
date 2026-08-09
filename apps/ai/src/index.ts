import {
  createDb,
  failMenuImport,
  getMenuImportJob,
  markMenuImportProcessing,
  saveMenuImportResult,
} from '@taomenu/db';
import { createOpenAiMenuProvider } from './openai-menu-provider';

type MenuImportQueueMessage = { importId: string };

function errorCode(error: unknown): string {
  if (!(error instanceof Error)) return 'AI_UNKNOWN_ERROR';
  if (error.message.startsWith('OPENAI_HTTP_')) return error.message;
  if (error.message.startsWith('OPENAI_')) return error.message.split(':')[0] ?? 'OPENAI_ERROR';
  return 'AI_PROCESSING_FAILED';
}

async function processMenuImport(env: AiWorkerEnv, importId: string) {
  const db = createDb(env.DB);
  const claimed = await markMenuImportProcessing(db, importId);
  if (!claimed) return;
  try {
    const job = await getMenuImportJob(db, importId);
    if (!job || job.assets.length === 0) throw new Error('IMPORT_ASSET_MISSING');
    const assets = await Promise.all(
      job.assets.map(async (asset) => {
        const object = await env.MEDIA.get(asset.r2Key);
        if (!object) throw new Error('IMPORT_ASSET_MISSING');
        return { mimeType: asset.mimeType, bytes: new Uint8Array(await object.arrayBuffer()) };
      }),
    );
    const provider = createOpenAiMenuProvider({
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_MENU_MODEL,
    });
    const result = await provider.extractMenu({
      assets,
      expectedLocale: job.menuImport.sourceLocale,
    });
    await saveMenuImportResult(db, importId, result.output, result.usage);
    await Promise.all(
      job.assets.map((asset) =>
        env.MEDIA.delete(asset.r2Key).catch((error) => {
          console.warn(
            JSON.stringify({ event: 'menu_import_source_cleanup_failed', importId, error }),
          );
        }),
      ),
    );
  } catch (error) {
    console.error(
      JSON.stringify({ event: 'menu_import_failed', importId, code: errorCode(error) }),
    );
    await failMenuImport(db, importId, errorCode(error));
  }
}

export default {
  async fetch() {
    return new Response('Not found', { status: 404 });
  },
  async queue(batch, env) {
    for (const message of batch.messages) {
      const body = message.body;
      if (!body || typeof body.importId !== 'string') {
        message.ack();
        continue;
      }
      await processMenuImport(env, body.importId);
      message.ack();
    }
  },
} satisfies ExportedHandler<AiWorkerEnv, MenuImportQueueMessage>;
