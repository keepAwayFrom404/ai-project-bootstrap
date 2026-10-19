import { createHash } from 'node:crypto';
import { lstat, readFile, realpath, readdir, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

const DEFAULT_IGNORES = new Set(['.git', '.worktrees', '.pnpm-store', '.opencode', 'node_modules', 'dist', 'build', 'coverage', '.next', '.cache', 'midscene_run', 'diag']);
const SENSITIVE_DIRECTORIES = [/^user_data(?:_|$)/i, /^data$/i, /^data\/users$/i, /^data\/(?:miaoshou_)?cookies?$/i, /(?:^|\/)sessions?$/i];
const INDEX_DIRECTORIES = new Set(['.codegraph']);

export async function resolveRepositoryRoot(repoPath) {
  const root = await realpath(resolve(repoPath));
  if (!(await stat(root)).isDirectory()) throw new Error('Repository root must be a directory');
  return root;
}

export function normalizeRepoPath(path) {
  if (typeof path !== 'string' || !path || isAbsolute(path)) throw new Error('Path must be repository relative');
  const normalized = path.replaceAll('\\', '/').replace(/^\.\//, '');
  if (normalized === '..' || normalized.startsWith('../') || normalized.includes('/../')) throw new Error('Path escapes repository');
  return normalized;
}

export async function resolveInsideRepository(root, path, { allowMissing = false } = {}) {
  const base = await resolveRepositoryRoot(root);
  const normalized = normalizeRepoPath(path);
  const target = resolve(base, normalized);
  const local = relative(base, target);
  if (!local || local === '..' || local.startsWith(`..${sep}`)) throw new Error('Path outside repository');
  let current = base;
  for (const segment of local.split(sep)) {
    current = resolve(current, segment);
    try {
      const info = await lstat(current);
      if (info.isSymbolicLink()) {
        const destination = await realpath(current);
        const resolvedLocal = relative(base, destination);
        if (resolvedLocal === '..' || resolvedLocal.startsWith(`..${sep}`)) throw new Error(`Symlink outside repository: ${normalized}`);
      }
    } catch (error) {
      if (error.code === 'ENOENT' && allowMissing) break;
      throw error;
    }
  }
  return target;
}

export async function* walkRepository(root, limits = {}) {
  const base = await resolveRepositoryRoot(root);
  const maxFiles = limits.maxFiles ?? 50000;
  const maxBytes = limits.maxBytes ?? 256 * 1024 * 1024;
  const maxFileBytes = limits.maxFileBytes ?? 1024 * 1024;
  let files = 0;
  let bytes = 0;
  let stopped = false;
  const ignoreRules = await readIgnoreRules(base);
  async function* walk(directory, prefix = '') {
    if (stopped) return;
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (DEFAULT_IGNORES.has(entry.name)) continue;
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolute = resolve(directory, entry.name);
      if (isGitIgnored(path, entry.isDirectory(), ignoreRules)) continue;
      if (entry.isSymbolicLink()) {
        await resolveInsideRepository(base, path);
        continue;
      }
      if (entry.isDirectory() && INDEX_DIRECTORIES.has(path)) {
        yield { path, absolute_path: absolute, size: 0, readable: false, kind: 'index-presence' };
      }
      else if (entry.isDirectory() && SENSITIVE_DIRECTORIES.some((pattern) => pattern.test(path))) {
        yield { path, absolute_path: absolute, size: 0, readable: false, kind: 'sensitive-presence' };
      }
      else if (entry.isDirectory()) yield* walk(absolute, path);
      else if (entry.isFile()) {
        const size = (await stat(absolute)).size;
        files += 1;
        bytes += size;
        if (files > maxFiles || bytes > maxBytes) {
          const message = files > maxFiles ? `Repository file limit exceeded: ${maxFiles}` : `Repository byte limit exceeded: ${maxBytes}`;
          if (typeof limits.onWarning === 'function') {
            limits.onWarning({ kind: 'scan-limit', message, path });
            stopped = true;
            return;
          }
          throw new Error(message);
        }
        yield { path, absolute_path: absolute, size, readable: size <= maxFileBytes };
      }
    }
  }
  yield* walk(base);
}

async function readIgnoreRules(root) {
  try {
    return (await readFile(resolve(root, '.gitignore'), 'utf8')).split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#')).map((line) => ({ negated: line.startsWith('!'), pattern: line.replace(/^!/, '').replace(/^\//, '') }));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

function isGitIgnored(path, isDirectory, rules) {
  let ignored = false;
  for (const { negated, pattern } of rules) {
    const directoryPattern = pattern.endsWith('/');
    const raw = directoryPattern ? pattern.slice(0, -1) : pattern;
    const escaped = raw.replace(/[.+^${}()|[\]\\]/g, '\\$&').replaceAll('**', '\u0000').replaceAll('*', '[^/]*').replaceAll('\u0000', '.*').replaceAll('?', '[^/]');
    const matcher = raw.includes('/') ? new RegExp(`^${escaped}(?:/.*)?$`) : new RegExp(`(?:^|/)${escaped}${directoryPattern ? '(?:/.*)?' : '$'}`);
    if (matcher.test(path) && (!directoryPattern || isDirectory || path.startsWith(`${raw}/`))) ignored = !negated;
  }
  return ignored;
}

export async function captureRepositoryState(root, limits = {}) {
  const entries = {};
  const warnings = [];
  for await (const entry of walkRepository(root, { ...limits, onWarning: (warning) => warnings.push(warning) })) {
    entries[entry.path] = entry.kind === 'sensitive-presence' || isSensitivePath(entry.path)
      ? 'sensitive-presence'
      : entry.readable ? await sha256File(entry.absolute_path) : `presence:${entry.size}`;
  }
  return { complete: warnings.length === 0, entries: Object.fromEntries(Object.entries(entries).sort(([a], [b]) => a.localeCompare(b))), warnings };
}

export function isSensitivePath(path) {
  return /(^|\/)(?:\.env$|\.agent-browser-auth\.json$|cookies?\.json$|credentials?\.(?:json|ya?ml)$|secrets?\.(?:json|ya?ml)$|user_data(?:_|$))|^data$/i.test(path);
}

export async function sha256File(path) {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

export function sha256Text(text) {
  return createHash('sha256').update(text).digest('hex');
}
