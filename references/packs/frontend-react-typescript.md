---
pack_id: frontend-react-typescript
version: 1
concern: frontend-engineering
applies_when: react and typescript are present
sources:
  - https://github.com/google/styleguide/blob/gh-pages/tsguide.html
  - https://github.com/google/gts
---

# React and TypeScript baseline

- Prefer typed component boundaries and explicit domain/API types; avoid using `any` to erase known contracts.
- Keep route/page composition separate from reusable components, data access, and long-lived subscriptions.
- Centralize HTTP client behavior and normalize legacy responses at the service boundary.
- Clean up effects, polling, subscriptions, and abortable requests when ownership ends.
- Validate with type checking, focused component tests, and a production build.

Adapt formatting and naming to existing automated tooling. Google explicitly notes that its TypeScript environment has constraints that may not apply elsewhere; use it as a decision source, not a drop-in mandate.
