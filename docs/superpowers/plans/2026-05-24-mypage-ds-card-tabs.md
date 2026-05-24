# My Page DS Card Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align `/mypage` favorite policy cards and bottom tabs with the app DS so mobile text does not overflow and tabs distribute evenly.

**Architecture:** Add reusable presentational patterns in `frontend/src/components/patterns.tsx`, consume them from `frontend/src/pages/MyPage.tsx`, and normalize the related CSS in `frontend/src/styles/app.css`. Keep all saved-policy data fetching and mutation through `AppDataApi` unchanged.

**Tech Stack:** React, TypeScript, Vite, Vitest Testing Library, CSS, Docker Compose, Playwright visual verification.

---

### Task 1: Regression Test For My Page DS Card

**Files:**
- Modify: `frontend/src/App.test.tsx`

- [ ] **Step 1: Update the existing my page saved-policy test**

Add assertions inside `shows saved policies on my page and removes them` after the link is found:

```tsx
const favoriteCard = document.querySelector(".ds-favorite-policy-card");
expect(favoriteCard).toBeTruthy();
expect(favoriteCard?.querySelector(".ds-favorite-policy-thumb")?.textContent?.trim()).toMatch(/^.$/);
expect(favoriteCard?.querySelector(".ds-favorite-policy-copy")).toBeTruthy();
expect(screen.getByRole("button", { name: "저장 해제" })).toHaveClass("ds-favorite-policy-remove");
```

- [ ] **Step 2: Run focused test and confirm current behavior fails before implementation**

Run: `cd frontend; npm test -- --run src/App.test.tsx -t "shows saved policies on my page and removes them"`

Expected before implementation: FAIL because `.ds-favorite-policy-card` does not exist.

### Task 2: Add DS Favorite Policy Patterns

**Files:**
- Modify: `frontend/src/components/patterns.tsx`

- [ ] **Step 1: Import `Policy` type and `Button`**

Update imports:

```tsx
import { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Policy } from "../api";
import { Button, SurfaceCard } from "./ui";
```

- [ ] **Step 2: Add `ProfileSectionHeader` and `FavoritePolicyCard`**

Append these exports:

```tsx
export function ProfileSectionHeader({ actionLabel, title, to }: { actionLabel?: string; title: string; to?: string }) {
  return (
    <div className="ds-section-header ds-profile-section-header">
      <h3>{title}</h3>
      {actionLabel && to && <Link to={to}>{actionLabel}</Link>}
    </div>
  );
}

export function FavoritePolicyCard({
  icon,
  isRemoving,
  onRemove,
  policy,
}: {
  icon: string;
  isRemoving: boolean;
  onRemove: () => void;
  policy: Policy;
}) {
  return (
    <SurfaceCard as="article" className="ds-favorite-policy-card">
      <Link className="ds-favorite-policy-link" to={`/policies/${policy.slug}`}>
        <span className="ds-favorite-policy-thumb" aria-hidden="true">
          {icon}
        </span>
        <span className="ds-favorite-policy-copy">
          <strong>{policy.title}</strong>
          <small>{policy.amount}</small>
        </span>
      </Link>
      <Button variant="ghost" disabled={isRemoving} onClick={onRemove}>
        {isRemoving ? "..." : "해제"}
      </Button>
    </SurfaceCard>
  );
}
```

- [ ] **Step 3: Run typecheck**

Run: `cd frontend; npm run typecheck`

Expected before MyPage wiring: PASS if exports compile.

### Task 3: Wire My Page To DS Patterns

**Files:**
- Modify: `frontend/src/pages/MyPage.tsx`

- [ ] **Step 1: Update imports**

Change pattern import:

```tsx
import { FavoritePolicyCard, ProfilePanel, ProfileSectionHeader } from "../components/patterns";
```

- [ ] **Step 2: Replace favorite section header**

Replace:

```tsx
<div className="prototype-section-header">
  <h3 id="favorite-policy-title">즐겨찾기 정책 ({isLoadingSavedPolicies ? "..." : savedPolicyCount})</h3>
  <Link to="/policies">정책 찾기</Link>
</div>
```

with:

```tsx
<ProfileSectionHeader title={`즐겨찾기 정책 (${isLoadingSavedPolicies ? "..." : savedPolicyCount})`} actionLabel="정책 찾기" to="/policies" />
```

Keep `aria-labelledby="favorite-policy-title"` only if the rendered heading still has that id; otherwise switch the section to `aria-label="즐겨찾기 정책"`.

- [ ] **Step 3: Replace favorite row markup**

Replace the mapped `<article className="prototype-favorite-row">...</article>` block with:

```tsx
<FavoritePolicyCard
  icon={policyIcon(policy)}
  isRemoving={removingPolicySlug === policy.slug}
  key={policy.slug}
  onRemove={() => removeSavedPolicy(policy)}
  policy={policy}
/>
```

- [ ] **Step 4: Restore directly touched visible Korean labels if needed**

If the file currently contains mojibake for directly touched labels, use readable Korean only in those touched labels:

```tsx
aria-label="즐겨찾기 정책"
actionLabel="정책 찾기"
```

### Task 4: Normalize CSS

**Files:**
- Modify: `frontend/src/styles/app.css`

- [ ] **Step 1: Make bottom tabs explicit grid items**

Ensure the global rules contain:

```css
.bottom-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.bottom-tabs .tab {
  width: auto;
  min-width: 0;
  justify-items: center;
  text-align: center;
}
```

- [ ] **Step 2: Add DS favorite card CSS**

Add:

```css
.ds-favorite-policy-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-height: 68px;
  padding: 10px 12px;
}

.ds-favorite-policy-link {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  align-items: center;
  min-width: 0;
  gap: 10px;
}

.ds-favorite-policy-thumb {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 10px;
  background: var(--color-bg-subtle);
  color: var(--color-action-primary);
  font-size: 18px;
  font-weight: 900;
  line-height: 1;
  white-space: nowrap;
}

.ds-favorite-policy-copy {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.ds-favorite-policy-copy strong,
.ds-favorite-policy-copy small {
  overflow: hidden;
  min-width: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ds-favorite-policy-remove {
  flex: 0 0 auto;
  min-width: 44px;
  white-space: nowrap;
}
```

- [ ] **Step 3: Retire conflicting prototype favorite row sizing**

Remove or override `.prototype-favorite-row`, `.prototype-favorite-link`, `.prototype-policy-thumb`, `.prototype-favorite-link strong`, `.prototype-favorite-link small`, and `.prototype-favorite-remove` rules so they do not affect the new DS card.

### Task 5: Verify, Visual QA, Docs, Commit

**Files:**
- Modify: `CHECKLIST.md`

- [ ] **Step 1: Run validation**

Run:

```bash
cd frontend
npm run typecheck
npm test -- --run src/App.test.tsx -t "shows saved policies on my page and removes them"
npm run build
```

Expected: all pass.

- [ ] **Step 2: Rebuild Docker**

Run: `docker compose -f compose.yaml up -d --build`

Expected: db, backend, frontend healthy/running.

- [ ] **Step 3: Visual verify `/mypage`**

Use Playwright against `http://127.0.0.1:4173/mypage` with authenticated local storage. Verify:

```js
{
  favoriteCards: await page.locator('.ds-favorite-policy-card').count(),
  overflowingCards: await page.locator('.ds-favorite-policy-card').evaluateAll(cards =>
    cards.filter(card => card.scrollWidth > card.clientWidth).length
  ),
  tabCount: await page.locator('.bottom-tabs .tab').count()
}
```

Expected: `favoriteCards >= 1`, `overflowingCards === 0`, `tabCount === 4`.

- [ ] **Step 4: Update `CHECKLIST.md`**

Record tests, Docker rebuild, visual screenshot path, and remaining risks.

- [ ] **Step 5: Commit**

Run:

```bash
git add CHECKLIST.md frontend/src/App.test.tsx frontend/src/components/patterns.tsx frontend/src/pages/MyPage.tsx frontend/src/styles/app.css docs/superpowers/plans/2026-05-24-mypage-ds-card-tabs.md
git commit -m "Align my page cards and tabs with DS"
```

Expected: commit succeeds, with only `tmp/` remaining untracked if screenshots exist.
