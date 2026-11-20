import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createInstallPlan, applyInstallPlan } from '../scripts/install.mjs';
import { test } from 'node:test';
import { createRepoFixture } from './helpers/repo-fixture.mjs';
import { captureRepositoryState } from '../scripts/lib/filesystem.mjs';
import { analyzeRepository, assessMode } from '../scripts/lib/scanner.mjs';
import { formatCommandMode } from '../scripts/lib/analyzers/formatting.mjs';

for (const [command, expected] of [
  ['prettier --check .', 'check'], ['prettier --write .', 'write'],
  ['prettier --check --write .', 'write'], ['npx --no-install prettier -c .', 'check'],
  ['pnpm exec biome format .', 'check'], ['biome check --write .', 'write'],
  ['biome ci .', 'check'], ['ruff format .', 'write'], ['ruff format --check .', 'check'],
  ['black --check .', 'check'], ['isort --check-only .', 'check'],
  ['prettier --check . && node mutate.mjs', null], ['prettier --check=false .', null],
  ['biome format --help', null], ['node custom-check.mjs', null],
  ['npm run format -- --check', null], ['echo "prettier --check ."', null],
]) {
  test(`classifies command body conservatively: ${command}`, () => assert.equal(formatCommandMode(command), expected));
}

const policy = '# Formatting\nUse Prettier formatter. Run format and format:check. Ignore generated files. CI runs format:check before completion.\n';
const registry = '# Registry\n| concern | authoritative path | scope | owner |\n| --- | --- | --- | --- |\n| Code formatting | docs/agent/formatting.md | repo | team |\n';
const recommendation = (result) => result.recommendations.find(({ pack_id }) => pack_id === 'code-style-formatting');

async function repoWith(t, extras = {}) {
  const repo = await createRepoFixture({ files: { 'src/index.ts': 'export const x = 1;', 'docs/agent/README.md': registry, 'docs/agent/formatting.md': policy, ...extras } });
  t.after(() => repo.cleanup());
  return repo;
}

test('a misleading check script name never registers a source-mutating formatter gate', async (t) => {
  const repo = await repoWith(t, { 'package.json': JSON.stringify({ devDependencies: { prettier: '3.6.2' }, scripts: { check: 'prettier --write .', 'format:check': 'prettier --write .' } }) });
  const result = await analyzeRepository({ repo: repo.root });
  assert.ok(!result.analyzers.commands.some(({ value }) => value.includes('format:check') || value === 'npm run check'));
  assert.ok(result.analyzers.formatting.some(({ kind }) => kind === 'format-write-command'));
  assert.equal(recommendation(result).current_status, 'partial');
  assert.ok(recommendation(result).missing_topics.includes('executable-check-command'));
});

test('EditorConfig and lint-only settings cannot fill an executable formatter gap', async (t) => {
  const repo = await repoWith(t, { '.editorconfig': 'root = true', 'pyproject.toml': '[tool.ruff.lint]\nselect = ["E"]', 'pom.xml': '<plugin>maven-checkstyle-plugin</plugin>' });
  const result = await analyzeRepository({ repo: repo.root });
  assert.ok(result.analyzers.formatting.every(({ kind }) => kind === 'editor-style-config' || kind === 'style-check-config'));
  assert.equal(recommendation(result).disposition, 'propose-adjust');
  assert.ok(recommendation(result).missing_topics.includes('executable-formatter'));
});

test('real body under an arbitrary script name is detected, without running it or rewriting source', async (t) => {
  const repo = await repoWith(t, { 'package.json': JSON.stringify({ prettier: { semi: true }, devDependencies: { prettier: '3.6.2' }, scripts: { 'verify:style': 'prettier --check .', format: 'prettier --write .' } }) });
  const before = await captureRepositoryState(repo.root);
  const result = await analyzeRepository({ repo: repo.root });
  assert.ok(result.analyzers.commands.some(({ value }) => value === 'npm run verify:style'));
  assert.equal(recommendation(result).disposition, 'compare-only');
  assert.equal(recommendation(result).requires_user_confirmation, false);
  assert.ok(result.analyzers.formatting.some(({ source_locator }) => source_locator === 'prettier'));
  assert.deepEqual(await captureRepositoryState(repo.root), before);
});

test('lifecycle hooks and wrappers remain unresolved, not safe formatting gates', async (t) => {
  const repo = await repoWith(t, { 'package.json': JSON.stringify({ devDependencies: { prettier: '3.6.2' }, scripts: { 'preformat:check': 'node mutate.mjs', 'format:check': 'prettier --check .', format: 'node custom-wrapper.mjs' } }) });
  const result = await analyzeRepository({ repo: repo.root });
  assert.ok(!result.analyzers.commands.some(({ value }) => value.includes('format:check')));
  assert.equal(result.analyzers.formatting.filter(({ kind }) => kind === 'format-command-unresolved').length, 2);
  assert.ok(recommendation(result).missing_topics.includes('unresolved-format-command'));
  assert.equal(recommendation(result).disposition, 'propose-adjust');
});

test('polyglot configs are evidence of declarations and still need executable check verification', async (t) => {
  const repo = await repoWith(t, { 'pyproject.toml': '[tool.ruff.format]\nquote-style = "single"', 'backend/pom.xml': '<plugin>spotless-maven-plugin</plugin>' });
  const result = await analyzeRepository({ repo: repo.root });
  assert.ok(result.analyzers.formatting.some(({ value }) => value === 'ruff'));
  assert.ok(result.analyzers.formatting.some(({ value }) => value === 'spotless-maven'));
  assert.ok(recommendation(result).missing_topics.includes('executable-check-command'));
});

test('formatting read errors are incomplete evidence, not a missing-tool success', () => {
  assert.equal(assessMode({ warnings: [{ kind: 'analyzer-error', analyzer: 'formatting' }] }).recommended_mode, 'consult-user');
});


test('ESM-only projects receive formatting advice and the installed analyzer remains runnable', async (t) => {
  const repo = await createRepoFixture({ files: {
    '.git/HEAD': 'ref: refs/heads/main',
    'src/index.mjs': 'export const x=1;',
    'package.json': JSON.stringify({ devDependencies: { prettier: '3.6.2' }, scripts: { 'verify:style': 'prettier --check .' } }),
  } }); t.after(() => repo.cleanup());
  const { plan } = await createInstallPlan(repo.root);
  await applyInstallPlan(repo.root, plan.plan_hash);
  const installed = join(repo.root, '.agents/skills/ai-project-bootstrap');
  assert.match(await readFile(join(installed, 'references/packs/code-style-formatting.md'), 'utf8'), /pack_id: code-style-formatting/);
  const { analyzeRepository: analyzeInstalled } = await import(join(installed, 'scripts/lib/scanner.mjs'));
  const result = await analyzeInstalled({ repo: repo.root });
  assert.ok(recommendation(result));
  assert.ok(result.analyzers.commands.some(({ value }) => value === 'npm run verify:style'));
  assert.equal(result.warnings.length, 0);
});
