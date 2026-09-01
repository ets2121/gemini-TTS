/**
 * scripts/copy-static.mjs
 *
 * Copies public/ and .next/static into .next/standalone after `next build`.
 * Required because Next.js standalone output does NOT include these automatically.
 *
 * Run after: npm run build
 * Used by:   npm run electron:dev  and  scripts/build-electron.ps1
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const standalone = path.join(root, '.next', 'standalone');

if (!fs.existsSync(standalone)) {
  console.error('❌  .next/standalone not found. Run `npm run build` first.');
  process.exit(1);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`⚠️  Source not found, skipping: ${src}`);
    return;
  }
  fs.cpSync(src, dest, { recursive: true, force: true });
  console.log(`✅  Copied: ${path.relative(root, src)} → ${path.relative(root, dest)}`);
}

// Copy public/ → .next/standalone/public/
copyDir(path.join(root, 'public'), path.join(standalone, 'public'));

// Copy .next/static/ → .next/standalone/.next/static/
copyDir(path.join(root, '.next', 'static'), path.join(standalone, '.next', 'static'));

console.log('\n🎉  Static assets copied into standalone output.\n');
