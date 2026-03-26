import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const DIST = 'dist';
const OUT = 'alfred-linkwarden.alfredworkflow';

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST);

await build({
  entryPoints: ['index.js'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: `${DIST}/index.js`,
});

cpSync('info.plist', `${DIST}/info.plist`);
writeFileSync(`${DIST}/package.json`, JSON.stringify({ type: 'module' }));
cpSync('node_modules/.bin/run-node', `${DIST}/run-node`);

execSync(`cd ${DIST} && zip -r ../${OUT} .`, { stdio: 'inherit' });

console.log(`Built ${OUT}`);
