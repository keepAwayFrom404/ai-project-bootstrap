# Contributing

This project maintains a small, portable AI-development governance Skill. Suggestions, reproducible bugs and focused pull requests are welcome at [GitHub](https://github.com/keepAwayFrom404/ai-project-bootstrap).

## Development

Use Node.js 20 or later and Git. The runtime/tests/Skill repository validator use Node built-ins; no global coding agent, Python or npm dependencies are required for the checks.

```sh
node --test tests/foundations.test.mjs tests/scanner.test.mjs
npm run validate:skill
```

Choose tests for changed behavior and affected consumers. Installer/resource changes also need `tests/install.test.mjs`; CLI changes need `tests/cli.test.mjs`. Reuse valid unchanged checks. `npm run check` runs all tests plus Skill validation and is the CI gate on Node 20/24, not a mandatory local rerun after every edit.

The local Skill validator deliberately checks this repository's two plain, single-line frontmatter fields (`name`, `description`), non-empty instructions and local Markdown file references. It is not a complete YAML parser, fragment validator or certification for every Agent host. If the Skill needs richer metadata, change the profile and its tests explicitly. Host-specific validation may be added as an optional check rather than a hidden developer prerequisite.

## Pull requests

- Explain the problem, resulting behavior, scoped verification and unverified boundaries.
- Preserve existing user-owned project rules; never turn an installed tool into an implicit project requirement.
- Keep analysis read-only except for its explicit report. Project edits and installation retain their reviewed/hash-bound protocols.
- Add failure/boundary tests for changed behavior. Do not mix unrelated reformatting with a feature.
- Change the canonical Skill source here; do not edit a consumer's managed copy as the long-term source.
- Do not include credentials, personal machine paths, user data, generated caches or private target repositories. Use synthetic fixtures and repository-relative examples.

## Reporting issues

Include the relevant commit, Node/OS versions, minimal synthetic fixture, command, expected/actual result and sanitized error. Topic coverage is heuristic evidence; a false positive is useful to report. Avoid putting secrets or real target-project contents in public issues. For a security concern, use GitHub private vulnerability reporting when available, or request a private contact channel without disclosing exploit details publicly.

## Compatibility and releases

The current 0.1.x work is early and may evolve. Preserve evidence fields when possible; document schema or installer behavior changes and migration implications. Maintainers review a clean candidate and CI results before tagging a version. Tags describe source versions; installing/upgrading still uses preview/apply and must not overwrite local drift. npm publication is not part of the current release path.

## License

Contributions are provided under the project's [MIT license](LICENSE). Preserve third-party license notices and cite sources; linked recommendation material retains its own terms.
