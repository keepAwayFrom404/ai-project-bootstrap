import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRepoFixture } from './helpers/repo-fixture.mjs';

const manifestApi = await import('../scripts/lib/manifest.mjs').catch(() => ({}));
const planApi = await import('../scripts/lib/plan.mjs').catch(() => ({}));

test('manifest serialization is stable and manual edits become manual-drift', async (t) => {
  assert.equal(typeof manifestApi.serializeManifest, 'function');
  const fixture = await createRepoFixture({ files: { 'AGENTS.md': 'managed\n' } });
  t.after(() => fixture.cleanup());
  const currentHash = await manifestApi.hashManagedTarget(fixture.root, 'AGENTS.md');
  const manifest = { schema_version: 'ai-project-bootstrap.manifest.v1', managed_targets: { 'AGENTS.md': { sha256: 'old' } } };
  assert.equal(manifestApi.classifyManagedTarget({ manifest, currentHash, target: 'AGENTS.md' }), 'manual-drift');
  assert.equal(manifestApi.serializeManifest({ b: 2, a: 1 }), '{\n  "a": 1,\n  "b": 2\n}\n');
});

test('plans omit deferred dependencies, reject unknown actions, and hash deterministically', () => {
  assert.equal(typeof planApi.createChangePlan, 'function');
  const actions = [
    { action: 'create', target_path: 'docs/agent/README.md', reason_evidence: ['x'], depends_on: [], before_sha256: null, after_sha256: 'a', rollback: 'remove' },
    { action: 'update-managed-section', target_path: 'AGENTS.md', reason_evidence: ['y'], depends_on: ['authority-api'], before_sha256: 'b', after_sha256: 'c', rollback: 'restore' },
  ];
  const plan = planApi.createChangePlan({ evidence: { schema_version: 'ai-project-bootstrap.evidence.v1' }, manifest: null, decisions: [{ id: 'authority-api', state: 'deferred' }], actions });
  assert.deepEqual(plan.actions.map(({ target_path }) => target_path), ['docs/agent/README.md']);
  assert.equal(planApi.hashPlan(plan), plan.plan_hash);
  const invalid = structuredClone(plan);
  invalid.actions[0].action = 'apply';
  assert.ok(planApi.validatePlanShape(invalid).some((error) => /action/i.test(error)));
  invalid.actions[0].action = 'create';
  invalid.plan_hash = 'stale';
  assert.ok(planApi.validatePlanShape(invalid).some((error) => /plan_hash/i.test(error)));
});

test('conflicts with one explicit authority key form one stable decision group', () => {
  const groups = planApi.groupConflicts([
    { decision_key: 'authority-api', source_path: 'AGENTS.md', value: 'npm test' },
    { decision_key: 'authority-api', source_path: 'docs/engineering.md', value: 'make verify' },
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].id, 'authority-api');
  assert.equal(groups[0].evidence.length, 2);
});

test('core skeleton planning preserves existing authorities and skips empty optional documents', () => {
  assert.equal(typeof planApi.planGovernanceSkeleton, 'function');
  const actions = planApi.planGovernanceSkeleton({
    existingPaths: ['AGENTS.md', 'docs/agent/project-rules.md'],
    optionalDocuments: [{ path: 'docs/agent/testing.md', content: '   ' }, { path: 'docs/agent/security.md', content: '# Security\nReal rules\n' }],
  });
  assert.deepEqual(actions.map(({ target_path }) => target_path), [
    '.ai-project-bootstrap/manifest.yaml',
    'docs/agent/README.md',
    'docs/agent/security.md',
  ]);
  assert.ok(!actions.some(({ target_path }) => target_path === 'docs/agent/project-rules.md'));
});
