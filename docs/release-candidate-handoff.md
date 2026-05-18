# Travel Hunter MVP 릴리즈 후보 인수인계

## 기준

- 기준일: 2026-05-07
- RC 기준 커밋: `b75a734 feat: complete button audit auth and UX fixes`
- 현재 상태: DB-backed-only MVP, runtime mock mode 제거
- 배포 방향: Docker Compose 기반 내부 테스트용 staging
- 배포 모드:
  - Public VPS 직접 노출 가능: `docs/deployment-vps.md`
  - 학교/온프레미스 NAT 제한: `docs/deployment-tunnel.md`

## 포함 기능

- 인증: 회원가입, 로그인, refresh, logout, `/api/me`.
- Password reset: email reset link 요청, token confirm, password hash 갱신, 기존 refresh token revoke.
- OAuth: Kakao/Google authorization code 시작, callback state 검증, social account 연결/생성.
- 프로필: 지역, 여행 스타일, 예산 설정 저장.
- 정책: 목록, 상세, 검색/필터, 저장/삭제, 공식/신청 URL CTA, 정책 링크 복사.
- 일정: 목록, 생성, 상세, 삭제, 정책 담기, 장소 추가/수정/삭제, 추천 결과 일정 추가.
- 초대: 초대 링크 생성, viewer/editor 권한 저장, 초대 수락, 일정 참여자 추가, 장소 편집 권한 enforcement.
- 알림: 연락처/설정 저장, 대상 계산, FastAPI scheduler, SOLAPI adapter, retry, webhook 상태 추적.
- 디자인: Wanted Design System 기준 Button/Toast 보정, 주요 화면 반응형 QA, Figma handoff frame 생성.

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

### Docker VPS direct staging mode

외부 `80/443` 포트를 열 수 있는 VPS에서는 `compose.vps.yaml`, `deploy/Caddyfile`, `deploy/.env.staging.example`을 사용한다.

```bash
cp deploy/.env.staging.example deploy/.env.staging
docker compose --env-file deploy/.env.staging -f compose.vps.yaml config
docker compose --env-file deploy/.env.staging -f compose.vps.yaml build
docker compose --env-file deploy/.env.staging -f compose.vps.yaml up -d db
docker compose --env-file deploy/.env.staging -f compose.vps.yaml run --rm backend alembic upgrade head
docker compose --env-file deploy/.env.staging -f compose.vps.yaml run --rm backend python -m app.db.seed
docker compose --env-file deploy/.env.staging -f compose.vps.yaml up -d
```

### Cloudflare Tunnel staging mode

NAT 제한으로 외부 inbound port를 열기 어렵다면 `compose.tunnel.yaml`, `deploy/Caddyfile.tunnel`, `deploy/.env.tunnel.example`을 사용한다.

```bash
cp deploy/.env.tunnel.example deploy/.env.tunnel
docker compose --env-file deploy/.env.tunnel -f compose.tunnel.yaml config
docker compose --env-file deploy/.env.tunnel -f compose.tunnel.yaml build
docker compose --env-file deploy/.env.tunnel -f compose.tunnel.yaml up -d db
docker compose --env-file deploy/.env.tunnel -f compose.tunnel.yaml run --rm backend alembic upgrade head
docker compose --env-file deploy/.env.tunnel -f compose.tunnel.yaml run --rm backend python -m app.db.seed
docker compose --env-file deploy/.env.tunnel -f compose.tunnel.yaml up -d
```

Cloudflare public hostname은 `https://<staging-domain>`에서 tunnel을 통해 `http://caddy:80`으로 연결한다.

## 테스트 계정

- Email: `test.user@example.com`
- Password: `password123`
- Display name: `테스트 사용자`

## 검증 결과

- Backend pytest: 181 passed.
- Frontend Vitest: 71 passed.
- DB-backed Playwright e2e: 5 passed.
- Frontend build: passed.
- Alembic offline SQL: passed.
- Local compose config/build: passed.
- VPS compose config: passed.
- Tunnel compose config: passed.
- Local SMTP capture password reset E2E: passed.
- OAuth local/preflight: passed.
- Cloudflare Quick Tunnel frontend `/login`: 200 after preview host allowlist fix.

## 내부 테스트 필수 플로우

- 회원가입 성공.
- 로그인 성공/실패.
- 프로필 설정 저장.
- 정책 목록 검색/필터.
- 정책 상세 진입.
- 정책 저장/삭제.
- 일정 생성.
- 일정 상세 확인.
- 일정 삭제.
- 정책을 일정에 담기.
- 초대 수락 링크 진입.
- 로그아웃.

## 현재 blocker

- Public VPS mode: VPS SSH, staging domain/DNS, repo clone 권한, 실제 `deploy/.env.staging` 값.
- Tunnel mode: Cloudflare 계정/도메인, tunnel token, 실제 `deploy/.env.tunnel` 값.
- 공개 테스트 전 운영 기준: 개인정보/약관, 로그, 백업, 모니터링, 장애 대응.

## 다음 담당자 체크리스트

1. `README.md`에서 읽는 순서를 확인한다.
2. `docs/current-work-spec.md`로 현재 구현 범위를 확인한다.
3. `docs/feature-implementation-status.md`로 완료/조건부/미구현 기능을 확인한다.
4. `docs/mvp-api-contract.md`로 API shape를 확인한다.
5. 네트워크 조건에 맞춰 `docs/deployment-vps.md` 또는 `docs/deployment-tunnel.md`를 선택한다.
6. 외부 staging URL에서 내부 테스트 필수 플로우를 통과시킨다.
7. 결과를 `CHECKLIST.md`와 이 문서에 기록한다.
