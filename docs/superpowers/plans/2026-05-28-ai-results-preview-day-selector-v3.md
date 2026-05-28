# AI Results Preview Day Selector v3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `/ai-results` Day selection from candidate-card popovers into the current itinerary preview area using the approved compact v3 selector.

**Architecture:** Keep API calls and DTOs unchanged in `AiResultsPage`; only change local UI state/rendering and CSS. Candidate add buttons select a candidate and switch `TripPreview` into a compact selector with an `×` close button, Day tabs, and one `Day N에 추가` CTA. The map remains selected-candidate-only, candidate order stays unchanged, and duplicates still hide add actions.

**Tech Stack:** React, TypeScript, React Router, Vite, Vitest/Testing Library, existing CSS in `frontend/src/styles/app.css`.

---

## File Structure

- Modify: `frontend/src/pages/itinerary/AiResultsPage.tsx`
  - Auto-select the first recommendation after recommendations load.
  - Remove inline `CandidateDayPopover` usage and component.
  - Pass day-picker state into `TripPreview` and render the approved v3 selector there.
  - Simplify selected map summary labels.
- Modify: `frontend/src/styles/app.css`
  - Remove card-popover spacing dependency.
  - Add compact preview-hosted Day selector styles.
  - Soften active/add red.
- Modify: `frontend/src/App.test.tsx`
  - Update add-flow tests to assert selector appears in `현재 일정 미리보기`, has no ghost cancel, and uses the single primary CTA.
  - Update map-selection test to expect the first candidate selected by default.
- Update: `CHECKLIST.md`
  - Record validation commands and remaining risks.

## Task 1: Lock the approved selector behavior with tests

- [ ] Update the inline add-flow test to expect no `.ai-day-popover`, no `취소` button, and a preview-hosted dialog/selector in `현재 일정 미리보기`.
- [ ] Update the add-failure test to click the preview-hosted `Day 1에 추가` CTA.
- [ ] Update selected-map sync test to expect the first candidate shown on initial load.

## Task 2: Implement the preview-hosted selector

- [ ] Add an effect that initializes `selectedCandidateKey` to the first recommendation key when recommendations are loaded and the current key is empty or no longer valid.
- [ ] Change `openDayPicker` to keep selecting the candidate and opening selector state without rendering an anchored card popover.
- [ ] Remove the inline `CandidateDayPopover` component and its render branch.
- [ ] Extend `TripPreview` props with `dayPickerCandidate`, `pendingAddDay`, `isSaving`, `onCloseDayPicker`, `onSelectPendingDay`, and `onAddDayPicker`.
- [ ] Render the compact v3 selector at the top of `TripPreview` when `dayPickerCandidate` exists: title `Day 선택`, `×`, candidate title/category, Day choices, and `Day N에 추가`.
- [ ] Keep normal current itinerary preview when no candidate is being added.

## Task 3: Simplify copy and visual hierarchy

- [ ] Remove redundant selected-summary kicker/status chips such as `선택 후보`, `추가 가능`, and `장소 정보`.
- [ ] Keep selected summary to title, address/location, and official category/phone when present.
- [ ] Soften active-card/add-button red to the approved lighter tone.
- [ ] Ensure mobile widths do not create horizontal overflow.

## Task 4: Validate

- [ ] Run `cd frontend && VITE_KAKAO_MAP_JS_KEY=real-ci-key npx vitest run src/App.test.tsx -t "AI additional candidates|inline add button|selected AI candidate|adding a recommendation fails"`.
- [ ] Run `cd frontend && npm run typecheck`.
- [ ] Run `cd frontend && npm run build`.
- [ ] Run `git diff --check`.
- [ ] Update `CHECKLIST.md` with the validation evidence.
