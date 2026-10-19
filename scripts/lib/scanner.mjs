import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { resolveRepositoryRoot, walkRepository } from './filesystem.mjs';
import { analyze as inventory } from './analyzers/inventory.mjs';
import { analyze as stack } from './analyzers/stack.mjs';
import { analyze as commands } from './analyzers/commands.mjs';
import { analyze as guidance } from './analyzers/guidance.mjs';
import { analyze as standards } from './analyzers/standards.mjs';
import { analyze as quality } from './analyzers/quality.mjs';
import { analyze as workflow } from './analyzers/workflow.mjs';
import { analyze as git } from './analyzers/git.mjs';
import { analyze as governanceCoverage } from './analyzers/governance-coverage.mjs';
import { buildRecommendations } from './recommendations.mjs';

const ANALYZERS = { commands, git, governanceCoverage, guidance, inventory, quality, stack, standards, workflow };

function stable(items) {
  return [...items].sort((a, b) => [a.source_path, a.kind, String(a.value)].join('\0').localeCompare([b.source_path, b.kind, String(b.value)].join('\0')));
}

export async function analyzeRepository({ repo, limits } = {}) {
  const root = await resolveRepositoryRoot(repo ?? '.');
  const files = [];
  const walkWarnings = [];
  for await (const entry of walkRepository(root, { ...limits, onWarning: (warning) => walkWarnings.push(warning) })) files.push(entry);
  const context = { root, files, readText: (path) => readFile(resolve(root, path), 'utf8') };
  const analyzers = {};
  const warnings = [...walkWarnings];
  for (const [name, analyzer] of Object.entries(ANALYZERS)) {
    try { analyzers[name] = stable(await analyzer(context)); }
    catch (error) {
      analyzers[name] = [];
      warnings.push({ kind: 'analyzer-error', analyzer: name, message: error.message });
    }
  }
  const result = { schema_version: 'ai-project-bootstrap.evidence.v1', repository: '.', analyzers, warnings: stable(warnings.map((warning) => ({ source_path: warning.path ?? '', ...warning }))).map(({ source_path, ...warning }) => warning), file_paths: files.map(({ path }) => path).sort() };
  result.recommendations = buildRecommendations(result);
  result.mode_assessment = assessMode(result);
  return result;
}

export function assessMode({ analyzers = {}, warnings = [], file_paths = [] } = {}) {
  const blocking = warnings.some(({ kind, analyzer }) => kind === 'scan-limit' || (kind === 'analyzer-error' && ['governanceCoverage', 'inventory', 'guidance', 'standards'].includes(analyzer)));
  if (blocking) return { recommended_mode: 'consult-user', confidence: 'candidate', basis: ['repository evidence is incomplete'], requires_user_confirmation: true };
  if (file_paths.includes('.ai-project-bootstrap/manifest.yaml')) return { recommended_mode: 're-audit', confidence: 'confirmed', basis: ['.ai-project-bootstrap/manifest.yaml exists'], requires_user_confirmation: false };
  const sources = [...(analyzers.guidance ?? []), ...(analyzers.standards ?? [])].map(({ source_path }) => source_path);
  if (sources.length) return { recommended_mode: 'legacy-reconciliation', confidence: 'confirmed', basis: sources.sort(), requires_user_confirmation: false };
  return { recommended_mode: 'new-project', confidence: 'strong', basis: ['no existing Agent guidance or standards were detected'], requires_user_confirmation: false };
}
