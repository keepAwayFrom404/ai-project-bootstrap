import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { applyAdoptionPlan, applyInstallPlan, createAdoptionPlan, createInstallPlan } from '../scripts/install.mjs';

async function targetRepo(t) {
  const root = await mkdtemp(join(tmpdir(), 'ai-project-bootstrap-install-'));
  await mkdir(join(root, '.git'));
  t.after(async () => { const { rm } = await import('node:fs/promises'); await rm(root, { recursive: true, force: true }); });
  return root;
}

test('preview is read-only and apply requires the exact current plan hash', async (t) => {
  const repo = await targetRepo(t);
  const { plan } = await createInstallPlan(repo);
  assert.equal(plan.conflicts.length, 0);
  assert.ok(plan.actions.some(({ action, path }) => action === 'create' && path === 'SKILL.md'));
  await assert.rejects(() => readFile(join(repo, '.agents/skills/ai-project-bootstrap/SKILL.md')));
  await assert.rejects(() => applyInstallPlan(repo, 'stale'), /Install plan changed/);
  const applied = await applyInstallPlan(repo, plan.plan_hash);
  assert.equal(applied.applied, true);
  assert.match(await readFile(join(repo, '.agents/skills/ai-project-bootstrap/SKILL.md'), 'utf8'), /name: ai-project-bootstrap/);
});

test('reinstall is idempotent and local-only customization is preserved', async (t) => {
  const repo = await targetRepo(t);
  const first = await createInstallPlan(repo);
  await applyInstallPlan(repo, first.plan.plan_hash);
  const second = await createInstallPlan(repo);
  assert.equal(second.plan.conflicts.length, 0);
  assert.ok(second.plan.actions.every(({ action }) => action === 'unchanged'));

  const skillPath = join(repo, '.agents/skills/ai-project-bootstrap/SKILL.md');
  await writeFile(skillPath, `${await readFile(skillPath, 'utf8')}\nlocal edit\n`);
  const drift = await createInstallPlan(repo);
  assert.equal(drift.plan.conflicts.length, 0);
  assert.equal(drift.plan.actions.find(({ path }) => path === 'SKILL.md').action, 'preserve-local');
  await applyInstallPlan(repo, drift.plan.plan_hash);
  assert.match(await readFile(skillPath, 'utf8'), /local edit/);

});

test('unmanaged collisions are never overwritten', async (t) => {
  const repo = await targetRepo(t);
  const destination = join(repo, '.agents/skills/ai-project-bootstrap');
  await mkdir(destination, { recursive: true });
  await writeFile(join(destination, 'SKILL.md'), 'human-owned\n');
  const { plan } = await createInstallPlan(repo);
  assert.equal(plan.conflicts.find(({ path }) => path === 'SKILL.md')?.reason, 'unmanaged-collision');
  await assert.rejects(() => applyInstallPlan(repo, plan.plan_hash), /conflicts must be resolved/);
  assert.equal(await readFile(join(destination, 'SKILL.md'), 'utf8'), 'human-owned\n');
});

test('legacy project copies require hash-bound adoption before upgrade', async (t) => {
  const repo = await targetRepo(t);
  const destination = join(repo, '.agents/skills/ai-project-bootstrap');
  const sourcePlan = await createInstallPlan(repo);
  for (const action of sourcePlan.plan.actions) {
    if (action.action !== 'create') continue;
    const source = join(import.meta.dirname, '..', action.path);
    const target = join(destination, action.path);
    await mkdir(join(target, '..'), { recursive: true });
    await writeFile(target, await readFile(source));
  }
  const adoption = await createAdoptionPlan(repo);
  assert.equal(adoption.plan.conflicts.length, 0);
  await assert.rejects(() => applyAdoptionPlan(repo, 'stale'), /Adoption plan changed/);
  await applyAdoptionPlan(repo, adoption.plan.plan_hash);
  const managed = await createInstallPlan(repo);
  assert.equal(managed.plan.conflicts.length, 0);
  assert.ok(managed.plan.actions.every(({ action }) => action === 'unchanged'));
});


test('managed distribution retains the MIT notice with copied Skill resources', async (t) => {
  const repo = await targetRepo(t);
  const { plan } = await createInstallPlan(repo);
  assert.ok(plan.actions.some(({ path }) => path === 'LICENSE'));
  await applyInstallPlan(repo, plan.plan_hash);
  const notice = await readFile(join(repo, '.agents/skills/ai-project-bootstrap/LICENSE'), 'utf8');
  assert.equal(notice, await readFile(new URL('../LICENSE', import.meta.url), 'utf8'));
  assert.match(notice, /MIT License/);
});


test('adopting an unknown historical customization never authorizes overwriting it on first upgrade', async (t) => {
  const repo = await targetRepo(t);
  const destination = join(repo, '.agents/skills/ai-project-bootstrap');
  const original = await createInstallPlan(repo);
  for (const action of original.plan.actions) {
    const target = join(destination, action.path);
    await mkdir(join(target, '..'), { recursive: true });
    await writeFile(target, await readFile(new URL('../' + action.path, import.meta.url)));
  }
  const skill = join(destination, 'SKILL.md');
  const customized = (await readFile(skill, 'utf8')) + '\nHuman customization\n';
  await writeFile(skill, customized);
  const adoption = await createAdoptionPlan(repo);
  await applyAdoptionPlan(repo, adoption.plan.plan_hash);
  const upgrade = await createInstallPlan(repo);
  assert.equal(upgrade.plan.actions.find(({ path }) => path === 'SKILL.md').action, 'preserve-local');
  await applyInstallPlan(repo, upgrade.plan.plan_hash);
  assert.equal(await readFile(skill, 'utf8'), customized);
});
