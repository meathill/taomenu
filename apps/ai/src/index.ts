import {
  createDb,
  failMenuImport,
  failMenuTranslation,
  getMenuImportJob,
  getMenuTranslationJob,
  markMenuImportProcessing,
  markMenuTranslationProcessing,
  saveMenuImportResult,
  saveMenuTranslationResult,
} from '@taomenu/db';
import { createOpenAiMenuProvider } from './openai-menu-provider';

type AiQueueMessage =
  | { type?: 'menu_import'; importId: string }
  | { type: 'menu_translation'; translationId: string };

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

async function processMenuTranslation(env: AiWorkerEnv, translationId: string) {
  const db = createDb(env.DB);
  const claimed = await markMenuTranslationProcessing(db, translationId);
  if (!claimed) return;
  try {
    const job = await getMenuTranslationJob(db, translationId);
    if (!job || job.entities.length === 0) throw new Error('TRANSLATION_INPUT_MISSING');
    const provider = createOpenAiMenuProvider({
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_MENU_MODEL,
    });
    const result = await provider.translateMenu({
      sourceLocale: job.job.sourceLocale,
      targetLocale: job.job.targetLocale,
      entities: job.entities,
    });
    await saveMenuTranslationResult(db, translationId, result.output, result.usage);
  } catch (error) {
    const code = errorCode(error);
    console.error(JSON.stringify({ event: 'menu_translation_failed', translationId, code }));
    await failMenuTranslation(db, translationId, code);
  }
}

export default {
  async fetch() {
    return new Response('Not found', { status: 404 });
  },
  async queue(batch, env) {
    for (const message of batch.messages) {
      const body = message.body;
      if (body?.type === 'menu_translation' && typeof body.translationId === 'string') {
        await processMenuTranslation(env, body.translationId);
        message.ack();
        continue;
      }
      if (!body || !('importId' in body) || typeof body.importId !== 'string') {
        message.ack();
        continue;
      }
      await processMenuImport(env, body.importId);
      message.ack();
    }
  },
} satisfies ExportedHandler<AiWorkerEnv, AiQueueMessage>;
