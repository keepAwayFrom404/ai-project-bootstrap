---
pack_id: readable-code-boundaries
version: 1
concern: readable-code-boundaries
applies_when: source code or Agent instructions are present
sources:
  - https://google.github.io/eng-practices/review/reviewer/looking-for.html
---

# Readable code and module boundaries

- Use domain-meaningful names and cohesive functions with a single responsibility and consistent abstraction level.
- Make ownership, input/output and side effects explicit. Prefer clear sequencing, named predicates and early returns to dense expressions.
- Map module responsibilities and dependency direction from existing consumers. Keep pure contracts independent of application implementations; do not introduce cycles.
- Explain reasons, constraints and compatibility in comments; avoid narrating obvious statements. Avoid speculative frameworks and one-purpose forwarding layers.
- Reuse shared business meaning, not superficial code similarity. Extract by responsibility rather than an arbitrary line threshold.
- Formatting is not readability. Adapt existing lint/type checks and review criteria; do not mandate a stack, directory rewrite, 600-line budget or worker count.
