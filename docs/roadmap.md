# Maintenance roadmap

This is a direction for ongoing work, not a promise that unfinished capabilities already exist.

## Current baseline

- Read-only evidence, explicit authority/decision handling, reviewed project changes and hash-bound managed installation.
- Progressive loading, tool independence, incremental verification and readable-code/module-boundary recommendation packs.
- Strict TypeScript runtime sources with committed dependency-free Node artifacts, synthetic fixtures and Node 20/24 CI.

## Next candidates

1. Expand upgrade recovery cases and cross-platform evidence; v2 now preserves local changes and supports reviewed three-way reconciliation.
2. Expand Markdown/MDX and section-routing evidence beyond the current bounded local link/anchor validator; keep unsupported syntax and incomplete traversal explicit.
3. Make scanner scope/budgets explainable for large repositories with build/output copies, without weakening privacy or path safety.
4. Collect synthetic examples across languages and existing project structures; improve heuristic precision from observed failures.

Selected formatter configuration and command recognition is included in the baseline; deeper cross-language command/inheritance resolution remains future work. New concerns must reuse the current pipeline rather than adding a mandatory workflow runtime.

## Release discipline

Keep changes small and independently verifiable. Distinguish source tests, installer tests and actual host-behavior evidence. State known limits in release notes; avoid claiming compliance, full context loading or production acceptance from keyword matches or simulated traces.
