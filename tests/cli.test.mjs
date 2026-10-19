import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { createRepoFixture } from './helpers/repo-fixture.mjs';

const cli = new URL('../scripts/bootstrap.mjs', import.meta.url);
function run(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cli.pathname, ...args]);
    let stdout = ''; let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

test('analyze writes only its explicit in-repository output', async (t) => {
  const fixture = await createRepoFixture('new-minimal');
  t.after(() => fixture.cleanup());
  const output = join(fixture.root, 'evidence.json');
  const result = await run(['analyze', '--repo', fixture.root, '--out', output]);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(JSON.parse(await readFile(output, 'utf8')).schema_version, 'ai-project-bootstrap.evidence.v1');
});

test('unknown command and missing or escaping options are usage failures without writes', async (t) => {
  const fixture = await createRepoFixture('new-minimal');
  t.after(() => fixture.cleanup());
  assert.equal((await run(['apply', '--repo', fixture.root])).code, 2);
  assert.equal((await run(['analyze', '--repo', fixture.root])).code, 2);
  assert.equal((await run(['analyze', '--repo', fixture.root, '--out', join(fixture.root, '../escape.json')])).code, 1);
  await assert.rejects(access(join(fixture.root, 'escape.json')));
});
