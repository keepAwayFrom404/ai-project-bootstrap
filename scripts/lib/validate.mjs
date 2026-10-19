import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ALLOWED_ACTIONS, validatePlanShape } from './plan.mjs';
import { hashManagedTarget } from './manifest.mjs';
import { captureRepositoryState, resolveInsideRepository } from './filesystem.mjs';

export async function verifyPlan({ repo, plan }) {
  const errors = validatePlanShape(plan);
  if (errors.length) return { ok: false, errors, checked_actions: 0 };
  const decisions = new Map((plan.decisions ?? []).map((decision) => [decision.id, decision.state]));
  for (const action of plan.actions ?? []) {
    if (!ALLOWED_ACTIONS.has(action.action)) continue;
    const current = await hashManagedTarget(repo, action.target_path);
    if (current !== action.before_sha256) errors.push(`${action.target_path}: before_sha256 drift`);
    for (const id of action.depends_on ?? []) if (decisions.get(id) !== 'accepted') errors.push(`${action.target_path}: decision ${id} is not accepted`);
  }
  return { ok: errors.length === 0, errors, checked_actions: plan.actions?.length ?? 0 };
}

export async function verifyApplied({ repo, plan }) {
  const errors = validatePlanShape(plan);
  if (errors.length) return { ok: false, errors, checked_actions: 0 };
  for (const action of plan.actions ?? []) {
    const current = await hashManagedTarget(repo, action.target_path);
    if (current !== action.after_sha256) errors.push(`${action.target_path}: after_sha256 mismatch`);
  }
  const targets = new Set((plan.actions ?? []).map(({ target_path }) => target_path));
  const current = await captureRepositoryState(repo);
  if (!current.complete) errors.push('current repository snapshot is incomplete');
  const beforeEntries = plan.repository_before.entries;
  for (const path of new Set([...Object.keys(beforeEntries), ...Object.keys(current.entries)])) {
    if (!targets.has(path) && current.entries[path] !== beforeEntries[path]) errors.push(`${path}: plan-external file changed`);
  }
  return { ok: errors.length === 0, errors, checked_actions: plan.actions?.length ?? 0 };
}

export async function validateGovernance({ repo, manifest }) {
  const errors = [];
  const warnings = [];
  const checks = [];
  for (const path of ['AGENTS.md', 'docs/agent/README.md', 'docs/agent/project-rules.md', '.ai-project-bootstrap/manifest.yaml']) {
    try { await readFile(join(repo, path), 'utf8'); checks.push({ path, ok: true }); }
    catch { errors.push(`missing core path: ${path}`); checks.push({ path, ok: false }); }
  }
  try {
    const registry = await readFile(join(repo, 'docs/agent/README.md'), 'utf8');
    const rows = registry.split('\n').filter((line) => /^\|/.test(line)).map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim())).filter(([concern]) => concern && !/^[-:]+$/.test(concern) && concern.toLowerCase() !== 'concern');
    const concerns = rows.map(([concern]) => concern);
    const duplicates = concerns.filter((value, index) => concerns.indexOf(value) !== index);
    if (duplicates.length) errors.push(`duplicate authority: ${[...new Set(duplicates)].join(', ')}`);
    for (const [, path] of rows) {
      if (!path || /^https?:/.test(path)) continue;
      try { await access(await resolveInsideRepository(repo, path)); } catch (error) { errors.push(`broken reference or path outside repository: ${path} (${error.message})`); }
    }
  } catch {}
  if (!Array.isArray(manifest?.quality_commands) || manifest.quality_commands.length === 0) errors.push('missing executable quality command');
  else {
    for (const command of manifest.quality_commands) {
      const rootMatch = /^npm (?:run )?([A-Za-z0-9:_-]+)$/.exec(command);
      const nestedMatch = /^npm --prefix ([^ ]+) run ([A-Za-z0-9:_-]+)$/.exec(command);
      let packagePath = 'package.json';
      let scriptName = rootMatch?.[1];
      if (nestedMatch) {
        try { packagePath = `${await resolveInsideRepository(repo, nestedMatch[1])}/package.json`; }
        catch { errors.push(`quality command is not executable from package scripts: ${command}`); continue; }
        scriptName = nestedMatch[2];
      }
      if (!scriptName) { errors.push(`quality command is not executable from package scripts: ${command}`); continue; }
      let scripts = {};
      try { scripts = JSON.parse(await readFile(nestedMatch ? packagePath : join(repo, packagePath), 'utf8')).scripts ?? {}; } catch {}
      if (!scripts[scriptName]) errors.push(`quality command is not executable from package scripts: ${command}`);
    }
  }
  for (const path of manifest?.optional_documents ?? []) {
    try { if (!(await readFile(await resolveInsideRepository(repo, path), 'utf8')).trim()) errors.push(`empty optional document: ${path}`); }
    catch (error) { errors.push(`broken optional document or path outside repository: ${path} (${error.message})`); }
  }
  for (const exception of manifest?.path_exceptions ?? []) {
    if (/CLAUDE\.md$/i.test(exception.path)) warnings.push(`adapter check deferred by manifest exception: ${exception.path}`);
  }
  if (manifest?.schema_version !== 'ai-project-bootstrap.manifest.v1') errors.push('unknown manifest schema');
  return { ok: errors.length === 0, errors, warnings, checks };
}
