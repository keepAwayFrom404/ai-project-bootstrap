---
pack_id: backend-node-express
version: 1
concern: backend-engineering
applies_when: node and express are present
sources:
  - https://github.com/goldbergyoni/nodebestpractices
  - https://github.com/goldbergyoni/nodejs-testing-best-practices
---

# Node and Express baseline

- Keep Router responsibilities at transport validation and response mapping; put use-case orchestration and domain rules behind explicit boundaries.
- Represent expected failures with stable error types/codes and one HTTP mapping layer; do not return raw exceptions.
- Propagate request, tenant, task, cancellation, and resource ownership explicitly.
- Release browsers, files, leases, and temporary resources in guaranteed lifecycle paths.
- Define idempotency and possible external-write state before allowing retries.
- Prefer API/component tests for high-confidence request-to-storage behavior, with focused unit tests for complex pure rules.

Do not prescribe a framework replacement or directory rewrite when existing boundaries can be improved incrementally.
