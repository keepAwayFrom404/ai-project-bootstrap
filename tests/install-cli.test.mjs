import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { createRepoFixture } from './helpers/repo-fixture.mjs';
import { captureRepositoryState } from '../scripts/lib/filesystem.mjs';
const script = new URL('../scripts/install.mjs', import.meta.url).pathname;
function run(args) { return spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024 }); }

test('CLI review and resolution preview bind the selected manual file to apply', async (t) => {
  const repo = await createRepoFixture({ files: { '.git/HEAD': 'ref: refs/heads/main' } }); t.after(() => repo.cleanup());
  let p = run(['preview', '--repo', repo.root]); assert.equal(p.status, 0, p.stderr);
  let plan = JSON.parse(p.stdout);
  const first = run(['apply', '--repo', repo.root, '--expected-plan-hash', plan.plan_hash]); assert.equal(first.status, 0, first.stderr);
  const target = join(repo.root, '.agents/skills/ai-project-bootstrap/SKILL.md');
  const source = await readFile(target, 'utf8'); await writeFile(target, source + '\nLocal customization\n');
  const before = await captureRepositoryState(repo.root);
  const review = run(['review', '--repo', repo.root, '--path', 'SKILL.md']); assert.equal(review.status, 0, review.stderr);
  assert.match(JSON.parse(review.stdout).local, /Local customization/);
  assert.deepEqual(await captureRepositoryState(repo.root), before);
  await repo.write('candidate.md', source + '\nReviewed combined customization\n');
  await repo.write('resolutions.json', JSON.stringify({ 'SKILL.md': { action: 'merged-file', file: 'candidate.md' } }));
  const options = ['--repo', repo.root, '--resolutions', join(repo.root, 'resolutions.json')];
  p = run(['preview', ...options]); assert.equal(p.status, 0, p.stderr); plan = JSON.parse(p.stdout);
  assert.equal(plan.conflicts.length, 0);
  const result = run(['apply', ...options, '--expected-plan-hash', plan.plan_hash]); assert.equal(result.status, 0, result.stderr);
  assert.match(await readFile(target, 'utf8'), /Reviewed combined customization/);
});

test('CLI rejects missing resolutions, unknown flags and duplicate directory flags without project writes', async (t) => {
  const repo = await createRepoFixture({ files: { '.git/HEAD': 'ref: refs/heads/main' } }); t.after(() => repo.cleanup());
  await repo.write('invalid-resolutions.json', 'null');
  const before = await captureRepositoryState(repo.root);
  for (const args of [
    ['preview', '--repo', repo.root, '--resolutions', join(repo.root, 'invalid-resolutions.json')],
    ['preview', '--repo', repo.root, '--resolutions', join(repo.root, 'missing.json')],
    ['preview', '--repo', repo.root, '--unknown', 'value'],
    ['preview', '--repo', repo.root, '--repo', repo.root],
    ['review', '--repo', repo.root],
  ]) assert.equal(run(args).status, 2);
  assert.deepEqual(await captureRepositoryState(repo.root), before);
});
