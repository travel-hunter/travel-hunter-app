# Policy Region Filter Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the confirmed "주요 지역 + 전체 보기" region filter for the policy list.

**Architecture:** The frontend continues to derive region values from `appDataApi.listPolicies()`. `PolicyListPage` computes a compact primary region set from `전체`, `전국`, the profile region, the selected region, and the highest-count regions, then exposes the remaining regions behind an expand control.

**Tech Stack:** React, React Router, TypeScript, Vitest, Testing Library, CSS.

---

### Task 1: Region Filter Behavior Test

**Files:**
- Modify: `frontend/src/App.test.tsx`

- [x] Add a failing test that opens the region filter with many regions.
- [x] Assert only primary regions show before expansion.
- [x] Assert `전체 지역 보기` reveals hidden regions.
- [x] Assert selecting a revealed region filters the policy list.
- [x] Update the existing region/category test so hidden regions are selected through the expand control.

### Task 2: Policy List Region Picker

**Files:**
- Modify: `frontend/src/pages/PolicyPages.tsx`

- [x] Add primary-region helper logic.
- [x] Include `전국`, profile region, selected region, and highest-count regions.
- [x] Keep remaining regions in a sorted secondary list.
- [x] Render `주요 지역` and `전체 지역 보기` inside the existing region filter area.
- [x] Preserve existing exact-match region filtering.

### Task 3: Styling

**Files:**
- Modify: `frontend/src/styles/app.css`

- [x] Add wrapped chip layout for the region picker.
- [x] Add a compact expand button.
- [x] Keep existing period and amount filter chip behavior unchanged.

### Task 4: Verification

**Files:**
- Modify: `CHECKLIST.md`

- [x] Verify RED failure before implementation.
- [x] Run targeted GREEN test.
- [x] Run category/region regression test.
- [x] Run frontend typecheck.
- [ ] Run Docker Compose config/build/recreate checks.
