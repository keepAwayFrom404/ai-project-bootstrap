# Evidence contract

The scanner emits `ai-project-bootstrap.evidence.v1`. Every analyzer item contains:

- `kind`, `value`: a bounded fact; sensitive files use only `sensitive-presence` and a redacted value.
- `source_path`, `source_locator`: where the fact came from.
- `scope`: repository or a narrower declared scope.
- `confidence`: `confirmed` for direct structured evidence, `strong` for a clear convention with a direct source, or `candidate` when user confirmation is still required.
- `basis`: the observation rule, never hidden model reasoning.

Treat warnings as part of the evidence. An analyzer error does not authorize inventing the missing fact. Arrays are stable-sorted, output contains no timestamps, and repeat Analyze runs on unchanged input must be identical.

`governanceCoverage` is a technology-triggered completeness assessment. Each expected concern reports `covered`, `partial`, or `missing`, the concrete topic checklist, the registered authority, and the documents that supplied evidence. `covered` requires one Registry authority whose own content covers the checklist; keywords scattered across unrelated documents remain `partial`. Coverage is still heuristic evidence, not proof that implementation complies. `partial` and `missing` are candidates for a Change Plan or a user Decision Group. A filename alone never establishes coverage.

`recommendations` contains only packs whose stack trigger matched. It records upstream sources, the local curated pack, current authority, missing topics, and one of `propose-create`, `propose-adjust`, or `compare-only`. Recommendations are not facts and never authorize mutation.

`mode_assessment` is deterministic and includes `recommended_mode`, `confidence`, `basis`, and `requires_user_confirmation`. A manifest selects `re-audit`; existing Agent guidance or standards select `legacy-reconciliation`; their absence selects `new-project`. Incomplete or limit-truncated evidence selects `consult-user`.

The scanner may report the presence and category of `.env`, cookies, profiles, credentials, sessions, or user-data paths. Do not read their contents, include their hashes as user-visible evidence, or quote their values.
