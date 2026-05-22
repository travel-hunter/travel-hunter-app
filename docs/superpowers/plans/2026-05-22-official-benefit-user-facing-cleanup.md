# Official Benefit User-Facing Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove user-facing `internal/external` policy distinctions so every visible policy reads as a normal official benefit, while preserving API compatibility for the later normalization migration.

**Architecture:** This plan keeps the existing backend DTO shape and frontend `AppDataApi` boundary. Phase 1 changes are limited to frontend presentation, frontend tests, and docs/evals wording; raw `external_source_records -> Policy DTO` exposure remains backward compatible until the separate normalization migration.

**Tech Stack:** React/Vite, TypeScript, Vitest Testing Library, FastAPI contract docs, `.agent/evals` JSON.

---

## Scope

Included:

- Remove `공식 수집`, `공식 수집 혜택`, and visible `external` semantics from policy cards, policy detail, and trip creation copy.
- Change official URL CTA label from `공식 안내 확인` to `혜택 안내 보기`.
- Stop hiding save and trip attach controls solely because `policy.sourceType === "external"`.
- Keep `sourceType` in API/types as a compatibility field.
- Update frontend tests and user-facing docs/evals wording for Phase 1.

Excluded:

- No Alembic migration.
- No `external_source_records -> policies` promotion service.
- No removal of `travelmonth-{id}` route behavior.
- No backend DTO field removal.

## File Map

- Modify: `frontend/src/components/cards.tsx`
  - Responsible for policy list card taxonomy, source badge, and favorite button visibility.
- Modify: `frontend/src/pages/PolicyPages.tsx`
  - Responsible for policy detail CTA label and save/trip attach visibility.
- Modify: `frontend/src/pages/itinerary/ItineraryCreatePage.tsx`
  - Responsible for trip creation copy when opened from a collected TravelMonth slug.
- Modify: `frontend/src/pages/MyPage.tsx`
  - Responsible for user help copy that explains policy CTA labels.
- Modify: `frontend/src/App.test.tsx`
  - Frontend regression coverage for cards, detail CTA, and trip creation copy.
- Modify: `docs/current-work-spec.md`
  - Record Phase 1 user-facing official benefit unification.
- Modify: `docs/mvp-api-contract.md`
  - Mark `sourceType` as compatibility/internal diagnostic and update CTA wording.
- Modify: `.agent/evals/api-contract-golden.json`
  - Keep schema shape but update behavioral text away from user-facing external terminology.
- Modify: `CHECKLIST.md`
  - Record validation and remaining migration risk after implementation.

## Task 1: Policy Card Source Wording

**Files:**
- Modify: `frontend/src/components/cards.tsx`
- Test: `frontend/src/App.test.tsx`

- [ ] **Step 1: Write failing frontend tests for list card wording**

In `frontend/src/App.test.tsx`, update the existing collected policy list test around the current `travelmonth-58` fixture so it expects no `공식 수집` text in the rendered policy list card.

Use this assertion inside the test that renders `/policies` with a collected policy:

```tsx
renderRoute("/policies");

await waitFor(() => expect(getLink("/policies/travelmonth-58")).toBeInTheDocument());
expect(document.body).toHaveTextContent("부산 여행 캐시백");
expect(document.body).not.toHaveTextContent("공식 수집");
expect(document.body).not.toHaveTextContent("external");
```

- [ ] **Step 2: Run the targeted failing test**

Run:

```powershell
cd frontend
npm test -- --run src/App.test.tsx -t "renders collected TravelMonth benefits in the policy list"
```

Expected: FAIL because `PolicyListCard` still renders `<em>공식 수집</em>` when `sourceType === "external"`.

- [ ] **Step 3: Remove the source badge and source-based save restriction**

In `frontend/src/components/cards.tsx`, replace:

```tsx
const canSave = policy.sourceType !== "external" && Boolean(onToggleSave);
```

with:

```tsx
const canSave = Boolean(onToggleSave);
```

Then replace:

```tsx
<div className="policy-list-taxonomy">
  <span>{policy.category}</span>
  {policy.sourceType === "external" && <em>공식 수집</em>}
</div>
```

with:

```tsx
<div className="policy-list-taxonomy">
  <span>{policy.category}</span>
</div>
```

- [ ] **Step 4: Run the targeted test again**

Run:

```powershell
cd frontend
npm test -- --run src/App.test.tsx -t "renders collected TravelMonth benefits in the policy list"
```

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

Run:

```powershell
git add frontend/src/components/cards.tsx frontend/src/App.test.tsx
git commit -m "fix: remove source badge from policy cards"
```

## Task 2: Policy Detail CTA And Controls

**Files:**
- Modify: `frontend/src/pages/PolicyPages.tsx`
- Test: `frontend/src/App.test.tsx`

- [ ] **Step 1: Write failing tests for official CTA wording and external detail controls**

In `frontend/src/App.test.tsx`, update the official-link test to expect `혜택 안내 보기` instead of `공식 안내 확인`:

```tsx
const applicationLink = await screen.findByRole("link", { name: "혜택 안내 보기" });
expect(applicationLink).toHaveAttribute("href", officialUrl);
expect(applicationLink).toHaveAttribute("target", "_blank");
```

Update the collected policy detail test so the official URL CTA also uses `혜택 안내 보기` and the page does not show `공식 수집`:

```tsx
renderRoute("/policies/travelmonth-58");

expect(await screen.findByRole("heading", { name: "부산 여행 캐시백" })).toBeInTheDocument();
expect(screen.getByRole("link", { name: "혜택 안내 보기" })).toHaveAttribute("href", collectedPolicy.officialUrl);
expect(document.body).not.toHaveTextContent("공식 수집");
```

If the current test fixture sets `sourceType: "external"`, keep it. The test should prove the visible behavior no longer changes because of `sourceType`.

- [ ] **Step 2: Run the targeted failing tests**

Run:

```powershell
cd frontend
npm test -- --run src/App.test.tsx -t "official policy link|collected policy detail"
```

Expected: FAIL because `getPolicyApplicationCta()` still returns `공식 안내 확인`, and detail still hides save/trip controls based on `isExternalPolicy`.

- [ ] **Step 3: Change CTA label**

In `frontend/src/pages/PolicyPages.tsx`, replace:

```tsx
if (policy.officialUrl) return { kind: "official", label: "공식 안내 확인", url: policy.officialUrl };
```

with:

```tsx
if (policy.officialUrl) return { kind: "official", label: "혜택 안내 보기", url: policy.officialUrl };
```

- [ ] **Step 4: Remove sourceType-driven detail control hiding**

In `frontend/src/pages/PolicyPages.tsx`, remove this line:

```tsx
const isExternalPolicy = policy.sourceType === "external";
```

Replace the overlay nav block:

```tsx
<div className="row">
  {!isExternalPolicy && (
    <button className="icon-btn" disabled={isSavingPolicy} onClick={savePrototypePolicy} type="button" aria-label="저장">
      <Heart size={18} fill={isPolicySaved ? "currentColor" : "none"} />
    </button>
  )}
  <IconButton label="공유" onClick={sharePrototypePolicyLink}>
    <Share2 size={18} />
  </IconButton>
</div>
```

with:

```tsx
<div className="row">
  <button className="icon-btn" disabled={isSavingPolicy} onClick={savePrototypePolicy} type="button" aria-label="저장">
    <Heart size={18} fill={isPolicySaved ? "currentColor" : "none"} />
  </button>
  <IconButton label="공유" onClick={sharePrototypePolicyLink}>
    <Share2 size={18} />
  </IconButton>
</div>
```

Replace the sticky CTA block:

```tsx
{!isExternalPolicy && (
  <Button variant="secondary" onClick={addToTrip}>
    {isPolicyInTrip ? "일정에 담김" : "📅 내 일정에 담기"}
  </Button>
)}
```

with:

```tsx
<Button variant="secondary" onClick={addToTrip}>
  {isPolicyInTrip ? "일정에 담김" : "📅 내 일정에 담기"}
</Button>
```

- [ ] **Step 5: Run the targeted tests again**

Run:

```powershell
cd frontend
npm test -- --run src/App.test.tsx -t "official policy link|collected policy detail"
```

Expected: PASS.

- [ ] **Step 6: Commit Task 2**

Run:

```powershell
git add frontend/src/pages/PolicyPages.tsx frontend/src/App.test.tsx
git commit -m "fix: present policy details as official benefits"
```

## Task 3: Trip Creation Copy

**Files:**
- Modify: `frontend/src/pages/itinerary/ItineraryCreatePage.tsx`
- Test: `frontend/src/App.test.tsx`

- [ ] **Step 1: Write failing tests for trip creation copy**

In `frontend/src/App.test.tsx`, update the test named `does not send collected external policy slugs to trip policy linking`.

After rendering `/trips/new?policySlug=travelmonth-58&region=...`, assert:

```tsx
expect(screen.getByText("선택한 혜택을 참고해 일정을 만들게요")).toBeInTheDocument();
expect(document.body).not.toHaveTextContent("공식 수집 혜택");
```

When the test reaches step 3, assert:

```tsx
expect(document.body).toHaveTextContent("참고 혜택 · 선택한 혜택");
expect(document.body).not.toHaveTextContent("참고 혜택 · 공식 수집 혜택");
```

- [ ] **Step 2: Run the targeted failing test**

Run:

```powershell
cd frontend
npm test -- --run src/App.test.tsx -t "does not send collected external policy slugs to trip policy linking"
```

Expected: FAIL because the current copy says `공식 수집 혜택`.

- [ ] **Step 3: Replace collected-source copy**

In `frontend/src/pages/itinerary/ItineraryCreatePage.tsx`, replace:

```tsx
? "공식 수집 혜택을 참고해 일정을 만들게요"
```

with:

```tsx
? "선택한 혜택을 참고해 일정을 만들게요"
```

Replace:

```tsx
<div className="linked">🎁 참고 혜택 · 공식 수집 혜택</div>
```

with:

```tsx
<div className="linked">🎁 참고 혜택 · 선택한 혜택</div>
```

- [ ] **Step 4: Run the targeted test again**

Run:

```powershell
cd frontend
npm test -- --run src/App.test.tsx -t "does not send collected external policy slugs to trip policy linking"
```

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

Run:

```powershell
git add frontend/src/pages/itinerary/ItineraryCreatePage.tsx frontend/src/App.test.tsx
git commit -m "fix: remove collected-source copy from trip creation"
```

## Task 4: Help Copy And Contract Wording

**Files:**
- Modify: `frontend/src/pages/MyPage.tsx`
- Modify: `docs/current-work-spec.md`
- Modify: `docs/mvp-api-contract.md`
- Modify: `.agent/evals/api-contract-golden.json`
- Test: `frontend/src/App.test.tsx`

- [ ] **Step 1: Update MyPage CTA help copy**

In `frontend/src/pages/MyPage.tsx`, replace the copy:

```tsx
body: "신청하러 가기는 접수 화면으로 바로 이동하는 링크이고, 공식 안내 확인은 주관 기관의 상세 안내 페이지로 이동하는 링크입니다.",
```

with:

```tsx
body: "신청하러 가기는 접수 화면으로 바로 이동하는 링크이고, 혜택 안내 보기는 주관 기관의 상세 안내 페이지로 이동하는 링크입니다.",
```

- [ ] **Step 2: Update frontend test copy expectations**

In `frontend/src/App.test.tsx`, replace all role/text expectations that look for `공식 안내 확인` as a user-facing CTA with `혜택 안내 보기`.

Do not change backend fixture fields or document labels that represent raw source data unless the assertion is checking visible UI copy.

- [ ] **Step 3: Update current work spec**

In `docs/current-work-spec.md`, change the policy CTA bullets from:

```markdown
- 정책 상세 CTA 분리:
  - `applyUrl`: `신청하러 가기`
  - `officialUrl`: `공식 안내 확인`
  - URL 없음: `신청 링크 준비 중`
```

to:

```markdown
- 정책 상세 CTA 분리:
  - `applyUrl`: `신청하러 가기`
  - `officialUrl`: `혜택 안내 보기`
  - URL 없음: `신청 링크 준비 중`
```

Also add this sentence to the official benefit section:

```markdown
사용자 화면에서는 `internal/external`, `공식 수집`, `내부 정책` 같은 구현 구분을 표시하지 않고 모든 노출 정책을 공식 혜택으로 표현한다.
```

- [ ] **Step 4: Update API contract wording**

In `docs/mvp-api-contract.md`, keep the `sourceType` field in response examples and schemas, but revise the explanatory paragraph for `GET /policies` to state:

```markdown
`sourceType` 허용 값은 `"internal" | "external"`이며 API 호환을 위해 유지한다. 사용자 화면은 이 값을 노출 문구나 기능 차이로 표시하지 않는다. 모든 사용자 노출 정책은 공식 혜택으로 표현하며, raw external record 직접 노출 제거는 후속 normalization migration에서 처리한다.
```

Change CTA wording references from `공식 안내 확인` to `혜택 안내 보기` where the text describes user-visible button labels.

- [ ] **Step 5: Update eval wording**

In `.agent/evals/api-contract-golden.json`, keep response shape fields unchanged. Update `dbModeBehavior` text for `/api/policies` from:

```json
"Returns DB policies plus active/fresh TravelMonth regional_benefit external_source_records mapped into the same Policy DTO. External collected benefit slugs use travelmonth-{externalSourceRecordId} and sourceType=external. Policy category is a benefit/source type; TravelMonth external records derive category from source URL/sourceCategory and do not use travelStyles for category filtering."
```

to:

```json
"Returns official-benefit Policy DTOs from DB policies and the backward-compatible active/fresh TravelMonth regional_benefit external_source_records mapping. sourceType remains in the DTO for compatibility, but user-facing UI must not expose internal/external wording. Policy category is a benefit/source type; TravelMonth records derive category from source URL/sourceCategory and do not use travelStyles for category filtering."
```

- [ ] **Step 6: Validate docs JSON**

Run:

```powershell
python -m json.tool .agent\evals\api-contract-golden.json > $null
```

Expected: exits 0.

- [ ] **Step 7: Commit Task 4**

Run:

```powershell
git add frontend/src/pages/MyPage.tsx frontend/src/App.test.tsx docs/current-work-spec.md docs/mvp-api-contract.md .agent/evals/api-contract-golden.json
git commit -m "docs: align policy copy with official benefits"
```

## Task 5: Full Verification And Checklist

**Files:**
- Modify: `CHECKLIST.md`

- [ ] **Step 1: Run frontend typecheck**

Run:

```powershell
cd frontend
npm run typecheck
```

Expected: exits 0.

- [ ] **Step 2: Run frontend unit tests**

Run:

```powershell
cd frontend
npm test -- --run src/App.test.tsx
```

Expected: exits 0 with all `src/App.test.tsx` tests passing.

- [ ] **Step 3: Run JSON and whitespace checks**

Run:

```powershell
cd ..
python -m json.tool .agent\evals\api-contract-golden.json > $null
git diff --check
```

Expected: both commands exit 0.

- [ ] **Step 4: Update CHECKLIST**

Add an entry to `CHECKLIST.md` with:

```markdown
- Official benefit user-facing cleanup:
  - `frontend npm run typecheck`: passed
  - `frontend npm test -- --run src/App.test.tsx`: passed
  - `python -m json.tool .agent/evals/api-contract-golden.json`: passed
  - `git diff --check`: passed
  - Remaining risk: `sourceType` and `travelmonth-{id}` remain as compatibility behavior until the normalization migration promotes collected records into `policies`.
```

- [ ] **Step 5: Commit Task 5**

Run:

```powershell
git add CHECKLIST.md
git commit -m "docs: record official benefit cleanup validation"
```

## Self-Review

- Spec coverage:
  - User-facing removal of `공식 수집`, `내부 정책`, and `external`: Tasks 1, 2, 3, 4.
  - CTA wording `혜택 안내 보기`: Tasks 2 and 4.
  - Keep `sourceType` compatibility: Tasks 2 and 4.
  - Migration work deferred and documented: Task 4 docs plus design spec.
  - Testing strategy for Phase 1: Tasks 1, 2, 3, 5.
- Placeholder scan:
  - No `TBD`, `TODO`, or unspecified code steps remain.
- Type consistency:
  - `Policy.sourceType` remains optional in `frontend/src/api/types.ts`.
  - No new API fields are introduced in this plan.
  - No backend route/schema changes are required for Phase 1.
