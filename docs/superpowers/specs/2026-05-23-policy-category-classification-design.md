# Policy Category Classification Design - 2026-05-23

## Problem

External policy promotion currently classifies most `regional_benefit` records as `지역할인` because `_external_policy_category()` relies mainly on `source_category` and source URLs. This loses stronger signals in the actual benefit text. For example, `남도 기차둘레길 1박 2일 최대 35% 할인행사` should be categorized as `교통`, but it is promoted as `지역할인`.

This also makes frontend category tabs look broken because tabs such as `교통` and `여행상품` have no matching policies even when the source text clearly contains those benefit types.

## Goal

Classify external policy categories by scoring signals from the collected record text and metadata, then use that classification consistently during:

- policy promotion from `external_source_records` to `policies`
- raw external detail fallback
- an explicit backfill/reclassification CLI for already-promoted policies

## Non-Goals

- Do not add a new DB column or Alembic migration.
- Do not introduce ML or an external classification service.
- Do not change the public `Policy.category` enum.
- Do not make frontend category filtering more complex; the backend should provide better category values.

## Category Contract

Allowed policy categories remain:

1. `교통`
2. `숙박`
3. `여행상품`
4. `지역할인`
5. `이벤트`
6. `기타`

When scores tie, apply this priority:

`교통 > 숙박 > 여행상품 > 이벤트 > 지역할인 > 기타`

## Classifier Architecture

Add `backend/app/services/policy_category_classifier.py`.

The classifier returns a small decision object:

```python
@dataclass(frozen=True)
class PolicyCategoryDecision:
    category: str
    scores: dict[str, int]
    matched_keywords: dict[str, list[str]]
```

Primary public function:

```python
def classify_external_policy_category(record: ExternalSourceRecord) -> PolicyCategoryDecision:
    ...
```

`backend/app/services/policies.py` keeps `_external_policy_category(record)` as a compatibility wrapper that returns `decision.category`. This keeps existing call sites stable while moving classification logic out of policy DTO formatting.

## Scoring Inputs

Build weighted text buckets from:

- `title`
- `benefit_text`
- `raw_detail_text`
- `tags`
- `organizer_text`
- `detail_url`
- `collected_page_url`
- `source_category`

Weights:

| field group | weight |
|---|---:|
| title | 4 |
| benefit text | 3 |
| raw detail text | 2 |
| tags, organizer, URLs | 1 |

Source category boosts:

| source category | boost |
|---|---|
| `traffic_benefit` | `교통 +5` |
| `local_half_trip` | `지역할인 +2`, `여행상품 +1` |
| `regional_benefit` | `지역할인 +1` |

The `regional_benefit` boost is intentionally weak so text signals such as `기차`, `숙박`, or `패키지` can override the default regional grouping.

## Initial Keyword Sets

`교통`:

- `기차`, `열차`, `철도`, `ktx`, `srt`, `항공`, `항공권`, `렌터카`, `렌트카`, `버스`, `셔틀`, `승선`, `여객선`, `크루즈`, `운임`, `교통`, `투어패스`

`숙박`:

- `숙박`, `호텔`, `리조트`, `펜션`, `글램핑`, `캠핑`, `스테이`, `객실`, `야영장`, `숙소`

`여행상품`:

- `패키지`, `여행상품`, `관광상품`, `체험상품`, `투어`, `코스`, `1박 2일`, `2박 3일`, `원정 경기`, `체류여행`

`이벤트`:

- `이벤트`, `프로모션`, `추첨`, `경품`, `챌린지`, `인증 이벤트`

`지역할인`:

- `캐시백`, `환급`, `지역`, `입장료`, `할인권`, `방문객`, `관광지`

`기타`:

- no keywords; used only when every other category has score 0.

## Expected Examples

| text | expected category | reason |
|---|---|---|
| `남도 기차둘레길 1박 2일 최대 35% 할인행사` | `교통` | title contains a strong transport signal; it beats package duration text by tie priority or score |
| `테마열차 할인` | `교통` | train keyword |
| `네이버 항공권에서 국내선 이용 시` | `교통` | flight ticket keyword |
| `피카푸 피크닉앤글램핑 숙박전용 4만원 할인` | `숙박` | lodging keywords |
| `K리그 지역 원정 경기 관람 및 체류여행 패키지 할인` | `여행상품` | package and stay-trip keywords without transport signal |
| `부산 여행 캐시백` | `지역할인` | cashback/regional discount signal |

## Promotion Behavior

`promote_external_benefits_to_policies(db)` continues to upsert idempotently by `external_source_record_id` or generated slug.

During every promotion pass, `_assign_policy_from_external_record()` must call the classifier and assign `policy.policy_type` from the current decision. This means already-promoted policies can be corrected by rerunning promotion after source records are updated.

## Backfill CLI

Add `backend/app/scripts/reclassify_external_policy_categories.py`.

Behavior:

- Query policies with `external_source_record_id IS NOT NULL`.
- Load each linked `ExternalSourceRecord`.
- Classify each record with the same classifier.
- Report changed categories.
- Default to dry-run.
- Apply changes only when `--apply` is present.
- Print JSON with no secrets.

Example dry-run output:

```json
{
  "checkedCount": 58,
  "changedCount": 12,
  "applied": false,
  "changes": [
    {
      "policySlug": "travelmonth-12",
      "title": "남도 기차둘레길 1박 2일 최대 35% 할인행사",
      "from": "지역할인",
      "to": "교통"
    }
  ]
}
```

## Testing

Backend unit tests:

- classifier examples above
- tie-break order, especially `교통` over `여행상품`
- source category boosts without allowing `regional_benefit` to dominate text

Promotion tests:

- a previously promoted `지역할인` policy is updated to `교통` when its linked source record classifies as transport
- promotion remains idempotent by `external_source_record_id`

CLI tests:

- dry-run prints changes without mutating DB
- `--apply` updates only changed policies and commits

Frontend tests:

- existing category tab filtering can remain client-side equality filtering
- add a small API mock containing one `교통` and one `여행상품` policy so category tabs prove they show matching records when backend categories are present

## Documentation Updates

Update:

- `docs/current-work-spec.md`
- `docs/mvp-api-contract.md`
- `CHECKLIST.md`

Document that external policy categories are rule-based classifier outputs, not simple source URL/source category mappings.

## Risks

- Keyword rules can over-classify ambiguous text. Mitigation: keep tests for known examples and keep scoring deterministic.
- Existing DB rows do not change until promotion reruns or the reclassification CLI is run with `--apply`.
- Official source HTML/text can change; category tests must focus on normalized record fields rather than brittle full-page HTML.
