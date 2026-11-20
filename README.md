# ai-project-bootstrap

`ai-project-bootstrap` analyzes a Git repository and helps an Agent establish or reconcile a small, auditable AI-development governance layer without replacing existing project authorities.

The repository root is the canonical Skill source. Copies under a consumer repository's `.agents/skills/ai-project-bootstrap/` are managed installation artifacts with separately tracked project-local customizations.

## Capabilities

- Classifies new projects, legacy repositories, and initialized repositories.
- Produces evidence and a deterministic Change Plan before project edits.
- Preserves human-owned guidance and stops on authority conflicts or drift.
- Validates the core governance registry and managed manifest.
- Offers stack-gated recommendations without silently adopting them.
- Detects selected formatter configuration and recognized command bodies, and proposes a stack-compatible executable baseline when formatting governance is missing.
- Keeps evidence and plan-hash mechanics internal for safe, unambiguous initialization; users are interrupted only for real conflicts or decisions.

It does not replace feature-development workflows, OpenSpec/Comet, `ai-dev-grow`, AgentMemory, CodeGraph, tests, or CI.

## Portable initialization foundations

Analyze reports four advisory concerns: progressive loading, tool independence, incremental verification, and readable code/module boundaries. Matching packs provide adaptable rules; `tooling` reports bounded command/path references from instructions, project Skills/Hooks and development scripts without executing them or reproducing source-line values.

These checks preserve existing project decisions. They do not install/remove workflows, generate automatic compliance guarantees, or force a pilot's framework, file size or worker count. See [generation guidance](references/initialization-foundations.md). Setup and troubleshooting stay on demand; local validation targets the scoped change and affected dependencies while preserving CI gates.

## Verify the source

```sh
npm run check
```

Use Node.js 20 or later and Git. Node code uses only built-ins; customized three-way upgrades also invoke the already-required Git executable. `npm run check` requires no global Agent installation, Python or dependency installation. The validator checks this repository's simple frontmatter profile and local reference files, not full YAML or live host compatibility. See [contributing](CONTRIBUTING.md) for focused commands and limits.

## Install into a project

The target must be an existing Git repository. Installation is deliberately two-step.

```sh
node scripts/install.mjs preview --repo /absolute/path/to/project
node scripts/install.mjs apply --repo /absolute/path/to/project --expected-plan-hash <hash-from-preview>
```

The installer writes only `.agents/skills/ai-project-bootstrap/`. It records upstream bases and actual customization hashes in `.install-manifest.json`, refuses unowned collisions, preserves local-only edits/deletions and proposes three-way merges for simultaneous changes. Overlapping edits and missing historical bases block apply until reviewed. Run `preview` again whenever the source or target changes.

For a legacy project that already contains a complete project-level copy from before independent distribution, first adopt it without changing content, then run the normal upgrade:

```sh
node scripts/install.mjs adopt-preview --repo /absolute/path/to/project
node scripts/install.mjs adopt-apply --repo /absolute/path/to/project --expected-plan-hash <adoption-hash>
node scripts/install.mjs preview --repo /absolute/path/to/project
```

Adoption is intentionally unavailable after an installation manifest exists and refuses incomplete copies.

After installation, invoke `$ai-project-bootstrap` in the target project. The Skill itself will analyze and preview governance changes; installing the Skill does not authorize those changes.

For an already initialized project, upgrading the installed Skill does not reformat code or modify project dependencies. Invoke `$ai-project-bootstrap` again: the existing manifest selects `re-audit`, which evaluates newly supported concerns such as formatting and requires an explicit decision before dependency, build-file, formatter-config, or repository-wide formatting changes.

## Review customized upgrades

Preview remains read-only in the target repository. For a customized file, inspect its base/local/upstream versions and proposed merge:

```sh
node scripts/install.mjs review --repo /absolute/path/to/project --path SKILL.md
```

If automatic merging cannot preserve both versions, prepare a resolution JSON file. `keep-local` retains the current bytes/deletion, `use-upstream` explicitly replaces/removes them, and `merged-file` uses a reviewed UTF-8 file inside the target repository. Re-preview and apply with the **same** resolution file and new hash:

```sh
node scripts/install.mjs preview --repo /absolute/path/to/project --resolutions /path/to/resolutions.json
node scripts/install.mjs apply --repo /absolute/path/to/project --resolutions /path/to/resolutions.json --expected-plan-hash <new-hash>
```

Resolution example:

```json
{
  "SKILL.md": { "action": "keep-local" },
  "references/governance-skeleton.md": { "action": "merged-file", "file": "upgrade/reviewed-skeleton.md" }
}
```

Only include decisions for resources shown in the preview. Review output contains installed source text; do not publish it if local customizations contain private material. See [upgrade safety and recovery](docs/installation-upgrades.md) for v1 compatibility, backups, conflicts and limits. Project-specific adaptations may stay local; generally reusable fixes belong in the canonical source.

## Development boundary

Shopee Utils was the first pilot and remains a consumer/validation case. Its `.ai-project-bootstrap/` and `docs/agent/` files are project state and are intentionally not part of this repository.

See [docs/architecture.md](docs/architecture.md) for source, installation, and upgrade boundaries.
The original pilot lineage is recorded in [docs/provenance.md](docs/provenance.md).

## Open-source maintenance

Licensed under [MIT](LICENSE). Contributions and reproducible issues are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md) and the [maintenance roadmap](docs/roadmap.md). CI is configured for Node 20/24; the workflow definition is not a claim that a remote run has passed.
