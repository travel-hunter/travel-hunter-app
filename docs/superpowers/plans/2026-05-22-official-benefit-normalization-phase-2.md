# Official Benefit Normalization Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote collected TravelMonth official benefits from `external_source_records` into normalized `policies` rows so every user-facing policy can be saved, attached to trips, and shown through one policy path.

**Architecture:** Keep `external_source_records` as the official source/raw evidence table. Add source-tracking columns to `policies`, upsert active/fresh collected benefits into `policies`, then remove raw external-record DTO merging from policy and trip recommendation services while preserving `travelmonth-{external_source_record.id}` slug compatibility.

**Tech Stack:** FastAPI, SQLAlchemy 2, Alembic, PostgreSQL, Pytest, React/Vite through `AppDataApi`.

---

### Task 1: Policy Source Tracking Migration

**Files:**
- Modify: `backend/tests/test_db_schema.py`
- Modify: `backend/app/models/tables.py`
- Create: `backend/alembic/versions/0012_policy_source_tracking.py`
- Later docs: `docs/db-schema-current.md`, `docs/db-schema-current.sql`

- [ ] **Step 1: Write failing schema metadata test**

Add assertions that `policies` has these columns:

```python
expected_policy_source_columns = {
    "source_type",
    "source_name",
    "source_category",
    "external_source_record_id",
    "source_url",
    "source_canonical_key",
    "normalized_at",
    "last_verified_at",
    "verification_status",
}
assert expected_policy_source_columns.issubset(set(policies.c.keys()))
```

Also assert that `external_source_record_id` has a FK to `external_source_records.id`.

- [ ] **Step 2: Verify RED**

Run:

```powershell
cd backend
python -m pytest tests/test_db_schema.py -q -p no:cacheprovider
```

Expected: fail because `policies.source_type` and related columns do not exist.

- [ ] **Step 3: Add SQLAlchemy model fields**

Add nullable source-tracking columns to `Policy`:

```python
source_type: Mapped[str | None] = mapped_column(String(50), index=True)
source_name: Mapped[str | None] = mapped_column(String(100), index=True)
source_category: Mapped[str | None] = mapped_column(String(80), index=True)
external_source_record_id: Mapped[int | None] = mapped_column(
    BigInteger, ForeignKey("external_source_records.id", ondelete="SET NULL"), unique=True, index=True
)
source_url: Mapped[str | None] = mapped_column(String(500))
source_canonical_key: Mapped[str | None] = mapped_column(String(160), index=True)
normalized_at: Mapped[datetime | None] = mapped_column(DateTime)
last_verified_at: Mapped[datetime | None] = mapped_column(DateTime)
verification_status: Mapped[str | None] = mapped_column(String(30))
```

- [ ] **Step 4: Add Alembic migration**

Create revision `0012_policy_source_tracking` after `0011_phone_verification_codes`. The migration adds the same columns, FK, and indexes:

```python
op.create_foreign_key(
    "fk_policies_external_source_record_id_external_source_records",
    "policies",
    "external_source_records",
    ["external_source_record_id"],
    ["id"],
    ondelete="SET NULL",
)
```

Use a unique index on `external_source_record_id` to prevent duplicate promotion.

- [ ] **Step 5: Verify GREEN**

Run:

```powershell
cd backend
python -m pytest tests/test_db_schema.py -q -p no:cacheprovider
alembic upgrade head --sql
```

Expected: schema metadata test passes and Alembic offline SQL renders.

### Task 2: Normalization Service

**Files:**
- Create: `backend/app/services/policy_normalization.py`
- Modify: `backend/app/repositories/policies.py`
- Modify: `backend/app/services/travelmonth_collection.py`
- Test: `backend/tests/test_policy_normalization.py`

- [ ] **Step 1: Write failing tests**

Tests must prove:

```python
def test_promotes_active_fresh_external_record_to_policy(db): ...
def test_promotion_is_idempotent_by_external_source_record_id(db): ...
def test_skips_inactive_or_stale_records(db): ...
```

Expected RED: `policy_normalization` module/function missing.

- [ ] **Step 2: Implement mapping**

Map `ExternalSourceRecord` to `Policy`:

- slug: `travelmonth-{record.id}`
- title: `record.title`
- organization: `record.organizer_text or record.source_name`
- policy_type: category derived from source URL/category
- description: `record.raw_detail_text or record.benefit_text`
- benefit_amount: `record.extracted_amount_krw`
- benefit_detail: `record.benefit_value_text or record.benefit_text`
- target_condition: `record.contact_text or "공식 혜택 안내에서 조건을 확인하세요."`
- region: `record.region or "전국"`
- dates and official URL from source record
- source tracking fields from source record

- [ ] **Step 3: Hook collection pipeline**

After `external_source_repository.upsert_external_source_records`, call the normalization service so local collection immediately creates usable policy rows.

### Task 3: Policy API Normalized Path

**Files:**
- Modify: `backend/app/services/policies.py`
- Modify: `backend/tests/test_policy_db_service.py`
- Modify: `backend/tests/test_policy_error_paths.py`
- Modify: `docs/mvp-api-contract.md`
- Modify: `.agent/evals/api-contract-golden.json`

- [ ] **Step 1: Write failing tests**

Tests must prove `/api/policies` returns normalized `policies` rows and does not append raw `external_source_records`.

- [ ] **Step 2: Preserve compatibility**

Keep `travelmonth-{id}` detail compatible by ensuring normalized policies use that slug. If a raw row exists without promotion during transition, detail may still use the existing fallback as a temporary shim.

- [ ] **Step 3: Update contract docs**

Change policy docs from “DB policies + raw external records” to “normalized official benefits from `policies`; raw source records are collection evidence.”

### Task 4: Trip Recommendation And Attachment

**Files:**
- Modify: `backend/app/services/trips.py`
- Modify: `backend/tests/test_trip_db_service.py`
- Modify: `backend/tests/test_trip_db_routes.py`

- [ ] **Step 1: Write failing tests**

Tests must prove:

```python
def test_trip_recommended_policies_use_normalized_policy_slugs(...): ...
def test_viewer_cannot_add_policy_to_trip(...): ...
```

- [ ] **Step 2: Remove raw external candidates**

Change `_list_recommended_policy_candidates` to use normalized `policies` only.

- [ ] **Step 3: Fix policy attachment permission**

Call `_require_trip_editor(trip, user)` in `add_policy_to_trip`.

### Task 5: Frontend Policy Action Unification

**Files:**
- Create: `frontend/src/utils/policyCapabilities.ts`
- Modify: `frontend/src/components/cards.tsx`
- Modify: `frontend/src/pages/PolicyPages.tsx`
- Modify: `frontend/src/pages/itinerary/ItineraryCreatePage.tsx`
- Test: `frontend/src/App.test.tsx`

- [ ] **Step 1: Write failing tests**

Tests must prove normalized official benefit policies can be saved and attached even when their slug starts with `travelmonth-`.

- [ ] **Step 2: Centralize capability logic**

Use a single frontend helper instead of scattered `sourceType` and `travelmonth-*` checks.

### Task 6: Verification And Smoke

**Files:**
- Modify: `CHECKLIST.md`
- Modify: `docs/current-work-spec.md`
- Modify: `docs/next-work-plan.md`

- [ ] **Step 1: Backend validation**

```powershell
cd backend
python -m pytest tests/test_db_schema.py tests/test_policy_normalization.py tests/test_policy_db_service.py tests/test_trip_db_service.py -q -p no:cacheprovider
python -m pytest -p no:cacheprovider --basetemp .pytest-tmp
alembic upgrade head --sql
```

- [ ] **Step 2: Frontend validation**

```powershell
cd frontend
npm run typecheck
npm test
```

- [ ] **Step 3: Local end-to-end smoke**

Run local backend/frontend, collect TravelMonth official benefits, verify `/api/policies`, `/policies`, `/trips/new`, `/trips/{id}`, and `/ai-results?tripId={id}` use normalized policies.
