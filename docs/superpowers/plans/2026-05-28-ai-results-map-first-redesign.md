# AI Results Map-First Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the selected A’’’ map-first `/ai-results` design so users can select an AI candidate on the map, choose a Day with a slim control, and add it without explanatory UI clutter.

**Architecture:** Keep all data access inside the existing `AppDataApi` usage in `AiResultsPage`. Refactor only the page-level render structure and CSS classes; reuse existing `CandidateMap`, recommendation helpers, `TripPreview`, and add-place service calls. Broaden the frontend scope to include the itinerary detail entry CTA, empty/error states, current-trip preview, and criteria sheet copy, but do not change API/backend contracts.

**Tech Stack:** React, TypeScript, React Router, Vite, Vitest/Testing Library, existing Travel Hunter CSS in `frontend/src/styles/app.css`.

---

## File Structure

- Modify: `frontend/src/pages/itinerary/AiResultsPage.tsx`
  - Remove large hero/flow-panel render from the primary path.
  - Add compact status filters/counts, selected map summary, slim Day add bar, and concise candidate rows.
  - Keep `appDataApi.listRecommendations`, `appDataApi.getTrip`, and `appDataApi.addTripPlace` unchanged.
- Modify: `frontend/src/pages/itinerary/ItineraryDetailPage.tsx`
  - Align entry CTA copy with the new candidate-add workflow.
- Modify: `frontend/src/styles/app.css`
  - Add/adjust CSS for compact map-first layout, slim Day bar, status filters, and candidate states.
  - Remove or stop relying on hero/flow-panel styles for the new `/ai-results` shell.
- Modify: `frontend/src/App.test.tsx`
  - Update AI results route tests to expect the new compact UI.
  - Add regression coverage for slim Day add behavior, duplicate state, entry CTA copy, criteria sheet, and empty/error states.
- Check: `docs/mvp-api-contract.md`
  - Confirm no API shape update is required because existing `Recommendation` and `Trip` fields are sufficient.
- Update after implementation: `CHECKLIST.md`
  - Record validation commands and remaining risks.

## Task 1: Lock the expected UI with failing tests

**Files:**
- Modify: `frontend/src/App.test.tsx`

- [ ] **Step 1: Update the AI results shell test to reject the old hero and require the compact map-first UI**

In the test that currently starts with `it("renders AI additional candidates with the shared map"`, replace the old hero/flow assertions:

```ts
expect(document.querySelector(".ai-results-hero")).toBeTruthy();
expect(screen.getByRole("region", { name: "AI 추천 일정 추가 단계" })).toBeInTheDocument();
expect(document.body).toHaveTextContent("속초 여행에 더할 장소 후보");
expect(document.body).toHaveTextContent("후보를 고르고 지도에서 확인한 뒤, 원하는 Day에 바로 추가하세요.");
```

with assertions for the selected A’’’ design:

```ts
expect(document.querySelector(".ai-results-hero")).toBeNull();
expect(document.querySelector(".ai-flow-panel")).toBeNull();
expect(screen.getByText("AI 추천 후보")).toBeInTheDocument();
expect(screen.getByRole("button", { name: /전체 1/ })).toBeInTheDocument();
expect(screen.getByRole("button", { name: /추가 가능 1/ })).toBeInTheDocument();
expect(screen.getByRole("button", { name: /이미 추가 0/ })).toBeInTheDocument();
expect(await screen.findByRole("region", { name: "추천 후보 지도" })).toBeInTheDocument();
expect(screen.getByRole("region", { name: "선택 후보 요약" })).toBeInTheDocument();
```

- [ ] **Step 2: Add a failing test for the slim Day add bar**

Append this test near the existing AI recommendation add tests:

```ts
it("adds a selected AI candidate from the slim Day bar", async () => {
  const recommendation = {
    id: "kakao_local:food-1",
    label: "food",
    title: "속초 로컬 맛집",
    meta: "점심 후보",
    reason: "식사 만족도가 높아요.",
    categoryGroup: "food" as const,
    categoryCode: "FD6",
    address: "강원 속초시 중앙로 1",
    latitude: 38.1,
    longitude: 128.5,
    placeUrl: "http://place.map.kakao.com/food-1",
    suggestedDay: 2,
    aiReview: "Day 2 점심 동선에 맞는 후보입니다.",
    sourceProvider: "kakao_local",
    externalPlaceId: "food-1",
  };
  const initialTrip: Trip = {
    ...getPreviewTrip(),
    id: "55",
    title: "AI recommendation trip",
    days: { 1: [], 2: [], 3: [] },
  };
  const updatedTrip: Trip = {
    ...initialTrip,
    days: { 1: [], 2: [{ id: "9", time: "", label: recommendation.title, meta: recommendation.aiReview }], 3: [] },
  };
  const listRecommendationsSpy = vi.spyOn(appDataApi, "listRecommendations").mockResolvedValue([recommendation]);
  const addPlaceSpy = vi.spyOn(appDataApi, "addTripPlace").mockResolvedValue(updatedTrip);
  const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValueOnce(initialTrip).mockResolvedValue(updatedTrip);

  try {
    await login();
    cleanup();
    renderRoute("/ai-results?tripId=55");

    await waitFor(() => expect(listRecommendationsSpy).toHaveBeenCalledWith("55"));
    await userEvent.setup().click(within(await screen.findByRole("region", { name: "맛집 후보" })).getByRole("button", { name: /속초 로컬 맛집/ }));
    expect(screen.getByRole("group", { name: "Day 선택" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "D2" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.setup().click(screen.getByRole("button", { name: "Day 2에 추가" }));

    await waitFor(() => expect(addPlaceSpy).toHaveBeenCalledWith("55", 2, expect.objectContaining({ label: recommendation.title })));
    await waitFor(() => expect(document.body).toHaveTextContent("속초 로컬 맛집을 Day 2 일정에 추가했어요."));
  } finally {
    listRecommendationsSpy.mockRestore();
    addPlaceSpy.mockRestore();
    getTripSpy.mockRestore();
  }
});
```

- [ ] **Step 3: Add a failing duplicate-state regression**

```ts
it("marks already-added AI candidates as duplicates without opening the add action", async () => {
  const recommendation = {
    id: "kakao_local:spot-1",
    label: "attraction",
    title: "속초해변",
    meta: "명소 후보",
    reason: "동선에 가까워요.",
    categoryGroup: "attraction" as const,
    suggestedDay: 1,
  };
  const trip: Trip = {
    ...getPreviewTrip(),
    id: "55",
    title: "Duplicate trip",
    days: { 1: [{ id: "1", time: "", label: "속초해변", meta: "이미 등록됨" }], 2: [] },
  };
  const listRecommendationsSpy = vi.spyOn(appDataApi, "listRecommendations").mockResolvedValue([recommendation]);
  const getTripSpy = vi.spyOn(appDataApi, "getTrip").mockResolvedValue(trip);

  try {
    await login();
    cleanup();
    renderRoute("/ai-results?tripId=55");

    await waitFor(() => expect(listRecommendationsSpy).toHaveBeenCalledWith("55"));
    expect(screen.getByRole("button", { name: /이미 추가 1/ })).toBeInTheDocument();
    const duplicateCard = within(await screen.findByRole("region", { name: "명소 후보" })).getByRole("button", { name: /속초해변/ });
    await userEvent.setup().click(duplicateCard);
    expect(document.body).toHaveTextContent("이미 추가됨");
    expect(screen.queryByRole("button", { name: /Day 1에 추가/ })).not.toBeInTheDocument();
  } finally {
    listRecommendationsSpy.mockRestore();
    getTripSpy.mockRestore();
  }
});
```

- [ ] **Step 4: Run the targeted tests and verify they fail for the expected UI reasons**

Run:

```bash
cd frontend
VITE_KAKAO_MAP_JS_KEY=real-ci-key npx vitest run src/App.test.tsx -t "AI additional candidates|slim Day bar|already-added AI candidates|opens the AI recommendation criteria sheet"
```

Expected: FAIL before implementation because `.ai-results-hero` still exists and the slim Day bar/status filters do not exist yet.

## Task 2: Refactor `/ai-results` render state helpers

**Files:**
- Modify: `frontend/src/pages/itinerary/AiResultsPage.tsx`

- [ ] **Step 1: Add compact status helper functions above `AiResultsPage`**

Add these helpers near the existing `tripDayNumbers` helper:

```ts
function recommendationLocationLabel(item: Recommendation): string {
  return item.address || item.meta || "위치 확인 필요";
}

function recommendationBenefitLabel(item: Recommendation): string {
  const source = item.aiReview || item.reason || item.meta;
  if (/혜택|정책|쿠폰|할인|지원/.test(source)) return "혜택 단서";
  return "추천 근거";
}

function compactDayLabel(dayNumber: number): string {
  return `D${dayNumber}`;
}
```

- [ ] **Step 2: Add derived status counts inside `AiResultsPage`**

After `alreadyAddedCount`, add:

```ts
const addableCount = Math.max(recommendations.length - alreadyAddedCount, 0);
const selectedAlreadyAdded = selectedCandidate ? tripHasRecommendation(activeTrip, selectedCandidate) : false;
const addableSelectedCandidate = selectedCandidate && !selectedAlreadyAdded ? selectedCandidate : null;
const selectedSummaryCandidate = selectedCandidate ?? recommendations[0] ?? null;
```

- [ ] **Step 3: Replace `selectCandidate` with duplicate-safe behavior**

Use this body:

```ts
const selectCandidate = (itemKey: string) => {
  const item = recommendations.find((candidate, index) => recommendationKey(candidate, index) === itemKey);
  setSelectedCandidateKey(itemKey);
  setPendingCandidateKey(item && !tripHasRecommendation(activeTrip, item) ? itemKey : null);
  setAddError("");
};
```

This preserves current behavior if already present. Do not add navigation or API calls here.

## Task 3: Implement compact map-first page structure

**Files:**
- Modify: `frontend/src/pages/itinerary/AiResultsPage.tsx`

- [ ] **Step 1: Remove the large hero and flow panel from the normal render path**

Delete the `<header className="ai-results-hero">...</header>` block and the `<section className="ai-flow-panel" ...>...</section>` block.

- [ ] **Step 2: Add a compact status filter strip at the top of `ai-results-content`**

Immediately inside `<div className="content ai-results-content">`, before loading/error states, add:

```tsx
<div className="ai-results-compact-head" aria-label="AI 추천 후보 상태">
  <div>
    <h1>AI 추천 후보</h1>
    <p>{activeTrip?.title ?? "현재 일정"}</p>
  </div>
  <div className="ai-candidate-status-tabs" role="list" aria-label="후보 상태 요약">
    <button className="active" type="button">전체 {recommendations.length}</button>
    <button type="button">추가 가능 {addableCount}</button>
    <button type="button">이미 추가 {alreadyAddedCount}</button>
  </div>
</div>
```

- [ ] **Step 3: Replace the `ai-results-workspace` contents with map-first ordering**

Inside the non-empty state, render the map column first, then the slim add bar, then candidate list/current preview:

```tsx
<div className="ai-results-layout ai-results-workspace ai-results-map-first">
  <section className="ai-map-column ai-map-column-primary" aria-label="후보 지도 확인">
    <CandidateMap
      candidates={recommendations}
      onSelect={(itemKey) => {
        if (itemKey) selectCandidate(itemKey);
        else {
          setSelectedCandidateKey(null);
          setPendingCandidateKey(null);
        }
      }}
      selectedKey={selectedCandidateKey}
      selectedCandidate={selectedSummaryCandidate}
      selectedAlreadyAdded={selectedAlreadyAdded}
    />
    {addableSelectedCandidate && (
      <SlimDayAddBar
        activeDay={activeDay}
        candidate={addableSelectedCandidate}
        dayNumbers={dayNumbers}
        isSaving={addingRecommendationKey === pendingCandidateKey}
        onSelectDay={setActiveDay}
        onAdd={() => void addRecommendationToTrip(activeDay)}
      />
    )}
  </section>
  <div className="ai-candidate-panel ai-planning-rail ai-planning-rail-compact">
    {/* keep grouped recommendation sections here */}
    <TripPreview trip={activeTrip} activeDay={activeDay} onSelectDay={setActiveDay} />
  </div>
</div>
```

In this step, move the existing grouped recommendation section markup into the indicated panel. Remove the old `DayPicker` conditional block.

- [ ] **Step 4: Update candidate card labels and status copy**

Inside the existing candidate card render, keep the button but update its status area to use compact signals:

```tsx
<span className="ai-candidate-actions">
  <Tag tone={alreadyAdded ? "gray" : "primary"}>{alreadyAdded ? "이미 추가됨" : "미추가"}</Tag>
  <span className="ai-candidate-cta">{alreadyAdded ? "중복" : "선택"}</span>
</span>
```

Add compact trust text in the copy block:

```tsx
<span className="ai-candidate-review">
  {recommendationLocationLabel(item)} · {recommendationBenefitLabel(item)}
</span>
```

## Task 4: Add `SlimDayAddBar` and map selected summary

**Files:**
- Modify: `frontend/src/pages/itinerary/AiResultsPage.tsx`

- [ ] **Step 1: Extend `CandidateMap` props**

Change the signature to:

```ts
function CandidateMap({
  candidates,
  onSelect,
  selectedAlreadyAdded,
  selectedCandidate,
  selectedKey,
}: {
  candidates: Recommendation[];
  onSelect: (itemKey: string | null) => void;
  selectedAlreadyAdded: boolean;
  selectedCandidate: Recommendation | null;
  selectedKey: string | null;
}) {
```

- [ ] **Step 2: Add selected summary below `KakaoMapView` inside `CandidateMap`**

After `</KakaoMapView>`, add:

```tsx
{selectedCandidate && (
  <section className="ai-map-selected-summary" aria-label="선택 후보 요약">
    <div>
      <strong>{selectedCandidate.title}</strong>
      <span>{recommendationLocationLabel(selectedCandidate)}</span>
    </div>
    <div className="ai-map-selected-signals" aria-label="선택 후보 상태">
      <Tag tone="gray">위치 확인</Tag>
      <Tag tone="primary">{recommendationBenefitLabel(selectedCandidate)}</Tag>
      <Tag tone={selectedAlreadyAdded ? "gray" : "primary"}>{selectedAlreadyAdded ? "이미 추가됨" : "미추가"}</Tag>
    </div>
  </section>
)}
```

- [ ] **Step 3: Replace `DayPicker` with `SlimDayAddBar`**

Remove the `DayPicker` component and add:

```tsx
function SlimDayAddBar({
  activeDay,
  candidate,
  dayNumbers,
  isSaving,
  onAdd,
  onSelectDay,
}: {
  activeDay: number;
  candidate: Recommendation;
  dayNumbers: number[];
  isSaving: boolean;
  onAdd: () => void;
  onSelectDay: (dayNumber: number) => void;
}) {
  const days = dayNumbers.length > 0 ? dayNumbers : [recommendationDayNumber(candidate)];

  return (
    <section className="ai-slim-day-add" aria-label="추천 후보 일정 추가">
      <div className="ai-slim-day-tabs" role="group" aria-label="Day 선택">
        {days.map((dayNumber) => (
          <button
            aria-pressed={activeDay === dayNumber}
            className={activeDay === dayNumber ? "active" : ""}
            disabled={isSaving}
            key={dayNumber}
            onClick={() => onSelectDay(dayNumber)}
            type="button"
          >
            {compactDayLabel(dayNumber)}
          </button>
        ))}
      </div>
      <button className="ai-slim-add-button" disabled={isSaving} onClick={onAdd} type="button">
        {isSaving ? "추가 중" : `Day ${activeDay}에 추가`}
      </button>
    </section>
  );
}
```

- [ ] **Step 4: Run targeted typecheck**

Run:

```bash
cd frontend
npm run typecheck
```

Expected: PASS after fixing any TypeScript prop/signature mismatches.

## Task 5: Adjust supporting surfaces

**Files:**
- Modify: `frontend/src/pages/itinerary/AiResultsPage.tsx`
- Modify: `frontend/src/pages/itinerary/ItineraryDetailPage.tsx`

- [ ] **Step 1: Update empty state copy**

Change the empty state to avoid implying full regeneration:

```tsx
<EmptyState
  title="추가할 추천 후보가 아직 없어요"
  body="일정 조건을 조정하면 새 후보를 다시 확인할 수 있어요."
  action={<Button onClick={() => navigate("/trips/new")}>일정 조건 조정</Button>}
/>
```

- [ ] **Step 2: Update criteria trigger accessible label and sheet copy**

Keep the button but make it concise:

```tsx
<button className="icon-btn" type="button" aria-label="추천 기준 보기" onClick={() => setIsCriteriaOpen(true)}>
  <Bot size={18} />
</button>
```

In `RecommendationCriteriaSheet`, use:

```tsx
<h2 id="recommendation-criteria-title">추천 기준</h2>
<p className="meta">후보는 일정 위치, 이동 부담, 저장된 정책 단서를 기준으로 정리돼요.</p>
```

- [ ] **Step 3: Update itinerary detail entry CTA copy**

In `ItineraryDetailPage.tsx`, change:

```tsx
✨ AI 추천 일정 보기
```

to:

```tsx
✨ 추천 후보 추가
```

- [ ] **Step 4: Keep current trip preview compact**

In `TripPreview`, change the heading copy from `Day {activeDay} 미리보기` to:

```tsx
<h3>Day {activeDay}</h3>
```

Keep the aria-label `현재 일정 미리보기` unchanged for accessibility and test continuity.

## Task 6: Implement CSS for selected A’’’ design

**Files:**
- Modify: `frontend/src/styles/app.css`

- [ ] **Step 1: Add compact head/status styles near existing AI results styles**

Add:

```css
.ai-results-compact-head {
  display: grid;
  gap: 10px;
  margin-bottom: 10px;
}

.ai-results-compact-head h1 {
  margin: 0;
  color: var(--text-strong, #172033);
  font-size: 1.05rem;
  letter-spacing: -0.03em;
}

.ai-results-compact-head p {
  margin: 2px 0 0;
  color: var(--text-muted, #64748b);
  font-size: 0.78rem;
}

.ai-candidate-status-tabs {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.ai-candidate-status-tabs button {
  border: 1px solid var(--line-soft, #d9e2ef);
  border-radius: 999px;
  background: #fff;
  color: var(--text-muted, #64748b);
  flex: 0 0 auto;
  font-size: 0.72rem;
  font-weight: 800;
  padding: 7px 10px;
}

.ai-candidate-status-tabs button.active {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1d4ed8;
}
```

- [ ] **Step 2: Add map-first workspace and summary styles**

```css
.ai-results-map-first {
  gap: 10px;
}

.ai-map-column-primary {
  gap: 8px;
}

.ai-map-selected-summary {
  align-items: flex-start;
  background: #fff;
  border: 1px solid var(--line-soft, #d9e2ef);
  border-radius: 18px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  display: grid;
  gap: 8px;
  margin-top: -64px;
  padding: 10px;
  position: relative;
  z-index: 2;
}

.ai-map-selected-summary strong,
.ai-map-selected-summary span {
  display: block;
}

.ai-map-selected-summary strong {
  color: var(--text-strong, #172033);
  font-size: 0.88rem;
}

.ai-map-selected-summary span {
  color: var(--text-muted, #64748b);
  font-size: 0.72rem;
  margin-top: 3px;
}

.ai-map-selected-signals {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
```

- [ ] **Step 3: Add slim Day bar styles**

```css
.ai-slim-day-add {
  align-items: center;
  background: #fff;
  border: 1px solid #bfdbfe;
  border-radius: 18px;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.08);
  display: grid;
  gap: 8px;
  grid-template-columns: 1fr auto;
  padding: 7px;
}

.ai-slim-day-tabs {
  display: flex;
  gap: 4px;
  min-width: 0;
}

.ai-slim-day-tabs button {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  color: #64748b;
  flex: 1 1 0;
  font-size: 0.72rem;
  font-weight: 900;
  line-height: 1;
  min-width: 0;
  padding: 8px 4px;
}

.ai-slim-day-tabs button.active {
  background: #eff6ff;
  border-color: #93c5fd;
  color: #1d4ed8;
}

.ai-slim-add-button {
  background: #2563eb;
  border: 0;
  border-radius: 13px;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 900;
  padding: 9px 11px;
  white-space: nowrap;
}
```

- [ ] **Step 4: Add responsive guardrails**

```css
@media (max-width: 430px) {
  .ai-candidate-status-tabs button,
  .ai-slim-add-button {
    font-size: 0.68rem;
  }

  .ai-slim-day-add {
    grid-template-columns: minmax(0, 1fr) auto;
  }
}
```

## Task 7: Update tests for supporting surfaces

**Files:**
- Modify: `frontend/src/App.test.tsx`

- [ ] **Step 1: Update the criteria sheet test**

Change:

```ts
await userEvent.setup().click(await screen.findByRole("button", { name: "추천 기준" }));
expect(screen.getByRole("dialog", { name: "AI 추천 기준" })).toBeInTheDocument();
```

to:

```ts
await userEvent.setup().click(await screen.findByRole("button", { name: "추천 기준 보기" }));
expect(screen.getByRole("dialog", { name: "추천 기준" })).toBeInTheDocument();
```

Keep assertions for `정책 조건` and `이동 거리`.

- [ ] **Step 2: Update the itinerary detail CTA expectation**

Find the test helper/assertion around `/ai-results?tripId=44` and change the link name expectation to:

```ts
expect(screen.getByRole("link", { name: "✨ 추천 후보 추가" })).toHaveAttribute("href", "/ai-results?tripId=44");
```

- [ ] **Step 3: Run targeted tests**

Run:

```bash
cd frontend
VITE_KAKAO_MAP_JS_KEY=real-ci-key npx vitest run src/App.test.tsx -t "AI additional candidates|slim Day bar|already-added AI candidates|opens the AI recommendation criteria sheet|ai-results"
```

Expected: PASS for the selected tests.

## Task 8: Validate no API contract change and record evidence

**Files:**
- Check: `docs/mvp-api-contract.md`
- Modify after implementation: `CHECKLIST.md`

- [ ] **Step 1: Confirm existing contract fields are sufficient**

Run:

```bash
grep -n "Additional \`Recommendation\` fields" -A20 docs/mvp-api-contract.md
```

Expected: contract already includes `address`, `latitude`, `longitude`, `suggestedDay`, `aiReview`, `sourceProvider`, and `externalPlaceId`; no contract edit needed.

- [ ] **Step 2: Run frontend typecheck**

Run:

```bash
cd frontend
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Run frontend build**

Run:

```bash
cd frontend
npm run build
rm -rf dist
```

Expected: build passes; generated `dist/` removed afterward.

- [ ] **Step 4: Run diff whitespace check**

Run:

```bash
git diff --check
```

Expected: PASS.

- [ ] **Step 5: Record validation in `CHECKLIST.md`**

Append entries like:

```md
## 2026-05-28 - /ai-results map-first A design implementation

- [x] Implemented selected A’’’ map-first slim Day bar design for `/ai-results`.
- [x] Confirmed no API contract change was required; existing `Recommendation` and `Trip` fields were sufficient.
- [x] Validation passed: `cd frontend && npm run typecheck`.
- [x] Validation passed: `cd frontend && VITE_KAKAO_MAP_JS_KEY=real-ci-key npx vitest run src/App.test.tsx -t "AI additional candidates|slim Day bar|already-added AI candidates|opens the AI recommendation criteria sheet|ai-results"`.
- [x] Validation passed: `cd frontend && npm run build`; generated `frontend/dist/` removed afterward.
- [x] Validation passed: `git diff --check`.
```

If Docker remains unavailable, do not claim full `npm test`; record it as blocked.

## Self-Review

- Spec coverage: Covers selected A’’’ design, broader surfaces, no API changes, tests, validation, and checklist recording.
- Placeholder scan: No unfinished placeholder markers are present.
- Type consistency: Uses existing `Recommendation`, `Trip`, `TripPlaceRequest`, and `appDataApi` boundaries; new helper names are defined before use.
