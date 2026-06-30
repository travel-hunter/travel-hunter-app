# 정책 수집부터 상세 화면 반영까지의 흐름

## 기준

- 기준일: 2026-06-30
- 기준 코드:
  - `backend/app/api/routes/ops.py`
  - `backend/app/services/external_benefit_collection.py`
  - `backend/app/services/travelmonth_parser.py`
  - `backend/app/services/travelmonth_stay_parser.py`
  - `backend/app/services/dgtourcard_parser.py`
  - `backend/app/repositories/external_sources.py`
  - `backend/app/services/policy_normalization.py`
  - `backend/app/services/policies.py`
  - `backend/app/api/routes/policies.py`
  - `frontend/src/api/appDataApi.ts`
  - `frontend/src/api/backendApi.ts`
  - `frontend/src/pages/PolicyPages.tsx`
- 이 문서는 현재 구현을 설명하는 문서다. live 수집 실행, schema 변경, backend/frontend runtime 코드 변경은 포함하지 않는다.

## 한 줄 요약

현재 정책 수집은 **공식 source HTML을 가져와 source별 parser가 `ExternalBenefitSource` 값으로 변환하고, 이를 `external_source_records`에 upsert한 뒤 공개 가능한 원천만 `policies`로 승격하고, backend `Policy` DTO로 변환해 frontend 정책 목록/상세 화면에 표시하는 흐름**이다.

이 프로젝트에서 사용자가 말하는 "크롤링"은 무제한 웹 크롤러가 아니라, 코드에 등록된 공식 URL을 대상으로 하는 **공식 외부 혜택 source 수집/파싱**에 가깝다.


## 아주 쉽게 설명하면

이 기능은 **여행 혜택을 모으는 도서관 사서**처럼 움직인다.

상상해 보자.

- 정부나 관광공사 사이트에는 여행 혜택 안내문이 붙어 있다.
- 우리 앱은 그 안내문을 보러 간다.
- 안내문에서 제목, 지역, 혜택, 기간, 신청 조건 같은 중요한 내용을 읽는다.
- 읽은 내용을 임시 정리함에 넣는다.
- 그중 사용자에게 보여줘도 되는 혜택만 골라 정책 목록에 올린다.
- 마지막으로 화면이 그 정책 목록을 가져와 예쁜 카드와 상세 페이지로 보여준다.

코드 흐름을 생활 비유로 바꾸면 다음과 같다.

| 코드에서 하는 일 | 쉬운 비유 | 실제 저장/표시 |
| --- | --- | --- |
| 공식 사이트 HTML 가져오기 | 게시판에 붙은 안내문을 가져오기 | `external_benefit_collection.py`가 공식 URL을 읽는다. |
| parser 실행 | 안내문에서 중요한 문장에 형광펜 치기 | 제목, 지역, 혜택, 날짜, 링크를 `ExternalBenefitSource` 형태로 만든다. |
| `external_source_records` 저장 | 원본 안내문을 임시 정리함에 보관하기 | 수집한 원천 데이터를 DB에 저장한다. |
| 공개 조건 확인 | 낡았거나 보여주면 안 되는 안내문 걸러내기 | active/fresh 같은 조건을 본다. |
| `policies`로 승격 | 진짜 전시 책장에 올리기 | 사용자에게 보여줄 정책으로 만든다. |
| API DTO 변환 | 어려운 내부 말을 화면용 말로 바꾸기 | `summary`, `amount`, `requirements`, `structuredDetail`, `officialUrl` 같은 값으로 바꾼다. |
| frontend 화면 표시 | 책장에 꽂힌 책을 예쁘게 보여주기 | 정책 목록과 정책 상세 화면에 보여준다. |

조금 더 풀어 쓰면 다음 순서다.

1. **공식 사이트에 간다.**
   앱은 아무 사이트나 돌아다니지 않는다. 코드에 정해 둔 공식 여행 혜택 사이트에만 간다.

2. **안내문을 읽는다.**
   parser가 안내문에서 `제목`, `지역`, `혜택`, `신청 기간`, `공식 링크` 같은 중요한 부분을 찾아낸다.

3. **원본 정리함에 넣는다.**
   찾은 내용은 먼저 `external_source_records`라는 원천 기록 테이블에 저장한다. 이곳은 “일단 가져온 자료를 보관하는 곳”이다.

4. **보여줘도 되는지 검사한다.**
   마감됐거나 오래됐거나 공개 대상이 아닌 자료는 화면에 바로 보여주지 않는다. 조건을 통과한 자료만 다음 단계로 간다.

5. **정책 책장에 올린다.**
   공개해도 되는 자료는 `policies` 테이블에 들어간다. 이때 화면에서 쓰기 좋은 형태로 제목, 혜택, 조건, 링크가 정리된다.

6. **화면용 말로 바꾼다.**
   backend는 DB 값을 그대로 보내지 않고, frontend가 이해하기 쉬운 `Policy` 모양으로 바꾼다. 예를 들면 `official_url`은 `officialUrl`이 되고, `benefit_detail`은 `amount`가 된다. 정책 상세 화면용 정리본은 `structured_detail`에서 `structuredDetail`로 내려간다.

7. **정책 상세 화면이 보여준다.**
   frontend는 `appDataApi.getPolicy(policySlug)`로 정책 하나를 받아온다. 그리고 그 값을 사용해 제목, 지원 내용, 신청 기간, 조건, 필요 서류, 혜택 안내 버튼을 그린다.

즉, 전체를 한 문장으로 말하면 다음과 같다.

> 공식 사이트에서 여행 혜택 안내문을 가져와 중요한 내용을 뽑고, 원본 보관함에 저장한 뒤, 보여줘도 되는 혜택만 정책 책장에 올리고, 화면이 그 정책을 읽어 사용자에게 보여준다.

## 실행 진입점

### 1. 관리자 수동 실행 API

파일: `backend/app/api/routes/ops.py`

- `POST /api/ops/external-collection/run`
- 관리자 인증이 필요하다.
- DB session이 있으면 `collect_external_benefits_from_live_sources(db)`를 호출한다.
- 응답은 전체 수집 결과와 source별 결과를 반환한다.
  - `parsedCount`
  - `createdOrUpdatedCount`
  - `outcome`
  - source별 `sourceCategory`, `parsedCount`, `createdOrUpdatedCount`, `outcome`, `error`

### 2. 자동 스케줄러

파일:

- `backend/app/main.py`
- `backend/app/services/external_collection_scheduler.py`
- `backend/app/core/config.py`
- `compose.yaml`

FastAPI lifespan에서 외부 수집 스케줄러를 시작할 수 있다. 다만 현재 기본 compose 설정은 다음과 같다.

```yaml
EXTERNAL_COLLECTION_SCHEDULER_ENABLED: "false"
EXTERNAL_COLLECTION_RUN_AT: "03:00"
EXTERNAL_COLLECTION_POLL_SECONDS: "60"
```

따라서 기본 로컬 compose 기준으로는 자동 수집이 켜져 있다고 보면 안 된다. 화면은 DB에 이미 저장된 `policies.status = "active"` 정책을 조회한다.

### 3. 수동 CLI

파일: `backend/app/scripts/collect_travelmonth_once.py`

- CLI에서 1회 수집을 실행하는 경로다.
- 내부적으로 live source collection service를 호출한다.

## source 수집 단계

파일: `backend/app/services/external_benefit_collection.py`

핵심 함수는 두 가지다.

| 함수 | 용도 |
| --- | --- |
| `collect_external_benefits_from_live_sources()` | 실제 공식 URL을 fetch해서 수집한다. 관리자 API/스케줄러/CLI의 주된 live 경로다. |
| `collect_external_benefits_from_html_sources()` | 이미 주어진 HTML 문자열을 source별 parser에 넣는다. 테스트나 fixture 기반 검증에 적합하다. |

live 경로의 순서는 다음과 같다.

1. `fetched_at`, `today`를 정한다.
2. `_source_registry()`에 등록된 source를 순회한다.
3. 각 source URL을 `fetch_external_source_html()`로 가져온다.
4. `_collect_source_records()`에서 source별 parser를 실행한다.
5. parser 결과를 `external_source_repository.upsert_external_source_records()`로 저장한다.
6. 하나라도 저장된 row가 있으면 `policy_normalization.promote_external_benefits_to_policies()`를 호출한다.
7. 마지막에 `db.commit()` 한다.
8. source별 성공/실패를 모아 `success`, `partial_success`, `error` 중 하나의 outcome을 반환한다.

## 등록된 source와 parser

파일: `backend/app/services/external_benefit_collection.py`

| source_category | URL/출처 | parser | 공개 정책 승격 여부 |
| --- | --- | --- | --- |
| `regional_benefit` | 여행가는 달 지역 혜택 legacy source | `parse_regional_benefits()` | 현재 public 승격 대상 아님. legacy source evidence로 보존/hidden 대상이다. |
| `traffic_benefit` | 여행가는 달 교통 혜택 legacy optional source | `parse_traffic_benefits()` | 현재 public 승격 대상 아님. 404/410이면 optional unavailable로 취급될 수 있다. |
| `local_half_trip` | `https://korean.visitkorea.or.kr/dgtourcard/tour50.do` | `parse_dgtourcard_benefits()` | 공개 승격 대상이다. active/scheduled + fresh/unknown 조건을 통과해야 한다. |
| `stay_discount` | `https://ktostay.visitkorea.or.kr/` | `parse_stay_discount_benefits()` | 공개 승격 대상이다. active + fresh 조건을 통과해야 한다. |

## parser가 만드는 값

파일: `backend/app/schemas/external_sources.py`

Parser는 최종적으로 `ExternalBenefitSource` 형태의 값을 만든다. 이 값이 원천 수집 레코드의 표준 중간 형태다.

| `ExternalBenefitSource` 필드 | 의미 | 이후 사용처 |
| --- | --- | --- |
| `source_name` | 출처 이름. 예: 여행가는 달, 대한민국 숙박세일 페스타 | `external_source_records.source_name`, `policies.source_name` |
| `source_type` | 공식 캠페인 같은 source 유형 | `external_source_records.source_type`, `policies.source_type` |
| `source_url` | source 대표 URL | 원천 추적/관리용 |
| `source_category` | `local_half_trip`, `stay_discount` 같은 분류 | 승격/hidden 판단, 정책 분류, admin 요약 |
| `external_id` | 외부 페이지 안의 항목 식별자 | 원천 추적/중복 판단 보조 |
| `canonical_key` | 같은 항목을 안정적으로 식별하는 key | upsert 기준의 일부 |
| `detail_url` | 상세/공식 안내 URL | `policies.official_url`, DTO `officialUrl` 후보 |
| `collected_page_url` | 수집한 목록/대표 페이지 URL | `officialUrl` fallback, 원천 추적 |
| `title` | 정책/혜택 제목 | `policies.title`, DTO `title` |
| `organizer_text` | 주관/운영 기관 문자열 | `policies.organization`, DTO `org` |
| `organizers` | 주관 기관 배열 | 원천 payload 성격 |
| `region`, `city`, `is_nationwide` | 지역 정보 | `policies.region`, list filter, detail meta, trip 생성 region context |
| `status_text`, `status` | 원문 상태와 정규화 상태 | 공개 승격/hidden 판단 |
| `start_date`, `end_date` | 시작/종료일 | `policies.start_date/end_date`, DTO `deadline`, 상세 신청 기간 |
| `benefit_text` | 혜택 본문 요약 | `policy_comment`, `summary`, fallback 설명 |
| `benefit_value_text` | 금액/할인율 등 사람이 읽는 혜택값 | `policies.benefit_detail`, DTO `amount` |
| `extracted_amount_krw` | 추출된 원화 금액 | `policies.benefit_amount`, DTO amount fallback |
| `extracted_discount_percent` | 추출된 할인율 | 분류/표현 보조 |
| `benefit_value_type` | amount/percent/free/mixed 등 | admin/품질 판단 보조 |
| `tags` | parser가 뽑은 태그 | 분류/추천 보조 |
| `contact_text` | 문의/조건성 텍스트 | `target_condition` 후보 |
| `inferred_travel_styles` | 추론된 여행 스타일 | 추천/품질 판단 보조 |
| `confidence`, `field_completeness` | parser 품질 점수 | 품질 리포트/운영 판단 |
| `raw_list_text`, `raw_detail_text` | 원문에서 추출한 목록/상세 텍스트 | `description`, `summary`, 조건 추출 fallback |
| `raw_payload` | source별 추가 구조화 데이터 | stay discount eligible areas 등 alias/특수 표시 |
| `last_fetched_at`, `last_verified_at` | 수집/검증 시각 | `policies.normalized_at`, `last_verified_at`, 운영 상태 |
| `freshness_status` | fresh/stale/expired/unknown | 공개 승격/hidden 판단 |

## `external_source_records` 저장

파일: `backend/app/repositories/external_sources.py`

저장은 `upsert_external_source_records()`가 담당한다.

Upsert 기준은 다음 3개다.

```text
source_name + source_category + canonical_key
```

동일한 공식 source 항목이 다시 수집되면 새 row를 계속 만들지 않고 기존 `external_source_records` row를 갱신한다. 이 테이블은 화면에 바로 보여주기 위한 최종 정책 테이블이라기보다, **공식 source에서 가져온 원천/정규화 전 기록**이다.

## 공개 정책 승격/hidden 처리

파일:

- `backend/app/repositories/external_sources.py`
- `backend/app/services/policy_normalization.py`

`external_source_records`에 저장된 모든 row가 바로 사용자 화면에 나오지는 않는다. 공개 가능한 source만 `policies`로 승격한다.

### 승격 대상 조건

`list_policy_promotion_records()`는 현재 다음 조건을 사용한다.

| source_category | 공개 승격 조건 |
| --- | --- |
| `local_half_trip` | `status in (active, scheduled)` 그리고 `freshness_status in (fresh, unknown)` |
| `stay_discount` | `status = active` 그리고 `freshness_status = fresh` |

`regional_benefit`, `traffic_benefit`은 legacy/evidence 성격으로 남기고 공개 정책 승격 대상에서는 제외한다.

### `policies`로 매핑되는 값

파일: `backend/app/services/policy_normalization.py`

`_assign_policy_from_external_record()`가 원천 record를 정책 row로 바꾼다.

| 원천 `ExternalSourceRecord` | `Policy` DB 필드 | 의미 |
| --- | --- | --- |
| `id` | `external_source_record_id` | 어떤 원천 record에서 승격됐는지 연결 |
| `id` | `slug = travelmonth-{id}` | 외부 수집 정책의 public slug |
| `title` | `title` | 정책 제목 |
| `organizer_text` or `source_name` | `organization` | 주관 기관 |
| record 전체 | `policy_type` | `classify_external_policy_category()` 결과. 교통/숙박/여행상품/지역할인/이벤트/기타 중 하나로 정규화된다. |
| `raw_detail_text` or `benefit_text` | `description` | 상세 설명 본문 |
| `extracted_amount_krw` or 추출값 | `benefit_amount` | 금액형 혜택 fallback |
| `benefit_value_text` or 추출값 or `benefit_text` | `benefit_detail` | DTO `amount`의 주 재료 |
| 조건 추출 결과 | `target_condition` | DTO `requirements`의 재료 |
| `region` or 전국 | `region` | 목록 필터/상세 meta |
| `start_date`, `end_date` | `start_date`, `end_date` | 상세 신청 기간/마감일 |
| `detail_url` or `collected_page_url` | `official_url` | 상세 CTA `혜택 안내 보기` |
| 없음 | `apply_url = None` | 별도 신청 URL은 현재 외부 수집 승격에서 넣지 않는다. |
| `benefit_text[:300]` | `policy_comment` | DTO `summary` 우선 후보 |
| source 관련 필드들 | `source_type`, `source_name`, `source_category`, `source_url`, `source_canonical_key` | 추적/관리용 |
| `last_fetched_at`, `last_verified_at`, `freshness_status` | `normalized_at`, `last_verified_at`, `verification_status` | 운영/검증 상태 |

공개 조건을 벗어난 기존 승격 정책은 `status = "hidden"`으로 내려 사용자 목록/상세에서 제외한다.

## API DTO 변환

파일: `backend/app/services/policies.py`

화면은 DB row를 직접 받지 않고 `Policy` DTO를 받는다. `policy_to_api()`가 `Policy` ORM 객체를 frontend용 dict로 바꾼다.

| `Policy` DB 필드 | API DTO 필드 | frontend 의미 |
| --- | --- | --- |
| `slug` | `id`, `slug` | route key와 React key |
| `benefit_amount`/display override | `label`, `tag` | 카드/상세 badge |
| `title` | `title` | 정책 제목. `local_half_trip_display.policy_title()`로 지역 접두어가 붙을 수 있다. |
| `organization` | `org` | 상세 meta의 주관 기관 |
| `region` | `region` | 목록 필터, 상세 meta, 일정 생성 region context |
| `end_date` | `deadline` | D-day와 신청 기간 표시 |
| `benefit_detail` or 금액 fallback | `amount` | 상세의 큰 혜택 금액/요약 |
| `policy_comment` or `description` | `summary` | 지원 내용 section을 쪼개는 주 입력 |
| display override | `match` | 추천/정렬 보조 점수 |
| `policy_type` | `category` | 교통/숙박/여행상품/지역할인/이벤트/기타 |
| `target_condition` | `requirements` | 신청 대상/혜택 적용 조건/확인 필요 사항으로 분류됨 |
| `policy.documents` | `documents` | 필요 서류 목록 |
| `structured_detail` | `structuredDetail` | 혜택/조건/기간/링크/필요 서류/주의사항을 화면 섹션으로 보여주는 사용자 화면용 JSON. raw 수집 JSON이 아니다. |
| `official_url` | `officialUrl` | `혜택 안내 보기` CTA |
| `apply_url` | `applyUrl` | `신청하러 가기` CTA. 있으면 officialUrl보다 우선 |
| `external_source_record_id`/`source_type` | `sourceType` | internal/external 구분 |

### stay discount alias 특수 처리

`stay_discount`는 DB에는 canonical 정책 1건을 저장하지만, 목록/검색/추천에서는 `raw_payload.eligibleAreas`를 기반으로 지역별 alias로 보일 수 있다.

- 목록 slug 예: `stay-discount-{sidoSlug}-{citySlug}`
- 실제 저장/일정 연결은 canonical `policies.id` 기준으로 중복을 방지한다.
- 상세 표시에서는 제목과 지역이 alias 지역에 맞게 바뀐다.

### raw external fallback

`get_policy()`는 `policies`에서 찾지 못했을 때 일부 `external_source_records`를 fallback DTO로 바꿀 수 있다. 이 경우 `actionStatus = "infoOnly"`가 붙을 수 있고, frontend는 저장/일정 담기를 제한한다.

## 정책 API route

파일: `backend/app/api/routes/policies.py`

| route | 내부 호출 | 역할 |
| --- | --- | --- |
| `GET /api/policies` | `policy_service.list_policies(db)` | active 정책 목록을 반환한다. |
| `GET /api/policies/{policy_slug}` | `policy_service.get_policy(policy_slug, db)` | slug 기준 상세 정책을 반환한다. 없거나 hidden이면 404. |
| `POST /api/me/saved-policies/{policy_slug}` | `policy_service.save_policy()` | 정규화된 정책 저장. raw infoOnly는 저장 대상이 아닐 수 있다. |
| `POST /api/trips/{tripId}/policies/{policySlug}` | trip service 쪽에서 policy slug 해석 | 정책을 일정에 담는다. |

Route는 얇고, 실제 조회/변환은 service/repository가 담당한다.

## frontend API boundary

파일:

- `frontend/src/api/appDataApi.ts`
- `frontend/src/api/backendApi.ts`
- `frontend/src/api/types.ts`

`appDataApi`는 현재 `backendApi`를 그대로 export한다.

```ts
export const appDataApi = backendApi;
```

정책 화면은 seed data나 backend client 세부 구현을 직접 보지 않고 `appDataApi` 경계를 통해 호출한다.

| frontend 함수 | HTTP API | 반환 타입 |
| --- | --- | --- |
| `appDataApi.listPolicies()` | `GET /api/policies` | `Policy[]` |
| `appDataApi.getPolicy(policySlug)` | `GET /api/policies/{policySlug}` | `Policy` |
| `appDataApi.savePolicy(policySlug)` | `POST /api/me/saved-policies/{policySlug}` | `SavePolicyResponse` |
| `appDataApi.addPolicyToTrip(tripId, policySlug)` | `POST /api/trips/{tripId}/policies/{policySlug}` | `TripPolicyResponse` |

Frontend `Policy` 타입은 camelCase DTO를 사용한다. 예: `officialUrl`, `applyUrl`, `sourceType`, `actionStatus`.

## 정책 목록 화면 반영

파일: `frontend/src/pages/PolicyPages.tsx`

`PolicyListPage` 흐름:

1. `useAsyncResource(() => appDataApi.listPolicies(), [])`로 정책 목록을 가져온다.
2. `region`, `category`, `period`, `amount`, `savedOnly`, 검색어로 client-side filtering을 한다.
3. `getPolicyListPriorityScore()`로 마감/혜택 명확성/매칭 점수를 반영해 정렬한다.
4. `PolicyListCard`에 `policy` DTO를 넘겨 카드로 표시한다.
5. 카드에서 사용하는 slug는 `/policies/${policy.slug}` 상세 route로 이어진다.


## 구조화 상세 JSON 반영

파일:
- `backend/app/models/tables.py`
- `backend/app/services/policy_structured_detail.py`
- `backend/app/services/policies.py`
- `frontend/src/pages/PolicyPages.tsx`

`policies.structured_detail`은 사용자 정책 상세 화면을 더 체계적으로 그리기 위한 정리본이다. `external_source_records.raw_payload`처럼 수집 원문을 그대로 담는 창고가 아니라, 화면에서 바로 읽기 쉬운 책장 카드에 가깝다.

v1 표준 섹션은 아래 여섯 개다.

```json
{
  "benefits": [],
  "conditions": [],
  "periods": [],
  "links": [],
  "documents": [],
  "notices": []
}
```

운영 적용은 안전하게 시작한다. `structuredDetail`이 있고 어떤 섹션이 비어 있지 않으면 frontend가 그 섹션을 보여준다. 비어 있는 섹션은 기존처럼 `summary`, `amount`, `requirements`, `documents`, 기간 값을 사용해 채운다. `links.url`은 `http://` 또는 `https://`만 화면에 링크로 보여준다. `structuredDetail`이 없거나 전체가 비어 있으면 기존 방식 그대로 상세 화면을 그린다.

## 정책 상세 화면 반영

파일: `frontend/src/pages/PolicyPages.tsx`

`PolicyDetailPage` 흐름:

1. route parameter `policyId`를 읽는다.
2. `useAsyncResource(() => appDataApi.getPolicy(policyId), [policyId])`로 상세 정책 DTO를 가져온다.
3. DTO 필드를 가공해 여러 section을 만든다.
4. 저장/공유/일정 담기/공식 안내 CTA를 렌더링한다.

### 상세 화면 section별 입력 필드

| 화면 영역 | frontend 함수/위치 | 사용하는 DTO 필드 | 설명 |
| --- | --- | --- | --- |
| 제목 | `<h1>{policy.title}</h1>` | `title` | `policies.title`에서 온다. 일부 source는 지역 접두어가 붙는다. |
| 주관/지역 meta | title block | `org`, `region` | `organization`, `region`에서 온다. |
| badge/tag | `getPolicyDisplayTag()` | `tag`, `category` | 표시용 tag가 generic이면 category로 대체한다. |
| D-day | `dday(policy.deadline)` | `deadline` | backend `end_date`가 ISO string으로 온다. |
| 지원 내용 큰 금액 | `getPolicyAmountLabel()` | `amount`, `title`, `category` | `benefit_detail` 또는 금액 fallback에서 온다. |
| 지원 내용 항목 | `getPolicyBenefitSections()` | `summary`, `amount` | `summary`를 줄 단위/패턴별로 나눠 핵심 혜택, 운영 기간, 이용 조건, 유의사항으로 분류한다. |
| 신청 기간 | `getPolicyPeriodLabel()` | `deadline` | 현재 frontend는 시작일을 DTO로 받지 않고 고정 시작 문구 + deadline 형태로 표시한다. |
| 신청 대상/조건 | `getPolicyRequirementSections()` | `requirements`, `region` | backend `target_condition`을 쪼갠 배열을 다시 신청 대상/혜택 조건/확인 사항으로 분류한다. |
| 필요 서류 | map over `policy.documents` | `documents` | `policy_documents` 관계에서 온다. 외부 fallback은 `혜택 안내 확인`을 쓸 수 있다. |
| 저장 버튼 | `savePrototypePolicy()` | `slug`, `actionStatus` | `actionStatus=infoOnly`이면 저장 제한. |
| 일정 담기 | `addToTrip()` / `attachPolicyToTrip()` | `slug`, `region`, `title`, `actionStatus` | 정규화된 정책만 일정 연결 가능. |
| CTA | `getPolicyApplicationCta()` | `applyUrl`, `officialUrl` | `applyUrl`이 있으면 `신청하러 가기`, 없고 `officialUrl`이 있으면 `혜택 안내 보기`. |

## end-to-end 값 흐름 예시

아래는 `local_half_trip` 같은 외부 수집 정책이 상세 화면까지 가는 대표 흐름이다.

| 단계 | 값 예시 | 저장/변환 위치 | 다음 단계 |
| --- | --- | --- | --- |
| Parser | `title`, `region`, `city`, `benefit_text`, `raw_detail_text`, `end_date`, `detail_url`, `status`, `freshness_status` | `ExternalBenefitSource` | repository upsert |
| 원천 DB | 같은 값들이 snake_case column으로 저장 | `external_source_records` | promotion 대상 선별 |
| 승격 조건 | `source_category=local_half_trip`, `status=active/scheduled`, `freshness_status=fresh/unknown` | `list_policy_promotion_records()` | `policies` 생성/갱신 |
| 정책 DB | `slug=travelmonth-{id}`, `title`, `organization`, `policy_type`, `description`, `benefit_detail`, `target_condition`, `region`, `end_date`, `official_url` | `policies` | API DTO 변환 |
| API DTO | `title`, `org`, `category`, `amount`, `summary`, `requirements`, `deadline`, `officialUrl`, `sourceType` | `policy_to_api()` | frontend fetch |
| 상세 화면 | 제목, 지원 내용, 신청 기간, 조건, 필요 서류, 혜택 안내 CTA | `PolicyDetailPage` | 사용자 표시 |

## 현재 이해할 때 중요한 제한/주의점

1. **자동 수집은 기본 compose에서 꺼져 있다.**
   `EXTERNAL_COLLECTION_SCHEDULER_ENABLED=false`이므로 로컬 기본 실행만 보고 "자동으로 계속 최신화된다"고 판단하면 안 된다.

2. **수집 성공과 공개 노출은 다르다.**
   `external_source_records`에 저장되어도 공개 조건을 통과해야 `policies.status="active"`로 사용자 화면에 나온다.

3. **legacy source는 보존되지만 public 정책으로 승격되지 않을 수 있다.**
   `regional_benefit`, `traffic_benefit`은 현재 public 승격보다 source evidence/hidden 처리 쪽에 가깝다.

4. **`stay_discount`는 alias가 있다.**
   DB 정책 1건이 화면에서는 지자체별 alias 여러 개처럼 보일 수 있다. 저장/일정 연결은 canonical 정책으로 처리한다.

5. **상세 화면은 DTO를 다시 가공한다.**
   backend가 `summary`, `requirements`, `documents`, `officialUrl`을 내려주고, frontend가 이를 화면 section으로 다시 분류한다. 따라서 화면 문구는 DB column 하나와 1:1로만 대응하지 않는다.

6. **공식 신청 링크와 공식 안내 링크는 다르다.**
   `applyUrl`이 있으면 신청 CTA가 되고, 없으면 `officialUrl`이 안내 CTA가 된다. 외부 수집 승격에서는 현재 `apply_url`을 별도로 채우지 않고 `official_url` 중심으로 연결한다.

## 빠른 추적 순서

정책 상세 화면의 어떤 문구가 어디서 왔는지 추적할 때는 아래 순서로 보면 된다.

1. Frontend 상세 화면: `frontend/src/pages/PolicyPages.tsx`
2. Frontend DTO 타입: `frontend/src/api/types.ts`
3. API 호출: `frontend/src/api/backendApi.ts`
4. Backend route: `backend/app/api/routes/policies.py`
5. DTO 변환: `backend/app/services/policies.py`
6. 정책 DB 조회: `backend/app/repositories/policies.py`
7. 정책 승격 로직: `backend/app/services/policy_normalization.py`
8. 원천 upsert/승격 후보: `backend/app/repositories/external_sources.py`
9. source 수집 orchestration: `backend/app/services/external_benefit_collection.py`
10. source별 parser: `backend/app/services/*parser.py`
