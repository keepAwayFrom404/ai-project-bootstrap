# Change Plan contract

Plans use `ai-project-bootstrap.plan.v1`. Allowed actions are exactly:

- `create`
- `update-managed-section`
- `move-after-confirmation`
- `reference-existing`
- `remove-after-confirmation`

Every action carries a normalized repository-relative `target_path`, source evidence IDs, decision dependencies, `before_sha256`, expected `after_sha256`, and rollback description. A plan also carries a complete `repository_before` snapshot produced by `captureRepositoryState`; sensitive paths use presence markers rather than content hashes. `plan_hash` covers the entire plan except the hash field itself.

Before mutation, show a human-readable preview with action, target, reason, before/after summary, dependencies, risk, rollback, excluded files, and `plan_hash`. Confirmation must identify the current hash and target scope. Any file drift or decision change invalidates that confirmation.

`verify-plan` checks `plan_hash`, the allowlist, repository/symlink containment, before hashes, and accepted dependencies before reading targets. The Agent then applies patches; scripts never provide an apply operation. `verify-applied` compares a fresh complete repository snapshot with `repository_before`, excluding only action targets, so additions and modifications outside the plan fail. `validate` checks the core skeleton, Registry uniqueness and links, manifest schema, quality commands, declared adapter exceptions, and non-empty optional standards.

After validation, run Analyze again and produce a second semantic plan. Non-empty actions indicate drift or a contract defect; report them rather than applying another implicit pass.
