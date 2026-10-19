import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { createRepoFixture } from './helpers/repo-fixture.mjs';

const scanner = await import('../scripts/lib/scanner.mjs').catch(() => ({}));

test('analyzeRepository emits sourced stable evidence without sensitive values', async (t) => {
  assert.equal(typeof scanner.analyzeRepository, 'function');
  const repo = await createRepoFixture('node-workspace');
  t.after(() => repo.cleanup());
  await writeFile(join(repo.root, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
  await writeFile(join(repo.root, '.env'), 'TOKEN=top-secret-value\n');
  const evidence = await scanner.analyzeRepository({ repo: repo.root });
  assert.equal(evidence.schema_version, 'ai-project-bootstrap.evidence.v1');
  assert.equal(evidence.mode_assessment.recommended_mode, 'legacy-reconciliation');
  assert.deepEqual(Object.keys(evidence.analyzers), ['commands', 'git', 'governanceCoverage', 'guidance', 'inventory', 'quality', 'stack', 'standards', 'workflow']);
  assert.ok(evidence.analyzers.stack.some((item) => item.kind === 'package-manager' && item.value === 'pnpm'));
  assert.ok(evidence.analyzers.stack.some((item) => item.kind === 'runtime' && item.source_path === 'packages/core/package.json'));
  assert.ok(evidence.analyzers.commands.some((item) => item.kind === 'quality-command' && item.value === 'npm test'));
  assert.ok(Array.isArray(evidence.recommendations));
  assert.match(JSON.stringify(evidence), /sensitive-presence/);
  assert.doesNotMatch(JSON.stringify(evidence), /top-secret-value/);
  assert.deepEqual(evidence, await scanner.analyzeRepository({ repo: repo.root }));
});

test('stack and recommendations include nested frontend package manifests', async (t) => {
  const repo = await createRepoFixture({ files: {
    'package.json': JSON.stringify({ dependencies: { express: '^5.0.0' } }),
    'web/package.json': JSON.stringify({ dependencies: { react: '^18.0.0', antd: '^5.0.0' }, devDependencies: { typescript: '^5.0.0' } }),
    'src/index.js': "const express = require('express');\n",
    'src/routes/a.js': 'module.exports = {};\n',
    'web/src/App.tsx': 'export default function App() { return null; }\n',
  } });
  t.after(() => repo.cleanup());
  const evidence = await scanner.analyzeRepository({ repo: repo.root });
  assert.ok(evidence.analyzers.stack.some(({ kind, value, source_path }) => kind === 'dependency' && value === 'antd' && source_path === 'web/package.json'));
  const ids = evidence.recommendations.map(({ pack_id }) => pack_id);
  assert.ok(ids.includes('frontend-react-typescript'));
  assert.ok(ids.includes('ui-antd-design-tokens'));
});

test('recommendation packs are stack-gated and never authorize implicit mutation', async (t) => {
  const repo = await createRepoFixture({ files: {
    'package.json': JSON.stringify({ dependencies: { express: '^5.0.0', react: '^18.0.0', typescript: '^5.0.0' } }),
    'src/index.js': "const express = require('express');\n",
    'src/routes/a.js': 'module.exports = {};\n',
    'web/src/App.tsx': 'export default function App() { return null; }\n',
    'AGENTS.md': '# Rules\nReact and TypeScript.\n',
  } });
  t.after(() => repo.cleanup());
  const evidence = await scanner.analyzeRepository({ repo: repo.root });
  const packs = new Map(evidence.recommendations.map((item) => [item.pack_id, item]));
  assert.equal(packs.get('frontend-react-typescript').disposition, 'propose-adjust');
  assert.equal(packs.get('frontend-react-typescript').requires_user_confirmation, true);
  assert.equal(packs.get('backend-node-express').disposition, 'propose-create');
  assert.equal(packs.get('api-rest-json').disposition, 'propose-create');
  assert.equal(packs.has('ui-antd-design-tokens'), false);
  assert.ok(packs.get('api-rest-json').sources.every((source) => source.startsWith('https://github.com/')));
});

test('governance coverage is technology-triggered and reports concrete missing topics', async (t) => {
  const repo = await createRepoFixture({ files: {
    'package.json': JSON.stringify({ dependencies: { express: '^5.0.0' }, scripts: { test: 'node --test' } }),
    'web/package.json': JSON.stringify({ dependencies: { react: '^18.0.0', antd: '^5.0.0' }, devDependencies: { vite: '^5.0.0' } }),
    'src/index.js': "const express = require('express');\n",
    'src/routes/orders.js': 'export const route = true;\n',
    'web/src/App.tsx': 'export default function App() { return null; }\n',
    'tests/api.test.js': 'test(\'x\', () => {});\n',
    'Dockerfile': 'FROM node:20\n',
    'openspec/config.yaml': 'schema: spec-driven\n',
    'AGENTS.md': '# Rules\nReact and TypeScript. API 调用统一走 services/api。修改后运行 npm test。\n',
  } });
  t.after(() => repo.cleanup());
  const evidence = await scanner.analyzeRepository({ repo: repo.root });
  const coverage = new Map(evidence.analyzers.governanceCoverage.map((item) => [item.concern, item]));
  assert.equal(coverage.get('frontend-engineering').value, 'partial');
  assert.equal(coverage.get('ui-ux').value, 'missing');
  assert.equal(coverage.get('backend-engineering').value, 'missing');
  assert.equal(coverage.get('api-contract').value, 'missing');
  assert.ok(coverage.get('api-contract').missing_topics.includes('response-envelope'));
  assert.equal(coverage.get('architecture-decisions-history').value, 'missing');
  assert.equal(coverage.get('operations-deployment').value, 'missing');
});

test('standards analyzer ignores implementation files whose names contain standards', async (t) => {
  const repo = await createRepoFixture({ files: {
    'src/standards.js': 'export const implementation = true;\n',
    'tools/engineering-helper.mjs': 'export const helper = true;\n',
    'docs/agent/frontend.md': '# Frontend rules\n',
  } });
  t.after(() => repo.cleanup());
  const evidence = await scanner.analyzeRepository({ repo: repo.root });
  assert.deepEqual(evidence.analyzers.standards.map(({ source_path }) => source_path), ['docs/agent/frontend.md']);
});

test('coverage requires a registered authority and does not combine scattered documents into covered', async (t) => {
  const repo = await createRepoFixture({ files: {
    'package.json': JSON.stringify({ dependencies: { react: '^18.0.0' } }),
    'web/src/App.tsx': 'export default function App() { return null; }\n',
    'AGENTS.md': 'React components use Hooks and call services/api. TypeScript is required.\n',
    'README.md': 'Run build:web for frontend verification.\n',
    'docs/agent/README.md': '# Registry\n| concern | authoritative path | scope | owner |\n| --- | --- | --- | --- |\n',
  } });
  t.after(() => repo.cleanup());
  const before = await scanner.analyzeRepository({ repo: repo.root });
  assert.equal(before.analyzers.governanceCoverage.find(({ concern }) => concern === 'frontend-engineering').value, 'partial');
  await repo.write('docs/agent/frontend.md', '# Frontend\nReact components use Hooks. State and API calls use services/api. TypeScript types live under types/. Run build:web for frontend verification.\n');
  await repo.write('docs/agent/README.md', '# Registry\n| concern | authoritative path | scope | owner |\n| --- | --- | --- | --- |\n| Frontend engineering | docs/agent/frontend.md | web | team |\n');
  const after = await scanner.analyzeRepository({ repo: repo.root });
  const coverage = after.analyzers.governanceCoverage.find(({ concern }) => concern === 'frontend-engineering');
  assert.equal(coverage.value, 'covered');
  assert.equal(coverage.authority_path, 'docs/agent/frontend.md');
});

test('missing topics are evaluated against the registered authority itself', async (t) => {
  const repo = await createRepoFixture({ files: {
    'package.json': JSON.stringify({ dependencies: { express: '^5.0.0' } }),
    'src/index.js': "const express = require('express');\n",
    'src/routes/a.js': 'module.exports = {};\n',
    'AGENTS.md': '请求契约、响应结构、HTTP 状态、认证授权、兼容迁移。\n',
    'docs/agent/README.md': '# Registry\n| concern | authoritative path | scope | owner |\n| --- | --- | --- | --- |\n| API contract | docs/agent/api.md | api | team |\n',
    'docs/agent/api.md': '# API\n认证与租户。\n',
  } });
  t.after(() => repo.cleanup());
  const evidence = await scanner.analyzeRepository({ repo: repo.root });
  const coverage = evidence.analyzers.governanceCoverage.find(({ concern }) => concern === 'api-contract');
  assert.equal(coverage.value, 'partial');
  assert.ok(coverage.missing_topics.includes('response-envelope'));
  assert.ok(coverage.missing_topics.includes('status-and-errors'));
});

test('mode assessment distinguishes new, legacy, re-audit, and uncertain evidence', async (t) => {
  for (const [definition, mode] of [['new-minimal', 'new-project'], ['legacy-conflicts', 'legacy-reconciliation']]) {
    const repo = await createRepoFixture(definition); t.after(() => repo.cleanup());
    assert.equal((await scanner.analyzeRepository({ repo: repo.root })).mode_assessment.recommended_mode, mode);
  }
  const audited = await createRepoFixture({ files: { 'README.md': '# x\n', '.ai-project-bootstrap/manifest.yaml': '{"schema_version":"ai-project-bootstrap.manifest.v1"}\n' } });
  t.after(() => audited.cleanup());
  assert.equal((await scanner.analyzeRepository({ repo: audited.root })).mode_assessment.recommended_mode, 're-audit');
  const uncertain = scanner.assessMode({ analyzers: { inventory: [], guidance: [], standards: [] }, warnings: [{ kind: 'analyzer-error', analyzer: 'inventory' }] });
  assert.equal(uncertain.recommended_mode, 'consult-user');
});

test('analyzer failures are isolated as stable warnings', async (t) => {
  assert.equal(typeof scanner.analyzeRepository, 'function');
  const repo = await createRepoFixture({ files: { 'README.md': '# x\n', 'package.json': '{broken' } });
  t.after(() => repo.cleanup());
  const evidence = await scanner.analyzeRepository({ repo: repo.root });
  assert.ok(evidence.warnings.some((warning) => warning.kind === 'analyzer-error'));
  assert.ok(evidence.analyzers.inventory.length > 0);
});

test('inventory and workflow evidence stay bounded to relevant entrypoints', async (t) => {
  const repo = await createRepoFixture({ files: {
    'README.md': '# x\n',
    '.agents/skills/demo/SKILL.md': '# not sensitive\n',
    'openspec/config.yaml': 'schema: spec-driven\n',
    'openspec/changes/a/proposal.md': '# detail\n',
    '.ai-dev-grow/project.yaml': 'project_id: x\n',
    'src/credentialCrypto.js': 'export const safe = true;\n',
    'docs/getCookies.md': '# code docs\n',
    '.env.example': 'TOKEN=template\n',
  } });
  t.after(() => repo.cleanup());
  const evidence = await scanner.analyzeRepository({ repo: repo.root });
  assert.ok(!evidence.analyzers.inventory.some((item) => item.source_path.includes('.agents') && item.kind === 'sensitive-presence'));
  assert.deepEqual(evidence.analyzers.workflow.map(({ source_path }) => source_path), ['.ai-dev-grow/project.yaml', 'openspec/config.yaml']);
  assert.ok(evidence.analyzers.inventory.length <= 6);
  assert.ok(!evidence.analyzers.inventory.some((item) => /credentialCrypto|getCookies|\.env\.example/.test(item.source_path)));
});
