import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRepoFixture } from './helpers/repo-fixture.mjs';

const validateApi = await import('../scripts/lib/validate.mjs').catch(() => ({}));
const manifestApi = await import('../scripts/lib/manifest.mjs').catch(() => ({}));

test('verifyPlan rejects target drift and unresolved decisions', async (t) => {
  assert.equal(typeof validateApi.verifyPlan, 'function');
  const fixture = await createRepoFixture({ files: { 'AGENTS.md': 'before\n' } });
  t.after(() => fixture.cleanup());
  const before = await manifestApi.hashManagedTarget(fixture.root, 'AGENTS.md');
  const repository_before = await (await import('../scripts/lib/filesystem.mjs')).captureRepositoryState(fixture.root);
  const plan = { schema_version: 'ai-project-bootstrap.plan.v1', repository_before, decisions: [{ id: 'x', state: 'deferred' }], actions: [{ action: 'update-managed-section', target_path: 'AGENTS.md', before_sha256: before, after_sha256: 'next', depends_on: ['x'], reason_evidence: ['e'], rollback: 'restore' }] };
  plan.plan_hash = (await import('../scripts/lib/plan.mjs')).hashPlan(plan);
  await fixture.write('AGENTS.md', 'changed\n');
  const result = await validateApi.verifyPlan({ repo: fixture.root, plan });
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /before_sha256|decision/i);
});

test('verifyPlan rejects a plan without a complete repository snapshot', async (t) => {
  const fixture = await createRepoFixture({ files: { 'README.md': '# x\n' } });
  t.after(() => fixture.cleanup());
  const plan = { schema_version: 'ai-project-bootstrap.plan.v1', decisions: [], actions: [] };
  plan.plan_hash = (await import('../scripts/lib/plan.mjs')).hashPlan(plan);
  const result = await validateApi.verifyPlan({ repo: fixture.root, plan });
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /complete repository snapshot/i);
});

test('verification rejects stale plan hashes and path or symlink escapes before reading them', async (t) => {
  const fixture = await createRepoFixture({ files: { 'README.md': '# x\n' } });
  const outside = await createRepoFixture({ files: { 'secret': 'outside\n' } });
  t.after(() => fixture.cleanup()); t.after(() => outside.cleanup());
  await (await import('node:fs/promises')).symlink(outside.root, new URL(`file://${fixture.root}/escape`).pathname);
  for (const target_path of ['../secret', 'escape/secret']) {
    const plan = { schema_version: 'ai-project-bootstrap.plan.v1', plan_hash: 'stale', decisions: [], repository_before: { complete: true, entries: {} }, actions: [{ action: 'create', target_path, before_sha256: null, after_sha256: 'x', depends_on: [], reason_evidence: ['e'], rollback: 'remove' }] };
    const result = await validateApi.verifyPlan({ repo: fixture.root, plan });
    assert.equal(result.ok, false);
    assert.match(result.errors.join('\n'), /plan_hash|escape|outside|relative/i);
  }
});

test('verifyApplied checks expected hashes and declared repository scope', async (t) => {
  assert.equal(typeof validateApi.verifyApplied, 'function');
  const fixture = await createRepoFixture({ files: { 'AGENTS.md': 'after\n', 'README.md': 'same\n' } });
  t.after(() => fixture.cleanup());
  const after = await manifestApi.hashManagedTarget(fixture.root, 'AGENTS.md');
  const entries = (await (await import('../scripts/lib/filesystem.mjs')).captureRepositoryState(fixture.root)).entries;
  const plan = { schema_version: 'ai-project-bootstrap.plan.v1', decisions: [], repository_before: { complete: true, entries }, actions: [{ action: 'update-managed-section', target_path: 'AGENTS.md', before_sha256: 'old', after_sha256: after, depends_on: [], reason_evidence: ['e'], rollback: 'restore' }] };
  plan.plan_hash = (await import('../scripts/lib/plan.mjs')).hashPlan(plan);
  assert.equal((await validateApi.verifyApplied({ repo: fixture.root, plan })).ok, true);
  await fixture.write('README.md', 'unexpected\n');
  assert.equal((await validateApi.verifyApplied({ repo: fixture.root, plan })).ok, false);
  await fixture.write('unplanned.md', 'unexpected addition\n');
  assert.equal((await validateApi.verifyApplied({ repo: fixture.root, plan })).ok, false);
});

test('governance validation reports missing core files and duplicate authority', async (t) => {
  assert.equal(typeof validateApi.validateGovernance, 'function');
  const fixture = await createRepoFixture({ files: { 'AGENTS.md': '# entry\n', 'docs/agent/README.md': '# Registry\n| test | a.md |\n| test | b.md |\n' } });
  t.after(() => fixture.cleanup());
  const result = await validateApi.validateGovernance({ repo: fixture.root, manifest: { schema_version: 'ai-project-bootstrap.manifest.v1', quality_commands: [] } });
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /project-rules|manifest|duplicate authority|quality command/i);
});

test('governance validation rejects broken registry paths, missing commands and empty optional docs', async (t) => {
  const fixture = await createRepoFixture({ files: {
    'AGENTS.md': '# entry\n',
    'docs/agent/project-rules.md': '# rules\n',
    'docs/agent/README.md': '# Registry\n| concern | authoritative path | scope | owner |\n| --- | --- | --- | --- |\n| testing | docs/agent/missing.md | repo | team |\n',
    'docs/agent/empty.md': '   \n',
    '.ai-project-bootstrap/manifest.yaml': '{"schema_version":"ai-project-bootstrap.manifest.v1"}\n',
    'package.json': '{"scripts":{"check":"tsc"}}\n',
  } });
  t.after(() => fixture.cleanup());
  const result = await validateApi.validateGovernance({ repo: fixture.root, manifest: {
    schema_version: 'ai-project-bootstrap.manifest.v1',
    quality_commands: ['npm run nonexistent'],
    optional_documents: ['docs/agent/empty.md'],
  } });
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /broken reference|quality command|empty optional/i);
});

test('governance validation rejects registry and optional-document escapes', async (t) => {
  const fixture = await createRepoFixture({ files: {
    'AGENTS.md': '# entry\n', 'docs/agent/project-rules.md': '# rules\n',
    'docs/agent/README.md': '# Registry\n| concern | authoritative path | scope | owner |\n| --- | --- | --- | --- |\n| unsafe | ../../../outside | repo | team |\n',
    '.ai-project-bootstrap/manifest.yaml': '{"schema_version":"ai-project-bootstrap.manifest.v1"}\n',
    'package.json': '{"scripts":{"check":"tsc"}}\n',
  } });
  t.after(() => fixture.cleanup());
  const result = await validateApi.validateGovernance({ repo: fixture.root, manifest: { schema_version: 'ai-project-bootstrap.manifest.v1', quality_commands: ['npm run check'], optional_documents: ['../outside'] } });
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /outside|escape|relative/i);
});

test('governance validation accepts declared scripts from a nested package', async (t) => {
  const fixture = await createRepoFixture({ files: {
    'AGENTS.md': '# agents\n',
    'docs/agent/README.md': '| concern | authoritative path | scope | owner |\n| --- | --- | --- | --- |\n| rules | docs/agent/project-rules.md | repo | team |\n',
    'docs/agent/project-rules.md': '# rules\n',
    '.ai-project-bootstrap/manifest.yaml': '{"schema_version":"ai-project-bootstrap.manifest.v1"}\n',
    'apps/web/package.json': JSON.stringify({ scripts: { test: 'vitest run', build: 'vite build' } }),
  } });
  t.after(() => fixture.cleanup());
  const result = await validateApi.validateGovernance({
    repo: fixture.root,
    manifest: {
      schema_version: 'ai-project-bootstrap.manifest.v1',
      quality_commands: ['npm --prefix apps/web run test', 'npm --prefix apps/web run build'],
    },
  });
  assert.deepEqual(result.errors, []);
});
