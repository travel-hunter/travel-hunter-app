# /ai-results initial selection + clean detail design

Status: pending user approval from browser wireframe.

Use `.omx/specs/deep-interview-ai-results-initial-selection-card-copy.md` as the requirements source. The first pass is a focused `/ai-results` UI polish: default first candidate selection, one selected map pin, softer add button red, and a simplified selected-summary card. No API/backend/order/add-flow changes.

## Add flow refinement: preview-hosted Day panel

User approved moving the candidate add Day picker out of the candidate card popover and into the current itinerary preview area. The panel should be minimal:

- Candidate card add click opens a Day selection/confirm panel in the `TripPreview` area.
- Remove helper text like `선택한 추천 후보` from the candidate pill.
- Remove the route/current-flow box from this panel; detailed schedule flow can be checked on the itinerary detail page.
- Keep only: title `어느 Day에 추가할까요?`, concise helper `Day를 고르고 바로 추가하세요`, candidate name + category, Day choices with counts, cancel, and `Day N에 추가` confirm.
- Preserve existing add API flow and duplicate blocking.

### Preview-hosted Day selector v3 refinement

- Remove the secondary ghost/cancel button because the panel already has an `×` close affordance.
- Remove extra preview-head helper copy; keep only a compact `Day 선택` title plus close button.
- Keep the selector focused on candidate identity, Day choices, and one primary confirm CTA.
