import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { resolveInsideRepository, sha256File } from './filesystem.mjs';

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).filter((key) => key !== 'last_run_at').sort().map((key) => [key, sortValue(value[key])]));
  return value;
}

export function serializeManifest(manifest) {
  return `${JSON.stringify(sortValue(manifest), null, 2)}\n`;
}

export async function readManifest(repo) {
  try { return JSON.parse(await readFile(join(repo, '.ai-project-bootstrap/manifest.yaml'), 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return null; throw new Error(`Invalid bootstrap manifest: ${error.message}`); }
}

export async function hashManagedTarget(repo, target) {
  try { return await sha256File(await resolveInsideRepository(repo, target, { allowMissing: true })); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

export function classifyManagedTarget({ manifest, currentHash, target }) {
  const saved = manifest?.managed_targets?.[target];
  if (!saved) return currentHash === null ? 'first-run' : 'first-run';
  if (currentHash === null) return 'missing';
  return saved.sha256 === currentHash ? 'unchanged' : 'manual-drift';
}
