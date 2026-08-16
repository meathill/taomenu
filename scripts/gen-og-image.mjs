// 一次性工具：根据品牌 SVG 生成默认 OG 图（1200×630 PNG）。
// 用法：node scripts/gen-og-image.mjs
// 产物：apps/website/public/brand/og-default.png（入库，平台抓取与本地一致）

import { mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// pnpm 未把 sharp 提升到仓库根，直接指向 .pnpm 中的实现（本脚本为一次性工具）
const require = createRequire(path.join(process.cwd(), 'package.json'));
const sharp = require(
  path.join(process.cwd(), 'node_modules/.pnpm/sharp@0.35.2/node_modules/sharp/dist/index.cjs'),
);

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(rootDir, 'apps/website/public/brand/og-default.png');

// taomenu-mark.svg 内嵌（512×512 viewBox），缩放到 300×300 放在左侧
const mark = `
  <g transform="translate(72,165) scale(0.586)">
    <rect width="512" height="512" fill="#FFF9F2"/>
    <path fill="#B3262D" d="M82 56h340c24 0 42 18 42 42v252c0 17-6 31-18 43l-55 55c-12 12-26 18-43 18H82c-24 0-42-18-42-42V98c0-24 18-42 42-42Z"/>
    <path fill="#FFF9F2" d="M92 82h320c14 0 26 12 26 26v235l-71 71H92c-14 0-26-12-26-26V108c0-14 12-26 26-26Z"/>
    <path fill="#2E6F5E" d="M374 414h48c20 0 36-16 36-36v-48l-84 84Z"/>
    <g fill="#B3262D">
      <rect x="106" y="110" width="96" height="96" rx="12"/><rect x="310" y="110" width="96" height="96" rx="12"/><rect x="106" y="314" width="96" height="96" rx="12"/>
    </g>
    <g fill="#FFF9F2">
      <rect x="122" y="126" width="64" height="64" rx="8"/><rect x="326" y="126" width="64" height="64" rx="8"/><rect x="122" y="330" width="64" height="64" rx="8"/>
    </g>
    <g fill="#B3262D">
      <rect x="142" y="146" width="24" height="24" rx="4"/><rect x="346" y="146" width="24" height="24" rx="4"/><rect x="142" y="350" width="24" height="24" rx="4"/>
    </g>
    <g fill="#B3262D">
      <rect x="222" y="112" width="24" height="24" rx="4"/><rect x="254" y="112" width="18" height="18" rx="3"/><rect x="280" y="116" width="24" height="24" rx="4"/><rect x="220" y="154" width="28" height="20" rx="4"/><rect x="264" y="150" width="20" height="28" rx="4"/><rect x="292" y="158" width="18" height="18" rx="3"/>
      <rect x="112" y="224" width="26" height="24" rx="4"/><rect x="146" y="234" width="20" height="18" rx="3"/><rect x="176" y="218" width="22" height="30" rx="4"/><rect x="314" y="220" width="24" height="22" rx="4"/><rect x="346" y="236" width="18" height="18" rx="3"/><rect x="376" y="216" width="24" height="28" rx="4"/>
      <rect x="112" y="270" width="18" height="18" rx="3"/><rect x="146" y="280" width="30" height="22" rx="4"/><rect x="336" y="278" width="26" height="22" rx="4"/><rect x="372" y="270" width="20" height="18" rx="3"/>
      <rect x="220" y="344" width="24" height="24" rx="4"/><rect x="252" y="352" width="18" height="18" rx="3"/><rect x="280" y="340" width="26" height="26" rx="4"/><rect x="216" y="382" width="20" height="18" rx="3"/><rect x="248" y="382" width="26" height="22" rx="4"/><rect x="286" y="378" width="18" height="18" rx="3"/><rect x="320" y="350" width="24" height="24" rx="4"/><rect x="354" y="374" width="20" height="20" rx="3"/>
    </g>
    <path fill="#2E6F5E" d="M194 238h124c-4 36-27 62-62 71-35-9-58-35-62-71Z"/><path fill="#2E6F5E" d="M240 304h32v13h-32z"/>
    <g fill="none" stroke="#2E6F5E" stroke-linecap="round" stroke-width="10"><path d="M226 224c-10-16-6-29 6-42 9-10 8-22 0-31"/><path d="M270 224c-10-16-6-29 6-42 9-10 8-22 0-31"/></g>
  </g>
`;

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#FFF9F2"/>
  <rect x="0" y="0" width="1200" height="12" fill="#B3262D"/>
  <rect x="0" y="618" width="1200" height="12" fill="#2E6F5E"/>
  ${mark}
  <text x="432" y="330" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="96" font-weight="700" fill="#211A18">TaoMenu</text>
  <text x="436" y="400" font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="40" font-weight="400" fill="#5C524E">QR ordering for small restaurants</text>
</svg>`;

mkdirSync(path.dirname(outputPath), { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(outputPath);
console.log(`written: ${outputPath}`);
