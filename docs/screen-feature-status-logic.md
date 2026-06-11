# 로직/API/추천 기능 설명

> Status: reference.
> This document remains the logic and fallback status ledger. For current local UX completion specs, use `docs/specs/spec-index.md` and the three `docs/specs/local-ux-*.md` documents.

이 문서는 Travel Hunter 화면 뒤에서 동작하는 수집, 외부 API, 추천/자동생성, fallback, 저장/선정 기준을 누적 기록한다. 화면별 버튼/상태 나열보다 팀원이 내부 동작과 한계, 향후 개선 방향을 판단하는 데 필요한 설명을 우선한다.

## 새 섹션 추가 기준

- 백엔드 service/repository/data pipeline, 외부 API 연동, scheduler, fallback, recommendation/scoring, 저장/선정 기준을 설명할 때 이 문서에 추가한다.
- 화면에서 보이는 결과가 있더라도 핵심이 내부 처리 기준이면 이 문서에 작성한다.
- 특정 화면의 버튼/링크/폼 상태는 `screen-feature-status-screens.md`에 쓰고, 이 문서에는 해당 화면을 가능하게 하는 로직만 설명한다.
- 현재 한계와 향후 개선 후보를 함께 적어 MVP 안전장치와 미구현 고도화 영역을 구분한다.

## 2026-05-29 - 정책 수집 로직 요약

### 수집 구조

정책 수집은 백엔드 수집 서비스가 공식 외부 페이지를 가져와 DB에 반영하는 구조이다. 현재 기본 Docker 설정에서는 `EXTERNAL_COLLECTION_SCHEDULER_ENABLED=false`로 되어 있어 자동 수집 스케줄러는 꺼져 있고, 화면은 DB에 이미 저장된 active 정책을 `GET /api/policies`로 조회한다. 관리자는 관리자 대시보드에서 현재 수집 상태를 보고 수동으로 1회 수집을 실행할 수 있다.

### 수집 대상/흐름

| 단계 | 개발 상태 | 로직 |
| --- | --- | --- |
| 공식 페이지 HTML 가져오기 | 완료 | `httpx.get()`으로 공식 페이지 HTML을 가져온다. 기본 User-Agent는 `Travel Hunter official-source collector/0.1`이다. |
| 수집 대상 분류 | 완료 | `regional_benefit`, `local_half_trip`, `stay_discount`를 public 정책/추천 입력으로 지원하고, `traffic_benefit`은 optional legacy source evidence로만 유지한다. |
| HTML 파싱 | 완료 | source category별 parser가 HTML에서 제목, 지역, 기간, 혜택 문구, 금액/할인율, 상세 URL 등을 추출한다. |
| 원천 레코드 저장 | 완료 | `external_source_records` 테이블에 `source_name + source_category + canonical_key` 기준으로 upsert한다. |
| 정책 테이블 반영 | 완료 | active/fresh 원천 레코드를 `policies` 테이블로 승격한다. 생성되는 slug는 `travelmonth-{external_source_record_id}` 형식이다. |
| 만료/비활성 처리 | 완료 | 원천 레코드가 active/fresh가 아니면 연결된 정책을 `hidden` 상태로 숨긴다. |
| 커밋 | 완료 | 수집/정규화 후 DB commit을 수행한다. 일부 source가 실패해도 성공한 source가 있으면 `partial_success`로 기록한다. |

### 자동 실행/수동 실행

| 실행 방식 | 현재 상태 | 설명 |
| --- | --- | --- |
| 앱 시작 시 스케줄러 등록 | 구현 완료/기본 비활성 | FastAPI lifespan에서 외부 수집 스케줄러를 시작할 수 있다. 단, 현재 compose 기본값은 비활성이다. |
| 스케줄 시간 | 구현 완료 | `EXTERNAL_COLLECTION_RUN_AT`, 기본 `03:00` KST 이후 하루 1회 실행한다. |
| 수집 주기 확인 | 구현 완료 | `EXTERNAL_COLLECTION_POLL_SECONDS`, 기본 60초마다 실행 시점 도달 여부를 확인한다. |
| 최소 파싱 건수 검증 | 구현 완료 | `EXTERNAL_COLLECTION_MIN_PARSED_COUNT`보다 적게 파싱되면 성공 실행일로 기록하지 않는다. |
| 단건 수동 수집 CLI | 구현 완료 | `python -m app.scripts.collect_travelmonth_once`로 configured 공식 source 전체를 1회 수집하고 source별 outcome을 JSON으로 확인할 수 있다. |
| 운영 상태 확인 API | 구현 완료 | 관리자 ops route에서 스케줄러 활성 여부, 마지막 실행일, 파싱 건수, outcome, error를 조회할 수 있다. |
| 관리자 수동 실행 API/UI | 구현 완료 | `POST /api/ops/external-collection/run`과 관리자 대시보드의 “지금 수집 실행” 버튼으로 공식 source 수집을 실행한다. |

### 보고용 요약

정책 수집은 “공식 페이지 HTML 수집 → source별 parser로 혜택 추출 → `external_source_records` 원천 테이블 upsert → active/fresh 데이터만 `policies`로 승격 → 만료/비활성 정책 hidden 처리” 순서로 진행된다. 현재 화면에 보이는 정책 목록은 이 수집 로직이 만든 `policies` 테이블의 active 정책을 조회하는 결과이다. 다만 현재 로컬/compose 기본 설정에서는 자동 스케줄러가 꺼져 있으므로, 자동 최신화가 항상 수행되는 운영 상태는 아니다.

### 확인 근거

- `backend/app/services/external_benefit_collection.py`: 다중 외부 source 수집, parser 선택, 원천 레코드 upsert, 정책 승격 호출
- `backend/app/services/travelmonth_live_collector.py`: 공식 여행가는 달 HTML fetch 로직
- `backend/app/services/travelmonth_collection.py`: 여행가는 달 지역 혜택 HTML 파싱 결과 저장
- `backend/app/services/policy_normalization.py`: 외부 원천 레코드를 `policies` 정책으로 승격/숨김 처리
- `backend/app/repositories/external_sources.py`: `external_source_records` upsert 및 promotion/deactivation 대상 조회
- `backend/app/services/external_collection_scheduler.py`: KST 기준 1일 1회 자동 수집 스케줄러
- `backend/app/scripts/collect_travelmonth_once.py`: 수동 1회 수집 CLI
- `backend/alembic/versions/0010_external_source_records.py`: 원천 수집 테이블 스키마
- `backend/alembic/versions/0012_policy_source_tracking.py`: 정책과 원천 레코드 연결 필드
- `compose.yaml`: 현재 기본 `EXTERNAL_COLLECTION_SCHEDULER_ENABLED=false`

### 남은 작업/리스크

- 자동 수집은 구현되어 있지만 기본 compose 설정에서는 비활성이다. 운영에서 자동 최신화를 사용하려면 환경변수 활성화와 실행 모니터링이 필요하다.
- HTML parser 기반이므로 공식 사이트 마크업이 바뀌면 파싱 결과가 줄거나 실패할 수 있다.
- 일부 source가 실패해도 전체 수집 결과는 `partial_success`가 될 수 있으므로 source별 실패 로그 확인이 필요하다.
- 관리자 수동 실행은 live fetch를 수행하므로 공식 사이트 차단/timeout/마크업 변경 시 `partial_success` 또는 `error`가 날 수 있다.

## 2026-05-29 - Kakao Map API 연결 상태 사전 확인

### 확인 결론

초기 Docker 실행 상태에서는 프론트엔드에 Kakao Maps JavaScript API 키가 주입되지 않아 Kakao Map SDK가 연결되지 않았다. 이후 `frontend/Dockerfile`과 `compose.yaml`에 `VITE_KAKAO_MAP_JS_KEY` build arg 전달 경로를 추가했고, Kakao 개발자 콘솔에 로컬 Web 플랫폼 도메인을 등록한 뒤 SDK 요청이 정상 응답하는 것을 확인했다.

### 확인 내용

| 항목 | 상태 | 확인 결과 |
| --- | --- | --- |
| 지도 컴포넌트 구현 | 완료 | `KakaoMapView`가 Kakao SDK 로드, 좌표/주소 검색, marker/overlay 표시를 지원한다. |
| SDK 키 감지 로직 | 완료 | `VITE_KAKAO_MAP_JS_KEY`가 비어 있으면 `Kakao Maps JavaScript key is not configured` 오류 경로로 들어간다. |
| 현재 compose 설정 | 빌드 키 주입 경로 추가 | `compose.yaml`의 frontend build args에 `VITE_KAKAO_MAP_JS_KEY`를 추가했다. |
| Docker 빌드 컨텍스트 | 미연결 | `frontend/.dockerignore`가 `.env`를 제외하므로 로컬 `.env` 키는 Docker 빌드에 포함되지 않는다. |
| 현재 실행 번들 | 키 주입 확인 | 재빌드 후 `http://127.0.0.1:4173/assets/index-*.js`에서 Kakao SDK appkey URL 생성이 확인된다. |
| Kakao SDK 요청 | 연결 확인 | `http://127.0.0.1:4173/`, `http://localhost:4173/` Referer 요청이 모두 `200 OK`를 반환한다. |
| 사용자 화면 영향 | Kakao 지도 사용 가능 | SDK 요청이 정상화되어 좌표가 있는 일정 상세 지도는 Kakao 지도 렌더링을 시도한다. 좌표가 없거나 SDK 로드가 실패하면 fallback UI가 유지된다. |

### 관련 코드 근거

- `frontend/src/lib/kakaoMap.ts`: `VITE_KAKAO_MAP_JS_KEY` 확인 및 Kakao Maps SDK script 로드
- `frontend/src/components/map/KakaoMapView.tsx`: SDK 사용 가능 시 Kakao 지도 렌더링, 실패/키 없음/좌표 없음이면 fallback 렌더링
- `frontend/src/pages/itinerary/ItineraryDetailPage.tsx`: 일정 상세 지도 탭에서 `KakaoMapView`와 fallback 지도를 연결
- `frontend/Dockerfile`: build arg로 `VITE_API_BASE_URL`, `VITE_KAKAO_MAP_JS_KEY`를 받음
- `frontend/.dockerignore`: `.env` 제외
- `compose.yaml`: frontend build args에 Kakao Map key 전달 경로 추가

### 보고용 요약

Kakao Map 연동 코드는 구현되어 있고 Docker 빌드 시점의 키 주입 경로도 추가되었다. Kakao 개발자 콘솔 Web 플랫폼 도메인 등록 후 `http://127.0.0.1:4173` 및 `http://localhost:4173` Referer 기준 SDK 요청이 `200 OK`로 정상화되었다. 현재 개발 서버 기준 Kakao Map API 연결 사전 조건은 충족된 상태이며, 일정 상세 페이지에서 좌표가 있는 일정은 SDK 지도 렌더링을 시도할 수 있다.

### 남은 작업/리스크

- 재빌드 시 `VITE_KAKAO_MAP_JS_KEY` 환경변수가 셸 또는 compose 환경에 있어야 한다.
- Vite 환경변수는 빌드 시점에 번들에 포함되므로, 키 변경 후에는 프론트엔드 재빌드가 필요하다.
- 실제 화면에서 지도 표시 여부는 일정 장소의 좌표 또는 Kakao services 주소/키워드 검색 결과에 영향을 받는다.

## 2026-05-29 - 일정 장소 자동생성 및 AI 추천 후보 로직 설명

### 설명 범위

- 대상 화면/흐름: `/trips/new` 일정 생성 완료 직후 `/trips/{tripId}`에 처음 채워지는 Day별 장소, `/ai-results?tripId={tripId}`에서 보이는 추가 후보 장소
- 설명 목적: 팀원이 현재 자동생성/추천 로직을 MVP 기준으로 합리적인 구조로 이해하고, 동시에 현재 한계와 향후 개선 후보를 판단할 수 있게 한다.
- 비목표: 이 섹션은 구현 변경, 신규 API 도입 설계, 상세 개발 계획을 다루지 않는다. 현재 동작과 한계, 개선 후보만 정리한다.

### 전체 추천 소스 구조

| 구분 | 우선 소스 | fallback/보조 소스 | 저장 여부 |
| --- | --- | --- | --- |
| 일정 생성 직후 Day별 초기 장소 | Kakao Local 후보 기반 자동 코스 | 내장 여행 장소 catalog | 생성 시점에 `trip_days`, `trip_places`로 DB 저장 |
| `/ai-results` 추가 후보 | Kakao Local 추가 후보 | 일정 생성 시 저장해 둔 recommendation 결과 | 화면 표시만으로는 저장되지 않고, 사용자가 Day를 선택해 `추가`할 때 `trip_places`에 저장 |
| 일정 상세 지도 marker | 저장된 장소의 좌표/주소/Kakao place metadata | 좌표 없거나 SDK 실패 시 fallback 지도/검색 표시 | 저장된 `trip_places` 응답을 표시 |

현재 기본 compose 설정은 `KAKAO_LOCAL_ENABLED=false`이므로, 별도 Kakao Local REST API 키와 활성화 설정이 없으면 일정 생성 초기 장소는 내장 catalog fallback을 사용한다. 이 fallback은 추천이 실패했다는 의미가 아니라, 외부 API 설정이 없거나 후보가 충분하지 않아도 MVP에서 일정 생성 흐름이 끊기지 않게 하는 안전장치다.

### 일정 생성 시 초기 장소가 추천/저장되는 흐름

| 단계 | 로직 | 설명 |
| --- | --- | --- |
| 1. 사용자가 일정 조건 입력 | `/trips/new`에서 지역, 세부 travel area, 여행 스타일, 날짜, 인원, 선택 정책을 입력 | 프론트는 `appDataApi.createTrip()`으로 `POST /api/trips`를 호출한다. |
| 2. 백엔드가 Trip 생성 | `create_trip()` | `trips` 레코드와 owner 멤버십을 먼저 만든다. |
| 3. 자동 코스 생성 호출 | `generate_auto_course(region, style, startDate, dayCount, travelAreaId, externalProvider)` | 현재 지역/권역, 여행 스타일, 일정 일수를 기준으로 초기 장소 후보를 만든다. |
| 4-A. Kakao Local 사용 가능 시 | `KakaoItineraryPlaceProvider` + `_external_course()` | Kakao Local 키워드 검색 결과를 카테고리별로 수집하고, 지역/권역 필터와 점수 정렬을 거친 뒤 Day별 시간대에 배치한다. |
| 4-B. Kakao Local 미사용/후보 부족 시 | `_catalog_course()` | `ITINERARY_PLACE_CATALOG`에서 같은 지역 항목을 찾고, 사용자 style과 일치하는 장소를 먼저 배치한다. 부족하면 같은 지역의 다른 style 장소를 보조로 사용한다. |
| 5. Day/장소 저장 | `add_trip_day()`, `add_trip_place()` | 생성된 장소는 화면 임시값이 아니라 일정 생성 트랜잭션 안에서 Day별 장소로 DB에 저장된다. |
| 6. 추천 설명 저장 | `add_recommendation()` | 생성된 장소의 추천 설명 목록도 `trip_recommendations`에 저장된다. 이 값은 Kakao 추가 후보가 없을 때 `/ai-results` fallback으로 쓰인다. |
| 7. 정책 연결 | `policySlug`가 있으면 `trip_policies` 연결 | 정책 상세에서 새 일정 생성으로 들어온 경우 해당 정책도 일정에 연결된다. |

### Kakao Local 기반 초기 장소 선택 기준

Kakao Local provider가 활성화되면, 백엔드는 여행 권역/도시명과 카테고리 키워드로 후보를 검색한다.

| 시간대 | 목적 | Kakao category/검색 의도 | 비고 |
| --- | --- | --- | --- |
| 10:00 | 오전 명소 | `AT4` 관광명소, 보조로 `CT1` 문화시설 | 관광 후보가 부족하면 일부 cafe 후보로 보완할 수 있다. |
| 13:00 | 점심/음식 | `FD6` 음식점 | 사용자의 맛집/미식 style이면 점수에 유리하다. |
| 16:00 | 카페/휴식 | `CE7` 카페 | 휴식/cafe style이면 점수에 유리하다. |
| 20:00 | 숙소 | `AD5` 숙소 | 마지막 날은 숙소 슬롯을 만들지 않는다. |

후보는 단순히 Kakao 응답을 그대로 쓰지 않고 다음 조건을 거친다.

- 장소명이 비어 있으면 제외한다.
- 장소명에 `휴업`, `폐업`이 포함되면 제외한다.
- travel area가 있으면 주소/장소명/도시명이 해당 시도와 포함 도시/별칭에 맞는지 확인한다.
- Kakao external place id 또는 정규화한 제목 기준으로 중복을 제거한다.
- 카테고리 일치, 지역/권역 용어 포함, style 텍스트 포함, 주소 존재, Kakao place URL 존재 여부로 점수를 계산한다.
- 점수가 높은 순서로 정렬하고, 같은 점수에서는 제목 순으로 정렬한다.
- Day별 시간대 슬롯에 맞춰 카테고리별 상위 후보를 하나씩 꺼내 배치한다.

이 구조는 “평점이 가장 높은 장소”를 고르는 방식은 아니지만, MVP 기준으로는 지역·카테고리·여행 스타일·중복 제거를 함께 반영하므로 무작위 추천보다 설명 가능한 규칙 기반 추천이다.

### Catalog fallback 기준

Kakao Local provider가 없거나 외부 후보가 충분하지 않으면 내장 catalog를 사용한다.

| 기준 | 설명 |
| --- | --- |
| 후보 원천 | `backend/app/data/itinerary_catalog.py`의 `ITINERARY_PLACE_CATALOG` |
| 지역 기준 | 요청된 `region`과 catalog 항목의 `region`이 정확히 일치하는 항목을 우선 사용 |
| style 기준 | 같은 지역 안에서 사용자 `style`과 일치하는 장소를 먼저 선택 |
| 부족할 때 | 같은 지역의 다른 style 장소를 보조로 선택 |
| 중복 제거 | 같은 제목의 장소는 한 번만 선택 |
| 개수 | `여행일수 × 3`개까지 요청 |
| 시간 배치 | `10:00`, `14:00`, `18:00` 고정 슬롯에 순서대로 배치 |

이 fallback은 Kakao API 설정이 없는 로컬/시연/개발 환경에서도 일정 생성 결과가 빈 화면으로 끝나지 않도록 하는 MVP 안전장치다. 다만 catalog에 없는 지역이거나 catalog 항목 수가 부족한 권역에서는 Day가 생성되어도 장소 수가 적거나 비어 있을 수 있다.

### `/ai-results` 후보가 추천되어 보이는 흐름

| 단계 | 로직 | 설명 |
| --- | --- | --- |
| 1. 화면 진입 | `/ai-results?tripId={tripId}` | 프론트는 `resolveTripId()`로 trip id를 확정한 뒤 `listRecommendations()`와 `getTrip()`을 함께 호출한다. |
| 2. 백엔드 후보 조회 | `GET /api/trips/{tripId}/recommendations` | 현재 사용자가 접근 가능한 일정인지 확인한다. |
| 3-A. Kakao 추가 후보 생성 | `_additional_recommendation_items()` | Kakao Local provider가 있으면 현재 일정의 지역, style, travel area를 기준으로 추가 후보를 다시 수집한다. |
| 3-B. 기존 장소 중복 제외 | `_existing_place_keys()`, `_is_duplicate_candidate()` | 이미 일정에 들어간 장소는 provider id, external id, 정규화 제목 기준으로 제외한다. |
| 3-C. 카테고리 균형 선택 | `additional_place_candidates()` | 명소, 맛집, 숙소 등 카테고리 목표치를 우선 채우고 남는 후보를 순서대로 보완한다. 기본 후보 limit은 18개다. |
| 3-D. 추천 Day 부여 | `suggestedDay` | 후보 순서대로 현재 일정의 Day 번호에 round-robin 방식으로 제안 Day를 부여한다. |
| 4. fallback 추천 반환 | 저장된 `trip_recommendations` | Kakao 추가 후보가 없으면 일정 생성 시 저장해 둔 추천 설명 목록을 `sourceType="savedSummary"`로 반환한다. |
| 5. 프론트 표시 | `AiResultsPage` | 후보를 `숙소`, `맛집`, `명소`, `기타` 그룹으로 나누고 지도/후보 목록/추천 기준 sheet를 보여준다. 출처 안내 banner와 candidate badge로 fresh candidate와 saved summary fallback을 구분한다. |
| 6. 사용자가 추가 | `POST /api/trips/{tripId}/days/{dayNumber}/places` | 후보는 보기만 할 때 저장되지 않는다. 사용자가 후보의 `추가`를 누르고 Day를 선택하면 장소 payload가 `trip_places`에 저장된다. |

`/ai-results`는 “현재 일정에 바로 추가할 수 있는 후보” 화면이다. Kakao Local이 활성화된 경우에는 현재 일정에 이미 들어간 장소를 제외한 새 후보를 우선 보여주고, Kakao 추가 후보가 없으면 일정 생성 시 저장해 둔 추천 결과를 보여준다.

### `/ai-results` 화면 표시 기준

| 화면 요소 | 현재 동작 |
| --- | --- |
| 후보 지도 | 선택된 후보 1개를 `KakaoMapView` marker로 표시한다. 좌표가 없거나 SDK가 실패하면 fallback map을 보여준다. |
| 후보 목록 | 추천 응답의 `categoryGroup`을 기준으로 `숙소`, `맛집`, `명소`, `기타`로 묶는다. |
| 출처 안내 | 추천 응답의 `sourceType`을 기준으로 새 Kakao 후보, 혼합 결과, 저장된 추천 요약 fallback을 banner와 badge로 표시한다. |
| 이미 추가됨 표시 | 현재 trip의 기존 장소명과 후보 제목을 정규화해 비교하고, 이미 있으면 `이미 추가됨`으로 표시한다. |
| Day 선택 | 후보의 `suggestedDay`가 있으면 해당 Day를 기본값으로 쓰고, 없으면 Day 1 또는 현재 일정의 첫 Day를 사용한다. 사용자는 inline Day selector에서 추가할 Day를 바꿀 수 있다. |
| 저장 payload | 후보 제목, 설명, 주소, 좌표, category code, place URL, source provider, external place id를 장소 추가 API로 전달한다. |
| 추천 기준 sheet | 정책 조건, 이동 거리, 예산, 여행 스타일을 함께 본다는 제품 설명을 제공한다. 현재 실제 코드에서 정량 이동시간/예산 최적화가 완성된 것은 아니므로 발표 시에는 “추천 기준 설명 UI”로 구분하는 편이 정확하다. |

### 현재 로직이 MVP 기준 합리적인 이유

- 지역/권역, 카테고리, 여행 스타일을 모두 사용하므로 완전 임의 선택이 아니다.
- Kakao Local 후보가 있으면 실제 장소명, 주소, 좌표, Kakao URL 같은 지도 표시 가능한 metadata를 보존한다.
- 이미 일정에 들어간 장소는 `/ai-results` 후보에서 제외해 중복 추가를 줄인다.
- Day별 시간대는 관광/식사/카페/숙소라는 여행자가 이해하기 쉬운 기본 리듬을 따른다.
- Kakao Local이 꺼져 있어도 catalog fallback으로 일정 생성 경험을 유지한다.
- 후보는 자동 저장되지 않고 사용자가 Day를 선택해 추가해야 저장되므로, `/ai-results`는 보조 추천/편집 흐름으로 동작한다.

### 현재 한계

| 한계 | 설명 |
| --- | --- |
| 평점/리뷰 기반 만족도 없음 | Kakao Local 응답에는 앱에서 바로 쓰는 평점/리뷰수 기반 만족도 점수가 없다. 현재 로직은 평점 높은 장소 추천이 아니라 지역·카테고리·style·metadata 기반 규칙 추천이다. |
| 실제 이동시간 최적화 미완료 | 현재 후보 점수에는 좌표/지역 단서가 반영되지만, Kakao Mobility 같은 경로 API로 Day별 이동시간을 최적화하는 단계는 아니다. |
| 후보 품질은 Kakao 검색/환경에 의존 | `KAKAO_LOCAL_ENABLED`, REST API 키, 검색 결과 품질, travel area term 매칭에 영향을 받는다. |
| catalog coverage 제한 | fallback catalog에 충분한 장소가 없는 지역은 장소 수가 부족할 수 있다. 이 경우에도 Day 자체는 생성된다. |
| `/ai-results` fallback은 생성 당시 추천 설명 기반 | Kakao 추가 후보가 없으면 새 후보라기보다 생성 시 저장된 recommendation 결과를 보여준다. 이 경우 UI는 저장 요약 fallback임을 명시한다. |
| 추천 기준 UI와 실제 정량 로직 차이 | 화면의 추천 기준 sheet는 정책/거리/예산/style을 함께 본다는 제품 방향을 설명하지만, 모든 항목이 현재 정량 최적화로 구현된 것은 아니다. |

### 향후 추천 품질 개선 후보

| 개선 후보 | 기대 효과 | 현재 섹션에서의 판단 |
| --- | --- | --- |
| Kakao Mobility 등 경로/길찾기 API | Day별 장소 간 실제 이동시간/거리 기반으로 동선 품질 개선 | 새 API 도입 후보. 현재 문서에서는 개념 후보로만 기록한다. |
| 평점/리뷰/만족도 데이터 source | “사용자 만족도가 높은 장소” 기준을 실제 수치로 반영 | Kakao Local만으로는 제한적이므로 별도 데이터 source 검토 필요. |
| 좌표 기반 clustering | 가까운 장소끼리 묶어 Day별 권역을 자연스럽게 구성 | Kakao 좌표 metadata를 활용해 개선 가능. |
| 사용자 행동 feedback | 사용자가 추가/삭제/길찾기 클릭/순서 변경한 데이터를 추천 점수에 반영 | 장기적으로 Travel Hunter 사용자에게 맞는 추천 품질 개선 가능. |
| category scoring 고도화 | 같은 카테고리 안에서도 여행 적합 키워드, 프랜차이즈/관공서 감점 등 품질 기준 추가 | 새 외부 API 없이 현 로직 개선 가능. |
| 후보/경로 cache | API 호출량과 응답 지연을 줄이고 반복 추천 안정성 향상 | Kakao Local/Mobility 확장 시 필요성이 커진다. |

### 보고용 요약

현재 Travel Hunter의 장소 자동생성/추천은 “Kakao Local 후보 우선 + catalog fallback 안전장치” 구조다. 일정 생성 시에는 지역, 세부 travel area, 여행 스타일, 여행일수를 기준으로 Day별 초기 장소를 만들고 즉시 DB에 저장한다. Kakao Local이 활성화되어 충분한 후보가 있으면 실제 장소 metadata를 가진 후보를 시간대별 카테고리에 맞춰 배치하고, 그렇지 않으면 내장 catalog로 일정 생성 경험을 유지한다. `/ai-results`는 기존 일정에 추가할 후보를 보여주는 화면이며, Kakao 추가 후보가 있으면 기존 장소 중복을 제외한 후보를 카테고리별로 보여주고, 후보가 없으면 일정 생성 시 저장된 recommendation 결과를 fallback으로 보여준다. 현재 로직은 MVP 기준으로 설명 가능한 규칙 기반 추천이지만, 평점/리뷰 만족도와 실제 이동시간 최적화는 아직 포함되지 않았으므로 향후 추천 품질 개선 후보로 관리하는 것이 적절하다.

### 확인 근거

- `frontend/src/pages/itinerary/ItineraryCreatePage.tsx`: 일정 생성 입력값과 `appDataApi.createTrip()` 호출, 생성 후 `/trips/{tripId}` 이동
- `frontend/src/pages/itinerary/AiResultsPage.tsx`: 추천 후보 조회, 카테고리 그룹 표시, 지도 marker, Day 선택 후 장소 추가 UI
- `frontend/src/api/backendApi.ts`: `createTrip`, `listRecommendations`, `addTripPlace`, `getTrip` API 연결
- `backend/app/services/trips.py`: `create_trip()`, `_build_external_place_provider()`, `_additional_recommendation_items()`, `list_recommendations()` 구현
- `backend/app/services/itinerary_recommendations.py`: Kakao 후보 수집/필터/점수/배치, catalog fallback, 추가 후보 balancing 구현
- `backend/app/data/itinerary_catalog.py`: fallback 장소 catalog
- `backend/app/services/kakao_local.py`: Kakao Local keyword search client
- `docs/mvp-api-contract.md`: `POST /trips`, `GET /trips/{tripId}/recommendations`, 장소 추가 API 계약
- `compose.yaml`: 현재 기본 `KAKAO_LOCAL_ENABLED=false`

### 2026-05-29 로컬 검증 결과

- 코드 근거 확인: `backend/app/services/trips.py`, `backend/app/services/itinerary_recommendations.py`, `backend/app/data/itinerary_catalog.py`, `frontend/src/pages/itinerary/AiResultsPage.tsx`, `frontend/src/pages/itinerary/ItineraryCreatePage.tsx`
- 이번 문서 작성 턴에서는 기능 코드를 변경하지 않았고, Kakao Local live API smoke는 추가 수행하지 않았다.

### 남은 작업/리스크

- 실제 Kakao Local 후보 품질은 운영 환경의 `KAKAO_LOCAL_ENABLED`, REST API 키, quota, 검색 결과에 의존한다.
- catalog fallback은 MVP 안전장치지만, 장기적으로는 지역 coverage 확장 또는 외부 후보 품질 개선이 필요하다.
- “이동 거리”, “예산” 같은 추천 기준 UI 문구는 제품 방향을 설명하지만 현재 모든 항목이 정량화된 ranking feature로 완성된 것은 아니다.
- 팀원 공유 시 “현재는 평점/리뷰 기반 만족도 추천이 아니다”와 “경로 API 기반 동선 최적화는 향후 후보”를 함께 설명해야 오해가 적다.


### 2026-06-11 - 정책 수집 로컬 확장

- `stay_discount` source가 숙박세일 페스타 숙박 할인권을 파싱해 `external_source_records`에 저장하고 active/fresh 레코드를 `policies`로 승격한다.
- 대한민국 반값여행 parser는 `신청접수`, `6월 중 예정`, `6.16 10시부터`, `마감` 같은 6-7월 상태 문구를 구분하고 여행기간을 raw payload에 보존한다.
- 일정 상세 추천 정책은 지역, 일정 날짜 겹침, 카테고리, 여행 스타일 텍스트만으로 점수화하며 LLM/AI 판단은 사용하지 않는다.
