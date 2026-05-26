# /trips/new Travel Area UX Continuity Design

## Status

- 상태: 완료
- 완료일: 2026-05-26
- 대상 작업: travel-area 기반 `/trips/new` 선택 상태 연속성 보강
- 검증 상태: frontend typecheck, travel 관련 App 테스트, Docker 재빌드 통과

## Summary

`/trips/new`에서 여행권역 선택 상태가 URL query, draft restore, 직접 URL 진입, 일반 지역 변경 사이에서 어긋나지 않도록 정리했다. 이번 작업은 이미 구현된 travel-area API와 `travelAreaId` 생성 흐름을 전제로 한 frontend UX/state 안정화 작업이며, backend API, DB schema, DTO 계약은 새로 변경하지 않았다.

## User Problem

사용자가 `강원`처럼 넓은 지역에서 `속초·고성·양양` 같은 여행권역을 선택한 뒤 새로고침하거나 다시 진입하면, 선택 상태가 유지되어야 한다. 반대로 `/trips/new?travelAreaId=...`로 직접 들어온 뒤 사용자가 `부산` 같은 일반 지역으로 마음을 바꾸면, 기존 `travelAreaId` 조건이 남아 생성 흐름을 막으면 안 된다.

## Completed Behavior

- `/trips/new?region=강원` 진입 시 강원 하위 여행권역 후보를 표시한다.
- 여행권역 카드를 선택하면 `region=<sido>&travelAreaId=<id>` 형태로 URL을 동기화한다.
- 여행권역 선택값은 trip creation draft에 `travelAreaId`, `travelAreaName`, `sido`, `includedCities`로 저장된다.
- 같은 URL로 remount해도 선택한 여행권역 카드가 active 상태로 복원된다.
- `selectedTravelArea`가 있을 때 broad region 버튼은 `selectedTravelArea.sido` 기준으로 active 표시된다.
- 직접 `/trips/new?travelAreaId=gangwon-sokcho-goseong-yangyang` 진입 시 해당 여행권역을 API 결과에서 찾아 active 카드로 표시한다.
- 직접 `travelAreaId` URL에서 사용자가 일반 지역 버튼을 누르면 stale `travelAreaId` query와 선택 상태를 제거한다.
- 일반 지역 선택 후 생성 payload에는 `travelAreaId`가 포함되지 않는다.
- `policySlug` query는 region/travelAreaId 동기화 과정에서 보존된다.

## Files Changed

- `frontend/src/pages/itinerary/ItineraryCreatePage.tsx`
- `frontend/src/App.test.tsx`
- `docs/superpowers/specs/2026-05-26-trips-new-travel-area-ux-continuity-design.md`
- `docs/superpowers/plans/2026-05-26-trips-new-travel-area-ux-continuity.md`
- `CHECKLIST.md`

## Acceptance Criteria

- [x] `/trips/new?region=강원`에서 여행권역 후보가 보인다.
- [x] 여행권역 선택 후 draft에 `travelAreaId`가 저장된다.
- [x] 같은 URL로 remount해도 선택한 여행권역 카드가 active로 복원된다.
- [x] `/trips/new?travelAreaId=gangwon-sokcho-goseong-yangyang`에서 해당 여행권역 카드가 active로 표시된다.
- [x] 직접 URL 상태에서 `부산`을 선택하면 `travelAreaId` 요구 상태가 해제되어 다음 단계로 진행할 수 있다.
- [x] 여행권역 선택 생성 payload에는 `region: "속초·고성·양양"`, `travelAreaId: "gangwon-sokcho-goseong-yangyang"`가 유지된다.
- [x] 일반 지역 선택 생성 payload에는 `travelAreaId`가 포함되지 않는다.

## Validation Results

- [x] `cd frontend; npm run typecheck` 통과
- [x] `cd frontend; npm test -- --run src/App.test.tsx -t travel` 통과
- [x] `docker compose -f compose.yaml up -d --build` 통과

## Remaining Risks

- 이번 최종 검증 요청에는 브라우저 스모크 검증이 포함되지 않았다.
- UI에서 `/trips/new?region=강원`, `/trips/new?travelAreaId=gangwon-sokcho-goseong-yangyang`, 일반 지역 전환을 눈으로 확인하는 단계는 별도 요청 시 수행한다.