# TravelMonth Benefit Value Normalization Implementation Plan

## Goal

Prevent TravelMonth records from using long condition or period text as the policy benefit amount when the concise discount value is present in the title.

## Steps

1. Add RED tests for title-based percent extraction and policy promotion fallback.
2. Extend `extract_benefit_value` to accept an optional title and search title plus benefit text.
3. Pass title from the regional TravelMonth parser.
4. Derive missing benefit values during policy promotion so existing source records can be repaired by re-running promotion.
5. Split mixed condition plus trailing period text in the policy detail benefit grouping.
6. Rebuild Docker, re-run promotion in the running backend environment, and verify `travelmonth-44` via API and browser.

## Validation

- `cd backend; python -m pytest tests/test_travelmonth_normalizer.py tests/test_policy_normalization.py -q`
- `cd backend; python -m pytest tests/test_travelmonth_parser.py tests/test_policy_db_service.py tests/test_region_recommendations.py -q`
- `cd frontend; npm test -- --run src/App.test.tsx -t "trailing benefit period"`
- `cd frontend; npm test -- --run src/App.test.tsx`
- `cd frontend; npm run typecheck`
- `docker compose -f compose.yaml build`
- `docker compose -f compose.yaml up -d --force-recreate`
- `docker compose -f compose.yaml exec -T backend python -c "...promote_external_benefits_to_policies..."`
- `GET http://127.0.0.1:8000/api/policies/travelmonth-44`
