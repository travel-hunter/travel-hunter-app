# External Benefit Source Expansion Design

## Context

Travel Hunter currently collects official external benefits from the TravelMonth regional benefit page and stores parsed evidence in `external_source_records`. Active and fresh records are then promoted to `policies`, which powers `/api/policies`, policy detail pages, saved policies, trip policy attachment, and recommendation flows.

The next practical expansion is to add two official benefit sources:

- TravelMonth traffic benefits: `https://korean.visitkorea.or.kr/travelmonth/benefits/traffic.do`
- Korea Tourism Organization half-price local trip benefits: `https://korean.visitkorea.or.kr/dgtourcard/tour50.do`

The goal is to integrate these sources into the same external evidence and policy promotion path without reintroducing static seed-driven runtime behavior.

## Scope

In scope:

- Parse `traffic.do` into traffic benefit source records.
- Parse `dgtourcard/tour50.do` into local half-trip source records.
- Store both source types in `external_source_records`.
- Promote active and fresh records into `policies`.
- Expose promoted records through existing policy list/detail APIs.
- Keep frontend behavior through existing `officialUrl` and `applyUrl` fields.
- Extend backend tests and API/docs where behavior changes.

Out of scope for this phase:

- Naver `travel.naver.co.kr/koreatravel` integration.
- New frontend screens.
- New DB tables.
- Direct user-specific eligibility calculation.
- Full multi-source operations dashboard redesign.

## Source Categories

Add source categories while keeping existing `regional_benefit` behavior:

- `regional_benefit`: existing TravelMonth regional benefit collector.
- `traffic_benefit`: TravelMonth traffic benefits. These are mostly nationwide transport benefits and should map to policy category `교통`.
- `local_half_trip`: KTO half-price local trip benefits. These are region/city-specific and should map to policy category `지역할인`.

The current `travelmonth-{externalSourceRecordId}` slug prefix remains for compatibility. It should be documented as a legacy external policy slug prefix rather than a source-specific name.

## Architecture

Use the existing flow:

```text
source page fetch
-> source-specific parser
-> external benefit source DTO
-> external_source_records upsert
-> active/fresh promotion to policies
-> /api/policies and /api/policies/{policySlug}
-> frontend policy CTA
```

Implementation units:

- `app.schemas.external_sources`
  - Generalize the accepted source category literals.
  - Keep existing `TravelMonthRegionalBenefitSource` compatibility.
  - Add source DTOs or a shared source model for `traffic_benefit` and `local_half_trip`.
- `app.services.travelmonth_traffic_parser`
  - Parse traffic benefit headings, benefit text, periods, links, contacts, and raw text.
- `app.services.dgtourcard_parser`
  - Move reusable parsing behavior out of the static seed crawler path.
  - Parse region/city, application status, application period, trip period, contact text, homepage links, and raw details.
- `app.services.travelmonth_live_collector` or a new multi-source collection service
  - Fetch and collect regional, traffic, and dgtourcard sources in one run.
  - Preserve source-level outcome information.
- `app.repositories.external_sources`
  - Accept the generalized source DTO shape.
  - Continue upserting by `(source_name, source_category, canonical_key)`.
- `app.services.policy_normalization`
  - Promote active and fresh records from `regional_benefit`, `traffic_benefit`, and `local_half_trip`.
- `app.services.region_recommendations`
  - Include `regional_benefit` and `local_half_trip`.
  - Exclude `traffic_benefit` from default region ranking to avoid nationwide transport benefits distorting destination recommendations.

## Data Mapping

Store source evidence in `external_source_records`:

| Column | Mapping |
|---|---|
| `source_name` | `여행가는 달` or `대한민국 반값여행` |
| `source_type` | `official_campaign` |
| `source_url` | Canonical source page URL |
| `source_category` | `traffic_benefit` or `local_half_trip` |
| `external_id` | Official id if present, otherwise stable hash |
| `canonical_key` | Stable duplicate key from source/category/title/period/region |
| `detail_url` | Detail, guide, reservation, or homepage URL when clearly available |
| `collected_page_url` | Page fetched by the collector |
| `title` | Benefit title shown to users |
| `organizer_text` | KTO, Korail, Naver Flight, local government, or other organizer |
| `region` / `city` | Local half-trip region/city; traffic benefits default to `전국` |
| `is_nationwide` | `true` for traffic benefits unless the source clearly says otherwise |
| `status` | `active`, `scheduled`, `ended`, or `unknown` |
| `start_date` / `end_date` | Application/sales period first, otherwise usage/trip period |
| `benefit_text` | Official benefit wording |
| `benefit_value_text` | Extracted human-readable value such as `50% 할인` or `최대 20만원 환급` |
| `extracted_amount_krw` | Explicit won amount when available |
| `extracted_discount_percent` | Explicit percentage when available |
| `tags` | Source-derived labels such as `철도`, `항공`, city, or status |
| `contact_text` | Contact or inquiry text |
| `raw_list_text` / `raw_detail_text` / `raw_payload` | Raw evidence for review and parser debugging |

Promote into `policies`:

| Policy field | Mapping |
|---|---|
| `policy_type` | `traffic_benefit -> 교통`, `local_half_trip -> 지역할인` |
| `description` | `raw_detail_text` or `benefit_text` |
| `benefit_amount` | `extracted_amount_krw` |
| `benefit_detail` | `benefit_value_text` or `benefit_text` |
| `target_condition` | Source condition/contact text or official-guide fallback |
| `official_url` | `detail_url` first, then `collected_page_url` |
| `apply_url` | Set only when a direct application or reservation URL is clearly separate |
| `source_category` | Original source category |
| `external_source_record_id` | Source record id |
| `source_canonical_key` | Source canonical key |

## Frontend Behavior

No new frontend data boundary is needed.

Existing policy detail CTA behavior remains:

- `applyUrl` present: show direct application CTA.
- `officialUrl` present and no `applyUrl`: show official benefit guide CTA.
- Neither URL present: show unavailable CTA.

All pages continue using `AppDataApi`.

## Operations And Quality

The scheduler can keep one external collection run, but the collection result should support source-level outcomes.

Outcomes:

- `success`: all enabled sources fetched and parsed above threshold.
- `partial_success`: at least one source succeeded and at least one source failed.
- `below_threshold`: total parsed count is below the configured minimum.
- `error`: all enabled sources failed.

`/api/ops/external-collection/quality` should accept an optional `sourceCategory` query parameter. Without the parameter, it should summarize all external source records and keep recommendation preview based only on recommendation-eligible categories.

## Error Handling

Source failures should be isolated.

- A `traffic.do` failure must not prevent successful `dgtourcard` records from being saved.
- A `dgtourcard` failure must not prevent existing TravelMonth regional records from being saved.
- Parser records missing required title, organizer, benefit text, or collected page URL should be skipped and counted as parser rejects.
- Date parsing failures should preserve raw text and use `unknown` only when a useful record can still be safely represented.

## Testing

Backend tests:

- `test_travelmonth_traffic_parser.py`
  - Parses railway and domestic flight benefits.
  - Extracts value text, amount or percent, periods, links, and nationwide classification.
- `test_dgtourcard_parser.py`
  - Parses local half-trip region/city records.
  - Handles `신청접수중`, `준비중`, and `마감`.
  - Preserves contact, application period, trip period, and homepage links.
- `test_external_collection.py`
  - Runs multi-source collection.
  - Verifies upsert into `external_source_records`.
  - Verifies partial success behavior.
- `test_policy_normalization.py`
  - Promotes `traffic_benefit` and `local_half_trip` records.
  - Verifies category, URL, source metadata, and idempotency.
- `test_region_recommendations.py`
  - Includes `local_half_trip` in region recommendations.
  - Excludes `traffic_benefit` from destination ranking.
- `test_ops_routes.py`
  - Verifies `sourceCategory` filter and all-source quality summary.

Frontend tests are only needed if backend DTO shape changes. The intended design keeps the existing `Policy` DTO stable.

## Documentation Updates

Update these files when implementation proceeds:

- `docs/current-work-spec.md`
- `docs/mvp-api-contract.md`
- `docs/db-schema-current.md` only if schema docs need source category wording updates
- `.agent/evals/api-contract-golden.json` if API response shape changes
- `CHECKLIST.md` with validation results and remaining risks

## Risks

- Source HTML can change without notice. Parsers should preserve raw evidence and count skipped records.
- `traffic_benefit` is mostly nationwide; including it in region recommendations would reduce ranking quality, so it stays policy-list-first in this phase.
- `dgtourcard` contains application period and travel period. The first implementation should use application/sales period as policy deadline and preserve trip period in raw payload.
- Some links are official guide pages rather than direct application links. Only clearly direct application/reservation URLs should populate `apply_url`.

## Approval State

Approved direction: practical expansion with `traffic.do` and `dgtourcard/tour50.do` integrated through `external_source_records`.
