# Installation upgrades and local customizations

## Change decisions

The installer owns only its managed Skill directory. Project AGENTS, governance results and business files are outside installation scope. Preview/apply still require an exact current plan hash.

| State | Default result |
| --- | --- |
| Local bytes equal upstream | unchanged |
| Only upstream changed | update or delete the unchanged managed file |
| Only local content/deletion changed | preserve-local and record the actual digest/deletion |
| Upstream removes a customized file | preserve it as a local override; do not silently delete it |
| Both change, verified base exists | propose a Git three-way merge; apply only a clean reviewed plan |
| Overlap, binary divergence, missing base or Git unavailable | conflict; no target writes |
| A new managed path already has different unowned bytes | conflict; no implicit ownership |

Use `review --repo ... --path ...` to inspect base/local/upstream/candidate text. Output may include private local source; treat it as local review material, not public issue content. Binary bodies are omitted. Clean merge does not prove semantic compatibility; review runnable-code changes and validate affected behavior after installation.

For conflicts, pass the same `--resolutions file.json` to preview and apply. Each key is a managed resource path, and the value is one of `{"action":"keep-local"}`, `{"action":"use-upstream"}`, or `{"action":"merged-file","file":"upgrade/reviewed.md"}`. A manual file must be regular UTF-8 text inside the target repository, without escaping symlinks or conflict markers. Decisions/candidate changes invalidate the old hash. No force or blanket overwrite option is provided.

## v1 compatibility

New installs and successful reconciliations use `ai-project-bootstrap.install.v2`; old installers reject that schema rather than silently treating customizations as upstream. Existing v1 manifests are accepted. Their base hashes alone cannot reconstruct text: unchanged upstream can retain local edits, but simultaneous divergence needs an explicit resolution if no verified base is available. Informational v1 `local_overrides` are not overwrite authorization.

Historical adoption remains metadata-only and records a v1 legacy copy. Because adoption may contain human edits from an unknown upstream version, its first normal upgrade preserves all differing managed files as customizations. Choose use-upstream explicitly only after review. A successful normal apply establishes current upstream snapshots for future three-way merges. Adoption still requires a complete runtime copy; an incomplete unowned copy must be reviewed through normal install conflicts and explicit per-file decisions rather than silently adopted.

## Local metadata and recovery

- `.install-base/<sha256>` stores verified upstream bytes, not local secrets. Keep these baselines with the installed manifest if upgrades must work across machines; do not prune them blindly.
- `.install-backups/<run-id>/...` preserves pre-replacement bytes. Backups can include local customizations; keep them private and exclude them from public commits if appropriate. Installation does not edit the project's ignore file.
- `.install.lock` prevents concurrent modern installers. A stale lock after a crash requires checking no installer is active before removing it; do not remove another process's lock automatically.
- Successful per-file writes are atomic; there is no all-or-nothing multi-file transaction or power-loss guarantee. On failure, the previous manifest remains and the error identifies partial state/backups. Preserve the directory, restore selected bytes if needed, then preview again. Do not reuse the old approval hash or run a force update.
- No automatic rollback deletes new files or resets manual changes. Backups and unused bases are retained for inspection, not automatically garbage-collected.

The source installer requires Node and Git, not a global Agent/workflow CLI. This release has automated Linux CI coverage; native Windows behavior must be validated separately.
