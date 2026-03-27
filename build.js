import { build } from 'esbuild';
import { cpSync, mkdirSync, readFileSync, rmSync } from 'fs';
import { execSync } from 'child_process';

const DIST = 'dist';
const OUT = 'alfred-linkwarden.alfredworkflow';
const plist = readFileSync('info.plist', 'utf-8');
const version = plist.match(/<key>version<\/key>\s*<string>([^<]+)<\/string>/)?.[1];
const ZIP = `alfred-linkwarden-v${version}.zip`;

rmSync(DIST, { recursive: true, force: true });
rmSync(OUT, { force: true });
mkdirSync(DIST);

await build({
  entryPoints: ['src/index.ts', 'src/save.ts', 'src/do-save.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: DIST,
});

cpSync('info.plist', `${DIST}/info.plist`);
cpSync('icon.png', `${DIST}/icon.png`);
cpSync('node_modules/run-node/run-node', `${DIST}/run-node`);

execSync(`cd ${DIST} && zip -r ../${OUT} .`, { stdio: 'inherit' });
execSync(`zip ${ZIP} ${OUT}`, { stdio: 'inherit' });

console.log(`Built ${OUT}`);
console.log(`Packaged ${ZIP}`);
