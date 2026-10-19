---
name: ai-project-bootstrap
description: Initialize or reconcile AI-facing project governance in new and legacy repositories using read-only evidence, explicit conflict decisions, previewed file scope, and deterministic validation. Use for project bootstrap or re-audit, not ordinary feature development.
---

# AI Project Bootstrap

Establish a small, auditable governance skeleton without replacing the repository's existing authorities. This Skill does not manage daily development, learning state, tasks, knowledge, or runtime services.

## Select a mode

- `new-project`: little or no existing guidance. Read [governance-skeleton.md](references/governance-skeleton.md) and [plan-contract.md](references/plan-contract.md).
- `legacy-reconciliation`: existing or conflicting guidance. Also read [legacy-reconciliation.md](references/legacy-reconciliation.md).
- `re-audit`: an existing `.ai-project-bootstrap/manifest.yaml` is present. Compare current evidence and managed hashes; never treat manual drift as generated content.

Read [evidence-contract.md](references/evidence-contract.md) before interpreting scanner output.
When the user asks for standards baselines or improvement advice, also read [recommendation-contract.md](references/recommendation-contract.md) and only the applicable files under `references/packs/`.
Recommendation `reference_path` values are relative to this Skill directory, not the target repository.

## Required workflow

1. Run `node scripts/bootstrap.mjs analyze --repo <repo> --out <repo-local-evidence.json>`. Analyze is read-only except for that explicit output artifact.
2. Inspect `mode_assessment`: a manifest selects `re-audit`, existing guidance selects `legacy-reconciliation`, and no existing governance selects `new-project`; `consult-user` means evidence was incomplete. Then classify facts, conflicts, and unknowns. Existing instructions and human-authored rules remain authoritative until the user decides otherwise.
   Inspect `governanceCoverage` as well. Technology-triggered `partial` or `missing` concerns require a concrete recommendation or Decision Group; they must not be hidden by the mere presence of `docs/agent/`.
   Treat `recommendations` as optional sourced advice. `compare-only` never creates an action; `propose-create` and `propose-adjust` require the user to choose `adopt`, `adapt`, `preserve`, `conflict`, `defer`, or `not-applicable` before they enter a Change Plan.
3. Build a Change Plan using [plan-contract.md](references/plan-contract.md). Show every target, action, evidence, before/after summary, dependency, risk, excluded item, and plan hash.
4. Keep the Change Plan and hash as internal audit evidence by default. If the user explicitly requested initialization and the plan only creates unambiguous governance files without overwriting human content, proceed without exposing protocol details or asking for a hash confirmation. Ask only when a Decision Group is unresolved, an existing human-owned file would change, a move/removal is proposed, evidence is incomplete, or a material policy choice was not implied by the request. When confirmation is required, bind it to the current plan hash and target scope.
5. Run `verify-plan` immediately before editing. If it fails, discard the preview and re-analyze.
6. The Agent applies only the confirmed patches. There is deliberately no `apply` command.
7. Run `verify-applied`, then `validate`, then a second Analyze and semantic dry run. Completion requires an empty action set.

Stop and consult the user when authority, ownership, intended command, or migration disposition cannot be established from direct evidence. Deferral is valid: remove only actions that depend on the deferred decision.

User-facing communication should describe project findings, real choices, and the final outcome. Do not make users operate internal schemas, plan hashes, evidence phases, or validation commands when no decision or intervention is required.

Never read or reproduce secrets, cookies, browser profiles, user data, or `.env` values. Never create parallel standards merely because the current structure differs from the preferred skeleton.
