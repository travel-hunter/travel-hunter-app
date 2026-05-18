# Travel Hunter 현재 작업 명세

## 현재 상태

Travel Hunter는 국내 여행 정책 탐색, 일정 생성/편집, 정책 저장, 초대 협업, 마감 알림 기반을 제공하는 DB-backed-only MVP다. Runtime mock mode는 제거됐고, frontend는 항상 FastAPI backend를 호출한다.

- 기준: 커밋 `7b8fec0`(feat: refresh frontend UX from prototype) 이후 현재 worktree의 랜딩 제거와 프로토타입 로그인 첫 화면 클론까지 포함한 스냅샷.
- 브랜치 상태: `feat/prototype-to-react`, `origin/feat/prototype-to-react` 대비 `ahead 7`이며 현재 랜딩 제거/로그인 화면 변경분이 커밋 전 상태로 남아 있다.
- 최근 변경으로 일단체크인 벤치마크 분석, 업로드 HTML 프로토타입 UX 분석, production sourcemap 비공개 명시, PWA manifest/meta 1차 적용, 프로젝트 구조 audit 문서화, Web Share API 공유 fallback, Codex 모델 실행 스크립트 호환성 수정, tunnel/staging preview host allowlist 보정, 프로토타입 기반 frontend UX 개편, 랜딩 제거와 프로토타입 로그인 첫 화면 클론을 완료했다.
- 같은 네트워크에서 개발 서버를 공유하는 LAN runbook은 `docs/local-lan-access.md`에 정리했다.
- Password reset SMTP smoke runbook은 `docs/password-reset-smtp-smoke.md`에 정리했다. Local SMTP capture 기반 E2E는 통과했고, 실제 SMTP provider와 public HTTPS staging domain 기반 smoke는 아직 입력값 대기 상태다.
- 구현 기능명세서는 `docs/implemented-feature-spec.md`에 정리했다.

## 구현 완료 범위

- Auth: email/password 회원가입, email 중복 확인, 닉네임 설정/추천, 로그인, refresh, logout, `/api/me`.
- Codex workflow: `docs/codex-model-workflow.md` and `scripts/codex-*.ps1` define planning `gpt-5.5/xhigh` and implementation `gpt-5.3-codex/high`.
- Password reset: email reset link 요청, token confirm, password hash 갱신, 기존 refresh token revoke.
- OAuth: Kakao/Google authorization code 시작, callback state 검증, social account 연결/생성, refresh cookie 기반 frontend callback.
- Profile: profile setup, mypage profile edit, notification contact 저장.
- Policies: 목록, 상세, 검색/필터, 정책 탐색 바로가기(추천/마감/유형), 조건 확인 요약/FAQ, 저장/삭제, official/apply URL CTA, 정책 링크 복사, Web Share API 공유 fallback.
- Trips: 목록, 생성, 상세, 삭제, 정책 담기, 일정 확정 상태 저장, 장소 추가/수정/삭제, 장소 드래그앤드롭 순서/날짜 이동과 이동 affordance.
- Frontend UX: HTML 프로토타입의 모바일 앱형 흐름을 현재 React 앱에 반영했다. `/`는 랜딩/온보딩 없이 프로토타입 로그인 첫 화면을 보여주고, `/onboarding`은 `/login`으로 redirect한다. 하단 탭/desktop header는 유지하고, 홈 대표 혜택 hero, 정책 카드/태그, 정책 상세 혜택 패키지, 일정 상세 혜택 묶음, 공통 배경/카드 톤을 프로토타입 기준으로 정리했다.
- Draft autosave: `/trips/new` 일정 생성 draft와 `/trips/:id` 장소 추가/수정 draft를 24시간 localStorage에 임시 저장하고, 복원 시 안내와 버리기 액션을 제공한다.
- State UX: `/policies`, `/trips`, `/mypage`의 loading/empty/error 상태에 공통 상태 패널과 다음 행동 CTA를 적용했다.
- AI recommendations: 추천 결과를 실제 `trip_places`에 추가, 추천 기준 sheet.
- Invites: 링크 생성, viewer/editor role 저장, 수락, 일정 멤버십 저장, 장소 편집 권한 enforcement.
- Notifications: deadline 설정 저장, contact 저장, delivery history, target calculation, FastAPI scheduler, SOLAPI AlimTalk adapter, retry, SOLAPI webhook 상태 추적.
- Design/deployment: Wanted Design System 1차 적용, Figma handoff 문서, PWA manifest/meta 1차 적용, Docker VPS/Tunnel 배포 산출물.
- PWA offline: service worker는 아직 추가하지 않고, 안전한 캐싱 기준은 `docs/pwa-offline-strategy.md`에 정리했다.
- Service readiness: 화면 표시값은 frontend display config로 중앙화하고, `/trips/new` 기본 날짜는 KST 기준 helper를 사용한다. Protected runtime(`staging/production/prod`)에서는 localhost/public fallback과 개발 secret을 config guard로 차단한다.

## Backend 기준

- FastAPI route/schema/service/repository 계층.
- SQLAlchemy 2.x sync ORM + psycopg 3 + Alembic + PostgreSQL 16.
- `create_all()`은 사용하지 않고 schema 생성은 Alembic migration만 허용한다.
- API DTO는 `camelCase`, DB column은 `snake_case`를 유지한다.
- 보안 필드(`password_hash`, `refresh_token_hash`, reset token raw value, OAuth provider id)는 response에 노출하지 않는다.

## Auth/OAuth 추가 사항

- `password_reset_tokens`는 raw token이 아니라 SHA-256 hash를 저장한다.
- reset token 기본 만료는 `PASSWORD_RESET_EXPIRE_MINUTES`이며 기본값은 30분이다.
- SMTP 미설정 환경에서 실제 계정에 password reset email을 발송해야 하면 `503 Email delivery is not configured`로 실패한다.
- OAuth state는 HttpOnly cookie로 검증한다.
- OAuth redirect 값은 내부 path만 허용한다. 외부 URL 또는 `//...` 값은 `/home`으로 대체한다.
- OAuth callback 성공 후 frontend `/oauth/callback?redirect=...`로 돌아가고, frontend는 `/api/auth/refresh`로 access token을 복구한다.

## Runtime Env 추가

- Password reset/SMTP:
  - `PASSWORD_RESET_EXPIRE_MINUTES`
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, `SMTP_USE_TLS`
  - `TRAVEL_HUNTER_PUBLIC_BASE_URL`
- OAuth:
  - `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`, `KAKAO_REDIRECT_URI`
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
  - `OAUTH_STATE_COOKIE_NAME`
- Notification:
  - `NOTIFICATION_SCHEDULER_ENABLED`, `NOTIFICATION_RUN_AT`, `NOTIFICATION_POLL_SECONDS`
  - `KAKAO_ALIMTALK_ENABLED`, `SOLAPI_*`, `NOTIFICATION_RETRY_*`, `SOLAPI_WEBHOOK_SECRET`
- Production/staging guard:
  - `APP_ENV=staging|production|prod`에서는 `AUTH_SECRET_KEY`, `TRAVEL_HUNTER_PUBLIC_BASE_URL`, `CORS_ORIGINS`, `REFRESH_COOKIE_SECURE`가 운영 기준을 만족해야 한다.

## 배포 산출물

- Local compose: `compose.yaml`.
- Public VPS direct mode: `compose.vps.yaml`, `deploy/Caddyfile`, `deploy/.env.staging.example`.
- NAT 제한 Cloudflare Tunnel mode: `compose.tunnel.yaml`, `deploy/Caddyfile.tunnel`, `deploy/.env.tunnel.example`.
- 실제 secret/env 값은 repo에 커밋하지 않는다.

## 최신 검증

- `cd backend && python -m pytest`: 181 passed.
- `cd frontend && npm test`: 71 passed.
- `cd frontend && npm run typecheck`: passed.
- `cd frontend && npm run build`: passed, production sourcemap 미생성, PWA manifest/icon 산출물 확인.
- `frontend/public/manifest.webmanifest`: valid JSON, app name/theme/icon metadata 확인.
- Draft autosave는 frontend localStorage 범위 변경이며 backend/API/DB 변경이 없다.
- `cd backend && alembic upgrade head --sql`: passed.
- `docker compose -f compose.yaml config`: passed.
- `docker compose --env-file deploy/.env.staging.example -f compose.vps.yaml config`: passed.
- `docker compose --env-file deploy/.env.tunnel.example -f compose.tunnel.yaml config`: passed.
- `git diff --check`: passed.
- Docker backend/frontend rebuild: passed.
- Local SMTP capture password reset E2E: passed. Reset email 수신, token confirm, 기존 비밀번호 실패, 새 비밀번호 로그인 성공을 확인했다.
- OAuth local/preflight: passed. 미설정 env의 503, state mismatch 400, dummy provider env의 authorization redirect/state cookie 흐름을 확인했다.
- Cloudflare Quick Tunnel: frontend preview `/login` 200 확인. `vite preview` host allowlist 보정 후 `.trycloudflare.com` 요청이 통과한다.
- Landing removal/login clone verification(2026-05-13): `cd frontend && npm run typecheck` passed, `cd frontend && npm test` 64 passed, `cd frontend && npm run build` passed.
- Service readiness cleanup verification(2026-05-18): display config/date defaults/runtime guard/policy data validation added; backend pytest 181 passed, frontend Vitest 69 passed, frontend typecheck/build passed.
- MyPage information sheet verification(2026-05-18): FAQ, terms, and privacy settings rows open in-app sheets; frontend Vitest 71 passed.

## 미구현/조건부 범위

- SMTP 설정 없이는 password reset email 실제 발송이 불가하다.
- Password reset local SMTP capture E2E는 통과했다. Unknown email은 `{"requested": true}`로 계정 존재 여부를 숨기고, existing email은 SMTP 미설정 상태에서 `503`으로 실패한다.
- Kakao/Google provider secret과 redirect URI가 없으면 OAuth 실제 로그인이 불가하다.
- Cloudflare named tunnel은 실제 `CLOUDFLARE_TUNNEL_TOKEN`이 필요하다. 현재 placeholder token은 유효하지 않다.
- Tunnel full-up의 DB migration/seed는 실제 `POSTGRES_PASSWORD`와 `DATABASE_URL` 값이 맞아야 한다. placeholder env로는 기존 Docker volume의 DB 비밀번호와 충돌할 수 있다.
- 전화번호 실인증/OTP는 아직 없다.
- 정책 실시간 수집, 지도/장소 검색, 실제 AI 추천 엔진은 아직 없다.
- 친구 초대 email/SMS/Kakao 외부 발송은 아직 없다.
- PWA service worker/offline runtime은 아직 없다. 현재는 install metadata만 제공한다.
- 실제 staging 외부 URL smoke는 배포 입력값 확보 후 진행한다.

## 다음 작업

다음 기능 우선순위는 `docs/next-work-plan.md`를 따른다.
현재 진행 순서는 `랜딩 제거와 프로토타입 로그인 첫 화면 변경분 커밋 -> deploy/.env.tunnel 실제값 확보 및 Cloudflare Tunnel full-up -> 외부 HTTPS 핵심 smoke -> 실제 SMTP provider password reset staging smoke -> Kakao/Google OAuth provider console smoke -> Phone OTP 설계/구현 -> PWA service worker 1차 구현 여부 결정`이다.
