import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync } from 'fs';
import { execSync } from 'child_process';

const DIST = 'dist';
const OUT = 'alfred-linkwarden.alfredworkflow';

rmSync(DIST, { recursive: true, force: true });
rmSync(OUT, { force: true });
mkdirSync(DIST);

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: `${DIST}/index.js`,
});

cpSync('info.plist', `${DIST}/info.plist`);
cpSync('icon.png', `${DIST}/icon.png`);
cpSync('node_modules/.bin/run-node', `${DIST}/run-node`);

execSync(`cd ${DIST} && zip -r ../${OUT} .`, { stdio: 'inherit' });

console.log(`Built ${OUT}`);
