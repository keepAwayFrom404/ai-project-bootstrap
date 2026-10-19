# Engineering rules

- Treat this repository as the only source for the `ai-project-bootstrap` Skill. Installed project copies are generated distributions, not authoring locations.
- Preserve the safety boundary: analysis is read-only apart from an explicit output file, project mutations require a reviewed plan, and installation requires a matching preview hash.
- Keep runtime code dependency-free unless a dependency has a demonstrated cross-project benefit.
- Add or update tests for behavior, installer, schema, or path-safety changes.
- Run `npm run check` before delivery and update README or architecture documentation when distribution behavior changes.
- Never include credentials, `.env` contents, browser profiles, cookies, target-project business data, or project-specific governance state.
