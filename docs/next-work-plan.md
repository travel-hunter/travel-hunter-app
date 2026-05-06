# Travel Hunter 다음 작업 우선순위

## 기준

- MVP 기능 구현은 완료 상태다.
- 런타임 mock mode는 제거됐고, 앱은 DB-backed-only 기준으로 동작한다.
- 다음 작업은 새 기능 추가보다 staging 배포 결정을 위한 포장과 운영값 확정이다.

## 우선순위

| 우선순위 | 작업 | 성공 기준 |
|---:|---|---|
| 1 | DB-backed-only 변경분 커밋 | mock selector/API/test/docs 제거 상태가 검증되고 커밋된다. |
| 2 | 실제 staging 환경 선택 | Render/Railway/Fly.io/VPS/AWS 중 하나를 고르고 domain, HTTPS, secret, DB 운영 방식을 정한다. |
| 3 | staging 배포 실행 | 선택한 환경에서 frontend/backend/PostgreSQL이 동작하고 seed test account로 로그인된다. |
| 4 | 운영 보안값 정리 | `AUTH_SECRET_KEY`, `DATABASE_URL`, `CORS_ORIGINS`, refresh cookie secure 정책이 실제 환경 기준으로 고정된다. |
| 5 | 릴리즈 후보 최종 검증 | DB-backed e2e, frontend build, backend pytest, migration/seed가 staging 기준으로 통과한다. |

## Fast Lane

```bash
cd frontend
npm run typecheck
npm test

cd ../backend
python -m pytest
```

## Release Gate

```bash
cd frontend
npm run test:e2e
npm run build

cd ..
docker compose -f compose.yaml config
docker compose -f compose.yaml build
docker compose -f compose.yaml run --rm backend alembic upgrade head
docker compose -f compose.yaml run --rm backend python -m app.db.seed
```

## 주의사항

- `trips.slug`는 추가하지 않는다.
- `jeju-3-days`는 legacy seed alias일 뿐 public slug가 아니다.
- 실제 staging에서는 `REFRESH_COOKIE_SECURE=true`와 HTTPS가 필요하다.
- mock mode를 다시 추가하지 않는다.
