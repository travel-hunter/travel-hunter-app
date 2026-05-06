# Travel Hunter 다음 작업 우선순위

## 기준

- MVP 기능 구현은 완료 상태다.
- runtime mock mode는 제거됐고, 앱은 DB-backed-only 기준으로 동작한다.
- 실제 staging 방향은 Docker VPS 기반 내부 테스트용 배포로 결정했다.
- 다음 작업은 기능 추가가 아니라 외부 staging URL에서 RC를 검증하는 것이다.

## 우선순위

| 우선순위 | 작업 | 성공 기준 |
|---:|---|---|
| 1 | Docker VPS staging 배포 실행 | `docs/deployment-vps.md` 절차에 따라 frontend/backend/PostgreSQL이 외부 URL에서 동작한다. |
| 2 | staging 환경 보안값 고정 | `AUTH_SECRET_KEY`, `DATABASE_URL`, `CORS_ORIGINS`, `REFRESH_COOKIE_SECURE=true`가 staging 기준으로 설정된다. |
| 3 | 내부 테스트 smoke 수행 | 로그인, 정책 탐색, 일정 생성/삭제, 정책 담기, 초대 수락, 로그아웃이 외부 URL에서 통과한다. |
| 4 | 배포 결과 문서화 | staging URL, 실행 커밋, 검증 결과, 남은 blocker가 RC 문서에 기록된다. |
| 5 | 공개 테스트 전 운영 기준 수립 | 개인정보/약관, 로그, 백업, 모니터링, 장애 대응 범위를 별도 계획으로 확정한다. |

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
- staging에서는 HTTPS와 `REFRESH_COOKIE_SECURE=true`가 같이 필요하다.
- mock mode를 다시 추가하지 않는다.
