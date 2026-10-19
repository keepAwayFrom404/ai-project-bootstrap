# Recommendation pack contract

Recommendation packs are sourced baselines, not authorities. Load only packs whose `applies_when` evidence matches the repository. Compare them with the Registry authority and emit advice without editing that authority.

Each recommendation reports:

- `pack_id` and version;
- triggering stack evidence and relevant governance concern;
- source URLs and the local pack path;
- disposition: `propose-create`, `propose-adjust`, or `compare-only`;
- missing topics and a short reason;
- `requires_user_confirmation: true` for every mutation-producing disposition.

Use these decision states when preparing a Change Plan: `adopt`, `adapt`, `preserve`, `conflict`, `defer`, or `not-applicable`. Existing project rules win until the user accepts a delta. Do not import brand colors, framework choices, organization-specific mandates, or historical rationale from a source project.

Pack versions are local curation versions, not versions of upstream projects. Re-evaluating a newer pack produces a diff; it never silently rewrites accepted project rules.
