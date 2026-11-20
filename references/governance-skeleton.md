# Governance skeleton

The standard core is intentionally small. Generate its reading contract using [initialization foundations](initialization-foundations.md); keep setup, troubleshooting and detailed domain rules on demand:


- `AGENTS.md`: concise entrypoint and repository-wide non-negotiable rules.
- `docs/agent/README.md`: Registry mapping each concern to exactly one authoritative path, scope, and owner.
- `docs/agent/project-rules.md`: durable project-specific engineering rules.
- `.ai-project-bootstrap/manifest.yaml`: generated ownership, hashes, path exceptions, unresolved groups, quality commands, and last validation result.

Optional domain documents are justified only by substantial, non-placeholder rules. An existing valid location may remain as an explicit Registry exception; standardization does not require moving it.

Derive optional domains from repository evidence. Typical triggers include source code formatting, frontend frameworks, UI systems, backend/API frameworks, deployment/runtime files, authentication or tenant boundaries, tests, and accumulated design/change records. Assess concern coverage before proposing files; distinguish current architecture from target architecture, and index historical decisions without inventing rationale. Formatting governance must point to executable repository-local tools and separate mutating write commands from non-mutating check commands.

Thin adapters such as `CLAUDE.md` may point to an authority but must not copy it. Systems already adopted by the project, such as OpenSpec/Comet, ai-dev-grow, AgentMemory, CodeGraph, MindWiki, tests, and CI, remain authorities for their own state. Their presence on the initializer's machine does not authorize project adoption or a global CLI requirement. Register their entrypoints and responsibility; never copy their graph, evidence, workflow state, or operating instructions into bootstrap files.

Registry rows use `concern | authoritative path | scope | owner/maintainer`. One concern has one authority. Links must resolve inside the repository; authority paths may identify a validated Markdown chapter. Use optional manifest reading_routes for explicit task-to-authority destinations, not a mandatory recursive read list.
