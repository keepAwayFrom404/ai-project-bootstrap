import assert from 'node:assert/strict';
import { readFile, writeFile, rm, symlink, chmod } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { createRepoFixture } from './helpers/repo-fixture.mjs';
import { captureRepositoryState } from '../scripts/lib/filesystem.mjs';
import { applyInstallPlan, createInstallPlan, reviewInstallFile } from '../scripts/install.mjs';
const hash = (v) => createHash('sha256').update(v).digest('hex');
const rootPath = '.agents/skills/ai-project-bootstrap';
const text = 'first\n\nsecond\n\nthird\n';

async function fixture(t) {
  const source = await createRepoFixture({ files: { 'SKILL.md': text, LICENSE: 'MIT\n', 'agents/a.yaml': 'agent\n', 'references/rules.md': 'rules\n', 'scripts/run.mjs': 'export const x=1;\n', 'package.json': '{"version":"1"}' } });
  const target = await createRepoFixture({ files: { '.git/HEAD': 'ref: refs/heads/main', 'AGENTS.md': 'Human rules', 'business.txt': 'do not touch' } });
  t.after(() => source.cleanup()); t.after(() => target.cleanup());
  const options = { sourceRoot: source.root };
  const initial = await createInstallPlan(target.root, options);
  await applyInstallPlan(target.root, initial.plan.plan_hash, options);
  const file = (path = 'SKILL.md') => join(target.root, rootPath, path);
  const preview = (extra = {}) => createInstallPlan(target.root, { ...options, ...extra });
  const apply = async (extra = {}) => {
    const prepared = await preview(extra);
    return applyInstallPlan(target.root, prepared.plan.plan_hash, { ...options, ...extra });
  };
  return { source, target, file, preview, apply, options };
}

test('local-only edits survive, v2 records upstream and actual hashes, repeat application is stable', async (t) => {
  const f = await fixture(t);
  await writeFile(f.file(), text + 'custom\n');
  const before = await captureRepositoryState(f.target.root);
  const p = await f.preview();
  assert.deepEqual(await captureRepositoryState(f.target.root), before);
  assert.equal(p.plan.actions.find((a) => a.path === 'SKILL.md').action, 'preserve-local');
  await f.apply();
  const manifest = JSON.parse(await readFile(f.file('.install-manifest.json'), 'utf8'));
  assert.equal(manifest.schema_version, 'ai-project-bootstrap.install.v2');
  assert.equal(manifest.files['SKILL.md'], hash(text));
  assert.equal(manifest.local_overrides['SKILL.md'].sha256, hash(text + 'custom\n'));
  const stable = await captureRepositoryState(f.target.root);
  await f.apply();
  assert.deepEqual(await captureRepositoryState(f.target.root), stable);
  assert.equal(await f.target.read('AGENTS.md'), 'Human rules');
});

test('nonoverlapping upstream/local changes produce a reviewable clean merge and keep a backup', async (t) => {
  const f = await fixture(t);
  await writeFile(f.file(), text.replace('first', 'local first'));
  await f.source.write('SKILL.md', text.replace('third', 'upstream third'));
  const before = await captureRepositoryState(f.target.root);
  const p = await f.preview();
  assert.equal(p.plan.conflicts.length, 0);
  assert.equal(p.plan.actions.find((a) => a.path === 'SKILL.md').action, 'merge');
  const review = await reviewInstallFile(f.target.root, 'SKILL.md', f.options);
  assert.match(review.candidate, /local first/); assert.match(review.candidate, /upstream third/);
  assert.deepEqual(await captureRepositoryState(f.target.root), before);
  const result = await f.apply();
  assert.equal(await readFile(f.file(), 'utf8'), review.candidate);
  assert.equal(await readFile(join(result.backup_directory, 'SKILL.md'), 'utf8'), text.replace('first', 'local first'));
  const stable = await f.preview();
  assert.equal(stable.plan.actions.find((a) => a.path === 'SKILL.md').action, 'preserve-local');
});

test('overlapping changes block writes and expose all three versions and conflict candidate', async (t) => {
  const f = await fixture(t);
  await writeFile(f.file(), text.replace('first', 'local'));
  await f.source.write('SKILL.md', text.replace('first', 'upstream'));
  const before = await captureRepositoryState(f.target.root);
  const p = await f.preview();
  assert.equal(p.plan.conflicts[0].reason, 'merge-conflict');
  const review = await reviewInstallFile(f.target.root, 'SKILL.md', f.options);
  assert.equal(review.base, text);
  assert.match(review.candidate, /<<<<<<< local/);
  await assert.rejects(applyInstallPlan(f.target.root, p.plan.plan_hash, f.options), /conflicts must be resolved/);
  assert.deepEqual(await captureRepositoryState(f.target.root), before);
});

for (const choice of ['keep-local', 'use-upstream', 'merged-file']) {
  test(`explicit ${choice} binds to a new plan; manual content drift invalidates approval`, async (t) => {
    const f = await fixture(t);
    await writeFile(f.file(), text.replace('first', 'local'));
    await f.source.write('SKILL.md', text.replace('first', 'upstream'));
    await f.target.write('upgrade/merged.md', text.replace('first', 'both reviewed'));
    const decision = { action: choice, ...(choice === 'merged-file' ? { file: 'upgrade/merged.md' } : {}) };
    const options = { ...f.options, resolutions: { 'SKILL.md': decision } };
    const old = await f.preview();
    const p = await createInstallPlan(f.target.root, options);
    assert.equal(p.plan.conflicts.length, 0);
    await assert.rejects(applyInstallPlan(f.target.root, old.plan.plan_hash, options), /plan changed/);
    if (choice === 'merged-file') {
      await f.target.write('upgrade/merged.md', 'changed after review');
      await assert.rejects(applyInstallPlan(f.target.root, p.plan.plan_hash, options), /plan changed/);
      await f.target.write('upgrade/merged.md', text.replace('first', 'both reviewed'));
    }
    await applyInstallPlan(f.target.root, p.plan.plan_hash, options);
    assert.match(await readFile(f.file(), 'utf8'), new RegExp(choice === 'keep-local' ? 'local' : choice === 'use-upstream' ? 'upstream' : 'both reviewed'));
  });
}

test('local deletion stays deleted until upstream also changes, then needs an explicit decision', async (t) => {
  const f = await fixture(t); await rm(f.file());
  await f.apply(); await assert.rejects(readFile(f.file()), { code: 'ENOENT' });
  await f.source.write('SKILL.md', 'new upstream\n');
  const p = await f.preview();
  assert.equal(p.plan.conflicts[0].reason, 'local-deletion-upstream-change');
});

test('upstream removal preserves customized files and deletes only unchanged managed files', async (t) => {
  const f = await fixture(t);
  await writeFile(f.file('references/rules.md'), 'local rules');
  await rm(join(f.source.root, 'references/rules.md'));
  await rm(join(f.source.root, 'agents/a.yaml'));
  await f.apply();
  assert.equal(await readFile(f.file('references/rules.md'), 'utf8'), 'local rules');
  await assert.rejects(readFile(f.file('agents/a.yaml')), { code: 'ENOENT' });
  assert.equal((await f.preview()).plan.conflicts.length, 0);
});

test('legacy v1 without base does not invent an ancestor; local_overrides is not overwrite permission', async (t) => {
  const f = await fixture(t);
  const path = f.file('.install-manifest.json'); const m = JSON.parse(await readFile(path, 'utf8'));
  m.schema_version = 'ai-project-bootstrap.install.v1';
  m.local_overrides = { 'SKILL.md': { sha256: hash('local'), reason: 'old informational record' } };
  await writeFile(path, JSON.stringify(m));
  await writeFile(f.file(), 'local'); await f.source.write('SKILL.md', 'upstream');
  const p = await f.preview();
  assert.equal(p.plan.conflicts[0].reason, 'missing-upstream-base');
  await f.apply({ resolutions: { 'SKILL.md': { action: 'keep-local' } } });
  assert.equal(JSON.parse(await readFile(path, 'utf8')).schema_version, 'ai-project-bootstrap.install.v2');
  assert.equal(await readFile(f.file(), 'utf8'), 'local');
});

test('cache corruption, source/target/manifest drift and stale resolutions stop approval', async (t) => {
  const f = await fixture(t);
  let p = await f.preview();
  await f.source.write('SKILL.md', 'changed upstream');
  await assert.rejects(applyInstallPlan(f.target.root, p.plan.plan_hash, f.options), /plan changed/);
  p = await f.preview(); await writeFile(f.file(), 'changed local');
  await assert.rejects(applyInstallPlan(f.target.root, p.plan.plan_hash, f.options), /plan changed/);
  await writeFile(f.file('.install-base/' + hash(text)), 'tampered');
  await assert.rejects(f.preview(), /snapshot is corrupt/);
});

test('manifest and manual paths cannot escape or traverse symlinks', async (t) => {
  const f = await fixture(t); const outside = await createRepoFixture({ files: { 'secret': 'untouched' } }); t.after(() => outside.cleanup());
  await symlink(outside.root, join(f.target.root, 'escape'));
  for (const resolutions of [
    { '../secret': { action: 'keep-local' } },
    { 'SKILL.md': { action: 'merged-file', file: '../secret' } },
    { 'SKILL.md': { action: 'merged-file', file: '.env' } },
    { 'SKILL.md': { action: 'merged-file', file: 'escape/secret' } },
  ]) await assert.rejects(f.preview({ resolutions }), /Invalid|relative|Symlink|escape/i);
  const path = f.file('.install-manifest.json'); const m = JSON.parse(await readFile(path, 'utf8'));
  m.files['../../secret'] = hash('untouched'); await writeFile(path, JSON.stringify(m));
  await assert.rejects(f.preview(), /Invalid managed resource path/);
  assert.equal(await outside.read('secret'), 'untouched');
});

test('manual conflict markers are rejected and an existing install lock is preserved', async (t) => {
  const f = await fixture(t); await f.target.write('merged.md', '<<<<<<< local\nno\n>>>>>>> upstream');
  await assert.rejects(f.preview({ resolutions: { 'SKILL.md': { action: 'merged-file', file: 'merged.md' } } }), /conflict markers/);
  const p = await f.preview(); await writeFile(f.file('.install.lock'), 'someone else');
  await assert.rejects(applyInstallPlan(f.target.root, p.plan.plan_hash, f.options), /locked/);
  assert.equal(await readFile(f.file('.install.lock'), 'utf8'), 'someone else');
});

test('binary divergence remains a conflict rather than text decoding or silent overwrite', async (t) => {
  const f = await fixture(t); await writeFile(f.file(), Buffer.from([0,1]));
  await f.source.write('SKILL.md', 'changed');
  assert.equal((await f.preview()).plan.conflicts[0].reason, 'non-text-content');
});


test('partial write failure leaves old manifest, backups, released lock and a recoverable preview', { skip: process.platform === 'win32' || process.getuid?.() === 0 }, async (t) => {
  const f = await fixture(t);
  await f.source.write('SKILL.md', 'new skill');
  await f.source.write('agents/a.yaml', 'new agent');
  const before = await readFile(f.file('.install-manifest.json'));
  const parent = f.file('agents');
  await chmod(parent, 0o555);
  let failure;
  try { await f.apply(); } catch (error) { failure = error; }
  finally { await chmod(parent, 0o755); }
  assert.equal(failure?.partial, true);
  assert.match(failure.message, /Installation may be partial/);
  assert.deepEqual(await readFile(f.file('.install-manifest.json')), before);
  assert.equal(await readFile(join(failure.backup_directory, 'SKILL.md'), 'utf8'), text);
  await assert.rejects(readFile(f.file('.install.lock')), { code: 'ENOENT' });
  await f.apply();
  assert.equal(await readFile(f.file(), 'utf8'), 'new skill');
  assert.equal(await readFile(f.file('agents/a.yaml'), 'utf8'), 'new agent');
});

test('manifest metadata drift invalidates even an otherwise unchanged plan', async (t) => {
  const f = await fixture(t);
  const p = await f.preview();
  const m = JSON.parse(await readFile(f.file('.install-manifest.json'), 'utf8'));
  m.note = 'changed after approval';
  await writeFile(f.file('.install-manifest.json'), JSON.stringify(m));
  await assert.rejects(applyInstallPlan(f.target.root, p.plan.plan_hash, f.options), /plan changed/);
});

test('missing Git yields an explicit merge blocker while local files stay unchanged', async (t) => {
  const f = await fixture(t);
  await writeFile(f.file(), text.replace('first', 'local first'));
  await f.source.write('SKILL.md', text.replace('third', 'upstream third'));
  const before = await captureRepositoryState(f.target.root);
  const previous = process.env.PATH;
  try {
    process.env.PATH = '/unavailable-bootstrap-test-bin';
    assert.equal((await f.preview()).plan.conflicts[0].reason, 'merge-unavailable');
  } finally {
    if (previous === undefined) delete process.env.PATH; else process.env.PATH = previous;
  }
  assert.deepEqual(await captureRepositoryState(f.target.root), before);
});
