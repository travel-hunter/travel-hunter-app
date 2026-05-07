# Travel Hunter 현재 작업 명세

## 현재 상태

Travel Hunter는 국내 여행 정책 탐색, 일정 관리, 정책 저장, 초대 협업, 마감 알림 설정을 제공하는 DB-backed-only MVP다. Runtime mock mode는 제거됐고, 프론트엔드는 항상 FastAPI backend를 호출한다.

현재 작업트리에는 FastAPI 내부 notification scheduler와 SOLAPI 기반 Kakao AlimTalk provider adapter 구현이 포함된다.

## 주요 구현 범위

- 인증: 회원가입, 로그인, refresh, logout, `/api/me`.
- 프로필: 온보딩/마이페이지에서 지역, 여행 스타일, 예산 저장.
- 정책: 목록, 상세, 검색/필터, 저장/삭제, 공식 안내/신청 URL CTA.
- 일정: 목록, 생성, 상세, 삭제, 정책 담기, 장소 추가/수정/삭제.
- AI 추천: `/ai-results` 추천 항목을 실제 일정 장소로 추가.
- 초대: 초대 링크 생성, 수락, `viewer/editor` 권한 저장, 장소 편집 권한 enforcement.
- 알림 설정: 마감 알림 켜기/끄기, 카카오 알림톡 연락처 저장.
- 알림 발송 기반: `notification_deliveries` 이력 테이블, D-7/D-1 대상 계산 service, FastAPI 내부 scheduler, SOLAPI 알림톡 dispatch.

## 백엔드 기준

- FastAPI route/schema/service/repository 계층.
- SQLAlchemy 2.x sync ORM + psycopg 3 + Alembic + PostgreSQL 16.
- `create_all()`은 사용하지 않고 schema 생성은 Alembic migration만 기준으로 한다.
- API DTO는 `camelCase`, DB 컬럼은 `snake_case`를 유지한다.
- route는 얇게 유지하고 business logic은 service/repository에 둔다.

## Notification Scheduler

- 모듈: `backend/app/services/notification_scheduler.py`.
- FastAPI lifespan에서 background task로 연결된다.
- 기본값은 비활성화다.
- `NOTIFICATION_SCHEDULER_ENABLED=true`일 때만 시작한다.
- enabled 상태에서 `DATABASE_URL`이 없으면 startup에서 실패한다.
- KST 기준 `NOTIFICATION_RUN_AT` 이후 하루 한 번 dispatch service를 실행한다.
- dispatch service는 target calculation 후 `pending` 후보를 provider 설정에 따라 SOLAPI로 접수한다.
- dispatch 실패는 로그로 남기고 다음 polling cycle에서 다시 시도할 수 있다.
- shutdown 시 background task를 cancel한다.
- public HTTP endpoint, DB migration, frontend 변경은 없다.

## Runtime Env

- `NOTIFICATION_SCHEDULER_ENABLED=false`
- `NOTIFICATION_RUN_AT=09:00`
- `NOTIFICATION_POLL_SECONDS=60`
- `KAKAO_ALIMTALK_ENABLED=false`
- `SOLAPI_BASE_URL=https://api.solapi.com`
- `SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, `SOLAPI_PF_ID`, `SOLAPI_TEMPLATE_ID_D7`, `SOLAPI_TEMPLATE_ID_D1`
- `SOLAPI_FROM_NUMBER`, `SOLAPI_DISABLE_SMS=true`, `SOLAPI_TIMEOUT_SECONDS=5`
- `TRAVEL_HUNTER_PUBLIC_BASE_URL`

위 값은 `backend/.env.example`, `compose.yaml`, `compose.vps.yaml`, `compose.tunnel.yaml`, 배포 env example에 반영되어 있다.

## 디자인/Figma 상태

- Wanted Design System `.fig`를 Figma 프로젝트에 import했다.
- Imported reference file: `https://www.figma.com/design/6X5t38FCiVoIdRdi3C2olj/Wanted-Design-System---Imported-Reference`.
- Travel Hunter handoff file: `https://www.figma.com/design/6qxML42kKtZWIwLUU1YDpX`.
- Button primary color, 기본 높이, radius, Toast 기준을 Wanted 수치에 맞춰 보정했다.

## 배포 산출물

- Local compose: `compose.yaml`.
- Public VPS direct mode: `compose.vps.yaml`, `deploy/Caddyfile`, `deploy/.env.staging.example`.
- NAT 제한 Cloudflare Tunnel mode: `compose.tunnel.yaml`, `deploy/Caddyfile.tunnel`, `deploy/.env.tunnel.example`.

## 최신 검증

- `cd backend && python -m pytest`: 135 passed.
- `cd backend && alembic upgrade head --sql`: passed.
- `docker compose -f compose.yaml config`: passed.
- `docker compose --env-file deploy/.env.staging.example -f compose.vps.yaml config`: passed.
- `docker compose --env-file deploy/.env.tunnel.example -f compose.tunnel.yaml config`: passed.
- `git diff --check`: passed.

이전 검증 기준:

- `cd frontend && npm run typecheck`: passed.
- `cd frontend && npm run build`: passed.
- Frontend DB-backed Vitest: 28 passed.
- DB-backed Playwright e2e: 5 passed.
- Local compose config/build: passed.
- VPS compose config: passed.
- Tunnel compose config: passed.

## 미구현 범위

- 알림 retry 정책.
- SOLAPI 웹훅 기반 최종 배송 상태 추적.
- 전화번호 실인증/OTP.
- 소셜 로그인 실제 연동.
- 정책 실시간 수집 API.
- 지도 장소 검색과 이동 시간 계산.
- 실제 AI 추천 엔진.
- 초대 이메일/SMS/카카오톡 실제 발송.
- 운영 관리자 기능.
- 실제 staging 배포와 외부 URL smoke.

## 다음 작업

다음 기능 우선순위는 `docs/next-work-plan.md`를 따른다. 현재 1순위는 알림 retry 정책 구현이다.
