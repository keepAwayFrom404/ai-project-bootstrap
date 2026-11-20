# Engineering rules

- Treat this repository as the only source for the `ai-project-bootstrap` Skill. Installed project copies are generated distributions, not authoring locations.
- Preserve the safety boundary: analysis is read-only apart from an explicit output file, project mutations require a reviewed plan, and installation requires a matching preview hash.
- Keep runtime code dependency-free unless a dependency has a demonstrated cross-project benefit.
- Add or update tests for behavior, installer, schema, or path-safety changes.
- Verify changed behavior and affected consumers with focused tests; reuse applicable results. Run the full `npm run check` only for broad impact or the CI gate, with the reason stated. Update README or architecture documentation when distribution behavior changes.
- Never include credentials, `.env` contents, browser profiles, cookies, target-project business data, or project-specific governance state.
