# Maintenance roadmap

This is a direction for ongoing work, not a promise that unfinished capabilities already exist.

## Current baseline

- Read-only evidence, explicit authority/decision handling, reviewed project changes and hash-bound managed installation.
- Progressive loading, tool independence, incremental verification and readable-code/module-boundary recommendation packs.
- Strict TypeScript runtime sources with committed dependency-free Node artifacts, synthetic fixtures and Node 20/24 CI.

## Planned environment lifecycle

Product direction confirmed on 2026-11-20: initialize project-level AI coding environments and keep them updated and improving. The current initialization/re-audit and Skill upgrade foundations are implemented; the three lifecycle extensions below are **planned, not implemented**. Work is deferred until a later explicit implementation request; no target date or release commitment is set.

Architecture and ownership constraints live in [the architecture document](architecture.md#planned-environment-lifecycle). This roadmap owns priority, completion expectations and deferred status; it does not duplicate implementation schemas or current product claims. The earlier percentage discussion was an informal assessment and is not a delivery or acceptance metric.

### P1 — Environment baseline and re-audit delta

**Status: planned / deferred.**

- Extend existing manifest/Registry/evidence records with the minimum references, versions, confirmed decisions and validation state needed to describe an accepted environment baseline.
- Compare a later scan with that baseline and explain added/changed/obsolete guidance, project-local adaptations and still-applicable evidence.
- Preserve historical and local decisions; a newer recommendation pack is a candidate, not automatic permission to rewrite project rules.

Completion expectations:

- A fixture that adds a module or changes a check can produce a sourced, scope-aware delta against the prior accepted baseline.
- Unchanged code/configuration/environment can reuse applicable verification; incomplete scans or incomparable scope cannot be reported as a complete delta.
- Existing manifests remain readable or have an explicit compatible migration, and no credentials or private user data are captured.

### P2 — Environment usability validation

**Status: planned / deferred; builds on P1 target/baseline evidence.**

- Offer scoped checks of the environment entrypoints and verification commands relevant to the target project.
- Record configured, executed/verified, failed, unavailable and unverified outcomes distinctly, with prerequisites and side effects visible before execution.
- Keep real execution separate from read-only analysis and preserve existing CI/authorization boundaries.

Completion expectations:

- Synthetic cases distinguish a declared-but-unusable command from an actual successful execution, failure and missing prerequisite.
- Execution requires appropriate authorization, binds its result to the selected target and does not silently install personal tools, change credentials or contact business databases.
- Checks stay proportional to changed behavior and affected dependencies; no new default full-suite regression after each edit.

### P3 — Confirmed improvement candidates and effect review

**Status: planned / deferred; uses P1 change records and P2 evidence where applicable.**

- Turn confirmed environment problems into candidates with provenance, affected scope, minimal proposed change and observable expected result.
- Trace adoption/adaptation/deferment, verification and a later review of whether the problem still occurs.
- Include reducing duplicate, stale or ineffective guidance, not just adding rules.

Completion expectations:

- A synthetic confirmed incident can be traced through a candidate, reviewed change, relevant validation and recorded review outcome.
- Unsupported effects remain unknown; no invented efficiency percentage, automatic learning from private chats or second business-task state engine.
- Human rules and local adaptations survive both adoption and subsequent environment updates.

## Supporting maintenance backlog

These support the lifecycle work but do not substitute for it:

1. Expand upgrade recovery cases and cross-platform evidence; v2 already preserves local changes and supports reviewed three-way reconciliation.
2. Expand Markdown/MDX and section-routing evidence beyond the bounded local link/anchor validator; keep unsupported syntax and incomplete traversal explicit.
3. Make scanner scope/budgets explainable for large repositories with build/output copies, preserving privacy and path safety.
4. Collect synthetic examples across languages/project structures and improve heuristic precision from observed failures.

Selected formatter configuration and command recognition is implemented; deeper cross-language command/inheritance resolution remains future work. Reuse the current pipeline and existing authorities before adding files, services or mandatory workflow dependencies.

## Release discipline

Keep changes small and independently verifiable. Distinguish source tests, installer tests and actual host-behavior evidence. State known limits in release notes; avoid claiming compliance, full context loading or production acceptance from keyword matches or simulated traces.
