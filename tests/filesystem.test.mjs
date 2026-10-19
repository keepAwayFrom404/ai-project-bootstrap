import assert from 'node:assert/strict';
import { mkdir, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { createRepoFixture } from './helpers/repo-fixture.mjs';

const filesystem = await import('../scripts/lib/filesystem.mjs').catch(() => ({}));

test('walkRepository rejects symlinks that escape the repository', async (t) => {
  assert.equal(typeof filesystem.walkRepository, 'function');
  const repo = await createRepoFixture({ files: { 'README.md': '# repo\n' } });
  const outside = await createRepoFixture({ files: { 'secret': 'do-not-read' } });
  t.after(() => repo.cleanup());
  t.after(() => outside.cleanup());
  await symlink(outside.root, join(repo.root, 'escape'));
  await assert.rejects(async () => {
    for await (const ignored of filesystem.walkRepository(repo.root)) void ignored;
  }, /outside repository/i);
});

test('walkRepository ignores dependency and build directories and enforces limits', async (t) => {
  assert.equal(typeof filesystem.walkRepository, 'function');
  const repo = await createRepoFixture({ files: { 'README.md': '# repo\n' } });
  t.after(() => repo.cleanup());
  await mkdir(join(repo.root, 'node_modules/pkg'), { recursive: true });
  await writeFile(join(repo.root, 'node_modules/pkg/index.js'), 'ignored');
  const entries = [];
  for await (const entry of filesystem.walkRepository(repo.root, { maxFiles: 5, maxBytes: 1000, maxFileBytes: 1000 })) entries.push(entry.path);
  assert.deepEqual(entries, ['README.md']);
  await assert.rejects(async () => {
    for await (const ignored of filesystem.walkRepository(repo.root, { maxFiles: 0 })) void ignored;
  }, /file limit/i);
});

test('walkRepository reports sensitive data directories without traversing their contents', async (t) => {
  const repo = await createRepoFixture({ files: { 'README.md': '# repo\n' } });
  t.after(() => repo.cleanup());
  await mkdir(join(repo.root, 'user_data/session'), { recursive: true });
  await writeFile(join(repo.root, 'user_data/session/cookies.json'), 'top-secret');
  const entries = [];
  for await (const entry of filesystem.walkRepository(repo.root, { maxBytes: 20 })) entries.push(entry);
  assert.ok(entries.some((entry) => entry.path === 'user_data' && entry.kind === 'sensitive-presence'));
  assert.ok(!entries.some((entry) => entry.path.includes('cookies.json')));
});

test('walkRepository honors root gitignore rules and can report a bounded limit warning', async (t) => {
  const repo = await createRepoFixture({ files: {
    '.gitignore': 'ignored/\n*.log\n!important.log\n',
    'ignored/a.txt': 'ignored',
    'debug.log': 'ignored',
    'important.log': 'kept',
    'README.md': '# kept\n',
  } });
  t.after(() => repo.cleanup());
  const warnings = [];
  const entries = [];
  for await (const entry of filesystem.walkRepository(repo.root, { maxFiles: 1, onWarning: (warning) => warnings.push(warning) })) entries.push(entry.path);
  assert.deepEqual(entries, ['.gitignore']);
  assert.equal(warnings[0].kind, 'scan-limit');
  const all = [];
  for await (const entry of filesystem.walkRepository(repo.root)) all.push(entry.path);
  assert.ok(all.includes('important.log'));
  assert.ok(!all.includes('debug.log') && !all.some((path) => path.startsWith('ignored/')));
});

test('captureRepositoryState detects unplanned additions without reading sensitive contents', async (t) => {
  assert.equal(typeof filesystem.captureRepositoryState, 'function');
  const repo = await createRepoFixture({ files: { 'README.md': '# x\n', '.env': 'SECRET=value\n', '.agent-browser-auth.json': '{"token":"secret"}\n' } });
  t.after(() => repo.cleanup());
  const before = await filesystem.captureRepositoryState(repo.root);
  await repo.write('extra.md', 'unexpected\n');
  const after = await filesystem.captureRepositoryState(repo.root);
  assert.equal(before.complete, true);
  assert.equal(before.entries['.env'], 'sensitive-presence');
  assert.equal(before.entries['.agent-browser-auth.json'], 'sensitive-presence');
  assert.ok(!before.entries['extra.md'] && after.entries['extra.md']);
});
