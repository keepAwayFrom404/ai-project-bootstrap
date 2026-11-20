# Architecture

## Product direction

Confirmed on 2026-11-20: `ai-project-bootstrap` is responsible for **AI coding environment initialization and ongoing updates/improvement** at project scope. Here, the environment includes project guidance, Skills, authority/read routes, repository-local checks and their declared tool requirements.

The intended lifecycle is: establish an environment → compare changes → propose a scoped update → verify usability → use confirmed development problems to propose improvements → review their effect. The following distinction describes current implementation and planned capabilities; it does not announce their completion.

| Area | Implemented foundation | Planned extension |
| --- | --- | --- |
| Initialization | Repository evidence, governance gap recommendations, authority ownership, reviewed changes and structural validation | Verify the initialized environment's applicable entrypoints and checks in the target project |
| Ongoing updates | Skill distribution upgrades, local customization preservation, conflicts/recovery and manually invoked re-audit | A project environment baseline and an explainable re-audit delta covering adopted rules, tools, decisions and relevant evidence |
| Ongoing improvement | Reusable recommendations and the ability to propose another reviewed change | Confirmed problem → improvement candidate → scoped validation → adoption/deferment → effect review, including simplification/removal of ineffective rules |

Skill package upgrades and project environment updates are separate operations. An installer success does not prove that project guidance is current or its checks are usable. Topic coverage and valid links likewise do not establish real coding outcomes.

See the [prioritized roadmap](roadmap.md#planned-environment-lifecycle) for deferred work and acceptance expectations. The planning below does not add commands, storage fields, automatic execution or new dependencies.

## Ownership

- This repository is the sole authoring source for Skill instructions, references, TypeScript runtime sources and tests. Runtime implementation is authored under `src/scripts/**/*.mts`, with compiled `.mjs` artifacts committed under `scripts/` for portable execution.
- A consumer repository owns its governance results: `AGENTS.md`, `docs/agent/`, and `.ai-project-bootstrap/`.
- A consumer's `.agents/skills/ai-project-bootstrap/` directory is a managed copy produced by the installer.
- Personal learning/mastery records and general task execution remain outside this project. Environment improvement must not introduce a dependency on a personal `ai-dev-grow` installation, copy a Skill Graph, or become another business-task state system.

## Initialization foundations

The existing coverage/recommendation pipeline now registers four stack-neutral concerns for repositories with source code or Agent guidance. Each uses topic evidence and one Registry authority, emits missing/partial/covered guidance, and retains explicit adoption before mutation. Packs are distributed by the existing installer.

The `tooling` analyzer reads bounded instruction/Skill/Hook and package-script surfaces, reporting only tool labels or path-presence markers and source locations. It never runs discovered commands or determines whether a reference is required, optional or prohibited. This keeps portability review separate from tool installation and avoids importing the initializer's global workflow.

Progressive loading is a documented routing contract; runtime loading/host context eviction, scanning-budget redesign are outside this change. Readability complements existing formatting governance rather than replacing it. Incremental verification preserves CI and does not infer test coverage from filename matches.

## Installation protocol

`preview` computes a plan from source hashes, the target's current files, and the previous installation manifest. The plan hash binds the source version, destination, actions, and conflicts.

`apply` recomputes the plan and requires the caller's expected hash. It stops if either repository changed, if an unmanaged target file would be overwritten, or if a customized file cannot be reconciled under the reviewed plan. Local-only changes are preserved; simultaneous changes use verified upstream base snapshots and Git three-way merge. Successful application writes each file atomically and replaces the installation manifest last.

Historical project-level copies use a separate hash-bound adoption plan. Adoption changes only ownership metadata, requires every current runtime file to exist, and never modifies Skill content. The subsequent ordinary preview exposes all differences from the canonical source.

The manifest establishes ownership only for distributed Skill files. It never grants permission to edit target-project governance or business files.

## Upgrade and rollback

- Upgrade by previewing and applying a newer canonical checkout.
- Project-specific local edits are tracked separately from upstream hashes and preserved. Clean three-way candidates are reviewable; conflicts require an explicit per-file resolution, not a forced reinstall. Reusable fixes should still be contributed upstream.
- Roll back upstream using the intended source version and the same preview/resolution protocol. Existing overwritten bytes are backed up; restoration is explicit, not an automatic replay of a failed apply.

An installation upgrade changes only the managed Skill copy. It does not execute project reconciliation. When the upgraded Skill is invoked in a repository with an existing bootstrap manifest, `re-audit` evaluates new analyzers and recommendation packs. Existing formatter configuration wins; dependency changes, build-file changes, and repository-wide formatting require an accepted project Change Plan.

## Rejected default: Git submodule

A submodule preserves source identity but introduces nested Git lifecycle, checkout, authentication, and CI requirements into every consumer. Managed copies keep discovery simple while retaining deterministic provenance and drift detection.

## Formatting evidence

Formatter detection is read-only static analysis. Command classification inspects bounded recognized CLI forms rather than trusting names such as format:check; write flags, shell composition, dynamic expressions and lifecycle hooks cannot be promoted into read-only formatting gates. Unknown forms remain unresolved for review. EditorConfig and lint-only settings are separate from formatter evidence. Analyzer failure marks the evidence incomplete.

Recommendations require both documented governance and recognized executable declarations before becoming compare-only. This does not certify installed binaries, command success, workspace-wide coverage, configuration inheritance, or arbitrary shell safety. Existing project configuration is preserved, and any dependency/build/reformatting change still requires the accepted Change Plan.

## Customized installations

The v2 install manifest stores upstream digests in `files`, actual divergent digests/deletions in `local_overrides`, and content-addressed upstream bytes under `.install-base/`. A v1 installation is read conservatively: no base is fabricated from a digest or informational override. Legacy adopted copies keep all differing managed files on their first upgrade because their original upstream cannot be inferred.

Plans bind the destination, complete prior manifest digest, selected source tree, current bytes, decisions and manual candidate digest. `review` is a separate explicit read of a managed file's versions; normal previews expose metadata instead of source bodies. Native Git merge-file runs only on private temporary copies, with no target write during preview. Missing Git, binary divergence, corrupt snapshots and conflicts never imply permission to replace a file.

Apply uses an exclusive installation lock, repeats preflight under that lock, persists upstream bases before target writes, checks each target before replacement, backs up existing replaced files, and writes the manifest last. This is per-file atomic replacement with recovery evidence, not a repository-wide transaction or crash-proof multi-file commit. See [installation upgrades](installation-upgrades.md).

## Governance reference validation

The validator now traverses bounded local references, validates supported chapter anchors, rejects repeated Registry concerns, and checks optional reading_routes against registered authorities. Chapter-scoped coverage uses only the selected section. External URLs remain unchecked and task triggers are not executed. See [supported syntax and limits](governance-validation.md).

## TypeScript source and portable distribution

The runtime uses strict TypeScript with NodeNext modules. `.mts` sources emit `.mjs` into the existing `scripts/` tree; public commands and installer resource paths remain compatible. TypeScript and Node typings are pinned development dependencies with a lockfile, not installed-runtime dependencies. Tests stay JavaScript to verify the actual emitted/installed interface.

`npm run check` builds/typechecks before running source tests and Skill validation. Source development begins with `npm ci`. The installer continues to copy compiled runtime, references, Agent metadata and license only; it does not copy `src`, node_modules, compiler configuration or development dependencies into consumers. CI on Node 20/24 verifies tests and that rebuilding leaves generated runtime unchanged.

## Planned environment lifecycle

These are design constraints for later implementation, not implemented APIs or a fixed new schema.

### Environment baseline and re-audit delta

Reuse the consumer's existing `.ai-project-bootstrap/` manifest, Registry, Change Plan and evidence contracts. Prefer source references, versions/digests and confirmed outcomes over a second copy of facts already owned by package/build files or product documents. Record which recommendations were adopted, adapted or deferred and why, while distinguishing upstream resources from project-local customization.

A later re-audit should explain what changed since an accepted baseline: stack/modules, relevant checks, rule sources, local adaptations and unresolved gaps. Its output should separate newly needed changes, obsolete guidance and still-valid evidence. Changes to comparison scope or incomplete scanning must remain explicit; a changed report alone must not force a new full regression.

### Environment usability validation

Keep analysis read-only. Usability validation is a separate, explicitly authorized operation on selected repository-local checks, with known target, prerequisites and side effects. Do not execute arbitrary discovered strings, install global tools, alter credentials or access business databases automatically.

Separate configured/declaratively present from actually executed and verified. Preserve failures, unavailable prerequisites and unverified scope; bind evidence to the target code/configuration and environment so unchanged results can be reused. Host integration still requires its own evidence.

### Problem-driven improvement and review

Accept explicitly confirmed, reusable observations about environment problems, with source and affected scope. Do not harvest private conversations, business data or inferred personal preferences. Produce reviewable improvement candidates that explain the problem, proposed minimal change, expected observable result and verification scope.

Candidates may strengthen, simplify, consolidate or remove rules; improvement is not measured by document count. Adoption/deferment and later review should be traceable through existing project records. Use actual observations when assessing effects and mark insufficient evidence as unknown; do not invent savings or treat a passing check as proof of better coding.

All three capabilities must retain scoped authorization, human edits, portable runtime operation and incremental verification. They should extend the existing evidence/recommendation/plan pipeline before introducing new infrastructure. Task orchestration, personal learning and autonomous deployment remain separate concerns.
