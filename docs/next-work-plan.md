# Travel Hunter 다음 작업 우선순위

## 1. 현재 기준

- 기준 브랜치: `feat/prototype-to-react`
- 최근 기준 커밋:
  - `6f5027d chore: establish db-backed policy baseline`
  - `434b6b8 test: cover policy db error paths`
  - `8a52c00 feat: add db-backed authentication`
  - `10aef8e feat: add db-backed trip services`
  - `cc59f15 fix: harden trip handle resolution`
- 현재 완료 상태:
  - 정책 목록/상세 API가 DB-backed mode를 지원한다.
  - 인증 `signup/login/me/refresh/logout`이 DB-backed mode를 지원한다.
  - 일정/trip 계열 API가 numeric DB id와 legacy alias `jeju-3-days` 호환 전략을 적용한 DB-backed mode를 지원한다.
  - frontend mock-mode e2e와 backend-mode 통합 e2e가 분리되어 실행된다.
  - `npm run test:e2e:backend`가 compose PostgreSQL, Alembic migration, seed, FastAPI, Vite backend-mode, Playwright smoke를 한 번에 검증한다.

## 2. 다음 우선순위

| 우선순위 | 작업 | 상태 | 성공 기준 |
|----------|------|------|-----------|
| 1 | 정책 담기와 일정 생성 UX를 DB 저장 기준으로 보강 | 다음 작업 | `내 일정에 담기`가 backend mode에서 실제 `trip_policies` 연결 API를 호출하고, 일정 생성 후 numeric trip id route로 이동한다. |
| 2 | profile DB persistence 설계 | 대기 | ERD v0.3에 없는 `style`, `budget` 저장 방식을 결정하고 API 계약을 갱신한다. |
| 3 | 친구 초대 수락 DB-backed 구현 | 대기 | `/api/invites/{token}/accept`가 `trip_invites.accepted_at`과 `trip_members` 추가를 실제 DB 기준으로 처리한다. |
| 4 | backend-mode e2e CI 고정 | 대기 | GitHub Actions 또는 로컬 CI 스크립트에서 mock e2e와 backend-mode e2e를 분리 실행한다. |
| 5 | 배포 readiness 정리 | 대기 | staging build, env 분리, containerized validation 기준을 문서화하고 검증한다. |

## 3. 1순위 작업 세부 방향

- 정책 상세의 `내 일정에 담기`는 현재 UI local state만 바꾼다.
- 다음 작업에서는 backend mode에서 첫 번째 접근 가능한 trip을 확인한 뒤 `POST /api/trips/{tripId}/policies/{policySlug}`를 호출한다.
- mock mode는 기존 local state 중심 흐름을 유지한다.
- 정책 연결 성공 후 toast는 유지하되, trip detail로 이동할 때 hardcoded `jeju-3-days` 대신 연결된 trip의 canonical `id`를 사용한다.
- 일정 생성 화면은 이미 `createTrip()` 결과의 `trip.id`로 이동하므로, backend-mode e2e에 create flow를 추가해 회귀를 고정한다.

## 4. 검증 명령

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
npm run test:e2e:backend
npm run build
```

## 5. 주의사항

- `trips.slug` 컬럼은 추가하지 않는다.
- DB mode `Trip.id`는 계속 `str(trips.id)`를 반환한다.
- `jeju-3-days`는 legacy seed alias일 뿐 public slug가 아니다.
- backend-mode e2e는 compose DB host `127.0.0.1:55432`, FastAPI `127.0.0.1:8001`, Vite `127.0.0.1:5174`를 사용한다.
- shared dev DB에 seed-like trip 중복 row가 있으면 `jeju-3-days` alias는 fail-closed 404가 정상이다.
