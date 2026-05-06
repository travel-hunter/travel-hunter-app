# Travel Hunter 협업 인수인계

## 현재 기준

- 현재 로컬 브랜치: `feat/prototype-to-react`
- 최신 문서 정리 커밋: `3b8e3ee docs: align current work specifications`
- Docker VPS staging 산출물 커밋: `91df9e9 chore: add docker vps staging artifacts`
- 상태: MVP 기능 구현 완료, DB-backed-only, runtime mock mode 제거.
- 원격 저장소: `https://github.com/travel-hunter/travel-hunter-app.git`

## 처음 참여하는 개발자 읽는 순서

1. `README.md`: 실행 방법과 전체 문서 안내.
2. `CONTRIBUTING.md`: 브랜치, PR, 검증, secret 규칙.
3. `docs/current-work-spec.md`: 현재 구현 범위.
4. `docs/mvp-api-contract.md`: API 계약.
5. `docs/release-candidate-handoff.md`: RC 범위와 검증 결과.
6. `docs/deployment-vps.md`: Docker VPS staging 배포 runbook.
7. `docs/next-work-plan.md`: 다음 우선순위.

## 구현된 범위

- 인증: 회원가입, 로그인, refresh, logout, `/api/me`.
- 프로필: 지역, 여행 스타일, 예산 설정 저장.
- 정책: 목록, 상세, 검색/필터, 저장/삭제, 공식/신청 URL CTA.
- 일정: 목록, 생성, 상세, 삭제, 정책 담기, 추천 결과 조회.
- 초대: 초대 링크 생성, 초대 수락, 일정 참여자 추가.
- 배포 산출물: local `compose.yaml`, VPS용 `compose.vps.yaml`, Caddy 설정, staging env 예시.

## 다음 작업

1. `feat/prototype-to-react` 브랜치를 원격에 푸시하고 `develop` 대상 draft PR을 검토한다.
2. VPS SSH 접속 정보, staging domain/DNS, repo clone 권한, 실제 `deploy/.env.staging` 값을 확보한다.
3. `docs/deployment-vps.md` 절차에 따라 Docker VPS staging을 배포한다.
4. 외부 staging URL에서 내부 smoke checklist를 수행한다.
5. 결과를 `docs/release-candidate-handoff.md`, `CHECKLIST.md`, `docs/next-work-plan.md`에 기록한다.

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

## 주의할 점

- `trips.slug`는 추가하지 않는다.
- `jeju-3-days`는 legacy seed alias이며 public slug가 아니다.
- frontend page는 `AppDataApi` 경계를 통해 데이터에 접근한다.
- backend route는 얇게 유지하고 service/repository에 동작을 둔다.
- API DTO는 `camelCase`, DB/SQL 필드는 `snake_case`를 유지한다.
- secret과 실제 staging env는 GitHub에 올리지 않는다.

## 현재 blocker

- VPS SSH 접속 정보 미제공.
- staging domain/DNS 미제공.
- repo clone 권한 확인 필요.
- 실제 `deploy/.env.staging` 값 미제공.

