# Travel Hunter 현재 구현 명세

## 현재 상태

Travel Hunter는 React/Vite 프론트엔드와 FastAPI/PostgreSQL 백엔드로 구성된 국내 여행 정책/일정 MVP다. 런타임 mock mode는 제거됐고, 사용자-facing 인증/데이터 흐름은 항상 FastAPI와 PostgreSQL 기준으로 동작한다.

## 주요 위치

| 구분 | 위치 |
|---|---|
| App root | `C:\Users\HP\Documents\프로젝트\진행중\travel-hunter-app` |
| Frontend | `frontend` |
| Backend | `backend` |
| API contract | `docs/mvp-api-contract.md` |
| DB schema reference | `docs/db-schema-v0.3.sql` |
| Release handoff | `docs/release-candidate-handoff.md` |

## Frontend 구현 범위

- Vite + React + TypeScript + React Router 기반 반응형 웹.
- `AppRoot`, `AppProviders`, `SessionProvider`, `ProtectedRoute` 구조.
- 모든 화면 데이터 접근은 `frontend/src/api/AppDataApi` 경계를 통해 수행.
- `appDataApi`는 항상 `backendApi`를 사용한다.
- 기존 데이터 소스 선택기와 mock e2e는 제거됐다.
- 로그인/회원가입/세션 검증은 `/api/auth/*`, `/api/me` 기준으로 동작.
- 정책 목록은 `GET /api/policies` 결과를 client-side 검색/지역/카테고리 필터로 탐색.
- 정책 상세는 저장 정책, 일정 선택 sheet, 공식/신청 URL CTA를 제공.
- 일정 생성은 `region`, `style`, 선택 `policySlug`를 `POST /api/trips` payload로 전달.
- 초대 수락 route `/invites/:inviteToken/accept`는 로그인 복귀 후 `POST /api/invites/{inviteToken}/accept`를 호출한다.

## Backend 구현 범위

- FastAPI route/schema/service/repository/data 계층.
- SQLAlchemy 2.x sync ORM + psycopg 3 + Alembic + PostgreSQL 16.
- schema 생성은 Alembic만 사용하고 `create_all()`은 사용하지 않는다.
- 개발 seed는 `python -m app.db.seed`로 주입하며 idempotent하다.
- `/api/profile-options`는 DB mock mode가 아니라 앱 정적 옵션 응답이다.

Implemented endpoints:

- `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`
- `GET /api/me`, `GET /api/me/profile`, `PATCH /api/me/profile`, `GET /api/profile-options`
- `GET /api/policies`, `GET /api/policies/{policySlug}`
- `GET /api/me/saved-policies`, `POST /api/me/saved-policies/{policySlug}`, `DELETE /api/me/saved-policies/{policySlug}`
- `GET /api/trips`, `POST /api/trips`, `GET /api/trips/{tripId}`
- `POST /api/trips/{tripId}/policies/{policySlug}`
- `GET /api/trips/{tripId}/recommendations`
- `GET /api/trips/{tripId}/invite`, `POST /api/trips/{tripId}/invite`, `POST /api/trips/{tripId}/invites`
- `POST /api/invites/{inviteToken}/accept`

## DB/API 기준

- `policies.slug`를 정책 상세 key로 사용한다.
- `trips.slug`는 만들지 않는다.
- `Trip.id`는 DB `trips.id`를 string으로 반환한다.
- `jeju-3-days`는 legacy seed alias일 뿐 public slug가 아니다.
- `Policy.match`, `Trip.expectedSaving`, `InviteState.copied`, `InviteState.invited`는 service mapper 계산/상태 값이다.
- API DTO는 `camelCase`, DB/SQL 필드는 `snake_case`.
- 응답에 `password_hash`, `refresh_token_hash`, `provider_id`를 노출하지 않는다.

## Seed Test Account

- Email: `test.user@example.com`
- Password: `password123`
- Display name: `테스트 사용자`

## 최근 검증

- `cd backend && python -m pytest`: 64 passed.
- `cd backend && alembic upgrade head --sql`: passed.
- `docker compose -f compose.yaml config`: passed.
- `cd frontend && npm run typecheck`: passed.
- `cd frontend && npm test`: DB-backed Vitest 16 passed.
- `cd frontend && npm run test:e2e`: DB-backed Playwright 5 passed.
- `cd frontend && npm run build`: passed.
- `docker compose -f compose.yaml build`: passed.

Known local note:

- Windows 환경에서 `backend/.pytest_cache` 접근 경고가 날 수 있지만 테스트 결과에는 영향이 없다.

## 미구현 범위

- 소셜 로그인 실제 연동.
- 정책 실시간 수집 API.
- 지도/장소 검색/이동 시간 계산.
- 실제 AI 추천 엔진.
- 친구 초대 이메일/SMS/카카오톡 실제 발송.
- 운영 관리자 기능.
- 실제 staging/cloud 배포.

## 다음 작업

다음 우선순위는 `docs/next-work-plan.md`를 따른다. 현재는 DB-backed-only 기준을 커밋한 뒤 실제 staging 환경 선택과 배포 실행으로 넘어간다.
