# Governance links and progressive reading validation

`bootstrap validate` checks the core governance documents, Registry authorities, optional documents and their local Markdown references. It does not fetch external URLs or execute linked files. The output reports errors/warnings and `link_validation` with traversal completeness and the number of Markdown documents inspected.

## Registry authority

Keep one row per concern. Concern identity ignores Unicode compatibility differences, case, repeated spaces and simple emphasis markers; it does not infer arbitrary semantic aliases across languages. Repeated rows are errors even if both point to the same file. Distinct concerns may share one authority file.

The authority column accepts a repository-relative file path, optionally with a chapter fragment, for example `docs/agent/backend.md#transactions`. Backticks around a path are allowed. Regular Markdown links elsewhere resolve relative to their containing document. Registry column paths resolve from the repository root.

Chapter-scoped topic coverage uses that chapter and nested subsections only. Keywords in another chapter cannot make it covered. Topic matching is still heuristic and does not prove code compliance.

## Optional reading routes

Existing v1 governance manifests remain valid without routes. To validate an explicit progressive-reading map, add `reading_routes`:

```json
{
  "reading_routes": [
    {
      "id": "backend-change",
      "when": "Changing backend transactions",
      "targets": ["docs/agent/backend.md#transactions"]
    }
  ]
}
```

Each route needs a unique ID, non-empty trigger and non-empty target list. Targets must exist, chapter references must resolve, duplicate targets within a route are errors, and destinations must be registered authorities or core entrypoints. If an authority is chapter-scoped, the route must identify that chapter; it cannot silently broaden to the entire file.

These declarations describe task selection; the validator does not run a loader, evaluate natural-language triggers, prove the agent read the right amount, or require following all references while coding. Structural validation traverses a bounded graph to find stale references; that is separate from the Agent's task-based reading policy. Backlinks and cycles are allowed and visited once.

## Supported Markdown and limits

Checks cover common inline links, reference definitions/links, ATX/Setext headings, Unicode and repeated-heading slugs, explicit quoted HTML IDs, percent-encoded destinations and angle-bracket paths with spaces. Fenced code, inline code and HTML comments are excluded from link scanning. Missing definitions and unclosed fenced blocks are reported.

The parser is a bounded Markdown subset, not full CommonMark/GFM or HTML validation. Complex nested link labels, unusual embedded HTML/MDX, and all entity/rendering edge cases are not certified. External references generate an unchecked warning without including their private URL values; no network access is implied.

Local paths must remain within the repository, refer to files and match filename case. Escaping symlinks, malformed encodings and non-Markdown chapter targets fail validation. Default graph limits are 64 Markdown documents, 2 MiB of document bytes and depth 8; exceeding them returns an error and `complete: false`, not a passing truncated result. API callers may choose explicit limits appropriate to their repository.

The Skill repository validator also checks supported chapter references in `SKILL.md` using the same parser. It does not recursively validate every Skill reference or fetch external sites.
