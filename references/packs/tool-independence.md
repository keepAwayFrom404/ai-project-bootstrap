---
pack_id: tool-independence
version: 1
concern: tool-independence
applies_when: source code or Agent instructions are present
sources:
  - https://agents.md/
---

# Tool independence

- Establish the baseline using repository-local commands/tools and declared project dependencies.
- No implicit global tool requirement: a personal Comet, ai-dev-grow, memory service, or host installation must not become a team prerequisite because it is present on the initializer's machine.
- Existing project-adopted workflows remain authoritative for their state. Require an explicit project decision for new adoption, removal, global installation, or Hook changes.
- For a missing tool, describe the actual blocked operation and an available direct-development path if compatible; do not automatically install, authenticate, or weaken existing gates.
- Inspect instruction files, Skills, Hooks and command scripts for personal paths and global CLI assumptions. Treat scanner references as candidates, not proof of an unwanted dependency.
- Separate developer-only validators from the distributed runtime. Portability claims must state which layer still needs host tooling.
