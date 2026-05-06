# Travel Hunter MVP 릴리즈 후보 인수인계

## 기준

- 기준일: 2026-05-06
- RC 기준 커밋: `91df9e9 chore: add docker vps staging artifacts`
- 배포 방향: Docker VPS 기반 내부 테스트용 staging
- 현재 상태: runtime mock mode 제거, DB-backed-only MVP
- 인수인계 방식: 문서 중심

## 포함 기능

- 인증: 회원가입, 로그인, refresh, logout, `/api/me`
- 프로필: 지역, 여행 스타일, 예산 설정 저장
- 정책: 목록, 상세, 검색/필터, 저장 정책, 공식/신청 URL CTA
- 일정: 목록, 생성, 상세, 삭제, 정책 담기, 추천 결과 조회
- 초대: 초대 링크 생성, 초대 수락, 일정 참여자 추가

## 실행 모드

### Local backend mode

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

확인 URL:

- Frontend dev: `http://127.0.0.1:5173`
- Backend API: `http://127.0.0.1:8000`
- Backend docs: `http://127.0.0.1:8000/docs`
- PostgreSQL host port: `127.0.0.1:55432`

### Docker Compose local staging mode

```powershell
docker compose -f compose.yaml build
docker compose -f compose.yaml up -d db
docker compose -f compose.yaml run --rm backend alembic upgrade head
docker compose -f compose.yaml run --rm backend python -m app.db.seed
docker compose -f compose.yaml up -d backend frontend
```

확인 URL:

- Frontend preview: `http://127.0.0.1:4173`
- Backend API: `http://127.0.0.1:8000`
- Backend docs: `http://127.0.0.1:8000/docs`

### Docker VPS staging mode

VPS 배포 절차는 `docs/deployment-vps.md`를 따른다.

구성은 VPS 전용 Docker Compose 방식으로 고정한다.

- `compose.vps.yaml`: `db`, `backend`, `frontend`, `caddy` 서비스
- `deploy/Caddyfile`: `/api/*`, `/docs*`, `/openapi.json`은 backend로, 나머지는 frontend로 라우팅
- `deploy/.env.staging.example`: staging env template
- 외부 공개 포트: Caddy `80`, `443`만 사용
- 공개 URL: `https://<staging-domain>`

실제 VPS에서는 `deploy/.env.staging.example`을 `deploy/.env.staging`으로 복사하고 `STAGING_DOMAIN`, `AUTH_SECRET_KEY`, DB password, `CORS_ORIGINS`를 staging 값으로 교체한다.

주요 명령:

```bash
docker compose --env-file deploy/.env.staging -f compose.vps.yaml config
docker compose --env-file deploy/.env.staging -f compose.vps.yaml build
docker compose --env-file deploy/.env.staging -f compose.vps.yaml up -d db
docker compose --env-file deploy/.env.staging -f compose.vps.yaml run --rm backend alembic upgrade head
docker compose --env-file deploy/.env.staging -f compose.vps.yaml run --rm backend python -m app.db.seed
docker compose --env-file deploy/.env.staging -f compose.vps.yaml up -d
```

## Seed Test Account

- Email: `test.user@example.com`
- Password: `password123`
- Display name: `테스트 사용자`

## 환경 변수 기준

Local compose:

- `VITE_API_BASE_URL=http://127.0.0.1:8000`
- `APP_ENV=docker`
- `DATABASE_URL=postgresql+psycopg://travelhunter:travelhunter@db:5432/travelhunter`
- `REFRESH_COOKIE_SECURE=false`
- `CORS_ORIGINS=http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:4173,http://localhost:4173`

Docker VPS staging:

- `VITE_API_BASE_URL=https://<staging-domain>`
- `APP_ENV=staging`
- `DATABASE_URL=postgresql+psycopg://<user>:<password>@db:5432/<database>`
- `AUTH_SECRET_KEY=<strong-secret>`
- `REFRESH_COOKIE_SECURE=true`
- `CORS_ORIGINS=https://<staging-domain>`

## 검증 결과

- `cd backend && python -m pytest`: 72 passed
- `cd backend && alembic upgrade head --sql`: passed
- `docker compose -f compose.yaml config`: passed
- `cd frontend && npm run typecheck`: passed
- `cd frontend && npm test`: DB-backed Vitest 20 passed
- `cd frontend && npm run test:e2e`: DB-backed Playwright 5 passed
- `cd frontend && npm run build`: passed
- `docker compose -f compose.yaml build`: passed
- `docker compose --env-file deploy/.env.staging.example -f compose.vps.yaml config`: passed

## VPS 배포 상태

- 상태: 실제 VPS 배포 대기.
- 배포 기준 커밋: `91df9e9 chore: add docker vps staging artifacts`.
- 현재 blocker: VPS 접속 정보, staging domain, DNS A record, repo clone 권한, 실제 `deploy/.env.staging` 값이 아직 제공되지 않았다.
- 다음 조치: 위 값이 준비되면 `docs/deployment-vps.md` 순서로 배포하고, 외부 URL smoke 결과를 이 문서와 `CHECKLIST.md`에 기록한다.

## 내부 테스트 필수 플로우

- 회원가입 성공
- 로그인 성공/실패
- 프로필 설정 저장
- 정책 목록 검색/필터
- 정책 상세 진입
- 정책 저장/삭제
- 일정 생성
- 일정 상세 확인
- 일정 삭제
- 정책을 일정에 담기
- 초대 수락 링크 진입
- 로그아웃

## 미구현 범위

- 소셜 로그인 실제 연동
- 정책 실시간 수집 API
- 지도/장소 검색/이동 시간 계산
- 실제 AI 추천 엔진
- 초대 이메일/SMS/카카오톡 실제 발송
- 운영 관리자 기능
- AWS/EKS/Argo CD 정식 배포

## 다음 담당자 체크리스트

1. `README.md`에서 읽는 순서를 확인한다.
2. `docs/current-work-spec.md`로 현재 구현 범위를 확인한다.
3. `docs/mvp-api-contract.md`로 API shape를 확인한다.
4. `docs/deployment-vps.md`에 따라 Docker VPS staging을 구성한다.
5. 외부 staging URL에서 내부 테스트 필수 플로우를 통과시킨다.
