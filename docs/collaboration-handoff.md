# Travel Hunter 협업 인수인계

## 현재 기준

- 브랜치: `feat/prototype-to-react`
- 기준 커밋: `026336e style: align toast with wanted figma values`
- 상태: MVP 기능 구현 완료, DB-backed-only, runtime mock mode 제거.
- 원격 저장소: `https://github.com/travel-hunter/travel-hunter-app.git`

## 새 참여자 읽는 순서

1. `README.md`
2. `CONTRIBUTING.md`
3. `docs/current-work-spec.md`
4. `docs/mvp-api-contract.md`
5. `docs/release-candidate-handoff.md`
6. `docs/deployment-tunnel.md` 또는 `docs/deployment-vps.md`
7. `docs/next-work-plan.md`

## 로컬 실행 요약

```powershell
docker compose -f compose.yaml up -d db

cd backend
$env:DATABASE_URL="postgresql+psycopg://travelhunter:travelhunter@127.0.0.1:55432/travelhunter"
$env:AUTH_SECRET_KEY="dev-only-change-me-secret-key-32-bytes"
alembic upgrade head
python -m app.db.seed
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

```powershell
cd frontend
$env:VITE_API_BASE_URL="http://127.0.0.1:8000"
npm run dev
```

테스트 계정:

- Email: `test.user@example.com`
- Password: `password123`
- Display name: `테스트 사용자`

## 다음 협업 작업

1. Cloudflare domain, tunnel token, repo clone 권한, 실제 `deploy/.env.tunnel` 값을 준비한다.
2. `docs/deployment-tunnel.md` 절차로 외부 HTTPS staging을 배포한다.
3. 내부 smoke checklist를 통과시킨다.
4. 결과를 `docs/release-candidate-handoff.md`, `CHECKLIST.md`, `docs/next-work-plan.md`에 기록한다.
5. Jenkinsfile은 tunnel staging이 검증된 뒤 후속 자동화 작업으로 추가한다.

## 주의사항

- `trips.slug`는 추가하지 않는다.
- `jeju-3-days`는 legacy seed alias이며 public slug가 아니다.
- frontend page는 `AppDataApi` 경계를 통해 데이터에 접근한다.
- backend route는 얇게 유지하고 service/repository에 동작을 둔다.
- API DTO는 `camelCase`, DB/SQL 필드는 `snake_case`를 유지한다.
- secret과 실제 staging env는 GitHub에 올리지 않는다.
