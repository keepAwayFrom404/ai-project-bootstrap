import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { validateSkill } from '../scripts/validate-skill.mjs';

const valid = '---\nname: fixture-skill\ndescription: Valid fixture instructions.\n---\n\n# Instructions\n';
async function fixture(t, content = valid) {
  const root = await mkdtemp(join(tmpdir(), 'bootstrap-skill-validation-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, 'SKILL.md'), content);
  return root;
}

test('validates the repository profile and local references using Node alone', async (t) => {
  const root = await fixture(t, valid + '[rules](references/rules.md)\n[web](https://example.invalid/rules)\n');
  await mkdir(join(root, 'references'));
  await writeFile(join(root, 'references/rules.md'), '# Rules');
  assert.deepEqual(await validateSkill(root), []);
  const script = new URL('../scripts/validate-skill.mjs', import.meta.url);
  const result = spawnSync(process.execPath, [script.pathname, root], {
    env: { PATH: dirname(process.execPath) }, encoding: 'utf8', timeout: 5000,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /valid/);
});

for (const [label, content] of [
  ['missing delimiters', '# Instructions'],
  ['duplicate fields', valid.replace('description:', 'name: duplicate\ndescription:')],
  ['missing description', valid.replace('description: Valid fixture instructions.\n', '')],
  ['invalid name', valid.replace('fixture-skill', 'Bad_Name')],
  ['unfinished placeholder', valid.replace('Valid fixture instructions.', '[TODO: finish]')],
  ['unsupported block YAML', valid.replace('Valid fixture instructions.', '>\n  multiline')],
  ['unsupported metadata', valid.replace('description:', 'metadata: {}\ndescription:')],
  ['empty body', valid.split('\n\n')[0] + '\n'],
]) {
  test(`rejects ${label}`, async (t) => {
    assert.ok((await validateSkill(await fixture(t, content))).length);
  });
}

test('rejects missing, absolute, scheme and symlink-escaping local references', async (t) => {
  const root = await fixture(t);
  const outside = await fixture(t);
  await symlink(outside, join(root, 'outside'));
  for (const target of ['missing.md', '/outside.md', 'file:///outside.md', 'outside/SKILL.md']) {
    await writeFile(join(root, 'SKILL.md'), valid + `[bad](${target})\n`);
    assert.ok((await validateSkill(root)).length, target);
  }
});
