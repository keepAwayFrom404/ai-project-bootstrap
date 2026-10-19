---
pack_id: testing-quality
version: 1
concern: testing-quality
applies_when: test files or executable quality commands are present
sources:
  - https://github.com/goldbergyoni/nodejs-testing-best-practices
  - https://github.com/goldbergyoni/javascript-testing-best-practices
---

# Testing and quality baseline

- Map change types to proportionate tests instead of relying only on a generic full-suite instruction.
- Prefer behavior-level API/component tests for service flows; use unit tests for complex pure rules and focused failure reproduction.
- Cover authorization, tenant isolation, cancellation, retries, resource cleanup, and external dependency failure where applicable.
- Keep test intent readable at the requirement level and avoid mocks that merely reproduce implementation details.
- Record commands that are executable in the repository and state any unverified scope at delivery.

Do not require every available test category for every change. Risk, blast radius, and runtime cost determine the verification set.
