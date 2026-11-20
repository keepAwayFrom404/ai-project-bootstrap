# Maintenance roadmap

This is a direction for ongoing work, not a promise that unfinished capabilities already exist.

## Current baseline

- Read-only evidence, explicit authority/decision handling, reviewed project changes and hash-bound managed installation.
- Progressive loading, tool independence, incremental verification and readable-code/module-boundary recommendation packs.
- Node-only source validation, synthetic fixtures and a Node 20/24 CI definition.

## Next candidates

1. Reconcile deliberate consumer customizations during installation upgrades while preserving provenance and rejecting unsafe overwrites.
2. Validate authority links and section routing across documents with bounded traversal; keep incomplete evidence explicit.
3. Make scanner scope/budgets explainable for large repositories with build/output copies, without weakening privacy or path safety.
4. Collect synthetic examples across languages and existing project structures; improve heuristic precision from observed failures.

Selected formatter configuration and command recognition is included in the baseline; deeper cross-language command/inheritance resolution remains future work. New concerns must reuse the current pipeline rather than adding a mandatory workflow runtime.

## Release discipline

Keep changes small and independently verifiable. Distinguish source tests, installer tests and actual host-behavior evidence. State known limits in release notes; avoid claiming compliance, full context loading or production acceptance from keyword matches or simulated traces.
