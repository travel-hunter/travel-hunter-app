# Local Collection And Itinerary Recommendation Smoke Design

## Summary

현재 목표는 Cloudflare/public HTTPS/provider smoke를 뒤로 미루고, 로컬 Docker Compose 환경에서 여행가는 달 수집 데이터와 일정 자동 생성 추천 기능이 끝까지 동작하는지 반복 검증 가능한 상태로 만드는 것이다.

검증할 핵심 흐름은 다음과 같다.

```text
TravelMonth 공식 페이지 수집
-> external_source_records 저장
-> /api/ops/external-collection/quality 저장 품질 확인
-> /api/recommendations/regions 지역 추천 확인
-> /home 추천 UI 확인
-> /trips/new 일정 생성
-> trip_days / trip_places 자동 코스 저장
-> /trips/{id}와 /ai-results?tripId={id}에서 결과 확인
```

## Scope

포함한다.

- 로컬 DB, backend, frontend 기준 smoke 절차.
- 여행가는 달 live collector 수동 1회 실행 경계.
- 수집 결과가 `external_source_records`에 저장됐는지 확인하는 ops quality 검증.
- 저장 데이터 기반 지역 추천 API 검증.
- `/home` 추천 UI와 `/trips/new` 일정 생성 UI의 연결 검증.
- 새 일정 생성 시 `trip_days`, `trip_places`, `recommendations`가 실제 저장되는지 검증.
- 반복 실행 가능한 로컬 smoke 명령 또는 스크립트 설계.

제외한다.

- Cloudflare Tunnel, public HTTPS, 실제 staging domain.
- SMTP, OAuth, SOLAPI 실제 provider smoke.
- Jenkins CD 자동화.
- 새로운 AI provider 연동. 현재는 규칙 기반/catalog 기반 추천을 검증하고, provider boundary는 이후 단계로 둔다.

## Current Baseline

현재 `develop`에는 아래 기반이 이미 들어와 있다.

- TravelMonth 공식 지역 할인 페이지 live collector PoC.
- TravelMonth parser hardening.
- `external_source_records` 저장소와 upsert service.
- external collection scheduler cadence/status.
- `GET /api/ops/external-collection`.
- `GET /api/ops/external-collection/quality`.
- `GET /api/recommendations/regions`.
- `/home` 지역 추천 UI.
- `/trips/new` catalog 기반 자동 코스 생성.
- 하루 3개 장소, 고정 시간대 `10:00`, `14:00`, `18:00`.
- `trip_days`, `trip_places`, `recommendations` 저장.

2026-05-21 로컬 smoke 시도에서 확인한 사실:

- compose build, migration, seed는 통과했다.
- 기존 Docker volume은 과거 DB password를 유지할 수 있으므로, 로컬 smoke는 clean volume 또는 DB role password 동기화 절차가 필요하다.
- live collection 수동 실행은 공식 페이지에서 58건을 parse/upsert했다.
- quality report는 `totalRecords=58`, `recommendationPreview=3`까지 확인됐다.
- Cloudflare tunnel token과 placeholder domain은 public HTTPS smoke blocker이므로 이 목표에서 제외한다.

## Desired Local Success Criteria

로컬 완성 기준은 한 번의 절차로 다음을 확인하는 것이다.

- Docker Compose 설정이 유효하다.
- DB migration이 최신 head까지 적용된다.
- seed가 적용된다.
- TravelMonth live collection이 성공하고 `parsedCount > 0`이다.
- `GET /api/ops/external-collection/quality`가 `totalRecords > 0`과 `recommendationPreview.length > 0`을 반환한다.
- `GET /api/recommendations/regions?style=맛집&region=부산&limit=3`이 3개 이하의 ranked region recommendation을 반환한다.
- `/home`은 region recommendation API를 통해 추천 지역 rail을 렌더링한다.
- `/trips/new`에서 지역/취향/날짜를 선택해 새 일정을 만들면, backend가 자동으로 `trip_days`와 하루 3개 `trip_places`를 저장한다.
- 생성된 일정 상세에서 실제 장소명이 보인다.
- `/ai-results?tripId={id}`에서 같은 추천 근거가 보인다.

## Proposed Implementation Tracks

### Track 1. Local Collection Command

현재 live collector는 service 함수로는 실행 가능하지만, smoke 담당자가 inline Python을 직접 작성해야 한다. 이를 명령으로 고정한다.

권장 형태:

```powershell
docker compose -f compose.yaml exec backend python -m app.scripts.collect_travelmonth_once
```

출력은 secret 없이 아래 값만 포함한다.

```json
{
  "sourceCategory": "regional_benefit",
  "parsedCount": 58,
  "createdOrUpdatedCount": 58
}
```

### Track 2. Local Recommendation Smoke Script

수집 이후 API와 일정 생성까지 확인하는 smoke 스크립트를 추가한다.

권장 형태:

```powershell
.\scripts\local-recommendation-smoke.ps1
```

검증 단계:

- compose config.
- DB migration.
- seed.
- live collection.
- ops quality API.
- region recommendation API.
- authenticated trip creation API.
- created trip detail API.
- trip recommendations API.

### Track 3. Backend Integration Coverage

network 없는 test는 fixture/mock 기반으로 유지한다. live network smoke는 로컬 수동 명령으로만 수행한다.

추가할 backend 검증:

- collection service가 저장한 레코드를 region recommendation이 읽는다.
- region/style/limit query가 preview와 recommendation API에 반영된다.
- trip create가 선택 지역/취향/기간을 기반으로 `trip_days`, `trip_places`, `recommendations`를 저장한다.
- catalog 후보가 부족하면 같은 지역의 다른 style 후보로 fallback한다.

### Track 4. Frontend And E2E Coverage

추가할 frontend/e2e 검증:

- `/home`에서 region recommendations API 결과를 렌더링한다.
- API가 비어 있거나 실패하면 기존 fallback을 유지한다.
- `/trips/new`에서 장소 취향 선택지가 일정 catalog style과 맞다.
- 새 일정 생성 후 상세에서 day별 장소가 보인다.
- `/ai-results?tripId={id}`에서 추천 결과가 보인다.

## Risks And Controls

- 공식 페이지 HTML 구조가 바뀌면 parsed count가 0 또는 threshold 미달이 될 수 있다. smoke는 실패를 숨기지 않고 parsed count를 그대로 보여준다.
- 기존 Docker volume은 과거 DB password를 유지할 수 있다. smoke 문서에는 clean volume 사용 또는 role password 동기화 절차를 명시한다.
- live network smoke는 외부 페이지 상태에 영향을 받는다. CI에는 넣지 않고 로컬 수동 smoke로 둔다.
- Cloudflare/public HTTPS 실패는 이 목표의 실패로 보지 않는다. public route smoke는 별도 운영 검증 트랙이다.

## Next Step

이 명세를 기준으로 구현 계획은 `docs/superpowers/plans/2026-05-21-local-collection-itinerary-recommendation-smoke.md`에 작성한다. 구현은 로컬 수집 명령과 smoke 자동화부터 시작한다.
