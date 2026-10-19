import assert from 'node:assert/strict';
import { access, readFile, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';

// Missing exports are assertions, so the initial RED describes the absent contract.
const fixtureModule = await import('./helpers/repo-fixture.mjs').catch(() => ({}));
const evidenceModule = await import('./behavior/check-evidence.mjs').catch(() => ({}));

test('fixture helper provides an isolated writable repository and cleanup', async (t) => {
  assert.equal(typeof fixtureModule.createRepoFixture, 'function', 'createRepoFixture must exist');
  const fixture = await fixtureModule.createRepoFixture({ files: { 'AGENTS.md': 'Human rule\n' } });
  t.after(() => fixture.cleanup());
  const other = await fixtureModule.createRepoFixture('new-minimal');
  t.after(() => other.cleanup());
  assert.notEqual(fixture.root, other.root);
  assert.equal(await fixture.read('AGENTS.md'), 'Human rule\n');
  await fixture.write('nested/note.md', 'preview');
  assert.equal(await fixture.read('nested/note.md'), 'preview');
  await fixture.cleanup();
  await assert.rejects(access(fixture.root), { code: 'ENOENT' });
});

test('fixture rejects traversal, absolute paths and symlink escapes', async (t) => {
  assert.equal(typeof fixtureModule.createRepoFixture, 'function', 'createRepoFixture must exist');
  const fixture = await fixtureModule.createRepoFixture({ files: {} });
  const outside = await fixtureModule.createRepoFixture({ files: { 'secret.txt': 'outside' } });
  t.after(() => fixture.cleanup());
  t.after(() => outside.cleanup());
  await symlink(outside.root, join(fixture.root, 'escape'));
  for (const path of ['../outside', outside.root, 'escape/secret.txt', 'escape/new.txt']) {
    await assert.rejects(fixture.read(path), /escape|relative|outside/i);
    await assert.rejects(fixture.write(path, 'overwrite'), /escape|relative|outside/i);
  }
  assert.equal(await outside.read('secret.txt'), 'outside');
  await assert.rejects(fixtureModule.createRepoFixture({ files: { '../leak': 'bad' } }), /relative|escape/i);
});

test('all four fixture definitions reproduce independently with conflict evidence intact', async (t) => {
  assert.equal(typeof fixtureModule.createRepoFixture, 'function', 'createRepoFixture must exist');
  for (const name of ['new-minimal', 'node-workspace', 'legacy-conflicts', 'initialized-drift']) {
    const fixture = await fixtureModule.createRepoFixture(name);
    t.after(() => fixture.cleanup());
    assert.ok(await fixture.read('README.md'));
    if (name === 'node-workspace') assert.equal(JSON.parse(await fixture.read('package.json')).private, true);
    if (name === 'legacy-conflicts') assert.match(await fixture.read('AGENTS.md'), /Human-owned/);
    if (name === 'initialized-drift') assert.match(await fixture.read('AGENTS.md'), /bootstrap:begin/);
  }
});

function records() {
  const repositoryInput = { 'AGENTS.md': 'Human-owned: never rewrite manually maintained rules.\n' };
  return {
    before: { skillLoaded: false, repositoryInput, artifacts: { ...repositoryInput }, events: [] },
    after: {
      skillLoaded: true, repositoryInput, artifacts: { ...repositoryInput, 'docs/preview.md': 'approved' },
      events: [
        { type: 'evidence', facts: [{ path: 'AGENTS.md', observation: 'Human-owned rule present' }] },
        { type: 'decision-group', unknowns: ['test command'], options: ['ask owner', 'leave unknown'] },
        { type: 'preview', changes: [{ path: 'docs/preview.md', before: null, after: 'approved' }] },
        { type: 'user-decision', decision: 'approve', source: 'user', paths: ['docs/preview.md'] },
        { type: 'mutation', paths: ['docs/preview.md'] },
      ],
    },
  };
}

test('rejects a before-Skill claim of no write when AGENTS.md changed', () => {
  assert.equal(typeof evidenceModule.checkBehaviorEvidence, 'function', 'checkBehaviorEvidence must exist');
  const { before, after } = records();
  before.artifacts['AGENTS.md'] = 'rewritten';
  before.events.push({ type: 'claim-no-write' });
  const result = evidenceModule.checkBehaviorEvidence({ scenario: 'preserve-human-rules', before, after });
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.includes('AGENTS.md')));
});

test('accepts observable evidence, preview and explicit user approval for every scenario', () => {
  assert.equal(typeof evidenceModule.checkBehaviorEvidence, 'function', 'checkBehaviorEvidence must exist');
  for (const scenario of ['preserve-human-rules', 'avoid-parallel-standards', 'preview-before-write']) {
    assert.deepEqual(evidenceModule.checkBehaviorEvidence({ scenario, ...records() }), { ok: true, failures: [] });
  }
});

test('rejects missing or reordered evidence and decisions, undeclared writes and changed inputs', () => {
  assert.equal(typeof evidenceModule.checkBehaviorEvidence, 'function', 'checkBehaviorEvidence must exist');
  const mutations = [
    ({ after }) => { after.events = after.events.filter((event) => event.type !== 'evidence'); },
    ({ after }) => { after.events[0].facts = []; },
    ({ after }) => { after.events = after.events.filter((event) => event.type !== 'preview'); },
    ({ after }) => { after.events = after.events.filter((event) => event.type !== 'user-decision'); },
    ({ after }) => { after.events[3].source = 'assistant'; },
    ({ after }) => { after.events[3].decision = 'reject'; },
    ({ after }) => { after.events[3].paths = []; },
    ({ after }) => { after.events.reverse(); },
    ({ after }) => { after.artifacts['unapproved.md'] = 'new'; },
    ({ after }) => { after.repositoryInput = { 'README.md': 'different input' }; },
    ({ after }) => { after.artifacts['AGENTS.md'] = 'erased human rules'; },
    ({ after }) => { delete after.artifacts; },
    ({ after }) => { after.skillLoaded = false; },
  ];
  for (const mutate of mutations) {
    const pair = records();
    mutate(pair);
    assert.equal(evidenceModule.checkBehaviorEvidence({ scenario: 'preserve-human-rules', ...pair }).ok, false);
  }
});

test('requires explicit unknown decisions and forbids unapproved parallel standards', () => {
  assert.equal(typeof evidenceModule.checkBehaviorEvidence, 'function', 'checkBehaviorEvidence must exist');
  const pair = records();
  pair.after.unknowns = ['test command'];
  pair.after.events = pair.after.events.filter((event) => event.type !== 'decision-group');
  assert.equal(evidenceModule.checkBehaviorEvidence({ scenario: 'preview-before-write', ...pair }).ok, false);
  const parallel = records();
  parallel.after.parallelStandards = ['docs/new-standards.md'];
  assert.equal(evidenceModule.checkBehaviorEvidence({ scenario: 'avoid-parallel-standards', ...parallel }).ok, false);
  assert.equal(evidenceModule.checkBehaviorEvidence({ scenario: 'unknown', ...records() }).ok, false);
  assert.equal(evidenceModule.checkBehaviorEvidence(null).ok, false);
});

test('rejects malformed evidence records without throwing or accepting substring path approvals', () => {
  for (const mutate of [
    ({ after }) => { after.events[3].paths = 'docs/preview.md'; },
    ({ after }) => { after.events[4].paths = 'docs/preview.md'; },
    ({ after }) => { after.events[4].paths = {}; },
    ({ after }) => { after.artifacts = { 'docs/preview.md': 42 }; },
    ({ after }) => { after.unknowns = 'missing command'; },
  ]) {
    const pair = records();
    mutate(pair);
    const result = evidenceModule.checkBehaviorEvidence({ scenario: 'preview-before-write', ...pair });
    assert.equal(result.ok, false);
  }
});

test('validates each checked-in no-Skill baseline against its immutable raw-evidence index', async () => {
  assert.equal(typeof evidenceModule.checkNoSkillBaselineEvidence, 'function', 'checkNoSkillBaselineEvidence must exist');
  const evidenceRoot = new URL('./behavior/evidence/', import.meta.url);
  const index = JSON.parse(await readFile(new URL('index.json', evidenceRoot), 'utf8'));
  assert.equal(index.schema_version, 'ai-project-bootstrap.no-skill-evidence-index.v1');
  assert.deepEqual(index.records.map(({ id }) => id), [
    'preserve-human-rules',
    'avoid-parallel-standards',
    'preview-before-write',
  ]);
  for (const expected of index.records) {
    const rawFiles = Object.fromEntries(await Promise.all(expected.files.map(async ({ path }) => [
      path,
      await readFile(new URL(path, evidenceRoot), 'utf8'),
    ])));
    const record = JSON.parse(rawFiles[expected.files[0].path]);
    assert.deepEqual(
      evidenceModule.checkNoSkillBaselineEvidence({ rawFiles, record, expected }),
      { ok: true, failures: [] },
      expected.id,
    );
  }
});

test('skill metadata and entrypoint expose the three modes and confirmation boundary', async () => {
  const skill = await readFile(new URL('../SKILL.md', import.meta.url), 'utf8');
  const ui = await readFile(new URL('../agents/openai.yaml', import.meta.url), 'utf8');
  for (const mode of ['new-project', 'legacy-reconciliation', 're-audit']) assert.match(skill, new RegExp(mode));
  assert.match(skill, /explicit.*confirm|明确确认/i);
  assert.match(skill, /legacy-reconciliation\.md/);
  assert.match(ui, /\$ai-project-bootstrap/);
  const short = ui.match(/short_description: "([^"]+)"/)?.[1] ?? '';
  assert.ok(short.length >= 25 && short.length <= 64);
});

test('skill keeps safe no-conflict initialization protocol internal', async () => {
  const skill = await readFile(new URL('../SKILL.md', import.meta.url), 'utf8');
  assert.match(skill, /only creates unambiguous governance files/);
  assert.match(skill, /without exposing protocol details/);
  assert.match(skill, /Do not make users operate internal schemas, plan hashes/);
  assert.match(skill, /existing human-owned file would change/);
});

test('controlled loaded-Skill forward checks preserve files when decisions are deferred', async () => {
  const evidence = JSON.parse(await readFile(new URL('./behavior/evidence/after-skill-controlled-runs.json', import.meta.url), 'utf8'));
  assert.equal(evidence.schema_version, 'ai-project-bootstrap.controlled-behavior.v1');
  assert.match(evidence.limitations, /not independent-agent/i);
  assert.equal(evidence.records.length, 3);
  for (const record of evidence.records) {
    assert.deepEqual(evidenceModule.checkBehaviorEvidence(record), { ok: true, failures: [] }, record.scenario);
    assert.deepEqual(record.after.artifacts, record.after.repositoryInput, `${record.scenario} must not mutate while deferred`);
  }
});
