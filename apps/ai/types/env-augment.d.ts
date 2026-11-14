/** Wrangler 无法从配置推导远程 secret，仅补充密钥名称，不手写 binding 类型。 */
interface AiWorkerEnv {
  /** 只用于菜品照片美化（MiMo 没有图像生成模型） */
  OPENAI_API_KEY: string;
  /** 菜单导入与 AI 翻译用的小米 MiMo key（wrangler secret put MIMO_API_KEY），可能未配置 */
  MIMO_API_KEY?: string;
}
