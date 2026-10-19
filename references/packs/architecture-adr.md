---
pack_id: architecture-adr
version: 1
concern: architecture-decisions-history
applies_when: architecture or accumulated design/change records are present
sources:
  - https://github.com/backstage/backstage/blob/master/docs/architecture-decisions/adr000-template.md
  - https://github.com/architecture-decision-record/architecture-decision-record
---

# Architecture decision baseline

- Record architecturally significant decisions with status, date, context, decision, alternatives, consequences, and verification evidence.
- Keep current architecture separate from target architecture and migration state.
- Preserve superseded decisions and link their replacements instead of rewriting history.
- Use an index that lets agents and maintainers locate the current authority for a decision.
- Skip ADRs for low-risk, temporary, local choices already governed by an existing standard.

Existing OpenSpec or design records may remain authoritative. Recommend an ADR file only when it closes a real provenance or cross-change history gap.
