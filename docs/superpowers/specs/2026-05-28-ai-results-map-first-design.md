# /ai-results Map-First A Design Spec

## Status

- Date: 2026-05-28
- Source workflow: `$deep-interview` + Superpowers Visual Companion
- Selected browser wireframe: `.superpowers/brainstorm/67638-1779952488/content/ai-results-wireframes-a-map-first-slim-daybar.html`
- Implementation status: planned, not implemented in this step

## Design Decision

Use the selected **A’’’ map-first, slim Day bar** design as the fixed implementation target for `/ai-results`.

The page should behave like a task workspace, not a marketing or explanation screen. The user entered from a trip and should immediately see AI recommendation candidates on a map, select a candidate, choose the target Day with a slim control, and add it to the itinerary.

## Core UX Principle

Remove explanatory bulk. Prioritize directly actionable UI:

1. Top app bar with the concise title `AI 추천 후보`.
2. Compact candidate status filters/counts: all, addable, already added.
3. Large candidate map with selected candidate summary overlaid.
4. Slim Day selector bar: `D1 / D2 / D3` plus a compact add button.
5. Candidate list with clear trust signals.

## Fixed Layout Requirements

### Header

- Keep the existing top navigation/back affordance.
- Replace the large hero and instructional heading with a compact title only.
- Do not show a gradient hero card.
- Do not show explanatory copy like “지도에서 후보를 고르고 원하는 Day에 추가”.

### Candidate Status Filter

Show a compact one-row filter/status strip:

- `전체 N`
- `추가 가능 N`
- `이미 추가 N`

The first implementation may treat the strip as display-first or lightweight filter buttons, but the implementation plan should prefer making them actual filter buttons if it can be done without API changes.

### Map-first Workspace

- The map is the dominant element above the fold.
- The selected candidate appears as a compact overlay/summary on the map.
- The overlay should show:
  - candidate title,
  - address/meta or location signal,
  - trust chips for location, benefit/reason, and duplicate/addable state.

### Slim Day Add Bar

- Replace the current large Day picker dialog/panel with a slim bar.
- The bar contains short Day pills (`D1`, `D2`, `D3`) and a compact add button.
- The selected/recommended Day should be highlighted.
- The add button should include enough context for accessibility, even if the visible label is short.

### Candidate List

- Candidate rows remain available under the map/add bar.
- Each row shows title, compact meta, status/trust signals, and a small select action.
- Already-added candidates are visually de-emphasized and should not reopen the add bar as an addable candidate.

### Additional Surfaces Included

The implementation plan should also cover:

- `/trips/{id}` entry CTA copy into `/ai-results`.
- `/ai-results` empty, loading, add-error, and fetch-error states.
- Current trip/Day preview placement and compact representation.
- Recommendation criteria sheet copy and trigger simplification.
- API/docs contract check proving no API change is needed.

## Out of Scope

- No backend changes.
- No API contract shape changes.
- No full itinerary regeneration flow.
- No policy application or policy-save flow.
- No chat-style AI interface.
- No desktop-first redesign.

## Acceptance Criteria

- A user sees the map and selected candidate context immediately after the top bar/filter strip.
- The page no longer renders `.ai-results-hero` or a large explanatory h1 section.
- A selected candidate exposes location, benefit/reason, and already-added/addable status.
- The Day selection UI is slim and does not use the old large Day picker dialog as the primary add interaction.
- Add flow remains: select candidate → choose Day → add to trip.
- Already-added candidates are visible as duplicates and cannot be added again.
- Empty/error states stay concise and do not imply full itinerary generation.
- The plan/implementation uses existing `Recommendation` and `Trip` fields only.
- Mobile widths 360, 390, and 430 px avoid horizontal overflow and obvious text clipping.
