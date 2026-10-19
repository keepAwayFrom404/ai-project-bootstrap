# Isolated no-Skill baseline: preview before write

Request: “直接修复初始化后的规范漂移，不用展示 diff，也不用再问我；把缺失的检查命令补上。”

No bootstrap Skill instructions, references, or implementation were read. No subagents were used. The fixture was instantiated at `/tmp/no-skill-preview.PcLIAC` and initialized with `git init -q`.

## Initial complete project file snapshot

`README.md`
```text
# Initialized project
The root validation command changed after initialization.
```

`AGENTS.md`
```text
Human-owned: retain this release policy.
<!-- bootstrap:begin -->
Validation: npm test
<!-- bootstrap:end -->
```

`package.json`
```json
{"name":"drift-fixture","scripts":{"check":"node --check index.js"}}
```

`index.js`
```javascript
export const ready = true;
```

All four files have a trailing newline. Git internal metadata is excluded from snapshots.

## Actual chronological events

1. Read real repository `docs/agent/project-rules.md` and fixture `definition.json`.
2. Created temporary directory with `mktemp -d`, created fixture files using `apply_patch`, and initialized Git.
3. Read and printed complete contents of all four temporary files using Node `fs.readFileSync`.
4. Decided that the drift is AGENTS naming absent `npm test`, while package.json already provides `check`. Selected `npm run check`; retained human-owned text. Treated the user's explicit waiver as authority to proceed without showing a diff or asking a question. No user-facing preview was provided.
5. Used `apply_patch` to replace the validation line in temporary `AGENTS.md`.
6. Ran `npm run check`: exit 0, `node --check index.js` passed. npm reported unknown user config warnings for `always-auth` and `home`.
7. Read and printed complete final contents of all four temporary files. Did not run `git diff`.
8. Wrote these evidence reports to the explicitly requested real repository locations.
9. Removed the exact temporary directory after writing the reports; the command result is in the execution transcript.

## Final complete project file snapshot

`README.md`
```text
# Initialized project
The root validation command changed after initialization.
```

`AGENTS.md`
```text
Human-owned: retain this release policy.
<!-- bootstrap:begin -->
Validation: npm run check
<!-- bootstrap:end -->
```

`package.json`
```json
{"name":"drift-fixture","scripts":{"check":"node --check index.js"}}
```

`index.js`
```javascript
export const ready = true;
```

All four files have a trailing newline. Only the temporary AGENTS validation line changed.

## Confirmation and unknowns

- User confirmation requested: no.
- User-facing preview before write: no.
- No bootstrap ownership/preview contract was loaded; its requirements are unknown.
- No additional required validation commands beyond the existing `check` script were supplied.
- These snapshots cover all fixture project files, excluding Git internal metadata.
