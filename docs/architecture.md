# Distribution architecture

## Ownership

- This repository is the sole authoring source for Skill instructions, references, deterministic scripts, and tests.
- A consumer repository owns its governance results: `AGENTS.md`, `docs/agent/`, and `.ai-project-bootstrap/`.
- A consumer's `.agents/skills/ai-project-bootstrap/` directory is a managed copy produced by the installer.
- Central learning and assessment remain in `ai-dev-grow`; no Skill Graph or mastery state is copied here.

## Initialization foundations

The existing coverage/recommendation pipeline now registers four stack-neutral concerns for repositories with source code or Agent guidance. Each uses topic evidence and one Registry authority, emits missing/partial/covered guidance, and retains explicit adoption before mutation. Packs are distributed by the existing installer.

The `tooling` analyzer reads bounded instruction/Skill/Hook and package-script surfaces, reporting only tool labels or path-presence markers and source locations. It never runs discovered commands or determines whether a reference is required, optional or prohibited. This keeps portability review separate from tool installation and avoids importing the initializer's global workflow.

Progressive loading is a documented routing contract; runtime loading/host context eviction, link-graph completeness, scanning-budget redesign are outside this change. Readability complements existing formatting governance rather than replacing it. Incremental verification preserves CI and does not infer test coverage from filename matches.

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
