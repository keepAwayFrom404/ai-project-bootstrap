# ai-project-bootstrap

English | [简体中文](README.zh-CN.md)

**Give coding agents clear project rules, without overwriting the way your team works.**

`ai-project-bootstrap` is a reusable Skill for establishing and maintaining AI-development guidance in Git repositories. It inspects the existing codebase, tools and documents, then helps an agent identify gaps and propose scoped changes: what to read, where code belongs, how to verify it, and which source owns each rule.

It works with new projects and existing repositories. Existing project decisions and human edits stay in control; recommendations are reviewed before adoption.

## When to use it

- Start a project with a small, understandable set of AI coding instructions.
- Reconcile scattered or conflicting guidance in an existing repository.
- Add missing engineering rules as a project grows beyond its initial frontend or prototype.
- Share project guidance across developers without making someone's personal workflow tools a team prerequisite.
- Upgrade the installed Skill while preserving project-local customizations.

## What it provides

| Capability | What it does |
| --- | --- |
| Evidence before changes | Inspects repository files and declarations; analysis writes only its explicitly requested report. |
| Clear ownership | Registers one authority per concern and preserves existing project documents. |
| Progressive loading | Keeps essential instructions small and routes setup, domain rules and troubleshooting by task. |
| Portable guidance | Reports selected personal-tool references for review, without automatically installing or adopting workflows. |
| Incremental verification | Starts with changed behavior and affected consumers, reuses valid results and preserves CI gates. |
| Readable code and boundaries | Recommends meaningful names, cohesive responsibilities, explicit side effects and dependency direction. |
| Formatting governance | Recognizes selected formatter declarations and command bodies, separating checks from writes and unresolved wrappers. |
| Managed upgrades | Tracks upstream bases and local customizations, proposes three-way merges and blocks unresolved conflicts. |

The Skill guides an agent; it does not automatically rewrite a project or replace its development workflow. Topic coverage is heuristic evidence, not proof of code quality, safe execution or compatibility with every agent host. See [architecture and limits](docs/architecture.md).

## Quick start

Requirements: **Node.js 20+**, **Git**, and an agent that can read Skill instructions. The committed Node runtime uses built-in modules; installing or using it needs no npm dependencies, Python or global workflow CLI. Three-way upgrade merges use Git.

Clone this source repository:

```sh
git clone https://github.com/keepAwayFrom404/ai-project-bootstrap.git
cd ai-project-bootstrap
```

Install into an existing Git project in two steps:

```sh
node scripts/install.mjs preview --repo /absolute/path/to/project
node scripts/install.mjs apply --repo /absolute/path/to/project --expected-plan-hash <hash-from-preview>
```

Review the preview before applying. Changes to upstream resources, managed files, installation records or chosen resolutions invalidate the old hash; run `preview` again.

The installer writes only `.agents/skills/ai-project-bootstrap/` in the target repository. Installing the Skill does not authorize changes to the project's rules or code.

In an agent that supports project Skills, invoke:

```text
$ai-project-bootstrap
```

If your agent does not discover the Skill automatically, ask it to read `.agents/skills/ai-project-bootstrap/SKILL.md` in the target project. This is an explicit reading path, not a claim of native integration with that host.

## How initialization works

1. **Inspect** the current repository, existing guidance, tools and commands.
2. **Assess** missing rules and actual authority conflicts, with evidence and known limits.
3. **Propose** changes that reuse the project's existing structure and reviewed decisions.
4. **Apply** the accepted scope and verify the resulting files and relevant checks.

For a new project, the default core is an `AGENTS.md` entrypoint, a small engineering baseline, an authority Registry and a managed manifest. Detailed documents are added only when the project needs them. Valid existing paths remain in place.

For an initialized project, run the Skill again to re-audit current evidence. Upgrading the Skill alone does not install formatter dependencies, reformat business code or activate a new workflow. See [initialization foundations](references/initialization-foundations.md).

## Upgrades and local customizations

After updating this source checkout to the version you want, use the same `preview` / `apply` commands. Local-only edits and deletions are preserved. Simultaneous upstream and local changes produce a three-way merge candidate when a verified base is available; overlapping changes or missing bases require review.

Inspect a particular file:

```sh
node scripts/install.mjs review --repo /absolute/path/to/project --path SKILL.md
```

Resolve conflicts per file with `keep-local`, `use-upstream` or a reviewed `merged-file`. Re-preview and apply using the same resolution file and the new plan hash:

```sh
node scripts/install.mjs preview --repo /absolute/path/to/project --resolutions /path/to/resolutions.json
node scripts/install.mjs apply --repo /absolute/path/to/project --resolutions /path/to/resolutions.json --expected-plan-hash <new-hash>
```

Review output can contain private local source. Existing replaced files are backed up, and the manifest is written last; installation is not an all-or-nothing multi-file transaction. Read [upgrade decisions, v1 compatibility and recovery](docs/installation-upgrades.md) before resolving an upgrade conflict.

A complete legacy copy without an installation manifest can use metadata-only adoption first:

```sh
node scripts/install.mjs adopt-preview --repo /absolute/path/to/project
node scripts/install.mjs adopt-apply --repo /absolute/path/to/project --expected-plan-hash <adoption-hash>
node scripts/install.mjs preview --repo /absolute/path/to/project
```

Adoption refuses incomplete copies. The first normal upgrade preserves differences from an unknown legacy upstream as local customizations.

## Contributing and verification

This repository is the canonical source for reusable improvements. Consumer projects own their governance results and local adaptations.

Choose focused tests for your change and its consumers; use the [contribution guide](CONTRIBUTING.md) for commands and expectations. Runtime source is maintained in strict TypeScript under `src/scripts/`; compiled `.mjs` files preserve the public commands and portable installed copies. Source development installs the pinned compiler locally. The complete source check is:

```sh
npm ci
npm run check
```

GitHub CI runs this check on Node 20 and 24. Local Skill validation covers this repository's simple frontmatter profile and local reference files; it is not a full YAML/Markdown parser or live host certification. See the [maintenance roadmap](docs/roadmap.md) for current boundaries and future work.

## License and provenance

Licensed under [MIT](LICENSE). Linked recommendation sources retain their own terms.

The project originated from a private repository pilot. Only reusable Skill source, synthetic tests, tooling and documentation belong here; see [provenance](docs/provenance.md).

[Governance links and reading routes](docs/governance-validation.md) describes supported references, chapter anchors and validation limits.
