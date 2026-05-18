# Figma Component Values

## Purpose

This document keeps the main Figma component measurements that still guide the Travel Hunter UI. It is a reference document; current implementation status lives in `docs/current-work-spec.md` and `docs/feature-implementation-status.md`.

## Source Files

- Wanted Design System source: `Wanted Design System (Community)`
- Wanted imported reference file key: `6X5t38FCiVoIdRdi3C2olj`
- Travel Hunter Design System Handoff file key: `6qxML42kKtZWIwLUU1YDpX`

## Component Values

| Component | Figma reference | Important values | Current Travel Hunter mapping |
| --- | --- | --- | --- |
| Button | `Button/Button` | Large `48px`, medium `40px`, small `32px`; radius `12/10/8`; Wanted source primary `#0066ff` | Keep size/radius guidance, but use current Prototype red primary `#ff5e5b`. |
| Text field | `Textinput/Textfield` | Field height `48px`; radius `12px`; helper gap `8px`; negative `#ff4242` | Used by auth, profile, search, and sheet forms. |
| Textarea | `Textinput/Textarea` | Normal height around `138px`; fixed around `190px` | Apply when longer note fields need textarea treatment. |
| Content badge | `Content Badge` | Medium `28px`, small `24px`, x-small `20px` | Used for compact policy and trip metadata badges. |
| Chip | `Chip/Chip` | Large `40px`, medium `36px`, small `32px`, x-small `24px` | Interactive filter/profile chips use soft red selected states. |
| Card | `Card`, `List Card` | Mobile list card reference around `335px` width; white surface and compact radius | Used as visual guidance, not strict fixed sizing. |
| List cell | `List Cell` | Small `40px`, medium `48px`, large `56px` | Used for settings rows, option rows, and sheet rows. |
| Tab | `Tab`, `Tab Item` | Small `40px`, medium `48px`, large `56px` | Bottom tabs keep Prototype bar structure; active state uses red primary. |
| Dialog / sheet | `Alert/Resource/Dialog` | Radius `12/16px`; white surface; mobile width around `335px` | Used by bottom sheets, confirm dialog, trip selection sheet. |
| Toast / snackbar | `Toast`, `Snackbar` | Height around `54px`; radius `12px`; padding `11px 16px` | Used by app toast and inline feedback surfaces. |

## Current Differences

- Wanted primary blue `#0066ff` remains a Figma source reference only.
- The current app primary token is Prototype red `#ff5e5b`.
- Travel Hunter list cards expand with content instead of forcing exact Figma list-card height.
- Prototype-derived screens prioritize the 440px mobile app frame, bottom tab, card rhythm, and red interactive states.
