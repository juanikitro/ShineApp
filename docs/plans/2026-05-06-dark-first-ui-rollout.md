# Dark-First UI Rollout

## Scope

Apply the documented dark-first direction across the current frontend without changing business logic, endpoints, payloads, or workflows.

## Constraints

- Keep Next.js App Router structure.
- Keep the current single-screen orchestration in `frontend/app/page.tsx`.
- No new dependencies.
- Extract presentational components only.

## Approved approach

1. Move repeated visual primitives out of `frontend/app/page.tsx` into `frontend/app/components/`.
2. Keep all state, API calls, handlers, and business rules inside `page.tsx`.
3. Rebuild `frontend/app/globals.css` around a dark-first token system:
   - `#0B2447` as main shell canvas
   - light text on dark surfaces
   - `#19376D` for raised/interactive surfaces
   - `#A5D7E8` for restrained accents and focus
4. Replace ad hoc inline spacing with class-based styling where touched.
5. Validate with `npm run build`.

## Presentational extraction target

- layout: `AppShell`, `SidebarNav`, `PageHeader`
- ui: `Field`, `SearchSelect`, `StatusPill`, `Empty`, `ModalFrame`, `DetailModal`, `Panel`, `MetricCard`, `RecordCard`

## Expected outcome

- Whole app visually aligned to the new dark direction
- Better reuse of presentational structure
- No behavior change

## Refinement: sober integrated mode

After the first dark rollout, the target direction was tightened:

- less shine
- fewer gradients
- fewer shadows
- fewer isolated boxes
- lower border radius
- stronger visual integration between sidebar, workspace, panels, and lists
