/** Wrangler 无法从配置推导远程 secret，仅补充密钥名称，不手写 binding 类型。 */
interface AiWorkerEnv {
  OPENAI_API_KEY: string;
}
