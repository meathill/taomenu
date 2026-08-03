#!/usr/bin/env node
/**
 * 将当前目录 wrangler.jsonc 的 vars 注入 process.env（不覆盖已有环境变量），
 * 再执行后续命令。用于 next / OpenNext build：NEXT_PUBLIC_* 必须在构建时进入 process.env。
 *
 * 用法（在 apps/app 或 apps/website 下）：
 *   node ../../scripts/run-with-wrangler-vars.mjs next build
 *   node ../../scripts/run-with-wrangler-vars.mjs opennextjs-cloudflare build
 */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadWranglerVars(wranglerPath) {
  let text = readFileSync(wranglerPath, 'utf8');
  // 去掉 // 行注释（vars 区够用；不处理字符串内的 //）
  text = text.replace(/^\s*\/\/.*$/gm, '');
  // 去掉尾逗号
  text = text.replace(/,(\s*[}\]])/g, '$1');
  const config = JSON.parse(text);
  return config.vars && typeof config.vars === 'object' ? config.vars : {};
}

const wranglerPath = resolve(process.cwd(), 'wrangler.jsonc');
const vars = loadWranglerVars(wranglerPath);
const env = { ...process.env };

for (const [key, value] of Object.entries(vars)) {
  if (env[key] === undefined || env[key] === '') {
    env[key] = String(value);
  }
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('用法: run-with-wrangler-vars.mjs <command> [args...]');
  process.exit(1);
}

const [command, ...commandArgs] = args;
const child = spawn(command, commandArgs, {
  stdio: 'inherit',
  env,
  cwd: process.cwd(),
  // Windows 上解析 .cmd；Unix 依赖 pnpm 注入的 PATH
  shell: process.platform === 'win32',
});

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
