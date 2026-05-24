# Trip Confirmation Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the frontend trip confirmation feature while keeping linked policy cards and owner/editor trip editing available.

**Architecture:** This is a frontend-only behavior removal. The backend `Trip.status` contract stays intact, but trip detail no longer uses it to render confirmation controls or lock owner/editor edits.

**Tech Stack:** React, TypeScript, Vite, Vitest, Testing Library, FastAPI-backed `AppDataApi`.

---

### Task 1: Update Trip Detail Tests

**Files:**
- Modify: `frontend/src/App.test.tsx`

- [ ] **Step 1: Replace confirmation-lock expectations**

Update tests that currently expect owner/editor `confirmed` trips to hide editing controls. The new expectation is that owner/editor can still edit, while viewer remains read-only.

Use assertions equivalent to:

```tsx
expect(screen.queryByRole("button", { name: "확정하기" })).not.toBeInTheDocument();
expect(screen.queryByRole("button", { name: "확정취소" })).not.toBeInTheDocument();
expect(screen.getByRole("button", { name: "장소 추가" })).toBeInTheDocument();
```

- [ ] **Step 2: Add linked policy removal coverage for confirmed owner/editor**

Add or adjust a test with a `Trip` object whose `status` is `"confirmed"`, `currentUserRole` is `"owner"`, and `linkedPolicies` contains one policy. Assert that the linked policy delete button appears and calls:

```tsx
expect(removePolicySpy).toHaveBeenCalledWith(trip.id, policy.slug);
```

- [ ] **Step 3: Run the focused tests and expect failure before implementation**

Run:

```bash
cd frontend
npm test -- --run src/App.test.tsx -t "confirmed trip"
```

Expected before implementation: at least one test fails because confirmed owner/editor trips are still locked.

### Task 2: Remove Detail Confirmation UI And Locking

**Files:**
- Modify: `frontend/src/pages/itinerary/ItineraryDetailPage.tsx`

- [ ] **Step 1: Remove status update state and handler**

Remove these detail-only values:

```tsx
const [isUpdatingTripStatus, setIsUpdatingTripStatus] = useState(false);
const [tripStatusError, setTripStatusError] = useState("");
const isTripConfirmed = trip?.status === "confirmed";
const updateTripConfirmationStatus = async (nextStatus: "draft" | "confirmed") => { ... };
```

- [ ] **Step 2: Make edit permission role-based**

Change:

```tsx
const canEditTrip = Boolean(canManageTripStatus && !isTripConfirmed);
```

to:

```tsx
const canEditTrip = Boolean(canManageTripStatus);
```

- [ ] **Step 3: Remove confirmation status panel markup**

Delete the `StatusPanel` block with `ariaLabel="일정 확정 상태"` and the `tripStatusError` paragraph.

- [ ] **Step 4: Update locked-copy messages**

Keep viewer-only read-only messaging. Remove owner/editor confirmed-lock messaging such as:

```tsx
"확정취소 후 장소와 연결 정책을 다시 편집할 수 있어요."
```

Policy removal should keep role-based denial copy:

```tsx
"이 일정은 보기 권한으로 참여 중이라 정책 연결을 삭제할 수 없어요."
```

- [ ] **Step 5: Run focused tests and typecheck**

Run:

```bash
cd frontend
npm test -- --run src/App.test.tsx -t "confirmed trip"
npm run typecheck
```

Expected: focused tests and typecheck pass.

### Task 3: Documentation And Full Verification

**Files:**
- Modify: `docs/current-work-spec.md`
- Modify: `docs/mvp-api-contract.md`
- Modify: `CHECKLIST.md`

- [ ] **Step 1: Update current behavior docs**

Replace detail confirmation-lock language with:

```markdown
일정 상세의 장소 편집과 연결 정책 삭제는 owner/editor 권한이면 가능하며, 별도의 일정 확정/확정취소 UI는 제공하지 않는다.
```

- [ ] **Step 2: Update API contract frontend behavior note**

Keep the `PATCH /trips/{trip_id}/status` endpoint documented as backend-compatible, but change frontend behavior to say the current frontend does not expose trip confirmation controls.

- [ ] **Step 3: Record validation**

Add a `CHECKLIST.md` entry with the commands that ran and any visual verification result.

- [ ] **Step 4: Run full frontend validation**

Run:

```bash
cd frontend
npm test -- --run src/App.test.tsx
npm run build
```

Expected: all selected frontend tests pass and production build succeeds.
