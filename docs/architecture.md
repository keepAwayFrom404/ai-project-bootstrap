# Distribution architecture

## Ownership

- This repository is the sole authoring source for Skill instructions, references, deterministic scripts, and tests.
- A consumer repository owns its governance results: `AGENTS.md`, `docs/agent/`, and `.ai-project-bootstrap/`.
- A consumer's `.agents/skills/ai-project-bootstrap/` directory is a managed copy produced by the installer.
- Central learning and assessment remain in `ai-dev-grow`; no Skill Graph or mastery state is copied here.

## Initialization foundations

The existing coverage/recommendation pipeline now registers four stack-neutral concerns for repositories with source code or Agent guidance. Each uses topic evidence and one Registry authority, emits missing/partial/covered guidance, and retains explicit adoption before mutation. Packs are distributed by the existing installer.

The `tooling` analyzer reads bounded instruction/Skill/Hook and package-script surfaces, reporting only tool labels or path-presence markers and source locations. It never runs discovered commands or determines whether a reference is required, optional or prohibited. This keeps portability review separate from tool installation and avoids importing the initializer's global workflow.

Progressive loading is a documented routing contract; runtime loading/host context eviction, link-graph completeness, installer local overrides and scanning-budget redesign are outside this change. Readability complements existing formatting governance rather than replacing it. Incremental verification preserves CI and does not infer test coverage from filename matches.

## Installation protocol

`preview` computes a plan from source hashes, the target's current files, and the previous installation manifest. The plan hash binds the source version, destination, actions, and conflicts.

`apply` recomputes the plan and requires the caller's expected hash. It stops if either repository changed, if an unmanaged target file would be overwritten, or if a previously managed file drifted locally. Successful application writes files atomically and replaces the installation manifest last.

Historical project-level copies use a separate hash-bound adoption plan. Adoption changes only ownership metadata, requires every current runtime file to exist, and never modifies Skill content. The subsequent ordinary preview exposes all differences from the canonical source.

The manifest establishes ownership only for distributed Skill files. It never grants permission to edit target-project governance or business files.

## Upgrade and rollback

- Upgrade by previewing and applying a newer canonical checkout.
- Local edits to an installed copy are treated as conflicts; move deliberate changes back to this repository first.
- Rollback by checking out the intended source version, previewing, and applying it. The same drift rules apply.

## Rejected default: Git submodule

A submodule preserves source identity but introduces nested Git lifecycle, checkout, authentication, and CI requirements into every consumer. Managed copies keep discovery simple while retaining deterministic provenance and drift detection.
