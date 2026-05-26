# AI Trip Travel Area Wizard Implementation Plan

## Status Update - 2026-05-26

- 상태: v1 구현 완료
- 완료 범위: backend travel-area catalog/service/API, trip `travelAreaId` 저장, frontend `AppDataApi` boundary, `/trips/new` travel-area Wizard, API contract, tests, Docker rebuild
- 추가 완료 작업: `/trips/new` URL/state/draft continuity 보강
- 검증: backend targeted pytest, frontend typecheck, App 테스트, Docker rebuild/up 완료 기록은 `CHECKLIST.md`에 남김
- 남은 리스크: 전국 travel-area catalog 품질 확장과 브라우저 UI smoke는 후속 작업으로 계속 관리

---

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the travel-area based AI itinerary creation flow so broad regions resolve into stable travel areas, trips persist `travel_area_id`, and legacy `/trips/new?region=...` links remain usable.

**Architecture:** Keep the existing policy-backed `/api/recommendations/regions` endpoint unchanged. Add a backend-owned travel-area catalog in `backend/app/data/travel_areas.py`, expose it through `GET /api/recommendations/travel-areas`, and route trip creation through `travelAreaId` when present. The frontend consumes travel-area data through `AppDataApi`, uses `travelAreaId` as the primary Wizard selection value, and preserves legacy `region` query behavior as a compatibility path.

**Tech Stack:** FastAPI, Pydantic, SQLAlchemy, Alembic, PostgreSQL, React, TypeScript, Vite, Vitest, React Testing Library.

---

## File Structure

- Create `backend/app/data/travel_areas.py`: immutable v1 catalog, `TravelArea` dataclass, lookup helpers.
- Create `backend/app/services/travel_areas.py`: search, sido filter, nationwide ranking, policy count scoring, response mapping.
- Create `backend/tests/test_travel_areas.py`: unit tests for catalog lookup, search, duplicate names, scoring, fallback.
- Modify `backend/app/schemas/recommendations.py`: add `TravelAreaRecommendation` and `TravelAreaRecommendationResponse`.
- Modify `backend/app/api/routes/recommendations.py`: add `GET /api/recommendations/travel-areas`.
- Create `backend/tests/test_travel_area_recommendation_routes.py`: route-level tests.
- Create `backend/alembic/versions/0013_add_trip_travel_area_id.py`: add nullable `trips.travel_area_id`.
- Modify `backend/app/models/tables.py`, `backend/app/repositories/trips.py`, `backend/app/schemas/trip.py`, `backend/app/services/trips.py`: persist and use `travelAreaId`.
- Modify `backend/app/data/itinerary_catalog.py` and `backend/app/services/itinerary_recommendations.py`: ensure selected travel-area display names generate places.
- Modify `frontend/src/api/types.ts`, `frontend/src/api/dataApi.ts`, `frontend/src/api/backendApi.ts`: add frontend API boundary.
- Modify `frontend/src/pages/itinerary/ItineraryCreatePage.tsx`: load/select/submit travel areas.
- Modify `frontend/src/App.test.tsx`: add frontend regression coverage.
- Modify `docs/mvp-api-contract.md` and `CHECKLIST.md`: document contract and validation.

---

### Task 1: Backend TravelArea catalog and service

**Files:**
- Create: `backend/app/data/travel_areas.py`
- Create: `backend/app/services/travel_areas.py`
- Create: `backend/tests/test_travel_areas.py`

- [x] **Step 1: Write failing catalog/search/scoring tests**

Create `backend/tests/test_travel_areas.py` with these test cases:

```python
def test_catalog_contains_representative_nationwide_areas() -> None:
    areas = list_travel_areas()
    ids = {area.id for area in areas}
    assert "jeju-all" in ids
    assert "busan-all" in ids
    assert "gangwon-sokcho-goseong-yangyang" in ids
    assert "jeonnam-yeosu-suncheon" in ids
    assert "gyeongnam-tongyeong-geoje-goseong" in ids
    assert "chungbuk-danyang-jecheon" in ids
    assert len(areas) >= 30

def test_get_travel_area_resolves_id_and_display_fields() -> None:
    area = get_travel_area("gangwon-sokcho-goseong-yangyang")
    assert area is not None
    assert area.name == "속초·고성·양양"
    assert area.sido == "강원"
    assert "고성" in area.included_cities
    assert "설악산" in area.aliases

def test_sido_filter_returns_only_that_sido(db) -> None:
    result = recommend_travel_areas(db, sido="전남", today=date(2026, 5, 26))
    assert result.mode == "sido"
    assert result.sido == "전남"
    assert result.emptyReason is None
    assert result.items
    assert all(item.sido == "전남" for item in result.items)

def test_unsupported_sido_returns_empty_reason(db) -> None:
    result = recommend_travel_areas(db, sido="없는지역", today=date(2026, 5, 26))
    assert result.items == []
    assert result.emptyReason == "unsupported_sido"

def test_search_sokcho_returns_gangwon_area(db) -> None:
    result = recommend_travel_areas(db, query="속초", today=date(2026, 5, 26))
    assert result.mode == "search"
    assert result.items[0].travelAreaId == "gangwon-sokcho-goseong-yangyang"

def test_search_duplicate_goseong_returns_distinct_sidos(db) -> None:
    result = recommend_travel_areas(db, query="고성", today=date(2026, 5, 26))
    pairs = {(item.sido, item.travelAreaId) for item in result.items}
    assert ("강원", "gangwon-sokcho-goseong-yangyang") in pairs
    assert ("경남", "gyeongnam-tongyeong-geoje-goseong") in pairs

def test_nationwide_falls_back_to_catalog_priority_when_no_policy_data(db) -> None:
    result = recommend_travel_areas(db, mode="nationwide", limit=3, today=date(2026, 5, 26))
    assert [item.travelAreaId for item in result.items] == [
        "jeju-all",
        "busan-all",
        "gangwon-sokcho-goseong-yangyang",
    ]
```

Add policy scoring tests using `ExternalBenefitSource` fixtures:

```python
def test_city_policy_boosts_matching_travel_area(db) -> None:
    upsert_external_source_records(db, [
        make_source("sokcho-city", region="강원", city="속초", title="속초 숙박 할인", amount=50000),
        make_source("gangwon-wide", region="강원", city=None, title="강원 전체 관광 할인", amount=30000),
    ])
    result = recommend_travel_areas(db, sido="강원", style="바다", today=date(2026, 5, 26))
    assert result.items[0].travelAreaId == "gangwon-sokcho-goseong-yangyang"
    assert result.items[0].localPolicyCount >= 2
    assert result.items[0].estimatedValueKrw == 80000
```

- [x] **Step 2: Run tests to verify failure**

Run:

```bash
cd backend
python -m pytest tests/test_travel_areas.py -q
```

Expected: FAIL because `app.data.travel_areas` and `app.services.travel_areas` do not exist.

- [x] **Step 3: Implement catalog**

Create `backend/app/data/travel_areas.py` with:

```python
from __future__ import annotations

from dataclasses import dataclass

@dataclass(frozen=True)
class TravelArea:
    id: str
    name: str
    sido: str
    included_cities: tuple[str, ...]
    aliases: tuple[str, ...]
    tags: tuple[str, ...]
    styles: tuple[str, ...]
    summary: str
    priority: int

TRAVEL_AREAS: tuple[TravelArea, ...] = (
    TravelArea("jeju-all", "제주 전체", "제주", ("제주", "서귀포"), ("제주시", "서귀포시", "한라산", "성산", "중문"), ("섬", "바다", "자연", "2박3일"), ("섬", "바다", "힐링", "사진"), "제주 전역을 넓게 둘러보는 대표 여행권역", 100),
    TravelArea("busan-all", "부산 전체", "부산", ("부산",), ("해운대", "광안리", "감천문화마을", "영도", "서면"), ("바다", "도시", "맛집"), ("바다", "도시", "맛집", "사진"), "바다와 도시 여행을 함께 즐기는 부산 대표 권역", 96),
    TravelArea("gangwon-sokcho-goseong-yangyang", "속초·고성·양양", "강원", ("속초", "고성", "양양"), ("속초시", "고성군", "양양군", "설악산", "낙산", "속초해변"), ("바다", "산", "카페", "2박3일"), ("바다", "산", "힐링", "사진", "맛집"), "바다와 설악산, 감성 카페를 함께 즐기는 동해 북부 권역", 95),
    TravelArea("jeonnam-yeosu-suncheon", "여수·순천", "전남", ("여수", "순천"), ("오동도", "순천만", "여수밤바다", "낭만포차"), ("바다", "정원", "야경"), ("바다", "맛집", "사진", "힐링"), "바다 야경과 순천만 정원을 함께 즐기는 전남 대표 권역", 93),
    TravelArea("gyeongnam-tongyeong-geoje-goseong", "통영·거제·고성", "경남", ("통영", "거제", "고성"), ("동피랑", "외도", "바람의언덕", "상족암"), ("바다", "섬", "드라이브"), ("바다", "섬", "사진", "맛집"), "섬과 바다 드라이브를 즐기는 남해안 권역", 92),
)

def list_travel_areas() -> tuple[TravelArea, ...]:
    return TRAVEL_AREAS

def get_travel_area(area_id: str | None) -> TravelArea | None:
    if not area_id:
        return None
    normalized = area_id.strip()
    for area in TRAVEL_AREAS:
        if area.id == normalized:
            return area
    return None
```

Then expand `TRAVEL_AREAS` to include every v1 row from `docs/superpowers/specs/2026-05-26-ai-trip-region-selection-wizard-design.md`: 제주 동부, 제주 서부, 서귀포, 서울 전체, 강릉·동해·삼척, 춘천·홍천, 평창·정선, 목포·신안, 담양·곡성, 남해·하동, 진주·사천, 경주, 안동, 포항·영덕, 전주·완주, 군산, 남원, 공주·부여, 태안·서산, 보령, 단양·제천, 청주, 가평·양평, 수원·화성, 파주, 인천·강화.

- [x] **Step 4: Implement service**

Create `backend/app/services/travel_areas.py` with:

```python
def recommend_travel_areas(db: Session, *, sido: str | None = None, query: str | None = None, mode: str | None = None, style: str | None = None, limit: int = 6, today: date | None = None) -> TravelAreaRecommendationResponse:
    selected_mode = "search" if _normalize(query) else "sido" if _normalize(sido) else "nationwide"
    areas = list(list_travel_areas())
    if selected_mode == "sido":
        areas = [area for area in areas if area.sido == _normalize(sido)]
        if not areas:
            return TravelAreaRecommendationResponse(mode="sido", sido=_normalize(sido), query=None, items=[], emptyReason="unsupported_sido")
    if selected_mode == "search":
        if _normalize(sido):
            areas = [area for area in areas if area.sido == _normalize(sido)]
        areas = [area for area in areas if _matches_query(area, _normalize(query) or "")]
        if not areas:
            return TravelAreaRecommendationResponse(mode="search", sido=_normalize(sido), query=_normalize(query), items=[], emptyReason="no_match")
    records = external_source_repository.list_regional_benefit_recommendation_records(db)
    ranked = sorted((_to_recommendation(area, _stats_for_area(area, records, style=style, today=today or date.today())) for area in areas), key=lambda item: (item.score, item.localPolicyCount, item.estimatedValueKrw, item.travelAreaName), reverse=True)
    return TravelAreaRecommendationResponse(mode=selected_mode, sido=_normalize(sido), query=_normalize(query), items=ranked[: max(1, min(limit, 20))], emptyReason=None)
```

Implement helper functions `_normalize`, `_matches_query`, `_stats_for_area`, `_score`, `_reason`, and `_to_recommendation` exactly according to the spec scoring order: city match, sido match, ending soon, amount, style, nationwide, catalog priority.

- [x] **Step 5: Run tests**

```bash
cd backend
python -m pytest tests/test_travel_areas.py -q
```

Expected: PASS after Task 2 schemas exist.

---

### Task 2: Backend travel-area API schema and route

**Files:**
- Modify: `backend/app/schemas/recommendations.py`
- Modify: `backend/app/api/routes/recommendations.py`
- Create: `backend/tests/test_travel_area_recommendation_routes.py`

- [x] **Step 1: Write failing route tests**

Create `backend/tests/test_travel_area_recommendation_routes.py`:

```python
def test_travel_area_route_passes_query_options(monkeypatch) -> None:
    captured = {}
    def fake_recommend_travel_areas(db, *, sido=None, query=None, mode=None, style=None, limit=6):
        captured.update({"sido": sido, "query": query, "mode": mode, "style": style, "limit": limit})
        return TravelAreaRecommendationResponse(mode="search", sido=sido, query=query, emptyReason=None, items=[])
    monkeypatch.setattr(recommendation_routes.travel_area_service, "recommend_travel_areas", fake_recommend_travel_areas)
    with TestClient(app) as client:
        response = client.get("/api/recommendations/travel-areas?sido=강원&query=속초&mode=nationwide&style=바다&limit=2")
    assert response.status_code == 200
    assert captured == {"sido": "강원", "query": "속초", "mode": "nationwide", "style": "바다", "limit": 2}

def test_travel_area_route_rejects_invalid_limit() -> None:
    with TestClient(app) as client:
        response = client.get("/api/recommendations/travel-areas?limit=0")
    assert response.status_code == 422
```

- [x] **Step 2: Add schemas**

Append to `backend/app/schemas/recommendations.py`:

```python
from typing import Literal

class TravelAreaRecommendation(BaseModel):
    travelAreaId: str
    travelAreaName: str
    sido: str
    includedCities: list[str]
    summary: str
    tags: list[str]
    reason: str
    policyCount: int = Field(ge=0)
    localPolicyCount: int = Field(ge=0)
    nationwidePolicyCount: int = Field(ge=0)
    endingSoonCount: int = Field(ge=0)
    estimatedValueKrw: int = Field(ge=0)
    score: int = Field(ge=0, le=100)

class TravelAreaRecommendationResponse(BaseModel):
    mode: Literal["sido", "search", "nationwide"]
    sido: str | None = None
    query: str | None = None
    items: list[TravelAreaRecommendation]
    emptyReason: Literal["unsupported_sido", "no_match"] | None = None
```

- [x] **Step 3: Add route**

Modify `backend/app/api/routes/recommendations.py`:

```python
from app.schemas.recommendations import RegionRecommendation, TravelAreaRecommendationResponse
from app.services import travel_areas as travel_area_service

@router.get("/recommendations/travel-areas", response_model=TravelAreaRecommendationResponse)
def list_travel_area_recommendations(
    sido: str | None = None,
    query: str | None = None,
    mode: str | None = None,
    style: str | None = None,
    limit: int = Query(default=6, ge=1, le=20),
    db: Session | None = Depends(get_optional_db),
) -> TravelAreaRecommendationResponse:
    if db is None:
        raise HTTPException(status_code=500, detail="DB session is required.")
    return travel_area_service.recommend_travel_areas(db, sido=sido, query=query, mode=mode, style=style, limit=limit)
```

- [x] **Step 4: Run backend API tests**

```bash
cd backend
python -m pytest tests/test_travel_areas.py tests/test_travel_area_recommendation_routes.py -q
```

Expected: PASS.

---

### Task 3: Persist `travel_area_id` on trips

**Files:**
- Create: `backend/alembic/versions/0013_add_trip_travel_area_id.py`
- Modify: `backend/app/models/tables.py`
- Modify: `backend/app/repositories/trips.py`
- Modify: `backend/app/schemas/trip.py`
- Modify: `backend/app/services/trips.py`
- Modify: `backend/tests/test_trip_db_service.py`

- [x] **Step 1: Add failing trip tests**

Add:

```python
def test_create_trip_with_travel_area_id_stores_resolved_area(sqlite_db_session, seed_user) -> None:
    created = trip_service.create_trip(sqlite_db_session, seed_user, CreateTripRequest(travelAreaId="gangwon-sokcho-goseong-yangyang", style="바다", durationDays=2))
    assert created["travelAreaId"] == "gangwon-sokcho-goseong-yangyang"
    assert "속초·고성·양양" in created["title"]

def test_create_trip_with_unknown_travel_area_id_returns_400(sqlite_db_session, seed_user) -> None:
    with pytest.raises(trip_service.TripServiceError) as error:
        trip_service.create_trip(sqlite_db_session, seed_user, CreateTripRequest(travelAreaId="missing-area"))
    assert error.value.status_code == 400
    assert error.value.detail == "Travel area not found"

def test_create_trip_region_only_remains_legacy_compatible(sqlite_db_session, seed_user) -> None:
    created = trip_service.create_trip(sqlite_db_session, seed_user, CreateTripRequest(region="강원", durationDays=2))
    assert created["travelAreaId"] is None
    assert "강원" in created["title"]
```

- [x] **Step 2: Add migration**

Create `backend/alembic/versions/0013_add_trip_travel_area_id.py`:

```python
from alembic import op
import sqlalchemy as sa

revision = "0013_add_trip_travel_area_id"
down_revision = "0012_policy_source_tracking"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column("trips", sa.Column("travel_area_id", sa.String(length=120), nullable=True))
    op.create_index("ix_trips_travel_area_id", "trips", ["travel_area_id"])

def downgrade() -> None:
    op.drop_index("ix_trips_travel_area_id", table_name="trips")
    op.drop_column("trips", "travel_area_id")
```

- [x] **Step 3: Update model/repository/schema/service**

Make these exact field changes:

```python
# backend/app/models/tables.py Trip
travel_area_id: Mapped[str | None] = mapped_column(String(120), index=True)

# backend/app/schemas/trip.py CreateTripRequest
travelAreaId: str | None = Field(default=None, max_length=120)

# backend/app/schemas/trip.py Trip
travelAreaId: str | None = None
```

In `backend/app/repositories/trips.py`, add `travel_area_id` to `create_trip()` and `Trip(...)`.

In `backend/app/services/trips.py`, resolve:

```python
travel_area_id = str(payload.get("travelAreaId") or "").strip() or None
travel_area = get_travel_area(travel_area_id)
if travel_area_id and travel_area is None:
    raise TripServiceError(400, "Travel area not found")
region = travel_area.name if travel_area else str(payload.get("region") or seed.PROFILE["region"])
```

Pass `travel_area.id if travel_area else None` to repository and add `"travelAreaId": trip.travel_area_id` to `trip_to_api()`.

- [x] **Step 4: Validate**

```bash
cd backend
python -m pytest tests/test_trip_db_service.py -q
alembic upgrade head --sql
```

Expected: tests PASS and SQL includes `travel_area_id`.

---

### Task 4: Frontend API boundary and `/trips/new` Wizard

**Files:**
- Modify: `frontend/src/api/types.ts`
- Modify: `frontend/src/api/dataApi.ts`
- Modify: `frontend/src/api/backendApi.ts`
- Modify: `frontend/src/pages/itinerary/ItineraryCreatePage.tsx`
- Modify: `frontend/src/App.test.tsx`

- [x] **Step 1: Add failing frontend tests**

Add tests that verify:

```tsx
renderRoute("/trips/new?travelAreaId=gangwon-sokcho-goseong-yangyang");
expect(await screen.findByText("속초·고성·양양")).toBeInTheDocument();

renderRoute("/trips/new?region=%EA%B0%95%EC%9B%90");
expect(await screen.findByText("강원에서 어떤 여행권역이 좋을까요?")).toBeInTheDocument();

await userEvent.click(screen.getByRole("button", { name: /일정 만들기/ }));
expect(createTripSpy).toHaveBeenCalledWith(expect.objectContaining({
  travelAreaId: "gangwon-sokcho-goseong-yangyang",
  region: "속초·고성·양양",
}));
```

- [x] **Step 2: Add frontend types/API**

Add `TravelAreaRecommendation`, `TravelAreaRecommendationResponse`, `TravelAreaRecommendationOptions`, `CreateTripRequest.travelAreaId`, and `AppDataApi.listTravelAreaRecommendations()`.

Implement backend client:

```ts
listTravelAreaRecommendations: (options?: TravelAreaRecommendationOptions): Promise<TravelAreaRecommendationResponse> => {
  const params = new URLSearchParams();
  if (options?.sido) params.set("sido", options.sido);
  if (options?.query) params.set("query", options.query);
  if (options?.mode) params.set("mode", options.mode);
  if (options?.style) params.set("style", options.style);
  if (options?.limit !== undefined) params.set("limit", String(options.limit));
  const query = params.toString();
  return apiClient.get<TravelAreaRecommendationResponse>(`/api/recommendations/travel-areas${query ? `?${query}` : ""}`);
}
```

- [x] **Step 3: Update `/trips/new` state and payload**

In `ItineraryCreatePage.tsx`, add `requestedTravelAreaId`, `selectedTravelAreaId`, travel-area API loading, travel-area cards, draft fields `travelAreaId`, `travelAreaName`, `sido`, `includedCities`, and submit:

```ts
const trip = await appDataApi.createTrip({
  title,
  region: selectedRegion,
  travelAreaId: selectedTravelAreaId ?? undefined,
  style: profile.style,
  ...(linkablePolicySlug ? { policySlug: linkablePolicySlug } : {}),
  startDate,
  endDate,
});
```

Legacy rule:

```text
travelAreaId query present -> preselect matching travel area.
region query only and region is broad -> show travel-area choices for that sido.
region query only and region is direct legacy -> keep existing behavior.
```

- [x] **Step 4: Validate frontend**

```bash
cd frontend
npm run typecheck
npm test -- --run src/App.test.tsx
```

Expected: PASS.

---

### Task 5: Contract, Docker build, and browser smoke

**Files:**
- Modify: `docs/mvp-api-contract.md`
- Modify: `CHECKLIST.md`

- [x] **Step 1: Update API contract**

Document:

```text
GET /api/recommendations/travel-areas
POST /api/trips request.travelAreaId
Trip response.travelAreaId
```

- [x] **Step 2: Run full targeted validation**

```bash
cd backend
python -m pytest tests/test_travel_areas.py tests/test_travel_area_recommendation_routes.py tests/test_itinerary_recommendations.py tests/test_trip_db_service.py -q
alembic upgrade head --sql

cd ../frontend
npm run typecheck
npm test -- --run src/App.test.tsx

cd ..
docker compose -f compose.yaml up -d --build
```

Expected: all commands pass.

- [x] **Step 3: Browser smoke**

Verify:

```text
/home
/trips/new?region=%EA%B0%95%EC%9B%90
/trips/new?travelAreaId=gangwon-sokcho-goseong-yangyang
/trips
```

Expected:

```text
/home remains unchanged.
/trips/new?region=강원 shows 강원 travel-area choices.
/trips/new?travelAreaId=gangwon-sokcho-goseong-yangyang preselects 속초·고성·양양.
Created trip persists travelAreaId and uses travel-area display name.
```

- [x] **Step 4: Record CHECKLIST**

Append validation command outputs, browser findings, and remaining catalog coverage risks.

---

## Self-Review

- Spec coverage: Covers existing region API preservation, new travel-area API, backend source of truth, DB persistence, frontend API boundary, `/trips/new` Wizard behavior, legacy region fallback, and validation.
- Placeholder scan: No task depends on vague future behavior; the only catalog expansion reference points to the already written spec table and names every omitted v1 row explicitly.
- Type consistency: Uses `travelAreaId` in API/TypeScript/Pydantic and `travel_area_id` in DB/model/repository.
- Residual risk: Frontend tests may require adapting to the existing API mock style in `App.test.tsx`; keep the `AppDataApi` boundary and do not introduce local seed/mock bypasses.
