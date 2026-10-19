#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { access, lstat, mkdir, readFile, readdir, realpath, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const INSTALL_ROOT = '.agents/skills/ai-project-bootstrap';
const MANIFEST_NAME = '.install-manifest.json';
const INCLUDED_ROOTS = ['SKILL.md', 'agents', 'references', 'scripts'];
const EXCLUDED_SOURCE_FILES = new Set([`scripts/${basename(fileURLToPath(import.meta.url))}`]);

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {};
  for (let index = 0; index < rest.length; index += 2) {
    const flag = rest[index];
    const value = rest[index + 1];
    if (!flag?.startsWith('--') || value === undefined) throw new Error(`Invalid option: ${flag ?? '<missing>'}`);
    options[flag.slice(2)] = value;
  }
  if (!['preview', 'apply', 'adopt-preview', 'adopt-apply'].includes(command)) {
    throw new Error('Command must be preview, apply, adopt-preview, or adopt-apply');
  }
  if (!options.repo) throw new Error('Required option: --repo');
  if (command.endsWith('apply') && !options['expected-plan-hash']) throw new Error('Apply requires --expected-plan-hash');
  return { command, options };
}

async function exists(path) {
  try { await access(path, constants.F_OK); return true; } catch { return false; }
}

function assertInside(root, path) {
  const rel = relative(root, path);
  if (!rel || rel === '..' || rel.startsWith(`..${sep}`)) throw new Error(`Path escapes target: ${path}`);
}

async function assertNoSymlinkPath(root, target) {
  assertInside(root, target);
  let current = root;
  for (const segment of relative(root, target).split(sep)) {
    current = join(current, segment);
    try {
      if ((await lstat(current)).isSymbolicLink()) throw new Error(`Symlink path is not installable: ${current}`);
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
  }
}

async function listSourceFiles() {
  const files = [];
  async function walk(path, rel) {
    const entry = await lstat(path);
    if (entry.isSymbolicLink()) throw new Error(`Source symlink is not distributable: ${rel}`);
    if (entry.isDirectory()) {
      for (const child of (await readdir(path)).sort()) await walk(join(path, child), rel ? `${rel}/${child}` : child);
      return;
    }
    if (entry.isFile() && !EXCLUDED_SOURCE_FILES.has(rel)) files.push(rel);
  }
  for (const root of INCLUDED_ROOTS) await walk(join(SOURCE_ROOT, root), root);
  return files;
}

async function readJson(path, fallback = null) {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw new Error(`Invalid JSON at ${path}: ${error.message}`); }
}

async function hashFile(path) { return sha256(await readFile(path)); }

export async function createInstallPlan(repoInput) {
  const repo = await realpath(resolve(repoInput));
  if (!(await stat(repo)).isDirectory()) throw new Error('Target repository must be a directory');
  if (!(await exists(join(repo, '.git')))) throw new Error('Target must be an initialized Git repository');
  const destination = join(repo, INSTALL_ROOT);
  await assertNoSymlinkPath(repo, destination);
  const manifestPath = join(destination, MANIFEST_NAME);
  const previous = await readJson(manifestPath, { schema_version: 'ai-project-bootstrap.install.v1', files: {} });
  if (previous.schema_version !== 'ai-project-bootstrap.install.v1') throw new Error('Unsupported installation manifest schema');

  const sourceFiles = await listSourceFiles();
  const desired = {};
  for (const path of sourceFiles) desired[path] = await hashFile(join(SOURCE_ROOT, path));
  const actions = [];
  const conflicts = [];

  for (const path of sourceFiles) {
    const target = join(destination, path);
    await assertNoSymlinkPath(repo, target);
    const currentHash = await exists(target) ? await hashFile(target) : null;
    const previousHash = previous.files?.[path] ?? null;
    const desiredHash = desired[path];
    if (currentHash === desiredHash) actions.push({ action: 'unchanged', path, before_sha256: currentHash, after_sha256: desiredHash });
    else if (currentHash === null) actions.push({ action: 'create', path, before_sha256: null, after_sha256: desiredHash });
    else if (previousHash === currentHash) actions.push({ action: 'update', path, before_sha256: currentHash, after_sha256: desiredHash });
    else conflicts.push({ path, reason: previousHash ? 'managed-file-drift' : 'unmanaged-collision', current_sha256: currentHash, previous_sha256: previousHash, desired_sha256: desiredHash });
  }

  for (const [path, previousHash] of Object.entries(previous.files ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
    if (desired[path]) continue;
    const target = join(destination, path);
    await assertNoSymlinkPath(repo, target);
    const currentHash = await exists(target) ? await hashFile(target) : null;
    if (currentHash === null) actions.push({ action: 'unchanged-removed', path, before_sha256: null, after_sha256: null });
    else if (currentHash === previousHash) actions.push({ action: 'delete', path, before_sha256: currentHash, after_sha256: null });
    else conflicts.push({ path, reason: 'removed-managed-file-drift', current_sha256: currentHash, previous_sha256: previousHash, desired_sha256: null });
  }

  const packageJson = await readJson(join(SOURCE_ROOT, 'package.json'), { version: 'unversioned' });
  const plan = {
    schema_version: 'ai-project-bootstrap.install-plan.v1',
    source: { name: 'ai-project-bootstrap', version: packageJson.version },
    destination: `${repo}/${INSTALL_ROOT}`,
    actions: actions.sort((a, b) => a.path.localeCompare(b.path)),
    conflicts: conflicts.sort((a, b) => a.path.localeCompare(b.path)),
  };
  plan.plan_hash = sha256(JSON.stringify(plan));
  return { plan, repo, destination, desired };
}

export async function createAdoptionPlan(repoInput) {
  const repo = await realpath(resolve(repoInput));
  if (!(await stat(repo)).isDirectory() || !(await exists(join(repo, '.git')))) {
    throw new Error('Target must be an initialized Git repository');
  }
  const destination = join(repo, INSTALL_ROOT);
  await assertNoSymlinkPath(repo, destination);
  if (await exists(join(destination, MANIFEST_NAME))) throw new Error('Installation is already managed');
  const files = {};
  const missing = [];
  for (const path of await listSourceFiles()) {
    const target = join(destination, path);
    await assertNoSymlinkPath(repo, target);
    if (!(await exists(target))) missing.push(path);
    else files[path] = await hashFile(target);
  }
  const plan = {
    schema_version: 'ai-project-bootstrap.adoption-plan.v1',
    source: { name: 'ai-project-bootstrap', version: 'legacy-project-copy' },
    destination: `${repo}/${INSTALL_ROOT}`,
    actions: Object.keys(files).sort().map((path) => ({ action: 'adopt', path, sha256: files[path] })),
    conflicts: missing.map((path) => ({ path, reason: 'missing-runtime-file' })),
  };
  plan.plan_hash = sha256(JSON.stringify(plan));
  return { plan, destination, files };
}

async function atomicWrite(path, content) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  await writeFile(temporary, content);
  await rename(temporary, path);
}

export async function applyInstallPlan(repoInput, expectedPlanHash) {
  const prepared = await createInstallPlan(repoInput);
  const { plan, destination, desired } = prepared;
  if (plan.plan_hash !== expectedPlanHash) throw new Error(`Install plan changed: expected ${expectedPlanHash}, current ${plan.plan_hash}`);
  if (plan.conflicts.length) throw new Error(`Install conflicts must be resolved first: ${plan.conflicts.map(({ path }) => path).join(', ')}`);
  for (const action of plan.actions) {
    const target = join(destination, action.path);
    if (action.action === 'create' || action.action === 'update') await atomicWrite(target, await readFile(join(SOURCE_ROOT, action.path)));
    else if (action.action === 'delete') await rm(target);
  }
  const manifest = {
    schema_version: 'ai-project-bootstrap.install.v1',
    source: plan.source,
    files: Object.fromEntries(Object.entries(desired).sort(([a], [b]) => a.localeCompare(b))),
  };
  await atomicWrite(join(destination, MANIFEST_NAME), `${JSON.stringify(manifest, null, 2)}\n`);
  return { ...plan, applied: true };
}

export async function applyAdoptionPlan(repoInput, expectedPlanHash) {
  const { plan, destination, files } = await createAdoptionPlan(repoInput);
  if (plan.plan_hash !== expectedPlanHash) throw new Error(`Adoption plan changed: expected ${expectedPlanHash}, current ${plan.plan_hash}`);
  if (plan.conflicts.length) throw new Error(`Adoption conflicts must be resolved first: ${plan.conflicts.map(({ path }) => path).join(', ')}`);
  const manifest = { schema_version: 'ai-project-bootstrap.install.v1', source: plan.source, files };
  await atomicWrite(join(destination, MANIFEST_NAME), `${JSON.stringify(manifest, null, 2)}\n`);
  return { ...plan, applied: true };
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  const result = command === 'preview'
    ? (await createInstallPlan(options.repo)).plan
    : command === 'apply'
      ? await applyInstallPlan(options.repo, options['expected-plan-hash'])
      : command === 'adopt-preview'
        ? (await createAdoptionPlan(options.repo)).plan
        : await applyAdoptionPlan(options.repo, options['expected-plan-hash']);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 2; });
}
