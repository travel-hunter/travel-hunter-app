# Policy Category URL State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the selected policy category tab through detail navigation and browser back.

**Architecture:** The policy list page reads and writes the selected category through React Router `useSearchParams`. Unknown query values fall back to `전체`, while `전체` removes the `category` query parameter.

**Tech Stack:** React, React Router, TypeScript, Vitest, Testing Library.

---

### Task 1: Add URL Category State Test

**Files:**
- Modify: `frontend/src/App.test.tsx`

- [ ] **Step 1: Write the failing test**

Add a test near existing policy list category tests that mocks one `교통` policy and one `여행상품` policy, renders `/policies?category=여행상품`, then asserts that only the travel product policy is visible and the `여행상품` button has the active class.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend; npm test -- --run src/App.test.tsx -t "restores the policy category tab from the URL"`

Expected: FAIL because the list currently initializes `selectedCategory` from local state only.

### Task 2: Implement URL-Backed Category Selection

**Files:**
- Modify: `frontend/src/pages/PolicyPages.tsx`

- [ ] **Step 1: Import `useSearchParams`**

Update the React Router import to include `useSearchParams`.

- [ ] **Step 2: Add category query validation**

Add a helper that accepts only values from `categoryFilters`.

- [ ] **Step 3: Derive `selectedCategory` from the URL**

Replace the local `selectedCategory` state with `searchParams.get("category")`, falling back to `전체`.

- [ ] **Step 4: Update category tab clicks**

Set or delete the `category` query parameter when a tab is clicked.

- [ ] **Step 5: Reset filters clears the query**

Make the existing reset button remove the category query parameter.

### Task 3: Verify

**Files:**
- Modify: `CHECKLIST.md`

- [ ] **Step 1: Run targeted frontend test**

Run: `cd frontend; npm test -- --run src/App.test.tsx -t "restores the policy category tab from the URL"`

- [ ] **Step 2: Run frontend typecheck**

Run: `cd frontend; npm run typecheck`

- [ ] **Step 3: Record validation**

Update `CHECKLIST.md` with the commands and results.
