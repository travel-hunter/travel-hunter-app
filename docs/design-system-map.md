# Travel Hunter Design System Map

## Purpose

This document records how external design references map to the current Travel Hunter UI tokens and components. It is a design reference, not the product requirements source of truth.

## Sources

- Wanted Design System imported reference: `6X5t38FCiVoIdRdi3C2olj`
- Travel Hunter handoff file: `6qxML42kKtZWIwLUU1YDpX`
- Current app direction: Prototype-style mobile app shell with Travel Hunter red primary theme.

## Token Mapping

| Design role | Travel Hunter token | Current value | Usage |
| --- | --- | --- | --- |
| Primary | `--primary-500` | `#ff5e5b` | Main CTA, active tab, focus state |
| Primary dark | `--primary-600`, `--primary-700` | `#e84845`, `#c73532` | Hover, pressed, gradient end |
| Primary surface | `--primary-50`, `--primary-100` | `#fff5f4`, `#ffe5e4` | Selected chip, soft CTA background |
| Secondary | `--secondary-500`, `--secondary-600` | `#ff4b6e`, `#d9365b` | Accent markers and supporting emphasis |
| Accent | `--accent-500`, `--accent-600` | `#00c7ae`, `#008f7d` | Savings/success emphasis |
| Neutral ink | `--ink`, `--gray-900` | `#111827`, `#0f172a` | Body and heading text |
| Neutral border | `--gray-200`, `--gray-300` | `#e5e7eb`, `#d1d5db` | Card, input, divider |
| Radius | `--radius-xs` to `--radius-xl` | `6px` to `16px` | Button, input, card, sheet |
| Shadow | `--shadow-xs`, `--shadow-sm`, `--shadow-md` | Low elevation | Cards, shell, modal |

## Component Mapping

| Figma/component reference | Current code surface | Current decision |
| --- | --- | --- |
| Button | `frontend/src/components/ui.tsx`, `.btn` | Keep Wanted size/radius guidance, use Prototype red primary tokens. |
| Chip / badge | `.filter-chip`, `.tag`, policy badges | Use soft red selected states for interactive chips; keep semantic badges compact. |
| Text field | `.field input`, `.search-field`, auth inputs | Keep 48px-ish form rhythm and 12px radius. |
| Cards | policy cards, itinerary cards, mypage cards | Keep white surface, subtle border/shadow, compact radius. |
| Navigation tab | `ServiceLayout`, `BottomTabs` | Keep Prototype-style bottom bar; active state uses red primary. |
| Sheet / dialog | trip select sheet, editor sheets, confirm dialog | Keep white surface, 16px radius, app-internal modal behavior. |
| Toast / inline state | `Toast`, `ErrorState`, `LoadingState` | Keep compact app feedback; avoid browser-native alert/confirm. |

## Notes

- Wanted source primary blue is a historical reference only. Current product UI uses Prototype red (`#ff5e5b`) as primary.
- Decorative colors such as travel gradients, policy thumbnails, Kakao yellow, Google white, warning yellow, and success mint may remain outside the primary palette when they carry semantic or brand meaning.
- This file is the single design reference kept in `docs/`; old Figma import and measurement notes were removed during docs core cleanup.
