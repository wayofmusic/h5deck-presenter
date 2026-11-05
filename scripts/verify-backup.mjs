import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

const root=fileURLToPath(new URL('../',import.meta.url));
const source=path.join(root,'双屏演讲系统-Codex开发交接包');
const version=fs.readFileSync(path.join(root,'VERSION'),'utf8').trim();
const pkg=JSON.parse(fs.readFileSync(path.join(source,'package.json'),'utf8'));
const lock=JSON.parse(fs.readFileSync(path.join(source,'package-lock.json'),'utf8'));
assert.equal(pkg.version,version,'VERSION and application package version differ');
assert.equal(lock.version,version,'Lockfile version differs');
assert.equal(lock.packages[''].version,version,'Lockfile root package version differs');
const manifest=JSON.parse(fs.readFileSync(path.join(source,'SOURCE-MANIFEST.json'),'utf8'));
for(const [relative,expected]of Object.entries(manifest)) {
  const content=fs.readFileSync(path.join(source,relative));
  assert.equal(content.length,expected.bytes,`Baseline size changed: ${relative}`);
  assert.equal(crypto.createHash('sha256').update(content).digest('hex'),expected.sha256,`Baseline hash changed: ${relative}`);
}
const tracked=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
const blocked=tracked.filter(file=>file.split('/').some(part=>['node_modules','runtime','dist','.runtime','data','.delivery','.playwright-cli','__pycache__'].includes(part))||/\.(zip|pem|key|pfx|p12)$/i.test(file)||/(^|\/)\.env($|\.(?!example$))/.test(file));
assert.deepEqual(blocked,[],'Excluded machine data or delivery archives entered Git');
console.log(`Backup verified: v${version}; ${Object.keys(manifest).length} baseline hashes match; ${tracked.length} tracked files checked.`);

