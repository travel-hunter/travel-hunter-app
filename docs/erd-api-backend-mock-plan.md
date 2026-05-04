# Travel Hunter ERD/API 계약 확정 + 백엔드 Mock API 연결 준비

## Summary

이 문서는 ERD를 받은 뒤 바로 API 계약 확정과 백엔드 Mock API 작업으로 이어가기 위한 기준 문서다.

현재 Travel Hunter production 앱의 프론트엔드는 `frontend/src/api/types.ts` 타입과 `AppDataApi` 경계를 기준으로 동작한다. ERD v0.3 권장안은 채택됐고, 다음 단계의 우선순위는 DB 연결이 아니라 v0.3 SQL과 API 계약을 기준으로 PostgreSQL/Alembic 구현 범위를 확정하는 것이다.

기존 `docs/mvp-api-contract.md`는 현재 초안으로 유지한다. ERD 분석이 끝난 뒤 UTF-8 기준으로 다시 정리해 API 계약 문서의 단일 기준으로 만든다.

## 현재 상태

- 프론트 기준 타입은 `frontend/src/api/types.ts`에 있다.
- 화면 데이터는 `frontend/src/api/appDataApi.ts`에서 선택한 `mock` 또는 `backend` 구현체를 통해 공급된다.
- seed data는 `frontend/src/data/seedData.ts`에 보관되어 있다.
- 백엔드는 FastAPI 라우터/스키마/서비스 구조와 v0.3 기준 `/api/*` Mock API가 준비된 상태다.
- 실제 DB, 인증, 정책 API, 일정 CRUD, AI 추천, 친구 초대 발송은 아직 연결하지 않는다.

## 우선순위

1. v0.3 SQL과 MVP API 계약 검수
2. 프론트 타입과 v0.3 entity 매핑 검수
3. FastAPI Mock API endpoint smoke test 유지
4. DB 연결, Alembic, PostgreSQL schema 구현

DB 연결은 API 계약과 ERD 매핑이 확정된 뒤 진행한다.

## ERD 수신 가능 형식

아래 형식 중 하나로 ERD를 받을 수 있다.

- 이미지: PNG, JPG
- 문서: PDF, Markdown, 텍스트
- SQL DDL
- dbdiagram.io 형식
- DrawSQL, Lucidchart, Figma 캡처

ERD를 받으면 원본 형식을 보존하고, production 앱 기준으로 필요한 entity와 API 응답 shape를 분리해 정리한다.

## ERD 분석 체크리스트

ERD를 받으면 먼저 다음 항목을 확인한다.

- 핵심 테이블 존재 여부: user, profile, policy, trip, trip_day, trip_place, recommendation, invite, saved_policy
- 각 테이블의 PK, FK, unique 제약, index 필요 여부
- user와 profile의 1:1 관계
- user와 policy 저장 관계
- user와 trip 소유 관계
- trip과 policy 연결 관계
- trip과 recommendation 연결 관계
- trip과 invite 연결 관계
- enum 후보: policy category, travel style, region, invite status, trip status
- nullable 허용 필드와 필수 필드
- 프론트 화면 응답에 필요한 파생 필드: match, expectedSaving, amount, deadline, copied, invited
- MVP에서 구현할 필드와 이후 확장으로 미룰 필드

## 프론트 타입 매핑 기준

ERD는 아래 프론트 타입과 우선 대조한다.

- `User`: 사용자 기본 정보, 홈 지역, persona, savedAmount
- `Profile`: 추천 지역, 여행 스타일, 예산
- `Policy`: 정책명, 기관, 지역, 마감일, 금액, 요약, 매칭률, 대상 조건, 필요 서류
- `Trip`: 일정명, 기간, 참여자, 예상 절감액, 일차별 장소
- `Recommendation`: AI 추천 라벨, 제목, 메타 정보, 추천 이유
- `InviteState`: 초대 링크, 초대 완료 여부, 링크 복사 여부
- `ProfileOptions`: 지역, 여행 스타일, 예산 옵션

DB 저장 필드와 API 응답 필드는 반드시 구분한다. 예를 들어 `match`, `expectedSaving`, `copied` 같은 값은 DB 원본 필드가 아니라 화면 상태 또는 계산 결과일 수 있다.

## API 계약 확정 대상

MVP API는 `/api` prefix를 기준으로 정리한다.

### 인증/사용자

- `POST /api/auth/login`
- `POST /api/auth/signup`
- `GET /api/me`
- `PATCH /api/me/profile`
- `GET /api/profile-options`

### 정책

- `GET /api/policies`
- `GET /api/policies/{policyId}`
- `POST /api/me/saved-policies/{policyId}`

### 일정

- `GET /api/trips`
- `POST /api/trips`
- `GET /api/trips/{tripId}`
- `POST /api/trips/{tripId}/policies/{policyId}`

### AI 추천

- `GET /api/trips/{tripId}/recommendations`

### 친구 초대

- `GET /api/trips/{tripId}/invite`
- `POST /api/trips/{tripId}/invite`

### 헬스체크

- `GET /api/health`

## 백엔드 Mock API 준비 범위

ERD와 API 계약이 확정되면 FastAPI에 Mock API를 먼저 만든다.

- 실제 DB 없이 seed data 또는 in-memory data를 사용한다.
- 프론트 타입과 같은 response shape를 반환한다.
- 인증은 실제 보안 구현 없이 개발용 token 또는 session stub으로 처리한다.
- 정책 저장, 일정에 정책 담기, 초대 완료 같은 액션은 in-memory 상태 변경으로 검증한다.
- `/api/health`는 유지한다.
- PostgreSQL, Alembic, 실시간 정책 API, 실제 AI 엔진, 친구 초대 발송은 다음 단계로 둔다.

## 작업 순서

1. ERD 원본을 받는다.
2. ERD entity를 프론트 타입과 매핑한다.
3. 누락 entity와 과도한 entity를 분리한다.
4. MVP API endpoint별 request/response 초안을 작성한다.
5. `docs/mvp-api-contract.md`를 UTF-8 기준으로 정리한다.
6. FastAPI Mock API endpoint skeleton을 구현한다.
7. backend pytest로 Mock API smoke test를 작성한다.
8. frontend client가 Mock API 응답을 받을 수 있는지 확인한다.
9. 이 기준이 안정되면 DB schema와 Alembic migration으로 넘어간다.

## Test Plan

### 문서 검증

- `docs/erd-api-backend-mock-plan.md`가 존재해야 한다.
- 한글이 UTF-8로 정상 표시되어야 한다.
- 기존 `docs/mvp-api-contract.md`는 이 단계에서 수정하지 않는다.

### ERD 분석 검증

- `frontend/src/api/types.ts`와 ERD 필드 차이 목록을 만든다.
- entity별 MVP 포함 여부를 표시한다.
- API endpoint별 request/response 초안을 작성한다.
- DB 저장 필드와 API 응답 필드를 분리한다.

### 다음 구현 검증

- backend pytest로 `/api/health`와 Mock API endpoint smoke test를 통과시킨다.
- frontend에서 `mockApi`를 backend client로 전환해도 화면 흐름이 깨지지 않는지 확인한다.
- 인증, 정책 목록, 정책 상세, 일정 목록, 일정 상세, AI 추천, 친구 초대 route를 smoke test한다.

## Assumptions

- 계획 문서는 production 앱 기준이므로 `travel-hunter-app/docs`에 저장한다.
- ERD를 받기 전에는 DB 연결, Alembic, PostgreSQL schema 구현을 시작하지 않는다.
- ERD가 없으면 현재 프론트 타입을 MVP API 계약의 임시 기준으로 사용한다.
- 백엔드 Mock API는 실제 인증, DB 저장, AI 추천 계산 없이 프론트 연동 검증용으로 만든다.
- 실제 서비스 데이터 연동은 Mock API 검증 이후 별도 단계에서 진행한다.
