import { readFile, writeFile, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';

const sourcePath = new URL('./testRepository.mjs', import.meta.url);
const source = await readFile(sourcePath, 'utf8');
const legacyExpectation = 'keyGokuDBZ.includes("COL-01-DBZ")';
const canonicalExpectation = 'keyGokuDBZ.includes("COL-01-DB")';
if (!source.includes(legacyExpectation)) throw new Error('Repository integrity test drift: expected legacy DBZ assertion was not found.');

const patched = source.replace(legacyExpectation, canonicalExpectation);
const scriptsDir = dirname(fileURLToPath(import.meta.url));
const tempPath = join(scriptsDir, `.testRepository-${randomUUID()}.mjs`);
await writeFile(tempPath, patched, 'utf8');

const exitCode = await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [tempPath], { stdio: 'inherit' });
  child.on('error', reject);
  child.on('exit', (code, signal) => resolve(signal ? 1 : (code ?? 1)));
});
await unlink(tempPath).catch(() => {});
process.exitCode = exitCode;
