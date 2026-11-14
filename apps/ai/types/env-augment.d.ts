/** Wrangler 无法从配置推导远程 secret，仅补充密钥名称，不手写 binding 类型。 */
interface AiWorkerEnv {
  OPENAI_API_KEY: string;
  /** Free 套餐菜单导入用的小米 MiMo key（wrangler secret put MIMO_API_KEY），可能未配置 */
  MIMO_API_KEY?: string;
}
