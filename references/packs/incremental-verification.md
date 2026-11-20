---
pack_id: incremental-verification
version: 1
concern: incremental-verification
applies_when: source code or Agent instructions are present
sources:
  - https://github.com/google-gemini/gemini-cli/blob/main/GEMINI.md
---

# Incremental verification

- Declare a comparison baseline, complete scoped diff and affected dependencies/consumers, including new files and configuration/runtime associations.
- Start with changed behavior and failure boundaries, then direct consumers. Incremental verification is not limited to edited test files.
- Reuse valid check results only when code, dependencies, configuration, environment and target remain applicable.
- A full-suite run needs a concrete reason/trigger: broad unbounded impact, evidence of wider regression, explicit user request, or an existing CI gate. Do not make it the default after each edit or commit.
- Keep CI gates intact. Documentation/Skill prose requires reference, ownership and resource checks; executable changes require their affected tests.
- Local reruns retain original failure and override parameters. Diagnose resource contention independently of timeouts; do not copy a fixed worker count or larger timeout across projects.
- Record tested target, selected scope/reason, actual results and exclusions; focused success must not be reported as full regression.
