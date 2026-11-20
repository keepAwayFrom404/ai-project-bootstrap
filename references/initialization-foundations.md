# Generating four portable foundations

Use the existing analyze → decisions → Change Plan → verification protocol. These capabilities guide what governance to propose; they do not introduce another workflow or authorize project edits.

| Concern | Default location | Read trigger |
| --- | --- | --- |
| Scope, authority, authorization, core engineering constraints | existing AGENTS and small project-rules | before changes |
| Task routing and one authority per concern | existing Registry | select only affected concerns |
| Local setup | existing run guide | installing dependencies or starting/stopping services |
| Module ownership, naming and side effects | existing engineering/domain rules | related code or architecture changes |
| Incremental checks and actual command prerequisites | existing verification guide | choose checks for the scoped diff |
| Troubleshooting | existing troubleshooting section | actual failure or environment blockage |
| Source rationale/history | existing decision or evidence record | provenance questions only |

Preserve valid current paths. Create an optional file only when substantial rules justify it; a section in an existing authority is enough. Do not duplicate commands across entrypoints. Registry file paths identify authority; describe relevant sections/read triggers without making the entire linked graph mandatory. Material business contracts remain complete for the affected scope.

## Tool independence

A discovered global tool/Hook/path is evidence to investigate, not permission to adopt or remove it. Distinguish personal availability, explicit team dependency and optional integration. Preserve authorized existing workflows; the baseline must not silently create a new CLI prerequisite. Keep host-specific development validation separate from the installed runtime. Do not copy local credentials or runtime caches.

## Verification selection

Bind checks to the complete task diff and actual consumers, not only edited tests. Select the nearest executable checks, reuse applicable results and state the reason before broadening. Keep existing CI gates; do not require local full-suite regression after every edit. When introducing enforcement, prove both accepted and rejected examples. A diagnostic rerun with altered workers/timeouts is not a default-run pass.

## Maintainability

Derive module ownership from existing code and callers. Use business names, one responsibility per function, explicit side effects, comments explaining reasons and stable dependency directions. Recommend existing lint/type tooling when useful, but do not introduce framework rewrites, arbitrary file sizes or fixed test concurrency merely because a pilot used them.

## Limits

Current topic checks are bounded keyword heuristics on registered authority content. `covered` means the documented topics matched; it does not validate recursive routing, every dependency edge or every global CLI. Tooling references may include examples, optional commands or prohibitions; classify them manually. Directory-safe link-graph validation and installer customization reconciliation are separate work, not implemented by these four foundations.
