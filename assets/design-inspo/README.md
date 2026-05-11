# Design Inspiration Assets

This folder is for visual reference material that should guide future UI work.

Allowed contents:

- screenshots
- mockups
- annotated captures
- wireframes
- exported design specs

## Naming rules

Use descriptive, sortable file names.

Preferred patterns:

- `YYYY-MM-DD-source-screen-topic.ext`
- `source-feature-variant.ext`
- `internal-screen-state-note.ext`

Examples:

- `2026-05-06-linear-sidebar-density.png`
- `stripe-dashboard-card-rhythm.png`
- `internal-workorder-modal-mobile.png`

## How future prompts should reference these files

Future prompts should mention the exact path and the exact intent.

Good example:

- "Use `assets/design-inspo/2026-05-06-linear-sidebar-density.png` as a spacing and density reference for the sidebar and record list. Do not copy the layout."

Bad example:

- "Make it look like the screenshot."

Prompts should always say:

- which file is relevant
- which part of it is useful
- what should not be copied

## Important rule

These files are inspiration, not assets to copy directly.

Do not:

- copy logos
- copy brand colors
- copy illustrations
- copy exact layouts
- treat external screenshots as product assets

## Documentation rule

Whenever a new screenshot or mockup is added here, update `docs/inspiration.md` with:

- the source
- what to borrow
- what not to copy
- where it applies in ShineApp
