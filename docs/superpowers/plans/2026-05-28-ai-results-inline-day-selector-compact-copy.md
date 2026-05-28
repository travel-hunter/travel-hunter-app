# AI Results Inline Day Selector Compact Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the `/ai-results` Day selector directly below the candidate card being added and simplify candidate-card copy to avoid duplicate map-detail information.

**Architecture:** Keep all data access inside the existing `AppDataApi` usage in `AiResultsPage`. Move the Day selector render from `TripPreview` to an inline panel emitted immediately after the open candidate card, preserve normal trip preview rendering, and add a frontend-only helper that displays the leaf `categoryName` for compact candidate descriptions.

**Tech Stack:** React, TypeScript, React Router, Vite, Vitest/Testing Library, existing CSS in `frontend/src/styles/app.css`.

---

## File Structure

- Modify: `frontend/src/App.test.tsx`
  - Update `/ai-results` tests to require card-local inline Day selector and compact category leaf copy.
- Modify: `frontend/src/pages/itinerary/AiResultsPage.tsx`
  - Add compact candidate description helper.
  - Remove address line from candidate cards.
  - Render `CandidateInlineDaySelector` after the active candidate card.
  - Keep `TripPreview` as normal preview only.
- Modify: `frontend/src/styles/app.css`
  - Style `.ai-inline-day-selector` as a slim panel under candidate cards.
  - Remove preview-hosted selector dependence from current UI.
- Update: `CHECKLIST.md`
  - Record validation evidence and remaining risks.

## Task 1: RED tests

- [ ] Update the add-flow test so clicking `속초 로컬 맛집 추가` expects a dialog inside the same `맛집 후보` region, not inside `현재 일정 미리보기`.
- [ ] Update the shell/copy test to expect `커피전문점`, no candidate-list address line, and no candidate-list phone number.
- [ ] Run the targeted Vitest selection and verify it fails because the selector is still preview-hosted and candidate cards still show address/full category.

## Task 2: GREEN implementation

- [ ] Add `recommendationCompactCategoryLabel(item)` to return the last trimmed `categoryName` segment, falling back to the category label/code/meta without using address or phone.
- [ ] Remove `.ai-candidate-meta` rendering from candidate cards.
- [ ] Render `CandidateInlineDaySelector` immediately after the open candidate card.
- [ ] Remove `dayPickerCandidate` mode from `TripPreview`; keep preview tabs/timeline unchanged.
- [ ] Add `.ai-inline-day-selector` styles and keep responsive behavior safe.

## Task 3: Verification

- [ ] Run targeted `/ai-results` Vitest selection.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Run `git diff --check`.
- [ ] Update `CHECKLIST.md`.
