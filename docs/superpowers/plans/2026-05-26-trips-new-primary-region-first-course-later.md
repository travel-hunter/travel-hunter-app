# /trips/new Primary Region First, Course Preference Later Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/trips/new` start with broad region/travel-area selection only, then ask course preference after a concrete travel area is selected.

**Architecture:** Keep backend travel-area API and trip creation contract unchanged. The frontend Wizard will separate the current mixed first step into `region/travel-area -> course preference -> dates -> review/create`, so the first screen no longer mixes destination choice with style/course preference. The source of truth for selectable first-step regions will live in display config, while actual trip generation still converges on `travelAreaId`.

**Tech Stack:** React, React Router, TypeScript, Vite, Vitest, Testing Library, `AppDataApi`.

---

## Product Decision

The current first screen is doing two jobs at once:

```text
1. Where do you want to go?
2. What course style do you prefer?
```

That is too early for style selection because the user has not yet decided the travel area. The revised flow is:

```text
Step 1: 어디로 떠나볼까요?
        큰 권역/대표 지역 선택
        넓은 지역이면 세부 여행권역 선택

Step 2: 어떤 코스를 선호하나요?
        맛집, 휴식, 체험, 자연, 역사 등 course preference 선택

Step 3: 언제 떠나나요?
        날짜/기간 선택

Step 4: 일정 이름 확인 후 생성
```

## File Structure

- Modify `frontend/src/data/displayConfig.ts`: split first-step region config from legacy city-like options.
- Modify `frontend/src/pages/itinerary/ItineraryCreatePage.tsx`: change Wizard from 3 steps to 4 steps and move course preference UI out of Step 1.
- Modify `frontend/src/App.test.tsx`: update travel-area creation tests and add first-screen regression coverage.
- Modify `frontend/src/styles/app.css`: only if the moved style-choice panel needs spacing/layout fixes in its new step.
- Modify `CHECKLIST.md`: record validation results and remaining UI risks.

---

### Task 1: Add regression tests for first-screen responsibility

**Files:**

- Modify: `frontend/src/App.test.tsx`

- [x] **Step 1: Add a test that the first screen is destination-only**

Add a test near the existing `/trips/new` tests:

```tsx
it("shows broad region selection first without course preference choices", async () => {
  await withBackendAuth(async () => {
    renderRoute("/trips/new");

    expect(await screen.findByText("어디로 떠나볼까요?")).toBeInTheDocument();
    expect(screen.queryByText("어떤 코스를 선호하나요?")).not.toBeInTheDocument();

    expect(screen.getByRole("button", { name: /강원/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /전남/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /경남/ })).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: /^강릉$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^경주$/ })).not.toBeInTheDocument();
  });
});
```

- [x] **Step 2: Add a test that course preference appears after destination selection**

```tsx
it("asks course preference after a travel area is selected", async () => {
  const user = userEvent.setup();
  const travelAreasSpy = vi.spyOn(appDataApi, "listTravelAreaRecommendations").mockResolvedValue(getGangwonTravelAreaResponse());

  try {
    await withBackendAuth(async () => {
      renderRoute("/trips/new?region=강원");

      await user.click(await screen.findByRole("button", { name: /속초·고성·양양/ }));
      await user.click(screen.getByRole("button", { name: "다음" }));

      expect(await screen.findByText("어떤 코스를 선호하나요?")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /맛집/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /휴식/ })).toBeInTheDocument();
    });
  } finally {
    travelAreasSpy.mockRestore();
  }
});
```

- [ ] **Step 3: Run the focused tests and confirm failure**

Run:

```powershell
cd frontend
npm test -- --run src/App.test.tsx -t "first|course preference|travel"
```

Expected result:

```text
FAIL
```

The first test should fail because the first screen still renders `어떤 코스를 선호하나요?`. Existing travel creation tests may also fail after the step-count expectation changes until Task 3 updates the Wizard.

---

### Task 2: Separate first-step region config from city-like legacy options

**Files:**

- Modify: `frontend/src/data/displayConfig.ts`
- Modify: `frontend/src/pages/itinerary/ItineraryCreatePage.tsx`

- [x] **Step 1: Add first-step primary region config**

In `frontend/src/data/displayConfig.ts`, keep existing exports that other screens may depend on, but add a new config dedicated to `/trips/new` first step:

```ts
export type TripCreatePrimaryRegion = {
  label: string;
  value: string;
  emoji: string;
  description: string;
};

export const tripCreatePrimaryRegions: TripCreatePrimaryRegion[] = [
  { label: "제주", value: "제주", emoji: "🏝️", description: "섬, 바다, 자연" },
  { label: "부산", value: "부산", emoji: "🌉", description: "바다, 도시, 맛집" },
  { label: "서울", value: "서울", emoji: "🏙️", description: "도시, 전시, 미식" },
  { label: "강원", value: "강원", emoji: "⛰️", description: "바다, 산, 드라이브" },
  { label: "전남", value: "전남", emoji: "🌊", description: "섬, 바다, 정원" },
  { label: "경남", value: "경남", emoji: "🛥️", description: "남해, 섬, 드라이브" },
  { label: "경북", value: "경북", emoji: "🏛️", description: "역사, 바다, 전통" },
  { label: "전북", value: "전북", emoji: "🍲", description: "한옥, 미식, 역사" },
  { label: "충남", value: "충남", emoji: "🌅", description: "서해, 역사, 온천" },
  { label: "충북", value: "충북", emoji: "🌿", description: "호수, 산, 힐링" },
  { label: "경기", value: "경기", emoji: "🚲", description: "근교, 자연, 가족" },
  { label: "인천", value: "인천", emoji: "⛴️", description: "섬, 항구, 강화" },
];

export const tripCreatePrimaryRegionValues = tripCreatePrimaryRegions.map((region) => region.value);
```

Do not remove `tripCreateRegions` in this task unless every usage is confirmed. The safer migration is to introduce the new first-step config and switch only `ItineraryCreatePage`.

- [x] **Step 2: Use the new config in `ItineraryCreatePage.tsx`**

Change the import:

```ts
import { tripCreatePrimaryRegions, tripCreatePrimaryRegionValues, tripRegionEmoji } from "../../data/displayConfig";
```

Change `normalizeRegionParam` to validate against the first-step values:

```ts
function normalizeRegionParam(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim();
  return (tripCreatePrimaryRegionValues as readonly string[]).includes(normalized) ? normalized : null;
}
```

Change the first-step region rendering from `tripCreateRegions.map(...)` to `tripCreatePrimaryRegions.map(...)`:

```tsx
{tripCreatePrimaryRegions.map((region) => (
  <button className={selectedRegionButton === region.value ? "active" : ""} key={region.value} onClick={() => selectRegion(region.value)} type="button">
    <span aria-hidden="true">{region.emoji}</span>
    <strong>{region.label}</strong>
    <small>{region.description}</small>
  </button>
))}
```

- [x] **Step 3: Keep exact `sido` values for API compatibility**

Do not use grouped labels like `충청` or `경기·인천` in `value` for this implementation. The current API accepts exact `sido` filters, so grouped labels would require backend or multi-call frontend logic. Use exact values like `충남`, `충북`, `경기`, `인천`.

---

### Task 3: Change the Wizard from 3 steps to 4 steps

**Files:**

- Modify: `frontend/src/pages/itinerary/ItineraryCreatePage.tsx`

- [x] **Step 1: Introduce a total step constant and update step type**

Replace the hard-coded `1 | 2 | 3` step model with:

```ts
const TRIP_CREATE_TOTAL_STEPS = 4;

type TripCreateStep = 1 | 2 | 3 | 4;

function isValidTripCreateStep(value: unknown): value is TripCreateStep {
  return value === 1 || value === 2 || value === 3 || value === 4;
}
```

Update state:

```ts
const [step, setStep] = useState<TripCreateStep>(isValidTripCreateStep(initialDraft?.step) ? initialDraft.step : 1);
```

- [x] **Step 2: Update progress UI**

Replace:

```tsx
<span>{step}/3</span>
<span style={{ width: `${(step / 3) * 100}%` }} />
```

With:

```tsx
<span>{step}/{TRIP_CREATE_TOTAL_STEPS}</span>
<span style={{ width: `${(step / TRIP_CREATE_TOTAL_STEPS) * 100}%` }} />
```

- [x] **Step 3: Update next/create button logic**

Replace:

```ts
if (step < 3) {
  setStep((current) => (current + 1) as 1 | 2 | 3);
  return;
}
```

With:

```ts
if (step < TRIP_CREATE_TOTAL_STEPS) {
  setStep((current) => Math.min(current + 1, TRIP_CREATE_TOTAL_STEPS) as TripCreateStep);
  return;
}
```

Replace the button label:

```tsx
{isCreating ? "일정을 만드는 중입니다" : step < TRIP_CREATE_TOTAL_STEPS ? "다음" : "일정 만들기"}
```

- [x] **Step 4: Update back button logic**

Keep the existing `step > 1` condition, but make the decrement typed:

```ts
setStep((current) => Math.max(current - 1, 1) as TripCreateStep);
```

---

### Task 4: Move course preference UI from Step 1 to Step 2

**Files:**

- Modify: `frontend/src/pages/itinerary/ItineraryCreatePage.tsx`
- Modify: `frontend/src/styles/app.css` only if needed for spacing

- [x] **Step 1: Remove style choice block from Step 1**

Remove the `.prototype-style-choice` block from inside `{step === 1 && (...)}`:

```tsx
<div className="prototype-style-choice">
  <span className="meta">어떤 코스를 선호하나요?</span>
  ...
</div>
```

Step 1 should contain only:

```text
linked policy 안내
primary region grid
travel-area candidates/status
```

- [x] **Step 2: Add Step 2 panel for course preference**

Insert a new `{step === 2 && (...)}` block before the date step:

```tsx
{step === 2 && (
  <section className="prototype-create-step-panel">
    <div className="prototype-create-step-copy">
      <span className="eyebrow">코스 취향</span>
      <h2>어떤 코스를 선호하나요?</h2>
      <p>{selectedRegion} 일정에 맞춰 코스 분위기를 먼저 정할게요.</p>
    </div>

    <div className="prototype-style-choice">
      {["맛집", "휴식", "체험", "자연", "역사"].map((style) => (
        <button
          className={profile.style === style ? "active" : ""}
          key={style}
          onClick={() => updateProfile("style", style)}
          type="button"
        >
          {style}
        </button>
      ))}
    </div>
  </section>
)}
```

Use the existing style option list if the file already defines one. Do not introduce a second duplicated source if an array already exists in the component.

- [x] **Step 3: Move the old date panel from Step 2 to Step 3**

Change:

```tsx
{step === 2 && (
  <section className="prototype-create-step-panel">
    ...
  </section>
)}
```

To:

```tsx
{step === 3 && (
  <section className="prototype-create-step-panel">
    ...
  </section>
)}
```

This is the current date/period screen.

- [x] **Step 4: Move the old review/title panel from Step 3 to Step 4**

Change:

```tsx
{step === 3 && (
  <section className="prototype-create-step-panel">
    ...
  </section>
)}
```

To:

```tsx
{step === 4 && (
  <section className="prototype-create-step-panel">
    ...
  </section>
)}
```

This is the current title/review/create screen.

- [x] **Step 5: Update `canProceed`**

Use:

```ts
const canProceed =
  step === 1
    ? Boolean(selectedRegion) && (!requiresTravelAreaSelection || Boolean(selectedTravelArea))
    : step === 2
      ? Boolean(profile.style)
      : step === 3
        ? Boolean(startDate && endDate)
        : titleDraft.trim().length > 0 || generatedTripTitle(selectedRegion, dayCount).trim().length > 0;
```

If `profile.style` is always prefilled, Step 2 remains passable by default while still exposing the choice at the correct point in the flow.

---

### Task 5: Keep direct travelAreaId and legacy region behavior intact

**Files:**

- Modify: `frontend/src/pages/itinerary/ItineraryCreatePage.tsx`
- Modify: `frontend/src/App.test.tsx`

- [x] **Step 1: Preserve direct travelAreaId entry**

Confirm this behavior remains unchanged:

```text
/trips/new?travelAreaId=gangwon-sokcho-goseong-yangyang
-> API query by travelAreaId
-> matching travel area selected
-> Step 1 can proceed
-> Step 2 asks course preference
-> Step 3 asks dates
-> Step 4 creates trip with travelAreaId
```

- [x] **Step 2: Preserve legacy broad region entry**

Confirm this behavior remains unchanged:

```text
/trips/new?region=강원
-> API query by sido=강원
-> shows 강원 travel-area choices
-> user picks one
-> Step 2 asks course preference
```

- [x] **Step 3: Update existing travel tests for 4 steps**

Where existing tests currently do this:

```tsx
await user.click(screen.getByRole("button", { name: "다음" }));
await user.click(screen.getByRole("button", { name: "다음" }));
await user.click(screen.getByRole("button", { name: "일정 만들기" }));
```

Change to:

```tsx
await user.click(screen.getByRole("button", { name: "다음" }));
await user.click(screen.getByRole("button", { name: "다음" }));
await user.click(screen.getByRole("button", { name: "다음" }));
await user.click(screen.getByRole("button", { name: "일정 만들기" }));
```

Only apply this to `/trips/new` tests that go through the full create flow. Do not blindly replace unrelated tests.

---

### Task 6: Validate and record

**Files:**

- Modify: `CHECKLIST.md`

- [ ] **Step 1: Run frontend typecheck**

Run:

```powershell
cd frontend
npm run typecheck
```

Expected:

```text
tsc --noEmit
```

Exit code must be `0`.

- [ ] **Step 2: Run focused App tests**

Run:

```powershell
cd frontend
npm test -- --run src/App.test.tsx -t travel
```

Expected:

```text
Test Files 1 passed
```

- [ ] **Step 3: Run broader create-flow tests if the focused pattern misses the new tests**

Run:

```powershell
cd frontend
npm test -- --run src/App.test.tsx -t "일정|course|first"
```

Expected:

```text
Test Files 1 passed
```

- [ ] **Step 4: Docker rebuild if requested after implementation**

Run only when the user asks for rebuild:

```powershell
docker compose -f compose.yaml up -d --build
```

Expected:

```text
frontend Built
backend Healthy
frontend Started
```

- [ ] **Step 5: Record results**

Append to `CHECKLIST.md`:

```md
## 2026-05-26 - /trips/new primary region first and course preference later

- Frontend typecheck: PASS/FAIL.
- Focused App tests: PASS/FAIL.
- Docker rebuild: PASS/FAIL or not requested.
- Remaining risk: browser smoke for `/trips/new`, `/trips/new?region=강원`, `/trips/new?travelAreaId=gangwon-sokcho-goseong-yangyang`.
```

---

## Self-Review

- Spec coverage: Covers the two product decisions: first screen should show broad regions, and course preference should move after travel-area selection.
- API scope: No backend, route, DTO, DB, or travel-area API change is required.
- Type consistency: UI still uses `travelAreaId` as the creation primary value and exact `sido` strings for travel-area API lookup.
- Risk: Existing tests that assume a 3-step create flow must be updated carefully because the full create path now requires one additional `다음` click.

## Implementation Status - 2026-05-26

- Status: IN PROGRESS.
- Completed in code: primary-region first screen, course preference moved to step 2, Wizard expanded to 4 steps, related App tests updated.
- Not yet run: frontend typecheck, focused App tests, browser smoke, Docker rebuild.
- Next verification commands: `cd frontend; npm run typecheck` and `cd frontend; npm test -- --run src/App.test.tsx -t travel`.
## Implementation Status - 2026-05-26 Follow-up

- Status: READY FOR VALIDATION.
- Additional adjustment: normalized duplicate `다음` click insertions in create-flow tests to match the 4-step Wizard.
- Required verification remains: frontend typecheck, focused App tests, and browser smoke before completion can be claimed.
## Implementation Status - 2026-05-26 TravelAreaId Convergence Update

- Status: READY FOR VALIDATION.
- Additional implementation: every first-step primary region now enters the travel-area path instead of allowing direct region-only creation.
- Additional implementation: if a selected primary region returns exactly one travel-area candidate, it is auto-selected and synced to the URL.
- Test expectation updated: switching from direct `travelAreaId` to `부산` now creates with `travelAreaId: "busan-all"` rather than `undefined`.
## Implementation Status - 2026-05-26 Direct TravelAreaId Guard

- Status: READY FOR VALIDATION.
- Additional implementation: prevented duplicate direct `travelAreaId` queries after a direct URL candidate has already been resolved and selected.
- UI preservation: the selected travel-area candidate list is kept visible while suppressing the duplicate query.
## Implementation Status - 2026-05-26 Default Entry Convergence

- Status: READY FOR VALIDATION.
- Additional implementation: default `/trips/new` entry now derives `travelAreaChoiceSido` from the initial region when that region is a primary first-step region.
- This prevents profile-default regions such as `부산` from bypassing travel-area selection.
## Implementation Status - 2026-05-26 Default Entry Test

- Status: READY FOR VALIDATION.
- Additional test: default `/trips/new` entry now has regression coverage for resolving the profile default `부산` region into the auto-selected `부산 전체` travel area.
## Implementation Status - 2026-05-26 Legacy City Query Convergence

- Status: READY FOR VALIDATION.
- Additional implementation: legacy city-style `region` query values now populate `travelAreaChoiceQuery` and search travel-area recommendations by query.
- Additional test: `/trips/new?region=경주` now verifies search-based travel-area resolution.
## Implementation Status - 2026-05-26 Restored TravelArea Cleanup

- Status: READY FOR VALIDATION.
- Additional implementation: restored travel-area draft state now clears legacy search query state so the restored concrete travel area remains the only active selection source.
## Implementation Status - 2026-05-26 Selected TravelArea Requery Suppression

- Status: READY FOR VALIDATION.
- Additional implementation: suppresses duplicate travel-area recommendation queries after a concrete `selectedTravelArea` has been established.
## Implementation Status - 2026-05-26 Restored List Hydration

- Status: READY FOR VALIDATION.
- Additional implementation: restored travel-area state now hydrates the recommendation list unless the current list already contains the selected travel area.
- Safety adjustment: recommendation-list state is not part of the effect dependency list to avoid no-query render loops.
## Implementation Status - 2026-05-26 Stale Restored TravelArea Recovery

- Status: READY FOR VALIDATION.
- Additional implementation: stale restored travel-area state is now recovered by auto-selecting a single current candidate or clearing the stale selection when multiple candidates exist.
## Implementation Status - 2026-05-26 Sokcho Legacy Query

- Status: READY FOR VALIDATION.
- Additional implementation: `region=속초` is accepted as a legacy search query and resolves through travel-area recommendations.
- Additional test: `/trips/new?region=속초` verifies search-based resolution to `속초·고성·양양`.
## Implementation Status - 2026-05-26 Gangneung Legacy Query Test

- Status: READY FOR VALIDATION.
- Additional test: `/trips/new?region=강릉` verifies search-based travel-area resolution to `강릉·동해·삼척`.
## Implementation Status - 2026-05-26 Legacy Query Allowlist Cleanup

- Status: READY FOR VALIDATION.
- Additional implementation: `/trips/new` no longer imports the old mixed `tripCreateRegions` for query validation; it uses primary first-step region values plus explicit legacy city query values.
## Implementation Status - 2026-05-26 Primary Region Description Styling

- Status: READY FOR VALIDATION.
- Additional implementation: primary-region card descriptions now have explicit CSS styling for compact readable rendering.