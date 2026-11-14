import {
  createDb,
  failMenuImageEnhancement,
  failMenuImport,
  failMenuTranslation,
  getMenuImageEnhancementJob,
  getMenuImportJob,
  getMenuTranslationJob,
  markMenuImageEnhancementProcessing,
  markMenuImportProcessing,
  markMenuTranslationProcessing,
  resolveMenuImportTargetLocale,
  saveMenuImageEnhancementResult,
  saveMenuImportResult,
  saveMenuTranslationResult,
} from '@taomenu/db';
import { translateImportOutput } from './import-translation';
import { createMimoMenuProvider } from './mimo-menu-provider';
import { createOpenAiImageProvider } from './openai-image-provider';

type AiQueueMessage =
  | { type?: 'menu_import'; importId: string }
  | { type: 'menu_translation'; translationId: string }
  | { type: 'menu_image_enhancement'; enhancementId: string };

function errorCode(error: unknown): string {
  if (!(error instanceof Error)) return 'AI_UNKNOWN_ERROR';
  if (error.message.startsWith('OPENAI_HTTP_')) return error.message;
  if (error.message.startsWith('OPENAI_')) return error.message.split(':')[0] ?? 'OPENAI_ERROR';
  if (error.message.startsWith('MIMO_')) return error.message.split(':')[0] ?? 'MIMO_ERROR';
  return 'AI_PROCESSING_FAILED';
}

function createMimoProvider(env: AiWorkerEnv) {
  // 密钥只来自 Worker secret；没配置时给出明确错误码，前端显示“暂不可用”
  if (!env.MIMO_API_KEY) throw new Error('MIMO_NOT_CONFIGURED');
  return createMimoMenuProvider({
    apiKey: env.MIMO_API_KEY,
    model: env.MIMO_MENU_MODEL,
    baseUrl: env.MIMO_BASE_URL,
    async pdfToText(bytes) {
      const result = await env.AI.toMarkdown({
        name: 'menu.pdf',
        blob: new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }),
      });
      return result.format === 'error' ? '' : (result.data ?? '');
    },
  });
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
    // 所有套餐的菜单识别都走 MiMo（issue #28）；历史上记成 openai 的待处理任务也一并由 MiMo 处理
    const mimo = createMimoProvider(env);
    const extracted = await mimo.extractMenu({
      assets,
      expectedLocale: job.menuImport.sourceLocale,
      currency: job.storeCurrency,
    });
    const localeResolution = resolveMenuImportTargetLocale({
      baseLocale: job.storeBaseLocale,
      detectedLocale: extracted.output.detectedLocale,
      hasExistingCategories: job.hasExistingCategories,
    });
    if (localeResolution) {
      await saveMenuImportResult(db, importId, extracted.output, extracted.usage);
    } else {
      // 识别语言与已有菜单不同：先翻译成菜单语言，原文随建议一起保存（issue #29）
      const translated = await translateImportOutput(
        (input) => mimo.translateMenu(input),
        extracted.output,
        job.storeBaseLocale,
      );
      await saveMenuImportResult(
        db,
        importId,
        translated.output,
        { extract: extracted.usage, translate: translated.usage },
        { originalOutput: extracted.output },
      );
    }
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
    // AI 菜单翻译同样走 MiMo（issue #28）
    const result = await createMimoProvider(env).translateMenu({
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

async function processMenuImageEnhancement(env: AiWorkerEnv, enhancementId: string) {
  const db = createDb(env.DB);
  const claimed = await markMenuImageEnhancementProcessing(db, enhancementId);
  if (!claimed) return;
  let previewImageKey: string | null = null;
  try {
    const job = await getMenuImageEnhancementJob(db, enhancementId);
    if (!job) throw new Error('IMAGE_ENHANCEMENT_JOB_MISSING');
    const source = await env.MEDIA.get(job.sourceImageKey);
    if (!source) throw new Error('SOURCE_IMAGE_MISSING');
    // MiMo 没有图像生成/编辑模型，照片美化仍走 OpenAI（issue #28）
    const provider = createOpenAiImageProvider({
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_IMAGE_MODEL,
    });
    const result = await provider.enhanceDishPhoto({
      mimeType: source.httpMetadata?.contentType ?? 'image/jpeg',
      bytes: new Uint8Array(await source.arrayBuffer()),
    });
    previewImageKey = `menu-enhancements/${job.storeId}/${job.itemId}/${job.id}.jpeg`;
    await env.MEDIA.put(previewImageKey, result.bytes, {
      httpMetadata: { contentType: 'image/jpeg' },
      customMetadata: {
        storeId: job.storeId,
        itemId: job.itemId,
        sourceImageKey: job.sourceImageKey,
      },
    });
    await saveMenuImageEnhancementResult(db, enhancementId, previewImageKey, result.usage);
  } catch (error) {
    if (previewImageKey) await env.MEDIA.delete(previewImageKey).catch(() => undefined);
    const code = errorCode(error);
    console.error(JSON.stringify({ event: 'menu_image_enhancement_failed', enhancementId, code }));
    await failMenuImageEnhancement(db, enhancementId, code);
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
      if (body?.type === 'menu_image_enhancement' && typeof body.enhancementId === 'string') {
        await processMenuImageEnhancement(env, body.enhancementId);
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
