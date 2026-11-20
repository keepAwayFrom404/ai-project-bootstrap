#!/usr/bin/env node
import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { access, lstat, mkdir, open, readFile, readdir, realpath, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeInstalledFile, utf8 } from './lib/install-merge.mjs';
const SOURCE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const INSTALL_ROOT = '.agents/skills/ai-project-bootstrap';
const MANIFEST_NAME = '.install-manifest.json';
const INCLUDED_ROOTS = ['SKILL.md', 'LICENSE', 'agents', 'references', 'scripts'];
const EXCLUDED_SOURCE_FILES = new Set([`scripts/${basename(fileURLToPath(import.meta.url))}`]);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
function parseArgs(argv) {
    const [command, ...rest] = argv;
    const options = {};
    for (let index = 0; index < rest.length; index += 2) {
        const flag = rest[index];
        const value = rest[index + 1];
        if (!flag?.startsWith('--') || value === undefined || Object.hasOwn(options, flag.slice(2)))
            throw new Error(`Invalid option: ${flag ?? '<missing>'}`);
        options[flag.slice(2)] = value;
    }
    if (!['preview', 'apply', 'review', 'adopt-preview', 'adopt-apply'].includes(command)) {
        throw new Error('Command must be preview, apply, review, adopt-preview, or adopt-apply');
    }
    if (!options.repo)
        throw new Error('Required option: --repo');
    if (command.endsWith('apply') && !options['expected-plan-hash'])
        throw new Error('Apply requires --expected-plan-hash');
    const allowed = new Set(['repo', 'expected-plan-hash', 'resolutions', 'path']);
    if (Object.keys(options).some((key) => !allowed.has(key)))
        throw new Error('Unknown option');
    if (command.startsWith('adopt-') && options.resolutions)
        throw new Error('Adoption does not accept install resolutions');
    if (command === 'review' && !options.path)
        throw new Error('Review requires --path');
    return { command, options };
}
async function exists(path) {
    try {
        await access(path, constants.F_OK);
        return true;
    }
    catch (caught) {
        const error = caught;
        if (error.code === 'ENOENT')
            return false;
        throw error;
    }
}
function assertInside(root, path) {
    const rel = relative(root, path);
    if (!rel || rel === '..' || rel.startsWith(`..${sep}`))
        throw new Error(`Path escapes target: ${path}`);
}
async function assertNoSymlinkPath(root, target) {
    assertInside(root, target);
    let current = root;
    for (const segment of relative(root, target).split(sep)) {
        current = join(current, segment);
        try {
            if ((await lstat(current)).isSymbolicLink())
                throw new Error(`Symlink path is not installable: ${current}`);
        }
        catch (caught) {
            const error = caught;
            if (error.code === 'ENOENT')
                return;
            throw error;
        }
    }
}
async function listSourceFiles(sourceRoot = SOURCE_ROOT) {
    const files = [];
    async function walk(path, rel) {
        const entry = await lstat(path);
        if (entry.isSymbolicLink())
            throw new Error(`Source symlink is not distributable: ${rel}`);
        if (entry.isDirectory()) {
            for (const child of (await readdir(path)).sort())
                await walk(join(path, child), rel ? `${rel}/${child}` : child);
            return;
        }
        if (entry.isFile() && !EXCLUDED_SOURCE_FILES.has(rel))
            files.push(rel);
    }
    for (const root of INCLUDED_ROOTS)
        await walk(join(sourceRoot, root), root);
    return files;
}
async function readJson(path, fallback) {
    try {
        return JSON.parse(await readFile(path, 'utf8'));
    }
    catch (caught) {
        const error = caught;
        if (error.code === 'ENOENT')
            return fallback;
        throw new Error(`Invalid JSON at ${path}: ${error.message}`);
    }
}
async function hashFile(path) { return sha256(await readFile(path)); }
function safeResourcePath(path) {
    if (typeof path !== 'string' || !path || path.includes('\\') || path.includes(':') || isAbsolute(path)
        || path.split('/').some((part) => !part || part === '.' || part === '..')
        || !INCLUDED_ROOTS.some((root) => path === root || (['agents', 'references', 'scripts'].includes(root) && path.startsWith(root + '/')))
        || EXCLUDED_SOURCE_FILES.has(path))
        throw new Error(`Invalid managed resource path: ${path}`);
    return path;
}
const digest = (value) => value === null ? null : sha256(value);
const validHash = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const mapLike = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
async function resource(repo, destination, path) {
    const target = join(destination, safeResourcePath(path));
    await assertNoSymlinkPath(repo, target);
    try {
        if (!(await lstat(target)).isFile())
            throw new Error(`Managed resource is not a regular file: ${path}`);
        return await readFile(target);
    }
    catch (caught) {
        const error = caught;
        if (error.code === 'ENOENT')
            return null;
        throw error;
    }
}
function validateManifest(previous) {
    if (!mapLike(previous) || typeof previous.schema_version !== 'string' || !['ai-project-bootstrap.install.v1', 'ai-project-bootstrap.install.v2'].includes(previous.schema_version) || !mapLike(previous.files))
        throw new Error('Unsupported or invalid installation manifest');
    for (const [path, hash] of Object.entries(previous.files)) {
        safeResourcePath(path);
        if (!validHash(hash))
            throw new Error('Invalid upstream digest in installation manifest');
    }
    if (previous.local_overrides !== undefined) {
        if (!mapLike(previous.local_overrides))
            throw new Error('Invalid local overrides');
        for (const [path, entry] of Object.entries(previous.local_overrides)) {
            safeResourcePath(path);
            if (!mapLike(entry) || (entry.sha256 !== null && !validHash(entry.sha256)))
                throw new Error('Invalid local override digest');
        }
    }
}
export async function createInstallPlan(repoInput, options = {}) {
    const repo = await realpath(resolve(repoInput));
    if (!(await stat(repo)).isDirectory() || !(await exists(join(repo, '.git'))))
        throw new Error('Target must be an initialized Git repository');
    const sourceRoot = await realpath(options.sourceRoot ?? SOURCE_ROOT);
    const resolutions = options.resolutions === undefined ? {} : options.resolutions;
    if (!mapLike(resolutions))
        throw new Error('Resolutions must be a path-to-decision object');
    const destination = join(repo, INSTALL_ROOT);
    await assertNoSymlinkPath(repo, destination);
    const manifestPath = join(destination, MANIFEST_NAME);
    await assertNoSymlinkPath(repo, manifestPath);
    const manifestBytes = await readFile(manifestPath).catch((error) => {
        if (error.code === 'ENOENT')
            return null;
        throw error;
    });
    const previous = manifestBytes === null ? { schema_version: 'ai-project-bootstrap.install.v1', files: {} } : JSON.parse(manifestBytes.toString('utf8'));
    validateManifest(previous);
    const upstream = new Map();
    for (const path of await listSourceFiles(sourceRoot))
        upstream.set(safeResourcePath(path), await readFile(join(sourceRoot, path)));
    const desired = Object.fromEntries([...upstream].map(([path, content]) => [path, sha256(content)]));
    const paths = [...new Set([...Object.keys(desired), ...Object.keys(previous.files), ...Object.keys(previous.schema_version.endsWith('v2') ? previous.local_overrides ?? {} : {})])].sort();
    for (const path of Object.keys(resolutions))
        if (!paths.includes(safeResourcePath(path)))
            throw new Error(`Resolution does not match a managed resource: ${path}`);
    const actions = [], conflicts = [], contents = new Map(), reviews = new Map();
    for (const path of paths) {
        const local = await resource(repo, destination, path);
        const incoming = upstream.get(path) ?? null;
        const currentHash = digest(local), desiredHash = digest(incoming), previousHash = previous.files[path] ?? null;
        let base = null;
        if (previousHash && previous.schema_version.endsWith('v2')) {
            const basePath = join(destination, '.install-base', previousHash);
            await assertNoSymlinkPath(repo, basePath);
            base = await readFile(basePath).catch((error) => {
                if (error.code === 'ENOENT')
                    return null;
                throw error;
            });
            if (base !== null && sha256(base) !== previousHash)
                throw new Error(`Upstream base snapshot is corrupt: ${path}`);
        }
        const metadata = { path, before_sha256: currentHash, previous_sha256: previousHash, upstream_sha256: desiredHash };
        let action, content = incoming, reason = null, candidate = null;
        const decision = resolutions[path];
        if (decision !== undefined) {
            if (!mapLike(decision) || !['keep-local', 'use-upstream', 'merged-file'].includes(decision.action))
                throw new Error(`Invalid resolution: ${path}`);
            if (decision.action === 'keep-local') {
                action = 'preserve-local';
                content = local;
            }
            else if (decision.action === 'use-upstream')
                action = incoming === null ? 'delete' : 'update';
            else {
                if (typeof decision.file !== 'string' || isAbsolute(decision.file) || decision.file.includes('\\') || decision.file.split('/').some((part) => !part || part === '.' || part === '..' || part === '.git' || part.startsWith('.env') || /^(?:credentials?|secrets?|cookies?|tokens?)\.(?:json|ya?ml)$/i.test(part)))
                    throw new Error('Merged file must be repository-relative');
                const selected = resolve(repo, decision.file);
                await assertNoSymlinkPath(repo, selected);
                if (!(await stat(selected)).isFile())
                    throw new Error('Merged candidate is not a regular file');
                content = await readFile(selected);
                if (!utf8(content) || /^(?:<{7} |>{7} |\|{7} )/m.test(content.toString('utf8')))
                    throw new Error('Merged candidate must be UTF-8 text without conflict markers');
                action = 'resolved-merge';
                candidate = content;
            }
        }
        else if (previous.source?.version === 'legacy-project-copy' && Object.hasOwn(previous.files, path) && currentHash !== desiredHash) {
            action = 'preserve-local';
            content = local;
        }
        else if (currentHash === desiredHash)
            action = incoming === null ? 'unchanged-removed' : 'unchanged';
        else if (previousHash === null && !Object.hasOwn(previous.local_overrides ?? {}, path)) {
            if (local === null)
                action = 'create';
            else
                reason = 'unmanaged-collision';
        }
        else if (currentHash === previousHash)
            action = incoming === null ? 'delete' : 'update';
        else if (desiredHash === previousHash || incoming === null) {
            action = 'preserve-local';
            content = local;
        }
        else if (local === null)
            reason = 'local-deletion-upstream-change';
        else if (base === null)
            reason = 'missing-upstream-base';
        else {
            const merged = await mergeInstalledFile(local, base, incoming);
            candidate = merged.content;
            if (merged.clean) {
                action = 'merge';
                content = merged.content;
            }
            else
                reason = merged.reason;
        }
        reviews.set(path, { ...metadata, base, local, upstream: incoming, candidate });
        if (reason)
            conflicts.push({ ...metadata, reason });
        else {
            if (!action)
                throw new Error(`No install action selected: ${path}`);
            actions.push({ ...metadata, action, after_sha256: digest(content) });
            contents.set(path, content);
        }
    }
    const pkg = await readJson(join(sourceRoot, 'package.json'), { version: 'unversioned' });
    const plan = {
        schema_version: 'ai-project-bootstrap.install-plan.v2',
        source: { name: 'ai-project-bootstrap', version: pkg.version, tree_sha256: sha256(JSON.stringify(desired)) },
        destination,
        manifest_sha256: digest(manifestBytes),
        resolutions,
        actions,
        conflicts,
    };
    return { plan: { ...plan, plan_hash: sha256(JSON.stringify(plan)) }, repo, destination, desired, upstream, contents, reviews };
}
export async function reviewInstallFile(repo, path, options = {}) {
    const prepared = await createInstallPlan(repo, options);
    const review = prepared.reviews.get(safeResourcePath(path));
    if (!review)
        throw new Error('No such managed resource in the install plan');
    const result = { path, plan_hash: prepared.plan.plan_hash, action: prepared.plan.actions.find((action) => action.path === path) ?? null, conflict: prepared.plan.conflicts.find((conflict) => conflict.path === path) ?? null };
    for (const key of ['base', 'local', 'upstream', 'candidate'])
        result[key] = review[key] === null ? null : utf8(review[key]) ? review[key].toString('utf8') : '[binary content omitted]';
    return result;
}
export async function createAdoptionPlan(repoInput) {
    const repo = await realpath(resolve(repoInput));
    if (!(await stat(repo)).isDirectory() || !(await exists(join(repo, '.git')))) {
        throw new Error('Target must be an initialized Git repository');
    }
    const destination = join(repo, INSTALL_ROOT);
    await assertNoSymlinkPath(repo, destination);
    if (await exists(join(destination, MANIFEST_NAME)))
        throw new Error('Installation is already managed');
    const files = {};
    const missing = [];
    for (const path of await listSourceFiles()) {
        const target = join(destination, path);
        await assertNoSymlinkPath(repo, target);
        if (!(await exists(target)))
            missing.push(path);
        else
            files[path] = await hashFile(target);
    }
    const plan = {
        schema_version: 'ai-project-bootstrap.adoption-plan.v1',
        source: { name: 'ai-project-bootstrap', version: 'legacy-project-copy' },
        destination: `${repo}/${INSTALL_ROOT}`,
        actions: Object.keys(files).sort().map((path) => ({ action: 'adopt', path, sha256: files[path] })),
        conflicts: missing.map((path) => ({ path, reason: 'missing-runtime-file' })),
    };
    return { plan: { ...plan, plan_hash: sha256(JSON.stringify(plan)) }, destination, files };
}
async function atomicWrite(path, content, mode = 0o644) {
    await mkdir(dirname(path), { recursive: true });
    const temporary = `${path}.tmp-${randomUUID()}`;
    try {
        await writeFile(temporary, content, { flag: 'wx', mode });
        await rename(temporary, path);
    }
    finally {
        await rm(temporary, { force: true });
    }
}
export async function applyInstallPlan(repoInput, expectedPlanHash, options = {}) {
    const initial = await createInstallPlan(repoInput, options);
    if (initial.plan.plan_hash !== expectedPlanHash)
        throw new Error(`Install plan changed: expected ${expectedPlanHash}, current ${initial.plan.plan_hash}`);
    if (initial.plan.conflicts.length)
        throw new Error(`Install conflicts must be resolved first: ${initial.plan.conflicts.map(({ path }) => path).join(', ')}`);
    await mkdir(initial.destination, { recursive: true });
    const lockPath = join(initial.destination, '.install.lock');
    const lock = await open(lockPath, 'wx', 0o600).catch((error) => {
        if (error.code === 'EEXIST')
            throw new Error('Installation is locked; inspect the other installer or stale lock before retrying');
        throw error;
    });
    const runId = randomUUID();
    const backupRoot = join(initial.destination, '.install-backups', runId);
    let started = false, backedUp = false;
    try {
        const prepared = await createInstallPlan(repoInput, options);
        const { plan, destination, desired, upstream, contents } = prepared;
        if (plan.plan_hash !== expectedPlanHash || plan.conflicts.length)
            throw new Error('Install plan changed while acquiring lock');
        // Baselines precede target writes, and remain available after partial failure.
        for (const [path, content] of upstream) {
            const basePath = join(destination, '.install-base', desired[path]);
            await assertNoSymlinkPath(prepared.repo, basePath);
            await atomicWrite(basePath, content);
        }
        const overrides = {};
        for (const action of plan.actions) {
            const local = await resource(prepared.repo, destination, action.path);
            if (digest(local) !== action.before_sha256)
                throw new Error(`Installed file changed during apply: ${action.path}`);
            const content = contents.get(action.path);
            if (action.after_sha256 !== action.upstream_sha256)
                overrides[action.path] = { sha256: action.after_sha256, upstream_sha256: action.upstream_sha256 };
            if (action.before_sha256 === action.after_sha256)
                continue;
            started = true;
            if (local !== null) {
                const backupPath = join(backupRoot, action.path);
                await assertNoSymlinkPath(prepared.repo, backupPath);
                await mkdir(dirname(backupPath), { recursive: true, mode: 0o700 });
                await atomicWrite(backupPath, local, 0o600);
                backedUp = true;
            }
            const target = join(destination, action.path);
            await assertNoSymlinkPath(prepared.repo, target);
            if (content === null)
                await rm(target, { force: true });
            else
                await atomicWrite(target, content);
        }
        const manifest = { schema_version: 'ai-project-bootstrap.install.v2', source: plan.source, files: desired, local_overrides: overrides };
        const manifestPath = join(destination, MANIFEST_NAME);
        await assertNoSymlinkPath(prepared.repo, manifestPath);
        const currentManifest = await readFile(manifestPath).catch((error) => {
            if (error.code === 'ENOENT')
                return null;
            throw error;
        });
        if (digest(currentManifest) !== plan.manifest_sha256)
            throw new Error('Installation manifest changed during apply');
        await atomicWrite(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
        return { ...plan, applied: true, backup_directory: backedUp ? backupRoot : null };
    }
    catch (caught) {
        const error = caught;
        if (started) {
            const failure = new Error(`Installation may be partial; preserve files and rerun preview. Backups: ${backedUp ? backupRoot : 'none (only new files written)'}. ${error.message}`);
            const partialFailure = failure;
            partialFailure.partial = true;
            partialFailure.backup_directory = backedUp ? backupRoot : null;
            throw failure;
        }
        throw error;
    }
    finally {
        await lock.close();
        await rm(lockPath, { force: true });
    }
}
export async function applyAdoptionPlan(repoInput, expectedPlanHash) {
    const initial = await createAdoptionPlan(repoInput);
    if (initial.plan.plan_hash !== expectedPlanHash)
        throw new Error(`Adoption plan changed: expected ${expectedPlanHash}, current ${initial.plan.plan_hash}`);
    if (initial.plan.conflicts.length)
        throw new Error('Adoption conflicts must be resolved first');
    const lockPath = join(initial.destination, '.install.lock');
    const lock = await open(lockPath, 'wx', 0o600).catch((error) => {
        if (error.code === 'EEXIST')
            throw new Error('Installation is locked');
        throw error;
    });
    try {
        const { plan, destination, files } = await createAdoptionPlan(repoInput);
        if (plan.plan_hash !== expectedPlanHash || plan.conflicts.length)
            throw new Error('Adoption plan changed while acquiring lock');
        const manifest = { schema_version: 'ai-project-bootstrap.install.v1', source: plan.source, files };
        await atomicWrite(join(destination, MANIFEST_NAME), `${JSON.stringify(manifest, null, 2)}\n`);
        return { ...plan, applied: true };
    }
    finally {
        await lock.close();
        await rm(lockPath, { force: true });
    }
}
async function main() {
    const { command, options } = parseArgs(process.argv.slice(2));
    const installOptions = options.resolutions ? { resolutions: JSON.parse(await readFile(options.resolutions, 'utf8')) } : {};
    const result = command === 'review' ? await reviewInstallFile(options.repo, options.path, installOptions) : command === 'preview'
        ? (await createInstallPlan(options.repo, installOptions)).plan
        : command === 'apply'
            ? await applyInstallPlan(options.repo, options['expected-plan-hash'], installOptions)
            : command === 'adopt-preview'
                ? (await createAdoptionPlan(options.repo)).plan
                : await applyAdoptionPlan(options.repo, options['expected-plan-hash']);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 2; });
}
