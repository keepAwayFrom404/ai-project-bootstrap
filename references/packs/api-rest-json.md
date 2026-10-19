---
pack_id: api-rest-json
version: 1
concern: api-contract
applies_when: an HTTP JSON API framework is present
sources:
  - https://github.com/microsoft/api-guidelines
  - https://github.com/zalando/restful-api-guidelines
---

# REST JSON API baseline

- Define request, response, error, authentication, authorization, pagination, idempotency, and compatibility behavior as a contract.
- Use HTTP status semantics consistently and provide stable machine-readable error codes with safe human messages.
- Treat compatibility and deprecation as explicit design decisions; inventory consumers before breaking changes.
- For public or multi-team APIs, prefer an API-first specification and automated contract checks. For a small internal application, adopt this only when its maintenance cost is justified.
- Provide examples for success, validation failure, authorization failure, conflict, asynchronous acceptance, and dependency failure.

Do not force a universal response envelope over mature existing conventions. For legacy inconsistency, recommend an incremental migration boundary and client adapter.
