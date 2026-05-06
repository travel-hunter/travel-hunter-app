# Travel Hunter 현재 작업 명세

## 현재 상태

Travel Hunter는 국내 여행 정책 탐색과 여행 일정 생성을 위한 MVP 앱이다. 현재 앱은 React/Vite 프론트엔드, FastAPI 백엔드, PostgreSQL DB를 기준으로 동작한다. runtime mock mode는 제거됐고, 사용자 인증과 주요 데이터 흐름은 FastAPI API와 PostgreSQL 저장소를 사용한다.

현재 기준 커밋은 `42d1a6c chore: capture tunnel and docs baseline`다. 이 커밋 이후 작업트리에는 일정 상세 장소 추가/수정/삭제 기능 구현 변경분이 포함되어 있으며, 아직 별도 커밋 전이다.

## 주요 위치

| 구분 | 위치 |
|---|---|
| 앱 루트 | `C:\Users\HP\Documents\프로젝트\진행중\travel-hunter-app` |
| 프론트엔드 | `frontend` |
| 백엔드 | `backend` |
| API 계약 | `docs/mvp-api-contract.md` |
| DB schema 기준 | `docs/db-schema-v0.3.sql` |
| RC 인수인계 | `docs/release-candidate-handoff.md` |
| VPS 배포 | `docs/deployment-vps.md` |
| Cloudflare Tunnel 배포 | `docs/deployment-tunnel.md` |
| 디자인 매핑 | `docs/design-system-map.md` |

## 구현된 기능

- 인증: 회원가입, 로그인, refresh, logout, `/api/me`.
- 프로필: 지역, 여행 스타일, 예산 저장 및 `/mypage` 편집 화면.
- 정책: 목록, 상세, 검색/필터, 저장/삭제, 공식/신청 URL CTA.
- 일정: 목록, 생성, 상세, 장소 추가/수정/삭제, 일정 삭제, 정책 담기, 추천 결과 조회.
- 초대: 초대 링크 생성, 초대 수락, 일정 참여자 추가.
- 테스트 계정: `test.user@example.com / password123`, 표시명 `테스트 사용자`.

## 프론트엔드 기준

- Vite + React + TypeScript + React Router 기반 반응형 웹이다.
- `AppRoot`, `AppProviders`, `SessionProvider`, `ProtectedRoute` 구조를 사용한다.
- 모든 화면 데이터 접근은 `AppDataApi` 경계를 통한다.
- `appDataApi`는 항상 `backendApi`를 사용한다.
- 정책 탐색은 현재 `GET /api/policies` 결과를 client-side 검색/지역/카테고리 필터로 처리한다.
- `/trips/new`는 지역, 스타일, 기간, 선택 정책을 `POST /api/trips` payload로 전달한다.
- `/trips/:id`는 `trip_places` 기반 장소 추가/수정/삭제를 지원하며 저장 후 새로고침해도 타임라인이 유지된다.
- `/invites/:inviteToken/accept`는 로그인 복귀 후 초대 수락 API를 호출한다.

## 백엔드 기준

- FastAPI route/schema/service/repository 계층을 사용한다.
- SQLAlchemy 2.x sync ORM + psycopg 3 + Alembic + PostgreSQL 16 기준이다.
- schema 생성은 Alembic migration만 사용하고 `create_all()`은 사용하지 않는다.
- 개발 seed는 `python -m app.db.seed`로 주입하며 idempotent하게 동작한다.
- API DTO는 `camelCase`, DB/SQL 필드는 `snake_case`를 유지한다.
- 응답에는 `password_hash`, `refresh_token_hash`, `provider_id`를 노출하지 않는다.

## DB/API 결정

- `policies.slug`는 정책 상세 key다.
- `trips.slug`는 추가하지 않는다.
- `Trip.id`는 DB `trips.id`를 string으로 반환한다.
- `jeju-3-days`는 legacy seed alias이며 public slug가 아니다.
- `Policy.match`, `Trip.expectedSaving`, `InviteState.copied`, `InviteState.invited`는 service mapper 계산/상태값이다.

## 디자인/Figma 상태

- Wanted Design System `.fig`를 Figma 프로젝트에 import했다.
- Imported reference file: `https://www.figma.com/design/6X5t38FCiVoIdRdi3C2olj/Wanted-Design-System---Imported-Reference`
- Travel Hunter handoff file: `https://www.figma.com/design/6qxML42kKtZWIwLUU1YDpX`
- Button primary color, 기본 높이, radius를 Wanted 기준으로 보정했다.
- Toast는 Wanted Toast child 기준 `54px`, radius `12px`, padding `11px 16px`로 보정했다.
- MVP 8개 route의 Current/Redesign Figma frame을 생성했다.
- 남은 디자인 작업은 Figma frame과 브라우저 캡처의 픽셀 비교 및 `Approved` 상태 전환이다.

## 배포 산출물

- Local compose: `compose.yaml`
- Public VPS direct mode:
  - `compose.vps.yaml`
  - `deploy/Caddyfile`
  - `deploy/.env.staging.example`
- NAT 제한 Cloudflare Tunnel mode:
  - `compose.tunnel.yaml`
  - `deploy/Caddyfile.tunnel`
  - `deploy/.env.tunnel.example`

Tunnel mode에서는 host `80/443` 포트를 열지 않는다. Cloudflare가 외부 HTTPS를 담당하고, `cloudflared` container가 outbound tunnel을 유지하며, Caddy는 Docker network 내부에서 `:80` reverse proxy로만 동작한다.

## 최신 검증

- `cd backend && python -m pytest`: 78 passed.
- `cd backend && alembic upgrade head --sql`: passed.
- `docker compose -f compose.yaml config`: passed.
- `cd frontend && npm run typecheck`: passed.
- `cd frontend && npm test`: DB-backed Vitest 22 passed.
- `cd frontend && npm run test:e2e`: DB-backed Playwright 5 passed.
- `cd frontend && npm run build`: passed.
- `docker compose -f compose.yaml build`: passed.
- `docker compose --env-file deploy/.env.staging.example -f compose.vps.yaml config`: passed.
- `docker compose --env-file deploy/.env.tunnel.example -f compose.tunnel.yaml config`: passed.

## 미구현 범위

- 소셜 로그인 실제 연동.
- 정책 실시간 수집 API.
- 지도/장소 검색/이동 시간 계산.
- 실제 AI 추천 엔진.
- 초대 이메일/SMS/카카오톡 실제 발송.
- 운영 관리자 기능.
- 실제 staging 배포와 외부 URL smoke.
- 공개 테스트 전 개인정보/약관, 로그, 백업, 모니터링, 장애 대응 기준.

## 다음 작업

다음 우선순위는 `docs/next-work-plan.md`를 따른다. 현재 기능 구현 관점에서는 AI 추천 결과를 일정 타임라인에 실제 장소로 추가하는 작업이 1순위다. 배포 관점의 Cloudflare Tunnel staging 실행과 Jenkinsfile은 기능 패스가 멈추거나 release staging으로 복귀할 때 재개한다.
