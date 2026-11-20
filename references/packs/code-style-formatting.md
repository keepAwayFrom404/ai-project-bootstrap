---
pack_id: code-style-formatting
version: 1
concern: code-style-formatting
applies_when: repository source code is present
sources:
  - https://github.com/biomejs/biome
  - https://github.com/prettier/prettier
  - https://github.com/diffplug/spotless
  - https://github.com/astral-sh/ruff
---

# Code style and formatting baseline

- Treat repository-local executable tooling as the authority; prose alone is not a formatting control.
- Preserve an existing formatter and its configuration. Do not migrate tools or rewrite human-owned configuration without an accepted decision.
- When no formatter exists, propose a stack-compatible baseline: Biome or Prettier for JavaScript/TypeScript, Spotless for JVM builds, Ruff for Python, and native formatters such as `gofmt` or `rustfmt` where applicable.
- Provide separate write and non-mutating check commands. Only the check command belongs in routine validation and CI gates.
- Pin tool versions through the project's normal dependency mechanism and exclude generated, vendored, build-output, and intentionally preserved files.
- Run the applicable formatting/lint checks for changed files or affected workspaces, reusing valid results; forbid disabling rules or adding broad ignores merely to make validation pass.
- For a legacy repository, assess the initial formatting diff before adoption. Keep a repository-wide formatting migration separate from behavior changes.

Formatting makes layout deterministic; it does not guarantee readable naming, cohesive functions, sound boundaries, or maintainable architecture. Keep those concerns in engineering and review rules.

## Evidence limits

A config filename, dependency or recognized command body is static evidence, not proof of installation or a successful check. EditorConfig and lint-only configuration do not establish an executable formatter. Unrecognized wrappers, shell chains and script lifecycle hooks require inspection; do not register them as read-only gates based on names.

Detection includes selected Prettier/Biome configs and npm script commands, Ruff/Black settings and Maven plugin declarations. It is not a full JSONC/TOML/XML parser, inheritance resolver or workspace coverage checker. Native formatters and JVM/Python command registration require project-specific verification; preserve existing tooling and do not silently install or run it.
