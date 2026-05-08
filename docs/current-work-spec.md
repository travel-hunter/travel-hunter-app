# Travel Hunter 현재 작업 명세

## 현재 상태

Travel Hunter는 국내 여행 정책 탐색, 일정 생성/편집, 정책 저장, 초대 협업, 마감 알림 기반을 제공하는 DB-backed-only MVP다. Runtime mock mode는 제거됐고, frontend는 항상 FastAPI backend를 호출한다.

- 기준: 현재 브랜치 `feat/prototype-to-react`의 최신 HEAD.
- 브랜치 상태: `feat/prototype-to-react`, origin 대비 ahead 상태.
- 최근 변경으로 일단체크인 벤치마크 분석, production sourcemap 비공개 명시, PWA manifest/meta 1차 적용, 프로젝트 구조 audit 문서화, Web Share API 공유 fallback을 완료했다.
- 같은 네트워크에서 개발 서버를 공유하는 LAN runbook은 `docs/local-lan-access.md`에 정리했다.
- Password reset SMTP smoke runbook은 `docs/password-reset-smtp-smoke.md`에 정리했다. 현재 세션에서는 SMTP env와 public HTTPS base URL이 없어 실제 이메일 발송 smoke는 미실행 상태다.
- 구현 기능명세서는 `docs/implemented-feature-spec.md`에 정리했다.

## 구현 완료 범위

- Auth: email/password 회원가입, email 중복 확인, 닉네임 설정/추천, 로그인, refresh, logout, `/api/me`.
- Codex workflow: `docs/codex-model-workflow.md` and `scripts/codex-*.ps1` define planning `gpt-5.5/xhigh` and implementation `gpt-5.3-codex/high`.
- Password reset: email reset link 요청, token confirm, password hash 갱신, 기존 refresh token revoke.
- OAuth: Kakao/Google authorization code 시작, callback state 검증, social account 연결/생성, refresh cookie 기반 frontend callback.
- Profile: onboarding, mypage profile edit, notification contact 저장.
- Policies: 목록, 상세, 검색/필터, 저장/삭제, official/apply URL CTA, 정책 링크 복사, Web Share API 공유 fallback.
- Trips: 목록, 생성, 상세, 삭제, 정책 담기, 일정 확정 상태 저장, 장소 추가/수정/삭제, 장소 드래그앤드롭 순서/날짜 이동.
- Draft autosave: `/trips/new` 일정 생성 draft와 `/trips/:id` 장소 추가/수정 draft를 24시간 localStorage에 임시 저장한다.
- AI recommendations: 추천 결과를 실제 `trip_places`에 추가, 추천 기준 sheet.
- Invites: 링크 생성, viewer/editor role 저장, 수락, 일정 멤버십 저장, 장소 편집 권한 enforcement.
- Notifications: deadline 설정 저장, contact 저장, delivery history, target calculation, FastAPI scheduler, SOLAPI AlimTalk adapter, retry, SOLAPI webhook 상태 추적.
- Design/deployment: Wanted Design System 1차 적용, Figma handoff 문서, PWA manifest/meta 1차 적용, Docker VPS/Tunnel 배포 산출물.
- PWA offline: service worker는 아직 추가하지 않고, 안전한 캐싱 기준은 `docs/pwa-offline-strategy.md`에 정리했다.

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

## 배포 산출물

- Local compose: `compose.yaml`.
- Public VPS direct mode: `compose.vps.yaml`, `deploy/Caddyfile`, `deploy/.env.staging.example`.
- NAT 제한 Cloudflare Tunnel mode: `compose.tunnel.yaml`, `deploy/Caddyfile.tunnel`, `deploy/.env.tunnel.example`.
- 실제 secret/env 값은 repo에 커밋하지 않는다.

## 최신 검증

- `cd backend && python -m pytest`: 169 passed.
- `cd frontend && npm test`: 54 passed.
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

## 미구현/조건부 범위

- SMTP 설정 없이는 password reset email 실제 발송이 불가하다.
- Password reset local preflight는 통과했다. Unknown email은 `{"requested": true}`로 계정 존재 여부를 숨기고, existing email은 SMTP 미설정 상태에서 `503`으로 실패한다.
- Kakao/Google provider secret과 redirect URI가 없으면 OAuth 실제 로그인이 불가하다.
- 전화번호 실인증/OTP는 아직 없다.
- 정책 실시간 수집, 지도/장소 검색, 실제 AI 추천 엔진은 아직 없다.
- 친구 초대 email/SMS/Kakao 외부 발송은 아직 없다.
- PWA service worker/offline runtime은 아직 없다. 현재는 install metadata만 제공한다.
- 실제 staging 외부 URL smoke는 배포 입력값 확보 후 진행한다.

## 다음 작업

다음 기능 우선순위는 `docs/next-work-plan.md`를 따른다. 현재 1순위는 미커밋 변경분 커밋 및 push 준비이고, 이후 SMTP/OAuth staging smoke로 이동한다.
