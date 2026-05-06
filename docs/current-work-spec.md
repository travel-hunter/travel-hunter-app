# Travel Hunter 현재 구현 명세

## 1. 현재 상태

Travel Hunter는 React/Vite 프론트엔드와 FastAPI 백엔드로 구성된 국내 여행 혜택/일정 MVP다. 프론트는 실제 서비스형 반응형 웹으로 동작하고, 백엔드는 기본 `mock` mode와 PostgreSQL 기반 `db` mode를 모두 지원한다.

현재 구현 기준은 다음 문서가 단일 소스다.

| 문서 | 역할 |
|------|------|
| `docs/current-work-spec.md` | 현재 구현 상태 요약 |
| `docs/mvp-api-contract.md` | API request/response/error 계약 |
| `docs/next-work-plan.md` | 다음 작업 우선순위 |
| `docs/db-schema-v0.3.sql` | ERD v0.3 SQL 기준본 |

## 2. 주요 위치

| 구분 | 위치 |
|------|------|
| App root | `C:\Users\HP\Documents\프로젝트\진행중\travel-hunter-app` |
| Frontend | `frontend` |
| Backend | `backend` |
| Backend routes | `backend/app/api/routes` |
| Backend services | `backend/app/services` |
| Backend repositories | `backend/app/repositories` |
| Frontend API boundary | `frontend/src/api` |
| Frontend pages | `frontend/src/pages` |
| Prototype archive | `C:\Users\HP\Documents\프로젝트\진행중\travel-hunter-prototype` |
| ERD source files | `C:\Users\HP\Documents\프로젝트\진행중\files` |

## 3. Frontend 구현 범위

- Vite + React + TypeScript + React Router 기반이다.
- `AppRoot`, `SessionProvider`, `ProtectedRoute`로 앱 진입과 세션을 구성한다.
- 모든 화면 데이터는 `frontend/src/api`의 `AppDataApi` 경계를 통해 접근한다.
- `VITE_DATA_SOURCE=mock|backend`로 mock data와 FastAPI backend를 선택한다.
- backend mode에서는 access token을 `Authorization: Bearer <token>`으로 보내고 refresh cookie를 위해 `credentials: "include"`를 사용한다.
- 정책 목록은 `GET /api/policies` 결과를 기반으로 검색어, 지역, 카테고리 client-side 필터를 제공한다.
- 정책 상세의 `내 일정에 담기`는 일정 선택 sheet를 열고, 선택한 일정에 정책을 연결한다.
- 정책 상세의 신청/공식 안내 링크는 검증된 공식 URL만 사용하고, 정확한 신청 deep link가 없으면 `applyUrl`을 `null`로 둔다.
- 일정 생성은 `region`, `style`, 선택적 `policySlug`를 API payload로 전송한다.
- 초대 링크 `/invites/:inviteToken/accept`는 비로그인 사용자를 로그인으로 보낸 뒤 원래 링크로 복귀해 초대를 수락한다.
- CI에서는 mock-mode Playwright와 backend-mode Playwright를 별도 job으로 실행하도록 구성한다.

### Route mapping

| Prototype route | Production route | Page |
|-----------------|------------------|------|
| `onboarding` | `/`, `/onboarding` | `OnboardingPage` |
| `signup` | `/signup` | `SignupPage` |
| `login` | `/login` | `LoginPage` |
| `profile-setup` | `/profile-setup` | `ProfileSetupPage` |
| `home` | `/home` | `HomePage` |
| `policy-list` | `/policies` | `PolicyListPage` |
| `policy-detail` | `/policies/:policySlug` | `PolicyDetailPage` |
| `itinerary-list` | `/trips` | `ItineraryListPage` |
| `itinerary-create` | `/trips/new` | `ItineraryCreatePage` |
| `itinerary-detail` | `/trips/:tripId` | `ItineraryDetailPage` |
| `ai-results` | `/ai-results` | `AiResultsPage` |
| `friend-invite` | `/friend-invite` | `FriendInvitePage` |
| Invite accept link | `/invites/:inviteToken/accept` | `InviteAcceptPage` |
| `mypage` | `/mypage` | `MyPage` |

## 4. Backend 구현 범위

- FastAPI route/schema/service/repository/data 계층으로 구성한다.
- SQLAlchemy 2.x sync ORM, psycopg 3, Alembic, PostgreSQL 16을 사용한다.
- `BACKEND_DATA_SOURCE=mock|db`로 deterministic mock service와 DB-backed service를 선택한다.
- schema 생성은 Alembic만 사용한다. `create_all()`은 사용하지 않는다.
- 개발 seed는 `python -m app.db.seed`로 주입하며 idempotent해야 한다.
- staging readiness 기준은 root `README.md`, `frontend/README.md`, `backend/README.md`, `.agent/evals/release-scorecard.md`에 정리한다.

DB-backed 완료 endpoint:

- `GET /api/policies`
- `GET /api/policies/{policySlug}`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/me`
- `GET /api/me/profile`
- `PATCH /api/me/profile`
- `GET /api/me/saved-policies`
- `POST /api/me/saved-policies/{policySlug}`
- `DELETE /api/me/saved-policies/{policySlug}`
- `GET /api/trips`
- `POST /api/trips`
- `GET /api/trips/{tripId}`
- `POST /api/trips/{tripId}/policies/{policySlug}`
- `GET /api/trips/{tripId}/recommendations`
- `GET /api/trips/{tripId}/invite`
- `POST /api/trips/{tripId}/invite`
- `POST /api/trips/{tripId}/invites`
- `POST /api/invites/{inviteToken}/accept`

Mock-only 또는 부분 구현 endpoint: 현재 없음. 실제 외부 연동 기능은 미구현 범위에 별도로 둔다.

## 5. ERD/API v0.3 기준

- `policies.slug`를 정책 상세 조회 key로 사용한다.
- `trips.slug`는 만들지 않는다.
- DB mode `Trip.id`는 `trips.id`를 문자열로 반환한다.
- `jeju-3-days`는 seed/prototype 호환 legacy alias이며 DB 컬럼으로 저장하지 않는다.
- canonical numeric trip handle은 `^[1-9][0-9]*$`만 허용한다.
- legacy alias 조회도 Bearer 인증과 owner/member 접근 권한 검사를 우회하지 않는다.
- API DTO는 `camelCase`, DB/SQL 필드는 `snake_case`다.
- 응답에 `password_hash`, `refresh_token_hash`, `provider_id`를 포함하지 않는다.
- `Policy.match`, `Trip.expectedSaving`, `InviteState.copied`, `InviteState.invited`는 DB 원본 필드가 아니라 계산/상태 값이다.
- `users.travel_style`, `users.travel_budget`은 profile persistence용 v0.3.1 extension migration으로 추가한다.
- `user_saved_policies`는 정책 단독 저장 persistence용 v0.3.2 extension migration으로 추가한다.
- `policies.apply_url`은 정책 신청 deep link용 v0.3.3 extension migration으로 추가한다.

## 6. 실행 및 검증

Frontend:

```bash
cd frontend
npm install
npm run dev
npm run typecheck
npm test
```

Backend:

```bash
cd backend
python -m pip install -r requirements.txt
python -m pytest
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

DB:

```bash
docker compose -f compose.yaml up -d db
cd backend
$env:DATABASE_URL="postgresql+psycopg://travelhunter:travelhunter@127.0.0.1:55432/travelhunter"
alembic upgrade head
python -m app.db.seed
```

Fast lane 최근 통과 검증:

- `python -m pytest`: 68 passed
- `npm run typecheck`: passed
- `npm test`: 16 passed
- `git diff --check`: passed

Release gate validation:

- `npm run test:e2e`: passed, 6 tests.
- `npm run build`: passed.
- `docker compose -f compose.yaml config`: passed.
- `npm run test:e2e:backend`, `docker compose -f compose.yaml build`, compose DB migration, and compose seed are blocked until Docker Desktop is running.

Current blocker:

- Docker Desktop daemon is not running. Docker-backed release gates fail to connect to `npipe:////./pipe/dockerDesktopLinuxEngine`.

## 7. 미구현 범위

- 소셜 로그인 실제 연동
- 정책 실시간 수집 API
- 지도/장소 검색/이동 시간 계산
- 실제 AI 추천 엔진
- 친구 초대 실제 발송
- AWS/EKS/Argo CD 배포

## 8. 다음 작업

다음 작업 우선순위는 `docs/next-work-plan.md`를 따른다. 현재 1순위는 Docker Desktop 실행 후 Docker-backed release gate 재실행이다.
