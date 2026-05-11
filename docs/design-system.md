# Design System

## Current repo baseline

This guidance is based on the current repo, not a greenfield assumption.

- Frontend framework: Next.js App Router with React 19 and TypeScript.
- Styling approach: `frontend/app/globals.css` como entrypoint con partials en `frontend/app/styles/`.
- Component structure: lightweight local React primitives in `frontend/app/components/`, home orchestration in `frontend/app/page.tsx`, and shared home support in `frontend/lib/page-support.tsx`.
- Current reusable UI primitives already visible in code: `Field`, `StatusPill`, `Empty`, `Modal`, `DetailModal`, `SearchSelect`, `LoginScreen`.
- Current shell pattern: sidebar navigation plus workspace content area.
- Current list pattern: cards and record rows are used more often than dense tables.
- Current design token layer: CSS custom properties under `:root` with semantic `--color-*` names and compatibility `--shop-*` names.
- Current theme model: light tokens in `:root`, dark-mode overrides scoped to `.app-shell[data-theme='dark']`, with a sidebar toggle persisted in local storage.
- Current breakpoints: `980px` and `620px`.

## Current conventions worth preserving

- Keep messages in Spanish.
- Keep the app fast and direct.
- Reuse the existing shell, panels, records, and form patterns before inventing new surfaces.
- Prefer local CSS classes over new styling infrastructure.
- Preserve backend-driven workflows and current API contracts.

## Current design inconsistencies to stop spreading

- `frontend/app/globals.css` has variables, but spacing and layout values are still mostly hardcoded.
- `frontend/app/page.tsx` contains repeated inline spacing styles such as `style={{ marginBottom: 12 }}` and `style={{ marginTop: 18 }}`.
- The current palette should follow the shared reference screenshot: light CRM shell, white panels, soft gray workspace, blue primary actions, and red destructive actions.
- UI primitives exist, but they live in one large file instead of a more intentional component layer.
- There is at least one hidden visual branch (`hidden-section`), so future UI work should remove or revive hidden surfaces intentionally instead of stacking more dormant UI.
- Some strings in `page.tsx` show encoding artifacts, so any UI pass should check rendered text carefully.

## Style direction

Target a calm light CRM-style SaaS surface:

- strong information hierarchy
- white sidebar and top-level surfaces
- soft gray app canvas
- white work panels and cards
- dark high-contrast text
- restrained brand color usage
- compact but readable records
- obvious actions
- clear state communication
- integrated surfaces with low visual noise

Avoid turning the app into a marketing page or a glossy design exercise.
Do not drift back into a dark-first shell by default. Keep the dark navy design as a supported alternate mode, not the primary direction.
Avoid shiny gradients, decorative background effects, heavy floating cards, and nested boxes that fragment the workflow.

## Best place for design tokens

Use `frontend/app/styles/tokens.css` as the source of truth for tokens, imported from `frontend/app/globals.css`.

Why:

- the repo already uses CSS variables in `:root`
- there is no Tailwind theme to extend
- there is no component library theme layer to hook into
- the current app imports `globals.css` from `frontend/app/layout.tsx`
- `globals.css` can stay small and delegate by `@import` to surface-specific partials

Recommended approach for future implementation:

1. Keep semantic light tokens in `frontend/app/styles/tokens.css`.
2. Keep dark-mode tokens scoped to `.app-shell[data-theme='dark']` in the same token file.
3. Keep the existing `--shop-*` variables working as compatibility aliases.
4. Remap touched UI to semantic aliases gradually.
5. Do not scatter raw hex values through JSX or one-off CSS classes.

## Token strategy

### Required semantic color tokens

Document these as the target semantic layer:

```css
:root {
  --color-primary: #0284C7;
  --color-primary-foreground: #FFFFFF;
  --color-primary-hover: #0369A1;
  --color-secondary: #F3F4F6;
  --color-secondary-foreground: #111827;
  --color-accent: #0EA5E9;
  --color-accent-foreground: #FFFFFF;
  --color-focus-ring: rgba(14, 165, 233, 0.28);
  --color-link: #0284C7;
  --color-link-hover: #0369A1;

  --color-canvas: #F8FAFC;
  --color-canvas-deep: #FFFFFF;
  --color-workspace: #E8ECF1;
  --color-workspace-surface: #FFFFFF;
  --color-workspace-surface-raised: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-surface-raised: #F8FAFC;
  --color-text: #111827;
  --color-text-soft: #4B5563;
  --color-text-muted: #8B95A1;
  --color-border: rgba(17, 24, 39, 0.10);
  --color-border-strong: rgba(17, 24, 39, 0.16);
  --color-success: #16A34A;
  --color-warning: #F59E0B;
  --color-danger: #E00000;
}
```

### Migration mapping for the current stack

When the palette is implemented, these are the safest first mappings:

- `--shop-action` -> `--color-primary`
- `--shop-action-strong` -> `--color-primary-hover`
- `--shop-canvas` -> `--color-canvas`
- `--shop-surface` -> `--color-surface`
- `--shop-surface-raised` -> `--color-surface-raised`
- `--shop-ink` -> `--color-text`
- `--shop-ink-soft` -> `--color-text-soft`
- `--shop-ink-muted` -> `--color-text-muted`
- `--shop-border` -> `--color-border`
- `--shop-border-strong` -> `--color-border-strong`

### Theme strategy

The app supports two themes:

- Light mode is the default and should match the shared CRM screenshot direction: white sidebar, gray workspace, white surfaces, dark text, blue primary actions, and red destructive actions.
- Dark mode preserves the earlier navy design direction: `#0B2447` / `#071A33` canvas, `#19376D` active and primary surfaces, white text, muted pale-blue metadata, and `#A5D7E8` for focus/accent details.

Implementation rules:

- Put theme values in CSS variables, not JSX.
- Scope dark overrides under `.app-shell[data-theme='dark']`.
- Keep the sidebar toggle visible in the sidebar footer as a compact pill switch with a moving thumb, not as a full text button.
- When touching UI, verify both themes for contrast, dropdown readability, focus rings, and status badges.
- Do not duplicate whole component trees for themes.

## Motion system

Motion is now the single runtime for stateful UI animation in the frontend.

- `motion` owns enter/exit transitions, layout reflow, toast presence, modal presence, directional agenda swaps, and contextual feedback pulses.
- CSS keeps only simple hover, focus, color, border, shadow, and responsive overflow behavior.
- The canonical config lives in `frontend/lib/motion-spec.ts`.
- The global runtime is provided from `frontend/app/components/motion/AppMotionProvider.tsx` through `MotionConfig` with `reducedMotion="user"` and `LazyMotion`.

### Allowed motion tokens

Use these timings and curves unless a documented exception is added to the shared spec:

- Fast: `160ms`
- Base: `220ms`
- View: `280ms`
- Slow: `380ms`
- Pulse: `880ms`
- Standard ease: `cubic-bezier(0.22, 1, 0.36, 1)`
- Emphasis ease: `cubic-bezier(0.16, 1, 0.3, 1)`
- Agenda ease: `cubic-bezier(0.4, 0, 0.2, 1)`

Mirror the CSS-side timing variables in `frontend/app/styles/tokens.css`. Do not introduce one-off durations or ad hoc keyframes inside component files.

### Motion vs CSS

Use Motion when:

- a surface mounts or unmounts
- a list or card reflows because data changes
- a modal, toast, dropdown, or workspace view needs presence management
- the agenda moves directionally between date windows
- a record or field needs a contextual feedback pulse

Use CSS when:

- a button, input, or row only changes color, border, or shadow on hover/focus
- the effect is static and does not depend on presence, sequencing, or layout measurement

### Reduced motion policy

- Respect the OS-level reduced-motion setting through `MotionConfig reducedMotion="user"`.
- Keep transitions readable without relying on long movement distances.
- Retain the repo-wide `prefers-reduced-motion` CSS guard for non-Motion transitions.
- Do not add a second manual reduced-motion switch unless product requirements explicitly ask for it.

### Agenda-specific rules

- Keep `@dnd-kit/core` as the drag engine.
- Animate agenda board swaps with Motion presence, not CSS carousel keyframes.
- Prefer Motion layout animations for card reflow and stack changes.
- Use a single canonical directional variant for agenda navigation so forward/backward movement stays consistent across Lavado and Detailing.
- Do not reintroduce timeout-driven cloned frames or measured-height choreography unless a concrete regression forces it and the exception is documented.

## Exact color usage rules

### `#F8FAFC`, `#FFFFFF`, and `#E8ECF1`

Use for:

- `#FFFFFF`: sidebar, search/top controls, cards, modals, dropdowns, and major work panels
- `#F8FAFC`: raised neutral surfaces and hover states
- `#E8ECF1`: workspace/app canvas behind white work panels

Use subtle borders and soft shadows to separate white panels from the gray canvas. Do not use large dark fills as the default shell.

### `#0284C7` / `#0EA5E9`

Use for:

- filled primary buttons
- important links
- selected states
- date/week emphasis
- focus and progress accents

Use white text on filled blue buttons, preferring `#0284C7` for contrast and `#0EA5E9` for non-text accents. Do not use blue for every decorative element; it should clearly point to the next action.

### `#E00000`

Use for:

- reset actions
- destructive actions
- high-risk warnings that require attention

Use white text on red filled actions. Do not use red for normal status decoration.

### Dark-mode navy palette

Use for the alternate dark theme only:

- `#0B2447`: main navy canvas and brand anchor.
- `#19376D`: active navigation, primary dark action surfaces, hover states, and selected states.
- `#A5D7E8`: focus rings, subtle accents, informational badges, and low-volume highlights.

Do not use `#A5D7E8` as small body text on dark or light surfaces without checking contrast. Prefer white or pale neutral text for important dark-mode copy, and use `#A5D7E8` as a signal rather than a text default.

## Accessibility and contrast notes

Contrast notes for the light reference direction:

- `#111827` on white is safe for primary text.
- `#4B5563` on white is safe for secondary text.
- `#8B95A1` should be reserved for metadata and helper text, not long body copy.
- White text on bright `#0EA5E9` can be weak for small text; filled buttons should prefer `#0284C7` or darker.
- White text on `#E00000` is safe for destructive buttons.
- Focus rings should remain blue and visible on white and gray surfaces.
- In dark mode, white text on `#0B2447` is safe, but muted metadata must stay light enough to remain readable.
- `#A5D7E8` works well as a focus/accent color in dark mode, but it should not become the main text color.

## Layout rules

Keep the current shell model and refine it.

- Desktop sidebar width: `240px` to `256px`.
- Workspace page padding: `24px` desktop, `16px` mobile.
- Panel/card padding: `20px` to `24px`.
- Section spacing inside a page: `32px` to `48px`.
- Tight record spacing: `12px` to `16px`.
- Keep one main primary action per panel or toolbar cluster.

For the current app:

- preserve the sidebar plus workspace shell
- treat the sidebar as white and the workspace as soft gray
- keep `.workspace` slightly gray, with white cards and panels separated by shadow, spacing, and subtle borders
- preserve panel-based sectioning
- do not create a dedicated form column next to lists or dashboards; primary screens should stay focused on overview, records, and actions
- place create/edit forms in popups/modals so the workspace does not become split between a permanent form column and operational content

## Spacing scale

Use this scale:

- `4px`
- `8px`
- `12px`
- `16px`
- `24px`
- `32px`
- `48px`
- `64px`

Rules:

- use `8px`, `12px`, `16px` for component internals
- use `24px` for page rhythm and card padding
- use `32px` or `48px` between major sections
- avoid introducing new one-off values unless a responsive edge case truly needs them

## Typography hierarchy

Keep the current system font stack approach for now. Do not add a font dependency just for style.

Preferred hierarchy:

- Page title `h1`: `28px`, `700`, tight margin
- Section title `h2`: `20px`, `650` to `700`
- Subsection title `h3`: `16px`, `650`
- Body default: `14px` to `16px`, `400` to `500`
- Secondary text: `13px` to `14px`
- Labels and metadata: `12px`, `600`
- KPI value: `24px` to `28px`, `700`

Rules:

- keep labels above controls
- avoid long uppercase labels
- use weight and spacing before using extra color
- keep number-heavy values aligned and easy to scan
- on light surfaces, rely on spacing, type weight, and subtle gray borders before adding extra decoration

## Border radius rules

Use a sharp, sober radius by default:

- controls, buttons, pills, cards, dropdowns, and modals: `2px`
- avoid pill-shaped `999px` tags unless the user explicitly asks for that treatment

Practical rule for this repo:

- keep `--radius-sm`, `--radius-md`, and `--radius-lg` mapped to `2px` in `frontend/app/globals.css`
- do not introduce rounded one-off styles such as `10px`, `12px`, or `999px`
- use spacing, border contrast, and typography for hierarchy before radius or shadow

## Shadow and elevation rules

Use subtle elevation only.

Recommended ranges:

- cards and menus: `0 8px 24px rgba(0, 0, 0, 0.18)`
- dropdowns: `0 12px 28px rgba(0, 0, 0, 0.24)`
- modals: `0 20px 48px rgba(0, 0, 0, 0.32)`

Rules:

- avoid heavy floating UI
- never stack multiple decorative shadows on the same surface
- use borders first, shadow second
- prefer continuity between the shell and workspace over isolated card islands

## Component principles

- Reuse before creating.
- Prefer extending the current shell and existing local primitives.
- Extract a shared component only when it clarifies repeated behavior, not only repeated markup.
- Visual consistency matters more than novelty.
- A new component should come with a clear reason, a stable name, and token-based styling.

## Button guidelines

### Button hierarchy

- Primary: the main task on the screen or panel.
- Secondary or ghost: supporting actions.
- Danger: destructive or high-risk actions only.

### Sizes

- Default height: `36px` to `40px`
- Large/mobile priority action: `44px`
- Icon button: minimum `36px`, larger if it is a mobile tap target

### Rules

- one clear primary action per local area
- pair icon plus label only when the icon improves scanning
- do not place primary and danger buttons with equal visual weight unless the decision is intentionally forced
- hover, focus, and disabled states must be visible
- default filled actions should use `#0284C7` with white text
- destructive/reset actions should use `#E00000` with white text
- secondary actions should usually be white or light gray with dark text

## Form guidelines

- Do not place forms as a permanent left/right column in the main workspace.
- Use popups/modals for create and edit flows by default.
- Keep the underlying list, dashboard, or agenda visible as the operational context behind the modal.
- Main screens may show compact filters, search, quick actions, or read-only summaries, but not a full data-entry column.
- Keep labels persistent. Do not rely on placeholders as labels.
- Use two-column rows only when fields are naturally paired.
- Collapse to one column on narrow screens.
- Keep input and `SearchSelect` heights aligned.
- Use helper text or `info-note` style for calculations, assumptions, or stock/cash feedback.
- Mark destructive or irreversible choices clearly.
- Default values should reduce typing, not hide decisions.

## Table and list guidelines

This repo currently favors records/cards over classic data tables. That is the default until a screen proves otherwise.

Use record cards when:

- the item has multiple metadata lines
- actions are item-level
- the list is moderate in size
- the operator needs recognition more than spreadsheet scanning

Use a true table only when:

- many rows and columns need fast comparison
- the same columns repeat across a large dataset
- row actions can stay compact without harming readability

Rules for lists:

- keep title first, metadata second, actions last
- highlight status consistently
- keep scan lines short
- avoid mixing more than two text densities inside one record
- on light screens, separate rows with white surfaces, soft shadows, subtle borders, and spacing before using strong accent fills

## Empty state guidelines

Every empty state should answer:

- what is empty
- why it matters
- what the user can do next

Use calm messaging. Avoid jokes or decorative filler.

## Loading state guidelines

- keep layout stable while loading
- prefer inline loaders or skeleton-like placeholders over blocking the whole page
- show loading close to the affected area when possible
- do not hide navigation or context during local loads

## Error state guidelines

- say what failed in plain Spanish
- keep the tone operational
- give the next useful action when possible
- do not expose technical internals unless the action truly requires them
- keep error surfaces readable on light backgrounds without collapsing into saturated red blocks

## Responsive behavior

Use the current repo breakpoints as the default baseline:

- major layout shift around `980px`
- narrow mobile adjustments around `620px`

Rules:

- sidebar can stack above content on smaller screens
- forms should become one column on mobile
- action clusters should wrap cleanly
- cards and records should preserve readable tap targets
- horizontal scrolling is acceptable only for clearly bounded content such as agenda lanes when needed
- the light CRM shell should remain consistent on mobile; do not switch to a separate dark presentation without reason

## Accessibility requirements

- keyboard focus must always be visible
- interactive rows must support keyboard behavior, not only click behavior
- modal dialogs must be dismissible and understandable with keyboard navigation
- color cannot be the only way to communicate state
- body text and controls must meet contrast requirements
- touch targets should aim for `44px` where mobile usage matters
- screen titles, section headings, and action labels should stay explicit

## Repo-specific CSS and component conventions

- No Tailwind is present. Do not write docs or prompts that assume a Tailwind theme.
- No component library is present. Do not assume a theme provider or design-token API.
- Prefer semantic CSS variables in `frontend/app/globals.css`.
- Prefer descriptive class names over inline styles.
- If a style repeats, move it to CSS instead of repeating `style={{}}`.
- Keep `frontend/app/page.tsx` stable unless there is a clear reason to extract UI into a dedicated component file.

## Practical implementation rule for the next UI task

When a future prompt asks for a visual improvement:

1. read this file plus `docs/design-brief.md`
2. inspect the touched area in `frontend/app/page.tsx` and `frontend/app/globals.css`
3. reuse the current component and class vocabulary first
4. add semantic tokens in `globals.css` before adding raw hex colors
5. validate layout, focus, empty/loading/error states, and mobile behavior before calling the work done
