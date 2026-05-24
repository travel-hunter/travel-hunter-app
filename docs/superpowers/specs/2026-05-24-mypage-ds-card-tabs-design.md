# My Page DS Card And Tab Alignment Design

## Context

The `/mypage` screen still has local layout rules for favorite policy rows and bottom navigation behavior. On mobile, favorite policy card text can overflow or split into vertical fragments, and the first bottom tab can appear fixed-width or visually inconsistent with the other tabs.

This work will align those areas with the app design-system language without changing data fetching, saved policy behavior, auth/session behavior, or backend API contracts.

## Goals

- Make favorite policy cards readable at mobile widths from 360px upward.
- Prevent title, amount, remove action, and icon/thumbnail text from overflowing their card.
- Make bottom tabs distribute evenly and center their icon/label content across screens, including `.prototype-mypage-screen`.
- Move my page repeated UI toward reusable DS-style patterns instead of one-off layout rules.
- Preserve current user flows: open saved policy detail, remove saved policy, navigate via bottom tabs.

## Non-Goals

- No API changes.
- No saved policy data model changes.
- No redesign of all my page sheets or profile editing flows.
- No broad Korean copy cleanup beyond visible text touched by these components.

## Recommended Approach

Create small presentational patterns in `frontend/src/components/patterns.tsx` and use them from `frontend/src/pages/MyPage.tsx`:

- `ProfileSectionHeader`: a reusable section heading/action row based on the existing home section header shape.
- `FavoritePolicyCard`: a saved-policy row/card pattern using `SurfaceCard`, fixed icon slot, truncating text stack, and a compact remove button.
- Keep `ProfilePanel` and `ProfileStat` usage, but make the favorite list stop relying on fragile local flex sizing.

For bottom tabs, normalize `.bottom-tabs` CSS globally:

- use a four-column grid with `repeat(4, minmax(0, 1fr))`;
- set each `.tab` to `min-width: 0`, centered column layout, and no item-specific width;
- ensure icon and label are vertically centered inside each tab.

## Favorite Card Behavior

Each favorite policy card should render as:

- left: compact visual marker or icon slot that never wraps text vertically;
- center: link area with `min-width: 0`;
- title: one-line ellipsis;
- amount/benefit summary: one-line ellipsis;
- right: compact remove button with `white-space: nowrap`, disabled state while removing.

The full card remains tappable through the policy link area. The remove button remains separate and accessible by `aria-label`.

## Testing And Validation

- Add or update a regression test in `frontend/src/App.test.tsx` for `/mypage` saved policy cards:
  - favorite card renders with a link and remove button;
  - visible text does not duplicate into icon slots;
  - the component class used for favorite cards is present.
- Run:
  - `cd frontend; npm run typecheck`
  - `cd frontend; npm test -- --run src/App.test.tsx -t "shows saved policies on my page"`
  - `cd frontend; npm run build`
- Rebuild Docker and visually verify `/mypage` at mobile width:
  - favorite policy rows do not overflow;
  - remove action is readable;
  - bottom tabs are evenly distributed and centered.

## Risks

- Some existing Korean text in `MyPage.tsx` is already mojibake in source. This task should avoid broad copy churn, but any directly touched labels should remain readable in the rendered UI.
- Existing CSS near `.prototype-mypage-screen` has duplicate rules. The implementation should keep edits scoped and prefer overriding/removing only the rules that affect favorite cards and bottom tabs.
