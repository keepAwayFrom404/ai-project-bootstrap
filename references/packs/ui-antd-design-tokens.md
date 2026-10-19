---
pack_id: ui-antd-design-tokens
version: 1
concern: ui-ux
applies_when: antd version 5 or later is present
sources:
  - https://github.com/ant-design/ant-design/blob/master/docs/react/customize-theme.en-US.md
  - https://github.com/carbon-design-system/carbon/blob/main/packages/styles/docs/sass.md
---

# Ant Design token baseline

- Use Ant Design Seed Tokens for brand intent, derived Map Tokens for scales, and Alias Tokens for semantic use; prefer algorithms over hand-maintained color ladders.
- Keep component-specific overrides narrow. Promote a value to a shared semantic token only after it repeats with the same meaning.
- Define spacing, typography, radius, elevation, responsive breakpoints, focus indication, and interaction-state rules alongside color.
- Use semantic roles such as surface, text, border, success, warning, danger, and link instead of raw color names in product rules.
- Require loading, empty, error, disabled, focus, hover, selected, and destructive states for affected components.

Never invent a brand primary color. If no brand evidence exists, leave Seed Token values as a user decision while still proposing the semantic structure.
