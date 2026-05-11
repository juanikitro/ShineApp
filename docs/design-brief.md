# Design Brief

## Product summary

ShineApp is an operational management app for car wash and detailing centers. It behaves more like a compact CRM than a showcase site: the user needs to move quickly between customers, vehicles, bookings, work orders, cash, inventory, and quotes without stopping to decode the interface.

The current frontend is a practical Next.js app with one main shell and a dense work surface. Future UI work should improve clarity and consistency inside that operating model instead of forcing a full visual reset. The current visual reference is a light operational CRM: white sidebar, soft gray app canvas, white work panels, dark text, blue primary actions, and red destructive actions. A navy dark mode is also supported as an alternate working theme, preserving the previous `#0B2447` direction for low-light use without replacing the light CRM default.

## Target user

- Skilled tradesperson or shop operator.
- Comfortable with the business domain, not necessarily comfortable with software.
- Needs fast recognition over exploration.
- Benefits from clear labels, predictable actions, and low-friction forms.

## Desired emotional tone

The app should feel:

- Simple
- Clear
- Professional
- Fast
- Trustworthy
- Modern, but not over-designed
- Calm, focused, and serious

The UI should feel like a reliable workshop tool, not a consumer app or a marketing site.
It should feel like a clean CRM workspace for real shop work: light, orderly, direct, and easy to scan.
In dark mode it should keep the same discipline, but with a serious navy shell, white text, restrained accents, and no glossy effects.

## Design principles

1. Reduce friction first.
   Every screen should help the user finish the task with minimal interpretation.

2. Make hierarchy obvious.
   Primary action, current context, key metrics, and state should be visible at a glance.

3. Reuse patterns aggressively.
   Similar data and similar actions should look and behave the same across sections.

4. Prefer calm density over empty polish.
   This is a work tool. It can be information-rich, but it must stay readable.

5. Keep forms out of the main workspace.
   Creation and editing should happen in popups/modals, not in a permanent form column that competes with the list, agenda, or dashboard.

6. Keep interaction feedback immediate.
   Loading, empty, success, warning, and error states should never feel ambiguous.

7. Preserve operational trust.
   Dangerous actions, money, status, and schedule changes should be explicit and easy to verify.

8. Avoid visual noise.
   Use color, radius, elevation, and motion with restraint.

## What the UI should avoid

- Decorative gradients as a default style.
- Excessive shadows, glassmorphism, or floating cards everywhere.
- Ambiguous actions with equal visual weight.
- One-off spacing, one-off colors, and one-off button styles.
- Permanent form columns beside lists or dashboards.
- Low-contrast accent text on white backgrounds.
- A bright canvas without enough gray framing or panel hierarchy.
- Clever interactions that hide important data or actions.
- Large empty hero areas that push the real work below the fold.
- Copying another product's brand language directly.

## What "good" means for this app

A good ShineApp screen should let an operator answer these questions fast:

- Where am I?
- What is the main action here?
- What changed?
- What needs attention?
- What can I safely do next?

If a screen looks polished but slows that down, it is not a good result for this product.

## How the palette supports the desired feeling

The palette should communicate trust, control, calm, and focused seriousness:

- `#F8FAFC` and `#FFFFFF` carry the sidebar, top surfaces, controls, and cards so the interface feels clear and approachable.
- `#E5E7EB` to `#EEF1F5` frame the workspace and separate major areas without visual heaviness.
- `#111827` and `#4B5563` keep text readable and serious.
- `#0284C7` to `#0EA5E9` is the action/link blue family, matching the clean blue emphasis in the reference screenshot while keeping button contrast stronger.
- `#E00000` is reserved for destructive or reset actions, matching the visual language of high-risk controls.
- `#0B2447`, `#19376D`, and `#A5D7E8` are reserved for the dark-mode identity: navy canvas, navy interaction states, and pale-blue focus/accent details.

Used correctly, the palette produces a professional light SaaS/CRM feel with workshop-level practicality. The key is restraint: most surfaces stay white or soft gray, blue marks the main path, red marks risk, and borders/shadows remain subtle.
