import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { createRepoFixture } from './helpers/repo-fixture.mjs';
import { createInstallPlan, applyInstallPlan } from '../scripts/install.mjs';

test('compiled public CLI and installed runtime work without TypeScript or npm dependencies', async (t) => {
  const repo = await createRepoFixture({ files: { '.git/HEAD': 'ref: refs/heads/main', 'src/example.py': 'print("fixture")' } });
  t.after(() => repo.cleanup());
  const { plan } = await createInstallPlan(repo.root);
  assert.ok(plan.actions.every(({ path }) => !path.startsWith('src/') && !path.startsWith('node_modules/') && !path.endsWith('.mts')));
  await applyInstallPlan(repo.root, plan.plan_hash);
  const entry = join(repo.root, '.agents/skills/ai-project-bootstrap/scripts/bootstrap.mjs');
  const result = spawnSync(process.execPath, [entry, 'analyze', '--repo', repo.root, '--out', join(repo.root, 'evidence.json')], {
    env: { PATH: dirname(process.execPath) }, encoding: 'utf8', timeout: 10000, maxBuffer: 2 * 1024 * 1024,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).schema_version, 'ai-project-bootstrap.evidence.v1');
});
