# Travel Hunter 다음 작업 우선순위

## 1. 현재 기준

- 기준 브랜치: `feat/prototype-to-react`
- 최근 기준 커밋:
  - `6f5027d chore: establish db-backed policy baseline`
  - `434b6b8 test: cover policy db error paths`
  - `8a52c00 feat: add db-backed authentication`
- 현재 작업 상태:
  - 정책 목록/상세 API는 DB-backed mode를 지원한다.
  - 인증 `signup/login/me/refresh/logout`는 DB-backed mode를 지원한다.
  - 일정/trip 계열 API는 numeric DB id와 legacy alias `jeju-3-days` 호환 전략을 적용해 DB-backed mode를 지원한다.
  - Mock mode의 기존 `jeju-3-days` 응답 shape는 유지한다.

## 2. 다음 우선순위

| 우선순위 | 작업 | 상태 | 성공 기준 |
|----------|------|------|-----------|
| 1 | frontend backend-mode 통합 smoke 강화 | 다음 작업 | backend server + frontend e2e가 `VITE_DATA_SOURCE=backend` 기준으로 로그인, 일정 목록, 일정 상세, 추천, 초대까지 검증한다. |
| 2 | 일정 생성/정책 연결 UX를 DB 저장 기준으로 보강 | 대기 | `createTrip` 후 numeric id route로 이동하고, 정책 상세의 `내 일정에 담기`가 실제 `trip_policies` 연결을 호출한다. |
| 3 | profile DB persistence 설계 | 대기 | ERD v0.3에 없는 `style`, `budget` 저장 방식을 결정하고 API 계약을 갱신한다. |
| 4 | 친구 초대 수락 DB-backed 구현 | 대기 | `/api/invites/{token}/accept`가 `trip_invites.accepted_at`과 membership 처리를 실제 DB 기준으로 수행한다. |
| 5 | 배포/CI 통합 검증 강화 | 대기 | GitHub Actions 또는 로컬 CI 스크립트에서 backend DB mode와 frontend backend mode smoke를 함께 실행한다. |

## 3. 일정/trip DB-backed 기준

- `trips.slug`는 만들지 않는다.
- API의 `tripId`는 string handle로 유지한다.
- DB mode 기본 `Trip.id`는 `trips.id`를 문자열로 변환한 numeric string이다.
- `/api/trips/jeju-3-days`는 seed/prototype 호환용 legacy alias로만 지원한다.
- legacy alias 응답의 `id`도 numeric string이어야 한다.
- DB mode trip endpoint는 Bearer access token이 필요하다.
- 접근 권한은 owner 또는 `trip_members` 포함 여부로 판단한다.
- 없는 trip, 지원하지 않는 alias, 접근 권한이 없는 trip은 모두 `404 {"detail": "Trip not found"}`를 반환한다.

## 4. 검증 명령

기본 검증:

```bash
cd backend
python -m pytest
alembic upgrade head --sql

cd ..
docker compose -f compose.yaml config

cd frontend
npm run typecheck
npm test
npm run test:e2e
npm run build
```

DB smoke:

```bash
docker compose -f compose.yaml up -d db
cd backend
$env:DATABASE_URL="postgresql+psycopg://travelhunter:travelhunter@127.0.0.1:55432/travelhunter"
alembic upgrade head
python -m app.db.seed
$env:BACKEND_DATA_SOURCE="db"
$env:AUTH_SECRET_KEY="dev-only-change-me-secret-key-32-bytes"
python -m pytest
```

## 5. 주의사항

- host `127.0.0.1:5432`는 기존 로컬 PostgreSQL과 충돌할 수 있으므로 compose DB는 host `127.0.0.1:55432`를 사용한다.
- API DTO는 `camelCase`, DB 필드는 `snake_case`를 유지한다.
- 응답에는 `password_hash`, `refresh_token_hash`, `provider_id`를 포함하지 않는다.
- schema 생성은 Alembic만 사용하고 SQLAlchemy `create_all()`은 사용하지 않는다.
- `Trip.expectedSaving`, `InviteState.copied`, `InviteState.invited`는 DB 원본 컬럼이 아니라 service mapper 계산값이다.
