# Contributing

This project maintains a small, portable AI-development governance Skill. Suggestions, reproducible bugs and focused pull requests are welcome at [GitHub](https://github.com/keepAwayFrom404/ai-project-bootstrap).

## Development

Use Node.js 20 or later and Git. The installed runtime/tests/Skill validator use Node built-ins. Source development uses the pinned TypeScript compiler and Node typings installed with npm ci; no global compiler, coding agent or Python is required.

```sh
npm ci
npm run build
node --test tests/foundations.test.mjs tests/scanner.test.mjs
npm run validate:skill
```

Choose tests for changed behavior and affected consumers. Installer/resource changes also need `tests/install.test.mjs`; CLI changes need `tests/cli.test.mjs`. Reuse valid unchanged checks. `npm run check` runs all tests plus Skill validation and is the CI gate on Node 20/24, not a mandatory local rerun after every edit.

Runtime sources live in `src/scripts/**/*.mts` under strict TypeScript. Keep public `.mjs` imports when authoring `.mts`; NodeNext resolves the source and emits the existing `.mjs` paths. `npm run typecheck` checks without emitting; `npm run build` updates committed runtime artifacts. Tests remain JavaScript and exercise those artifacts, including installed copies without compiler dependencies. CI also rejects stale generated files.

The local Skill validator deliberately checks this repository's two plain, single-line frontmatter fields (`name`, `description`), non-empty instructions and local Markdown file references. It validates supported chapter fragments but is not a complete YAML/Markdown parser or certification for every Agent host. If the Skill needs richer metadata, change the profile and its tests explicitly. Host-specific validation may be added as an optional check rather than a hidden developer prerequisite.

## Pull requests

- Explain the problem, resulting behavior, scoped verification and unverified boundaries.
- Preserve existing user-owned project rules; never turn an installed tool into an implicit project requirement.
- Keep analysis read-only except for its explicit report. Project edits and installation retain their reviewed/hash-bound protocols.
- Add failure/boundary tests for changed behavior. Do not mix unrelated reformatting with a feature.
- Change the canonical Skill source here; keep project-local adaptations distinguishable from reusable upstream changes.
- Do not include credentials, personal machine paths, user data, generated caches or private target repositories. Use synthetic fixtures and repository-relative examples.

## Reporting issues

Include the relevant commit, Node/OS versions, minimal synthetic fixture, command, expected/actual result and sanitized error. Topic coverage is heuristic evidence; a false positive is useful to report. Avoid putting secrets or real target-project contents in public issues. For a security concern, use GitHub private vulnerability reporting when available, or request a private contact channel without disclosing exploit details publicly.

## Compatibility and releases

The current 0.1.x work is early and may evolve. Preserve evidence fields when possible; document schema or installer behavior changes and migration implications. Maintainers review a clean candidate and CI results before tagging a version. Tags describe source versions; installing/upgrading still uses preview/apply and must preserve or explicitly reconcile local changes. npm publication is not part of the current release path.

## License

Contributions are provided under the project's [MIT license](LICENSE). Preserve third-party license notices and cite sources; linked recommendation material retains its own terms.
