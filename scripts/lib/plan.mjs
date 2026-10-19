import { createHash } from 'node:crypto';
import { normalizeRepoPath } from './filesystem.mjs';

export const ALLOWED_ACTIONS = new Set(['create', 'update-managed-section', 'move-after-confirmation', 'reference-existing', 'remove-after-confirmation']);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}

export function hashPlan(plan) {
  const { plan_hash, ...content } = plan;
  return createHash('sha256').update(JSON.stringify(stable(content))).digest('hex');
}

export function validatePlanShape(plan) {
  const errors = [];
  if (plan?.schema_version !== 'ai-project-bootstrap.plan.v1') errors.push('unknown plan schema_version');
  if (!Array.isArray(plan?.actions)) errors.push('actions must be an array');
  if (typeof plan?.plan_hash !== 'string' || hashPlan(plan) !== plan.plan_hash) errors.push('plan_hash does not match plan content');
  if (plan?.repository_before?.complete !== true || !plan.repository_before?.entries || typeof plan.repository_before.entries !== 'object') errors.push('repository_before must be a complete repository snapshot');
  for (const [index, action] of (plan?.actions ?? []).entries()) {
    if (!ALLOWED_ACTIONS.has(action.action)) errors.push(`action ${index} is not allowed`);
    try { normalizeRepoPath(action.target_path); } catch (error) { errors.push(`action ${index}: ${error.message}`); }
    for (const key of ['reason_evidence', 'depends_on', 'rollback']) if (action[key] === undefined) errors.push(`action ${index} missing ${key}`);
    if (!('before_sha256' in action) || !('after_sha256' in action)) errors.push(`action ${index} missing hashes`);
  }
  return errors;
}

export function createChangePlan({ evidence, manifest, decisions = [], actions = [], repository_before = {} }) {
  const deferred = new Set(decisions.filter(({ state }) => state !== 'accepted').map(({ id }) => id));
  const plan = {
    schema_version: 'ai-project-bootstrap.plan.v1',
    evidence_schema_version: evidence?.schema_version ?? null,
    manifest_schema_version: manifest?.schema_version ?? null,
    decisions: [...decisions].sort((a, b) => a.id.localeCompare(b.id)),
    repository_before,
    actions: actions.filter(({ depends_on = [] }) => !depends_on.some((id) => deferred.has(id))).map((action) => ({ ...action, target_path: normalizeRepoPath(action.target_path) })).sort((a, b) => a.target_path.localeCompare(b.target_path)),
  };
  plan.plan_hash = hashPlan(plan);
  return plan;
}

export function groupConflicts(conflicts) {
  const grouped = new Map();
  for (const conflict of conflicts) {
    if (!conflict.decision_key) continue;
    if (!grouped.has(conflict.decision_key)) grouped.set(conflict.decision_key, []);
    grouped.get(conflict.decision_key).push(conflict);
  }
  return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([id, evidence]) => ({
    id,
    evidence: [...evidence].sort((a, b) => `${a.source_path}:${a.value}`.localeCompare(`${b.source_path}:${b.value}`)),
    recommendation: null,
    alternatives: [],
    risk: 'Requires explicit user choice',
    affected_files: [...new Set(evidence.map(({ source_path }) => source_path))].sort(),
    dependent_actions: [],
    state: 'unresolved',
  }));
}

export function planGovernanceSkeleton({ existingPaths = [], optionalDocuments = [] } = {}) {
  const existing = new Set(existingPaths);
  const required = ['.ai-project-bootstrap/manifest.yaml', 'AGENTS.md', 'docs/agent/README.md', 'docs/agent/project-rules.md'];
  const candidates = [
    ...required.filter((path) => !existing.has(path)).map((target_path) => ({ target_path, content: null })),
    ...optionalDocuments.filter(({ path, content }) => !existing.has(path) && typeof content === 'string' && content.trim()).map(({ path, content }) => ({ target_path: path, content })),
  ];
  return candidates.map(({ target_path }) => ({
    action: 'create', target_path: normalizeRepoPath(target_path), reason_evidence: ['governance-core-or-confirmed-domain-need'],
    depends_on: [], before_sha256: null, after_sha256: null, rollback: 'remove created file',
  })).sort((a, b) => a.target_path.localeCompare(b.target_path));
}
