import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { join } from 'node:path';
import { createRepoFixture } from './helpers/repo-fixture.mjs';
import { captureRepositoryState } from '../scripts/lib/filesystem.mjs';
import { analyzeRepository, assessMode } from '../scripts/lib/scanner.mjs';
import { createInstallPlan, applyInstallPlan } from '../scripts/install.mjs';

const ids = ['progressive-loading', 'tool-independence', 'incremental-verification', 'readable-code-boundaries'];
const texts = {
  'progressive-loading': 'Small foundation. Task-based routing: read relevant sections; do not recursively open links. One authority per concern.',
  'tool-independence': 'Repository-local commands. No global tool requirement. Explicit project decision for adoption. Missing tool is reported.',
  'incremental-verification': 'Declare a comparison baseline and affected dependencies. Reuse valid check results. Full-suite triggers require a reason. Preserve CI gates.',
  'readable-code-boundaries': 'Use business names and single responsibility. Define dependency direction and explicit side effects. Avoid speculative frameworks.',
};
const registry = (rows) => '# Registry\n| concern | authoritative path | scope | owner |\n| --- | --- | --- | --- |\n' + rows.map(([label, path]) => `| ${label} | ${path} | repository | team |\n`).join('');
const coverage = (evidence, id) => evidence.analyzers.governanceCoverage.find((item) => item.concern === id);

for (const initialized of [false, true]) {
  test(`all four gaps are proposed without mutations (${initialized ? 're-audit' : 'new'})`, async (t) => {
    const files = { 'src/a.py': 'print("fixture")\n' };
    if (initialized) files['.ai-project-bootstrap/manifest.yaml'] = '{"schema_version":"ai-project-bootstrap.manifest.v1"}\n';
    const repo = await createRepoFixture({ files }); t.after(() => repo.cleanup());
    const before = await captureRepositoryState(repo.root);
    const first = await analyzeRepository({ repo: repo.root });
    assert.equal(first.mode_assessment.recommended_mode, initialized ? 're-audit' : 'new-project');
    for (const id of ids) {
      assert.equal(coverage(first, id).value, 'missing');
      const recommendation = first.recommendations.find((item) => item.pack_id === id);
      assert.equal(recommendation.disposition, 'propose-create');
      assert.equal(recommendation.requires_user_confirmation, true);
      assert.ok((await readFile(new URL('../' + recommendation.reference_path, import.meta.url), 'utf8')).includes('pack_id: ' + id));
    }
    assert.deepEqual(await analyzeRepository({ repo: repo.root }), first);
    assert.deepEqual(await captureRepositoryState(repo.root), before);
  });
}

for (const id of ids) {
  test(`${id} needs one registered authority, not scattered prose or a filename`, async (t) => {
    const path = `docs/agent/${id}.md`;
    const repo = await createRepoFixture({ files: {
      'src/index.js': 'export const value = 1;',
      'AGENTS.md': texts[id],
      [path]: '# Placeholder\n',
      'docs/agent/README.md': registry([[id.replaceAll('-', ' '), path]]),
    } }); t.after(() => repo.cleanup());
    const before = await analyzeRepository({ repo: repo.root });
    assert.equal(coverage(before, id).value, 'partial');
    assert.ok(coverage(before, id).missing_topics.length);
    await repo.write(path, texts[id]);
    const after = await analyzeRepository({ repo: repo.root });
    assert.equal(coverage(after, id).value, 'covered');
    assert.equal(coverage(after, id).authority_path, path);
    const recommendation = after.recommendations.find((item) => item.pack_id === id);
    assert.equal(recommendation.disposition, 'compare-only');
    assert.equal(recommendation.requires_user_confirmation, false);
  });
}

test('foundations apply to Agent-guided repositories without selecting a framework', async (t) => {
  const repo = await createRepoFixture({ files: { 'AGENTS.md': '# Existing guidance\n' } }); t.after(() => repo.cleanup());
  const result = await analyzeRepository({ repo: repo.root });
  for (const id of ids) assert.ok(coverage(result, id));
  assert.ok(!result.recommendations.some((item) => item.pack_id === 'frontend-react-typescript'));
});

test('tool references are bounded advisory clues with no personal values or execution', async (t) => {
  const secret = '/Users/private-person/secret-token-tool';
  const repo = await createRepoFixture({ files: {
    'AGENTS.md': `Do not run comet resume-probe .\nUse ${secret}\n`,
    '.agents/skills/custom/SKILL.md': 'comet native status\n',
    '.codex/hooks.json': '{"command":"aidev resume CASE"}',
    'package.json': JSON.stringify({ scripts: { local: 'node ' + secret } }),
    'docs/archive/old.md': 'comet native next\n',
    'src/example.js': 'const example = "comet native next";',
    '.env': 'SECRET=' + secret,
  } }); t.after(() => repo.cleanup());
  const before = await captureRepositoryState(repo.root);
  const result = await analyzeRepository({ repo: repo.root });
  const clues = result.analyzers.tooling;
  assert.ok(clues.some((item) => item.source_path === 'AGENTS.md' && item.value === 'comet'));
  assert.ok(clues.some((item) => item.source_path === '.agents/skills/custom/SKILL.md'));
  assert.ok(clues.some((item) => item.source_path === '.codex/hooks.json'));
  assert.ok(clues.some((item) => item.source_locator === 'scripts.local'));
  assert.ok(clues.every((item) => item.confidence === 'candidate'));
  assert.ok(!clues.some((item) => item.source_path === 'docs/archive/old.md' || item.source_path === 'src/example.js' || item.source_path === '.env'));
  assert.ok(!JSON.stringify(clues).includes(secret));
  assert.deepEqual(await captureRepositoryState(repo.root), before);
});

test('a tooling analyzer failure blocks a completeness claim', () => {
  assert.equal(assessMode({ warnings: [{ kind: 'analyzer-error', analyzer: 'tooling' }] }).recommended_mode, 'consult-user');
});

test('installer distributes all foundations and tooling while preserving project state', async (t) => {
  const repo = await createRepoFixture({ files: { '.git/HEAD': 'ref: refs/heads/main\n', 'AGENTS.md': 'Human-owned rules\n' } }); t.after(() => repo.cleanup());
  const { plan } = await createInstallPlan(repo.root);
  await applyInstallPlan(repo.root, plan.plan_hash);
  const installed = join(repo.root, '.agents/skills/ai-project-bootstrap');
  for (const id of ids) assert.ok((await readFile(join(installed, 'references/packs', id + '.md'), 'utf8')).includes('pack_id: ' + id));
  assert.ok((await readFile(join(installed, 'scripts/lib/analyzers/tooling.mjs'), 'utf8')).includes('export async function analyze'));
  assert.equal(await repo.read('AGENTS.md'), 'Human-owned rules\n');
  const { analyzeRepository: installedAnalyze } = await import(join(installed, 'scripts/lib/scanner.mjs'));
  const result = await installedAnalyze({ repo: repo.root });
  assert.ok(result.recommendations.some((item) => item.pack_id === 'tool-independence'));
});
