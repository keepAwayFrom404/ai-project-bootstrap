# Governance skeleton

The standard core is intentionally small:

- `AGENTS.md`: concise entrypoint and repository-wide non-negotiable rules.
- `docs/agent/README.md`: Registry mapping each concern to exactly one authoritative path, scope, and owner.
- `docs/agent/project-rules.md`: durable project-specific engineering rules.
- `.ai-project-bootstrap/manifest.yaml`: generated ownership, hashes, path exceptions, unresolved groups, quality commands, and last validation result.

Optional domain documents are justified only by substantial, non-placeholder rules. An existing valid location may remain as an explicit Registry exception; standardization does not require moving it.

Derive optional domains from repository evidence. Typical triggers include frontend frameworks, UI systems, backend/API frameworks, deployment/runtime files, authentication or tenant boundaries, tests, and accumulated design/change records. Assess concern coverage before proposing files; distinguish current architecture from target architecture, and index historical decisions without inventing rationale.

Thin adapters such as `CLAUDE.md` may point to an authority but must not copy it. Existing systems such as OpenSpec/Comet, ai-dev-grow, AgentMemory, CodeGraph, MindWiki, tests, and CI remain authorities for their own state. Register their entrypoints and responsibility; never copy their graph, evidence, workflow state, or operating instructions into bootstrap files.

Registry rows use `concern | authoritative path | scope | owner/maintainer`. One concern has one authority. Links must resolve inside the repository.
