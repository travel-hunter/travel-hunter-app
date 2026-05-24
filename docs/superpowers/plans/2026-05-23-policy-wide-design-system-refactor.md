# Policy-Wide Design System Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the Figma design system language across policy and trip screens without changing API contracts, backend behavior, or app data flow.

**Architecture:** Keep page data loading and routing unchanged. Introduce small UI primitives in `frontend/src/components/ui.tsx`, align semantic tokens in `frontend/src/styles/tokens.css`, then migrate `/trips`, `/trips/:id`, `/policies`, `/policies/:policySlug`, and bottom tabs to the same button, tag, card, status panel, and navigation styling contract.

**Tech Stack:** React, TypeScript, React Router, Vite, CSS variables, Vitest, Testing Library.

---

## Scope

Included:
- Trip list and trip detail visual language.
- Policy list and policy detail visual language.
- Bottom tabs active/inactive alignment.
- Shared `Button`, `LinkButton`, `Tag`, `SurfaceCard`, `StatusPanel`, and bottom-tab class contract.
- CSS token alignment to the Figma DS state: brand red, draft yellow, confirmed green, benefit blue, neutral surfaces.

Excluded:
- Backend changes.
- API DTO changes.
- Policy collection, classification, normalization, or source validation changes.
- Login, signup, onboarding, mypage redesign.
- Replacing app data access with anything outside `AppDataApi`.

## File Structure

- Modify `frontend/src/components/ui.tsx`: add typed design-system primitives and preserve existing exports.
- Modify `frontend/src/components/cards.tsx`: migrate policy and itinerary cards to shared primitives.
- Modify `frontend/src/components/AppLayout.tsx`: keep routing unchanged, align bottom tab semantics and labels.
- Modify `frontend/src/pages/PolicyPages.tsx`: replace policy detail/list local card/tag/button patterns with primitives where practical.
- Modify `frontend/src/pages/itinerary/ItineraryDetailPage.tsx`: migrate trip status panel and linked policy surfaces to primitives while preserving edit-lock behavior.
- Modify `frontend/src/styles/tokens.css`: add missing component-level semantic variables.
- Modify `frontend/src/styles/app.css`: consolidate duplicate card/tag/button/status/bottom-tab rules and remove conflicting one-off colors.
- Modify `frontend/src/App.test.tsx`: add regression assertions for design-system class usage and behavior preservation.
- Modify `CHECKLIST.md`: record validation commands and remaining visual QA risks.

---

### Task 1: Lock Shared UI Primitive Contract

**Files:**
- Modify: `frontend/src/components/ui.tsx`
- Modify: `frontend/src/App.test.tsx`

- [ ] **Step 1: Add regression tests for shared primitive class contracts**

Add these tests near the existing frontend rendering tests in `frontend/src/App.test.tsx`:

```tsx
it("renders design-system tags with semantic tone classes", () => {
  render(
    <MemoryRouter>
      <div>
        <Tag tone="draft">작성 중</Tag>
        <Tag tone="confirmed">확정됨</Tag>
        <Tag tone="benefit">예상 혜택</Tag>
      </div>
    </MemoryRouter>,
  );

  expect(screen.getByText("작성 중")).toHaveClass("tag", "draft");
  expect(screen.getByText("확정됨")).toHaveClass("tag", "confirmed");
  expect(screen.getByText("예상 혜택")).toHaveClass("tag", "benefit");
});

it("renders surface cards and status panels with design-system classes", () => {
  render(
    <MemoryRouter>
      <SurfaceCard tone="confirmed" className="test-card">
        <span>카드 내용</span>
      </SurfaceCard>
      <StatusPanel tone="draft" badge="작성 중" title="편집 가능" body="확정 전까지 수정할 수 있습니다." />
    </MemoryRouter>,
  );

  expect(screen.getByText("카드 내용").closest(".ds-card")).toHaveClass("confirmed", "test-card");
  expect(screen.getByText("편집 가능").closest(".ds-status-panel")).toHaveClass("draft");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd frontend
npm test -- --run src/App.test.tsx -t "design-system"
```

Expected: fail because `SurfaceCard` and `StatusPanel` are not exported yet.

- [ ] **Step 3: Implement primitives in `frontend/src/components/ui.tsx`**

Add these types and components while preserving the existing `Button`, `LinkButton`, `Tag`, `IconButton`, state components, and dialog exports:

```tsx
type Tone = "default" | "primary" | "warning" | "yellow" | "green" | "gray" | "benefit" | "confirmed" | "draft" | "danger";
type SurfaceTone = "default" | "draft" | "confirmed" | "benefit" | "danger";

function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function SurfaceCard({
  children,
  tone = "default",
  className,
  as: Component = "div",
}: {
  children: ReactNode;
  tone?: SurfaceTone;
  className?: string;
  as?: "article" | "section" | "div";
}) {
  return <Component className={classNames("ds-card", tone !== "default" && tone, className)}>{children}</Component>;
}

export function StatusPanel({
  tone,
  badge,
  title,
  body,
  action,
  className,
}: {
  tone: "draft" | "confirmed" | "benefit" | "danger";
  badge: string;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={classNames("ds-status-panel", tone, className)} aria-label={title}>
      <div>
        <span className={classNames("ds-status-badge", tone)}>{badge}</span>
        <strong>{title}</strong>
        {body && <p className="meta">{body}</p>}
      </div>
      {action && <div className="ds-status-action">{action}</div>}
    </section>
  );
}
```

Update `Tag` to use the shared `Tone` type:

```tsx
export function Tag({ children, tone = "default" }: { children: ReactNode; tone?: Tone }) {
  return <span className={classNames("tag", tone)}>{children}</span>;
}
```

- [ ] **Step 4: Run tests to verify primitive contract passes**

Run:

```bash
cd frontend
npm test -- --run src/App.test.tsx -t "design-system"
```

Expected: pass.

---

### Task 2: Extend Token And Base Component CSS

**Files:**
- Modify: `frontend/src/styles/tokens.css`
- Modify: `frontend/src/styles/app.css`

- [ ] **Step 1: Add semantic component tokens**

In `frontend/src/styles/tokens.css`, extend `:root` with these variables near the existing semantic tokens:

```css
  --color-surface-raised: var(--white);
  --color-surface-muted: #f5f5f7;
  --color-brand-soft: var(--primary-50);
  --color-brand-border: var(--primary-100);
  --status-benefit-border: #7dd3fc;
  --status-danger-bg: #fef2f2;
  --status-danger-border: #fecaca;
  --status-danger-text: #b91c1c;
  --component-card-radius: var(--radius-sm);
  --component-card-border: var(--color-border-default);
  --component-card-shadow: var(--shadow-xs);
  --component-control-radius: var(--radius-sm);
```

- [ ] **Step 2: Add base DS CSS classes**

In `frontend/src/styles/app.css`, place this block after the existing `.card` and `.tag` base rules, then remove duplicated declarations only when the new class covers the same selector:

```css
.ds-card {
  border: 1px solid var(--component-card-border);
  border-radius: var(--component-card-radius);
  background: var(--color-bg-card);
  box-shadow: var(--component-card-shadow);
}

.ds-card.draft {
  border-color: var(--status-draft-border);
  background: var(--status-draft-bg);
}

.ds-card.confirmed {
  border-color: var(--status-confirmed-border);
  background: var(--status-confirmed-bg);
}

.ds-card.benefit {
  border-color: var(--status-benefit-border);
  background: var(--status-benefit-bg);
}

.ds-card.danger {
  border-color: var(--status-danger-border);
  background: var(--status-danger-bg);
}

.ds-status-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  border: 1px solid var(--component-card-border);
  border-radius: var(--component-card-radius);
  padding: var(--space-4);
  background: var(--color-bg-card);
}

.ds-status-panel strong {
  display: block;
  margin-top: var(--space-2);
  color: var(--color-text-primary);
}

.ds-status-panel .meta {
  margin-top: var(--space-1);
  color: var(--color-text-secondary);
}

.ds-status-panel.draft {
  border-color: var(--status-draft-border);
  background: var(--status-draft-bg);
}

.ds-status-panel.confirmed {
  border-color: var(--status-confirmed-border);
  background: var(--status-confirmed-bg);
}

.ds-status-panel.benefit {
  border-color: var(--status-benefit-border);
  background: var(--status-benefit-bg);
}

.ds-status-panel.danger {
  border-color: var(--status-danger-border);
  background: var(--status-danger-bg);
}

.ds-status-badge {
  display: inline-flex;
  min-height: 24px;
  align-items: center;
  border-radius: 999px;
  padding: 0 var(--space-2);
  font-size: 12px;
  font-weight: 900;
}

.ds-status-badge.draft {
  color: var(--status-draft-text);
  background: rgba(225, 161, 0, 0.14);
}

.ds-status-badge.confirmed {
  color: var(--status-confirmed-text);
  background: rgba(31, 139, 76, 0.14);
}

.ds-status-badge.benefit {
  color: var(--status-benefit-text);
  background: rgba(3, 105, 161, 0.12);
}

.ds-status-badge.danger {
  color: var(--status-danger-text);
  background: rgba(185, 28, 28, 0.12);
}

.ds-status-action {
  display: flex;
  flex-shrink: 0;
}
```

- [ ] **Step 3: Run CSS syntax check**

Run:

```bash
git diff --check -- frontend/src/styles/tokens.css frontend/src/styles/app.css
```

Expected: no whitespace errors. CRLF warnings are acceptable if the repo already shows them.

---

### Task 3: Migrate Trip List And Trip Detail To Primitives

**Files:**
- Modify: `frontend/src/components/cards.tsx`
- Modify: `frontend/src/pages/itinerary/ItineraryDetailPage.tsx`
- Modify: `frontend/src/App.test.tsx`

- [ ] **Step 1: Add tests for trip UI class consistency**

Extend the existing trip status tests in `frontend/src/App.test.tsx` with these assertions:

```tsx
expect(document.querySelector(".itinerary-card.ds-card")).toBeTruthy();
expect(document.querySelector(".itinerary-policy-row .tag.benefit")).toHaveTextContent("예상 혜택");
expect(document.querySelector(".itinerary-policy-row .tag.draft, .itinerary-policy-row .tag.confirmed")).toBeTruthy();
```

For trip detail status tests, add:

```tsx
expect(document.querySelector(".prototype-trip-detail-screen .ds-status-panel")).toBeTruthy();
expect(document.querySelector(".prototype-trip-detail-screen .ds-status-badge")).toBeTruthy();
```

- [ ] **Step 2: Run focused trip tests before implementation**

Run:

```bash
cd frontend
npm test -- --run src/App.test.tsx -t "draft trips|confirmed trip detail|trip detail"
```

Expected: fail on the new `.ds-card` or `.ds-status-panel` assertions.

- [ ] **Step 3: Update itinerary cards**

In `frontend/src/components/cards.tsx`, import `SurfaceCard`:

```tsx
import { SurfaceCard, Tag } from "./ui";
```

Replace the `ItineraryCard` wrapper:

```tsx
<SurfaceCard as="article" tone={trip.status === "confirmed" ? "confirmed" : "draft"} className="itinerary-card">
  ...
</SurfaceCard>
```

Keep the existing inner links, delete button behavior, and `Tag` usage unchanged.

- [ ] **Step 4: Update trip detail status panel**

In `frontend/src/pages/itinerary/ItineraryDetailPage.tsx`, import `StatusPanel`:

```tsx
import { Button, ConfirmDialog, EmptyState, ErrorState, IconButton, LinkButton, LoadingState, StatusPanel, Toast, TopBar } from "../../components/ui";
```

Replace the local `section className={isTripConfirmed ? "trip-status-panel confirmed" : "trip-status-panel draft"}` block with:

```tsx
<StatusPanel
  tone={isTripConfirmed ? "confirmed" : "draft"}
  badge={isTripConfirmed ? "확정됨" : "작성 중"}
  title={isTripConfirmed ? "일정이 확정되어 편집이 잠겨 있어요" : "아직 편집할 수 있는 일정이에요"}
  body={
    isTripConfirmed
      ? "장소 추가, 순서 이동, 정책 연결 삭제는 확정취소 후 다시 사용할 수 있습니다."
      : "장소와 연결 정책을 정리한 뒤 일정을 확정할 수 있습니다."
  }
  className="trip-status-panel"
  action={
    canManageTripStatus ? (
      <Button
        variant={isTripConfirmed ? "line" : "primary"}
        disabled={isUpdatingTripStatus}
        onClick={() => updateTripStatus(isTripConfirmed ? "draft" : "confirmed")}
      >
        {isUpdatingTripStatus ? "변경 중" : isTripConfirmed ? "확정취소" : "일정 확정"}
      </Button>
    ) : undefined
  }
/>
```

Keep the existing `updateTripStatus`, edit-lock, linked policy delete lock, and toast behavior.

- [ ] **Step 5: Run focused trip tests**

Run:

```bash
cd frontend
npm test -- --run src/App.test.tsx -t "draft trips|confirmed trip detail|trip detail"
```

Expected: pass.

---

### Task 4: Migrate Policy List Cards, Filter Chips, And Discovery Cards

**Files:**
- Modify: `frontend/src/components/cards.tsx`
- Modify: `frontend/src/pages/PolicyPages.tsx`
- Modify: `frontend/src/styles/app.css`
- Modify: `frontend/src/App.test.tsx`

- [ ] **Step 1: Add policy list visual contract assertions**

In the existing policy list tests in `frontend/src/App.test.tsx`, add:

```tsx
expect(document.querySelector(".policy-list-card.ds-card")).toBeTruthy();
expect(document.querySelector(".prototype-category-tab.active")).toHaveTextContent("전체");
expect(document.querySelector(".prototype-filter-pill")).toBeTruthy();
```

- [ ] **Step 2: Run focused policy list tests**

Run:

```bash
cd frontend
npm test -- --run src/App.test.tsx -t "policy list|TravelMonth benefits"
```

Expected: fail on `.policy-list-card.ds-card` until the component migrates.

- [ ] **Step 3: Update policy list card wrapper**

In `frontend/src/components/cards.tsx`, replace:

```tsx
<article className="policy-list-card card">
```

with:

```tsx
<SurfaceCard as="article" tone="default" className="policy-list-card">
```

Then replace the closing `</article>` with `</SurfaceCard>`.

- [ ] **Step 4: Normalize policy list CSS**

In `frontend/src/styles/app.css`, update `.policy-list-card` and related list/card selectors so they rely on DS card border/radius/surface. Keep layout-specific rules such as grid/flex/gap:

```css
.policy-list-card {
  position: relative;
  display: grid;
  min-height: 128px;
  overflow: hidden;
}

.policy-list-card-link {
  display: grid;
  grid-template-columns: 58px 1fr;
  gap: var(--space-3);
  min-width: 0;
  padding: var(--space-4);
}
```

Keep `.policy-list-heart`, `.policy-list-icon`, `.policy-list-copy`, and `.policy-list-badges` behavior, but replace hardcoded repeated colors with semantic variables when the value matches an existing token.

- [ ] **Step 5: Run focused policy list tests**

Run:

```bash
cd frontend
npm test -- --run src/App.test.tsx -t "policy list|TravelMonth benefits"
```

Expected: pass.

---

### Task 5: Migrate Policy Detail Benefit, Requirement, And Sticky CTA Surfaces

**Files:**
- Modify: `frontend/src/pages/PolicyPages.tsx`
- Modify: `frontend/src/styles/app.css`
- Modify: `frontend/src/App.test.tsx`

- [ ] **Step 1: Add policy detail visual contract assertions**

In the existing policy detail tests in `frontend/src/App.test.tsx`, add:

```tsx
expect(document.querySelector(".prototype-policy-detail-screen .policy-benefit-group.ds-card")).toBeTruthy();
expect(document.querySelector(".prototype-policy-detail-screen .policy-requirement-group.ds-card")).toBeTruthy();
expect(document.querySelector(".prototype-policy-detail-screen .sticky-cta")).toBeTruthy();
```

- [ ] **Step 2: Run focused policy detail tests**

Run:

```bash
cd frontend
npm test -- --run src/App.test.tsx -t "policy detail|benefit summaries|dgtour summary"
```

Expected: fail on `.ds-card` assertions.

- [ ] **Step 3: Import and use `SurfaceCard` in policy detail**

In `frontend/src/pages/PolicyPages.tsx`, update the import:

```tsx
import { Button, EmptyState, ErrorState, IconButton, LinkButton, LoadingState, SurfaceCard, Tag, Toast } from "../components/ui";
```

Replace benefit section wrappers:

```tsx
<SurfaceCard tone={section.title.includes("혜택") ? "benefit" : "default"} className="policy-benefit-group" key={section.title}>
  <div className="policy-benefit-title">{section.title}</div>
  ...
</SurfaceCard>
```

Replace requirement section wrappers:

```tsx
<SurfaceCard tone={section.title.includes("확인") ? "draft" : "default"} className="policy-requirement-group" key={section.title}>
  ...
</SurfaceCard>
```

Keep the existing benefit section construction, requirement text, official/apply CTA logic, saved-policy behavior, and trip attachment sheet unchanged.

- [ ] **Step 4: Normalize detail CSS**

In `frontend/src/styles/app.css`, remove duplicated background/border/radius declarations from:
- `.prototype-policy-detail-screen .policy-benefit-group`
- `.prototype-policy-detail-screen .policy-requirement-group`
- `.prototype-policy-detail-screen .highlight-box`

Keep only spacing, list, and typography rules. Add:

```css
.prototype-policy-detail-screen .policy-benefit-group,
.prototype-policy-detail-screen .policy-requirement-group {
  padding: var(--space-4);
}

.prototype-policy-detail-screen .sticky-cta {
  border-top: 1px solid var(--color-border-default);
  background: color-mix(in srgb, var(--color-bg-card) 94%, transparent);
}
```

- [ ] **Step 5: Run focused policy detail tests**

Run:

```bash
cd frontend
npm test -- --run src/App.test.tsx -t "policy detail|benefit summaries|dgtour summary"
```

Expected: pass.

---

### Task 6: Normalize Bottom Tabs And Shared Button/Tag CSS

**Files:**
- Modify: `frontend/src/components/AppLayout.tsx`
- Modify: `frontend/src/styles/app.css`
- Modify: `frontend/src/App.test.tsx`

- [ ] **Step 1: Add bottom tab regression assertion**

In a route smoke test that renders `ServiceLayout`, add:

```tsx
expect(document.querySelector(".bottom-tabs .tab.active")).toBeTruthy();
expect(document.querySelector(".bottom-tabs .tab.active svg")).toBeTruthy();
expect(document.querySelector(".bottom-tabs .tab.active span")).toBeTruthy();
```

- [ ] **Step 2: Fix bottom tab labels if mojibake remains in source**

In `frontend/src/components/AppLayout.tsx`, ensure the labels are readable Korean:

```tsx
<NavLink className={tabClass} to="/home">
  <Home size={19} />
  <span>홈</span>
</NavLink>
<NavLink className={tabClass} to="/policies">
  <WalletCards size={19} />
  <span>정책</span>
</NavLink>
<NavLink className={tabClass} to="/trips">
  <CalendarDays size={19} />
  <span>일정</span>
</NavLink>
<NavLink className={tabClass} to="/mypage">
  <UserRound size={19} />
  <span>마이</span>
</NavLink>
```

- [ ] **Step 3: Normalize bottom tabs CSS**

In `frontend/src/styles/app.css`, consolidate `.bottom-tabs`, `.bottom-tabs .tab`, and `.bottom-tabs .tab.active`:

```css
.bottom-tabs {
  position: fixed;
  left: 50%;
  bottom: 0;
  z-index: 40;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  width: 100%;
  max-width: var(--app-width);
  min-height: 72px;
  transform: translateX(-50%);
  border-top: 1px solid var(--color-border-default);
  background: var(--color-bg-card);
  box-shadow: 0 -8px 24px rgba(15, 23, 42, 0.08);
}

.bottom-tabs .tab {
  display: grid;
  place-items: center;
  align-content: center;
  gap: 4px;
  min-width: 0;
  min-height: 72px;
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 800;
}

.bottom-tabs .tab.active {
  color: var(--color-action-primary);
}
```

- [ ] **Step 4: Run bottom tab focused test**

Run:

```bash
cd frontend
npm test -- --run src/App.test.tsx -t "bottom|routes|policy list"
```

Expected: pass.

---

### Task 7: Remove Conflicting One-Off Styles And Verify Visual Scope

**Files:**
- Modify: `frontend/src/styles/app.css`
- Modify: `CHECKLIST.md`

- [ ] **Step 1: Search for remaining hardcoded component color conflicts**

Run:

```bash
rg -n "#[0-9a-fA-F]{3,8}|rgba\\(|linear-gradient" frontend/src/styles/app.css frontend/src/styles/tokens.css
```

Expected: hardcoded values remain only for brand primitives, map/hero visuals, shadows, gradients that are not equivalent to DS status/card/button semantics, and intentionally preserved legacy screens outside this scope.

- [ ] **Step 2: Replace policy/trip component hardcoded values with tokens**

For selectors under these groups, replace duplicated hardcoded component colors with tokens:
- `.prototype-policy-list-screen`
- `.policy-list-card`
- `.prototype-policy-detail-screen`
- `.prototype-trip-list-screen`
- `.prototype-trip-detail-screen`
- `.benefit-banner`
- `.prototype-matching-policy-card`
- `.bottom-tabs`

Use this mapping:

```css
background: #fff; -> background: var(--color-bg-card);
background: #f8f8fa; -> background: var(--color-bg-page);
border-color: #e5e7eb; -> border-color: var(--color-border-default);
color: #6b7280; -> color: var(--color-text-secondary);
color: #0f172a; -> color: var(--color-text-primary);
color: #ff5e5b; -> color: var(--color-action-primary);
```

- [ ] **Step 3: Record validation target in `CHECKLIST.md`**

Append a concise entry:

```markdown
- [ ] 2026-05-23 policy-wide DS refactor: run frontend typecheck, focused Vitest suites, build, and responsive visual QA at 360/390/430/1024/1440 for `/policies`, one policy detail, `/trips`, and one trip detail.
```

- [ ] **Step 4: Run CSS diff check**

Run:

```bash
git diff --check -- frontend/src/styles/app.css frontend/src/styles/tokens.css CHECKLIST.md
```

Expected: no whitespace errors. Existing CRLF warnings are acceptable.

---

### Task 8: Final Frontend Verification

**Files:**
- Modify: `CHECKLIST.md`

- [ ] **Step 1: Run typecheck**

Run:

```bash
cd frontend
npm run typecheck
```

Expected: pass.

- [ ] **Step 2: Run focused tests**

Run:

```bash
cd frontend
npm test -- --run src/App.test.tsx -t "design-system|draft trips|confirmed trip detail|policy list|policy detail|benefit summaries|dgtour summary"
```

Expected: pass.

- [ ] **Step 3: Run frontend build**

Run:

```bash
cd frontend
npm run build
```

Expected: pass.

- [ ] **Step 4: Run responsive browser QA**

Start or reuse the Vite preview/dev server, then check these routes at widths `360`, `390`, `430`, `1024`, and `1440`:

```text
/policies
/policies/dgtour-%EB%B0%80%EC%96%91-1
/trips
/trips/1
```

Expected:
- No horizontal overflow.
- Bottom tabs icons and labels are vertically centered.
- Policy list cards use consistent border/radius/surface.
- Policy detail benefit and requirement groups read as related cards, not mismatched blocks.
- Draft trip surfaces are yellow.
- Confirmed trip surfaces are green.
- Benefit tags are blue.
- Sticky CTA does not leave a gap above bottom tabs.

- [ ] **Step 5: Update `CHECKLIST.md` with actual results**

Replace the unchecked line from Task 7 with pass/fail notes:

```markdown
- [x] 2026-05-23 policy-wide DS refactor: `npm run typecheck` PASS; focused Vitest PASS; `npm run build` PASS; responsive visual QA PASS at 360/390/430/1024/1440 for `/policies`, policy detail, `/trips`, and trip detail.
```

If a check fails, record the failing command and exact blocker instead of marking it passed.

---

## Self-Review

- Spec coverage: the plan covers shared primitives, tokens, trip list/detail, policy list/detail, bottom tabs, and validation without API/backend/data-flow changes.
- Placeholder scan: no `TBD`, `TODO`, or open-ended implementation placeholders are present.
- Type consistency: `Tone`, `SurfaceTone`, `SurfaceCard`, and `StatusPanel` are defined before use and reused consistently.
- Risk: source files currently show mojibake in several Korean strings. This plan allows fixing visible bottom tab labels because they are part of the UI refactor, but it does not authorize broad text cleanup outside touched UI surfaces.
