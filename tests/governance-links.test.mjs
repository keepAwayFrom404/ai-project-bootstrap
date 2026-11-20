import assert from 'node:assert/strict';
import { test } from 'node:test';
import { symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { createRepoFixture } from './helpers/repo-fixture.mjs';
import { captureRepositoryState } from '../scripts/lib/filesystem.mjs';
import { validateGovernanceLinks } from '../scripts/lib/governance-links.mjs';
import { parseMarkdown } from '../scripts/lib/markdown.mjs';
import { validateSkill } from '../scripts/validate-skill.mjs';

const table = (rows) => '| concern | authoritative path | scope | owner |\n| --- | --- | --- | --- |\n' + rows.join('\n');
async function fixture(t, files = {}) {
  const repo = await createRepoFixture({ files: { 'AGENTS.md': '# Entry\n', 'docs/agent/README.md': table(['| API | docs/agent/api.md | API changes | team |']), 'docs/agent/project-rules.md': '# Rules\n', 'docs/agent/api.md': '# API\n## 请求与权限\nRules\n## Requests\nMore\n## Requests\nRepeated\n', ...files } });
  t.after(() => repo.cleanup()); return repo;
}
const check = (repo, manifest = {}, limits) => validateGovernanceLinks({ repo: repo.root, manifest, limits });

test('checks inline/reference links, encoded Unicode/space paths, repeated headings and explicit anchors', async (t) => {
  const repo = await fixture(t, {
    'AGENTS.md': '# Entry\n[api](docs/agent/api.md#%E8%AF%B7%E6%B1%82%E4%B8%8E%E6%9D%83%E9%99%90)\n[repeat](docs/agent/api.md#requests-1)\n[space](<docs/read guide.md#title>)\n[ref][rules]\n[rules]: docs/read%20guide.md#custom\n',
    'docs/read guide.md': '# Title\n<a id="custom"></a>\n',
  });
  const before = await captureRepositoryState(repo.root);
  const result = await check(repo);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(await captureRepositoryState(repo.root), before);
});

for (const [target, reason] of [['missing.md', /ENOENT/], ['docs/agent/api.md#missing', /missing chapter/], ['docs/agent/API.md', /case|ENOENT/], ['docs/', /regular file/], ['../escape.md', /outside|escapes/], ['docs/%zz.md', /URI malformed/]]) {
  test(`rejects broken local target ${target}`, async (t) => {
    const repo = await fixture(t, { 'AGENTS.md': `[target](${target})` });
    assert.match((await check(repo)).errors.join('\n'), reason);
  });
}

test('does not inspect examples or external links; backlinks/cycles do not force infinite traversal', async (t) => {
  const repo = await fixture(t, { 'AGENTS.md': '# Entry\n```md\n[example](missing.md)\n```\n`[inline](missing.md)`\n[external](https://user:secret@example.invalid/page?token=secret)\n[loop](docs/loop.md)\n', 'docs/loop.md': '[back](../AGENTS.md)' });
  const result = await check(repo);
  assert.deepEqual(result.errors, []);
  assert.match(result.warnings.join('\n'), /no network/);
  assert.doesNotMatch(result.warnings.join('\n'), /secret/);
});

test('missing reference definitions and unclosed fences cannot report a complete pass', async (t) => {
  const repo = await fixture(t, { 'AGENTS.md': '[label][absent]\n```md\nunfinished' });
  const result = await check(repo);
  assert.match(result.errors.join('\n'), /missing reference definition/);
  assert.match(result.errors.join('\n'), /unclosed/);
});

test('duplicate concerns normalize case/whitespace; different concerns may share a file', async (t) => {
  const repo = await fixture(t, { 'docs/agent/README.md': table(['| API rules | docs/agent/api.md | change | team |', '| api   RULES | docs/agent/api.md#requests | change | team |']) });
  assert.match((await check(repo)).errors.join('\n'), /duplicate authority/);
  await repo.write('docs/agent/README.md', table(['| API rules | docs/agent/api.md | change | team |', '| Backend rules | docs/agent/api.md | change | team |']));
  assert.deepEqual((await check(repo)).errors, []);
});

test('Registry chapter references and declared progressive reading routes must exist and have an authority', async (t) => {
  const repo = await fixture(t);
  const manifest = { reading_routes: [{ id: 'api-edit', when: 'API changes', targets: ['docs/agent/api.md#requests'] }] };
  assert.deepEqual((await check(repo, manifest)).errors, []);
  for (const routes of [
    [{ id: 'api-edit', when: '', targets: ['docs/agent/api.md'] }],
    [{ id: 'same', when: 'API', targets: ['docs/agent/api.md'] }, { id: 'SAME', when: 'API', targets: ['docs/agent/api.md'] }],
    [{ id: 'api', when: 'API', targets: ['docs/agent/api.md#requests', 'docs/agent/api.md#requests'] }],
    [{ id: 'api', when: 'API', targets: ['docs/other.md'] }],
    [{ id: 'api', when: 'API', targets: ['docs/agent/api.md#absent'] }],
  ]) {
    await repo.write('docs/other.md', '# Other');
    assert.ok((await check(repo, { reading_routes: routes })).errors.length);
  }
  await repo.write('docs/agent/README.md', table(['| API | docs/agent/api.md#absent | API | team |']));
  assert.match((await check(repo)).errors.join('\n'), /missing chapter/);
});

test('traversal budgets and escaping symlinks fail closed', async (t) => {
  const repo = await fixture(t, { 'AGENTS.md': '[more](docs/one.md)', 'docs/one.md': '[next](two.md)', 'docs/two.md': '# Two' });
  const limited = await check(repo, {}, { maxDocuments: 1 });
  assert.equal(limited.complete, false);
  assert.match(limited.errors.join('\n'), /limit/);
  const outside = await createRepoFixture({ files: { 'private.md': '# Secret' } }); t.after(() => outside.cleanup());
  await symlink(outside.root, join(repo.root, 'escape'));
  await repo.write('AGENTS.md', '[outside](escape/private.md)');
  assert.match((await check(repo)).errors.join('\n'), /outside/);
});

test('Skill validation checks real self/chapter references and ignores fenced examples', async (t) => {
  const repo = await createRepoFixture({ files: { 'SKILL.md': '---\nname: test-skill\ndescription: Valid description\n---\n# Entry\n[real](#entry)\n```md\n[example](missing.md)\n```\n' } }); t.after(() => repo.cleanup());
  assert.deepEqual(await validateSkill(repo.root), []);
  await repo.write('SKILL.md', (await repo.read('SKILL.md')) + '\n[missing](#missing)');
  assert.match((await validateSkill(repo.root)).join('\n'), /Missing Skill chapter/);
});

test('coverage evaluates the registered chapter, without credit from other sections', async (t) => {
  const { analyzeRepository } = await import('../scripts/lib/scanner.mjs');
  const repo = await fixture(t, {
    'src/index.js': 'export const x=1;',
    'docs/agent/README.md': table(['| Incremental verification | docs/agent/api.md#selected | coding | team |']),
    'docs/agent/api.md': '# Rules\n## Selected\nComparison baseline.\n## Other\nAffected dependencies; reuse valid check results; full-suite triggers; CI gates.\n',
  });
  let result = await analyzeRepository({ repo: repo.root });
  let coverage = result.analyzers.governanceCoverage.find(({ concern }) => concern === 'incremental-verification');
  assert.equal(coverage.value, 'partial');
  assert.ok(coverage.missing_topics.includes('affected-dependencies'));
  await repo.write('docs/agent/api.md', '# Rules\n## Selected\nComparison baseline; affected dependencies; reuse valid check results; full-suite triggers; CI gates.\n');
  result = await analyzeRepository({ repo: repo.root });
  coverage = result.analyzers.governanceCoverage.find(({ concern }) => concern === 'incremental-verification');
  assert.equal(coverage.value, 'covered');
});
