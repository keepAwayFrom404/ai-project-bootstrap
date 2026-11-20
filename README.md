# ai-project-bootstrap

`ai-project-bootstrap` analyzes a Git repository and helps an Agent establish or reconcile a small, auditable AI-development governance layer without replacing existing project authorities.

The repository root is the canonical Skill source. Copies under a consumer repository's `.agents/skills/ai-project-bootstrap/` are managed installation artifacts.

## Capabilities

- Classifies new projects, legacy repositories, and initialized repositories.
- Produces evidence and a deterministic Change Plan before project edits.
- Preserves human-owned guidance and stops on authority conflicts or drift.
- Validates the core governance registry and managed manifest.
- Offers stack-gated recommendations without silently adopting them.
- Keeps evidence and plan-hash mechanics internal for safe, unambiguous initialization; users are interrupted only for real conflicts or decisions.

It does not replace feature-development workflows, OpenSpec/Comet, `ai-dev-grow`, AgentMemory, CodeGraph, tests, or CI.

## Portable initialization foundations

Analyze reports four advisory concerns: progressive loading, tool independence, incremental verification, and readable code/module boundaries. Matching packs provide adaptable rules; `tooling` reports bounded command/path references from instructions, project Skills/Hooks and development scripts without executing them or reproducing source-line values.

These checks preserve existing project decisions. They do not install/remove workflows, generate automatic compliance guarantees, or force a pilot's framework, file size or worker count. See [generation guidance](references/initialization-foundations.md). Setup and troubleshooting stay on demand; local validation targets the scoped change and affected dependencies while preserving CI gates.

## Verify the source

```sh
npm run check
```

The Skill runtime and its tests use only Node.js built-ins. `validate:skill` resolves the Codex `skill-creator` validator from `CODEX_HOME`, falling back to `~/.codex`.

## Install into a project

The target must be an existing Git repository. Installation is deliberately two-step.

```sh
node scripts/install.mjs preview --repo /absolute/path/to/project
node scripts/install.mjs apply --repo /absolute/path/to/project --expected-plan-hash <hash-from-preview>
```

The installer writes only `.agents/skills/ai-project-bootstrap/`. It records managed hashes in `.install-manifest.json`, refuses unowned collisions, and blocks updates when an installed file has local drift. Run `preview` again whenever the source or target changes.

For a legacy project that already contains a complete project-level copy from before independent distribution, first adopt it without changing content, then run the normal upgrade:

```sh
node scripts/install.mjs adopt-preview --repo /absolute/path/to/project
node scripts/install.mjs adopt-apply --repo /absolute/path/to/project --expected-plan-hash <adoption-hash>
node scripts/install.mjs preview --repo /absolute/path/to/project
```

Adoption is intentionally unavailable after an installation manifest exists and refuses incomplete copies.

After installation, invoke `$ai-project-bootstrap` in the target project. The Skill itself will analyze and preview governance changes; installing the Skill does not authorize those changes.

## Development boundary

Shopee Utils was the first pilot and remains a consumer/validation case. Its `.ai-project-bootstrap/` and `docs/agent/` files are project state and are intentionally not part of this repository.

See [docs/architecture.md](docs/architecture.md) for source, installation, and upgrade boundaries.
The original pilot lineage is recorded in [docs/provenance.md](docs/provenance.md).
