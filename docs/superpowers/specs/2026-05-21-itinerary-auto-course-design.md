# Itinerary Auto Course Generation Design

## Summary

When a user creates a new trip from `/trips/new`, Travel Hunter will generate a day-by-day starter course and save it as real itinerary places. The first implementation is deterministic and catalog-backed, while the service boundary stays open for a later AI provider.

The feature must preserve the existing app data boundary and API shape. Frontend pages continue to call `AppDataApi`; backend route modules stay thin; recommendation behavior lives in services and data catalogs under backend-owned modules.

## Goals

- Generate a starter course during trip creation.
- Save generated places into `trip_days` and `trip_places` so the trip detail page shows an editable itinerary immediately.
- Save the same generated recommendation set into `recommendations.result` so `/ai-results?tripId=...` can explain the generated suggestions.
- Use a backend catalog keyed by region and place preference style.
- Avoid external AI/API calls in the first implementation.
- Keep the design compatible with a later AI recommendation provider.

## Non-Goals

- Do not add public trip slugs.
- Do not change trip route handles; trip routes continue to use numeric string trip ids.
- Do not regenerate or overwrite a user's edited itinerary after creation.
- Do not introduce an external AI, map, or place-search integration in the first implementation.
- Do not change the first API response shape for `Recommendation`; keep `{ label, title, meta, reason }`.

## User Flow

1. The user opens `/trips/new`.
2. The user selects a region, place preference style, date range, and title.
3. The frontend sends the existing create-trip payload through `AppDataApi`.
4. The backend creates the trip and trip days.
5. The backend generates up to three places per day at fixed times.
6. The backend stores the generated places in `trip_places`.
7. The backend stores the generated recommendation list in `recommendations.result`.
8. The frontend navigates to `/trips/{id}`, where the generated course is visible and editable.

## Catalog

Add a backend catalog under `backend/app/data`.

Supported regions:

- `제주`
- `부산`
- `강원`
- `전국`

Supported place preference styles:

- `휴식`
- `맛집`
- `체험`
- `자연`
- `사진`

Catalog target size:

- 25 places per region.
- 5 places per style within each region where possible.
- 100 total starter catalog entries.

Catalog entry shape:

```python
{
    "title": str,
    "style": "휴식" | "맛집" | "체험" | "자연" | "사진",
    "label": str,
    "meta": str,
    "reasonSeed": str,
}
```

## Recommendation Behavior

Selection rules:

- Compute the requested number of places as `trip_day_count * 3`.
- Prefer entries matching the selected `region` and `style`.
- If not enough entries exist, add entries from the same `region` with other styles.
- If there are still not enough entries, use only the available entries.
- If no entries exist, create the trip days but no trip places.
- Do not use a different region as a final fallback.

Placement rules:

- Each day gets up to three places.
- Fixed time slots are `10:00`, `14:00`, and `18:00`.
- Preserve catalog order within the selected candidate list.
- Do not duplicate a catalog entry in the same generated trip.

Generated mappings:

- `trip_places.place_name` receives `title`.
- `trip_places.visit_time` receives the fixed slot time.
- `trip_places.order_num` is `1`, `2`, or `3` per day.
- `trip_places.memo` receives `meta`.
- `recommendations.result[].label` receives `label`.
- `recommendations.result[].title` receives `title`.
- `recommendations.result[].meta` uses `Day N · HH:MM · {meta}`.
- `recommendations.result[].reason` is built from `reasonSeed`.

## Backend Design

Introduce a recommendation provider boundary in the trip service layer.

The first provider is catalog-backed and deterministic:

- Input: region, style, start date, end date or day count.
- Output: generated place candidates grouped by day and time slot.
- Failure behavior: return an empty result instead of raising for missing catalog data.

`create_trip()` changes:

- Keep existing trip creation, member creation, invite creation, and policy linking behavior.
- Replace `seed.TRIP["days"]` place copying with the catalog-backed generator.
- Add generated places to each `TripDay`.
- Add one `Recommendation` row containing the generated recommendation list.
- Commit once after all trip creation side effects are prepared.

The backend must keep DTO fields in camelCase and database fields in snake_case.

## Frontend Design

The frontend keeps the existing `AppDataApi` create-trip path.

Update place preference options so `travelStyles` include:

- `휴식`
- `맛집`
- `체험`
- `자연`
- `사진`

`/trips/new` continues sending `style` in the existing create-trip payload. The backend interprets this value as the place preference style. The trip detail page does not need a new data path because generated places are saved as normal `trip_places`.

## API And Contract

No new endpoint is required.

The existing `POST /api/trips` request remains compatible:

```json
{
  "title": "제주 3일 여행",
  "region": "제주",
  "style": "자연",
  "policySlug": "local-vacation",
  "startDate": "2026-07-12",
  "endDate": "2026-07-14"
}
```

The existing `Trip` response shape remains unchanged. The difference is that `days` will contain generated places when catalog candidates are available.

The existing `Recommendation` response shape remains unchanged:

```json
{
  "label": "NA",
  "title": "성산 일출봉",
  "meta": "Day 1 · 10:00 · 자연 · 제주 동부",
  "reason": "자연 취향과 제주 여행에 맞는 대표 코스입니다."
}
```

Contract documentation must update `profile-options.travelStyles` to `["휴식", "맛집", "체험", "자연", "사진"]`.

## Edge Cases

- If date range is invalid, keep existing validation behavior.
- If style is unknown, use same-region entries from any known style.
- If region is unknown, create trip days but no generated places.
- If only some candidates are available, fill days in order and leave the rest empty.
- If the user later edits, deletes, or moves generated places, do not regenerate automatically.
- If a policy is linked during creation, keep policy linking behavior but do not regenerate the course from policy data in v1.

## Tests

Backend unit/service tests:

- Creates a trip with generated places for a known region and style.
- Generates three places per day for available catalog data.
- Uses fixed time slots `10:00`, `14:00`, and `18:00`.
- Falls back to same-region other-style candidates when the requested style has too few entries.
- Creates a partial itinerary when catalog candidates are insufficient.
- Creates trip days with no places when no region candidates exist.
- Stores matching recommendation results for generated places.
- Does not reintroduce non-numeric trip route handles.

Frontend unit tests:

- `profile-options` includes `체험`.
- `/trips/new` can select or submit the place preference style.
- Existing create-trip payload still uses `style`.
- Existing route smoke behavior remains compatible with generated trip days.

Validation commands:

```bash
cd frontend
npm run typecheck
npm test

cd ../backend
python -m pytest
```

Run e2e and build if the frontend route behavior or visible flow changes beyond option text.

## Assumptions

- The first implementation is deterministic and does not call external APIs.
- The catalog is product-owned starter data, not an operational place database.
- Region consistency is more important than matching the exact requested style.
- A blank generated course is preferable to failing trip creation when catalog data is missing.
- `recommendations.result` remains a JSON list compatible with the existing mapper.
