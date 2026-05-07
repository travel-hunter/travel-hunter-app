# Travel Hunter 현재 작업 명세

## 현재 상태

Travel Hunter는 국내 여행 정책 탐색과 여행 일정 관리를 위한 DB-backed MVP다. Runtime mock mode는 제거됐고, 프론트엔드는 항상 FastAPI 백엔드를 호출하며 주요 데이터는 PostgreSQL 기준으로 저장된다.

현재 기준 커밋은 `963ab3a feat: enforce trip invite edit roles`다. 이 커밋 이후 작업트리에는 마감 알림 발송 기반 설계 문서 변경분이 포함되어 있으며, 기능 코드 변경은 없다.

## 주요 위치

| 구분 | 위치 |
|---|---|
| 루트 | `C:\Users\HP\Documents\프로젝트\진행중\travel-hunter-app` |
| 프론트엔드 | `frontend` |
| 백엔드 | `backend` |
| API 계약 | `docs/mvp-api-contract.md` |
| 현재 구현 명세 | `docs/current-work-spec.md` |
| 다음 작업 | `docs/next-work-plan.md` |
| 알림 발송 설계 | `docs/notification-delivery-plan.md` |
| Cloudflare Tunnel 배포 | `docs/deployment-tunnel.md` |

## 구현된 기능

- 인증: 회원가입, 로그인, refresh, logout, `/api/me`.
- 프로필: 지역, 여행 스타일, 예산 저장과 `/mypage` 프로필 편집.
- 정책: 목록, 상세, 검색/필터, 저장/삭제, 공식 안내/신청 URL CTA.
- 일정: 목록, 생성, 상세, 삭제, 정책 담기, 장소 추가/수정/삭제.
- AI 추천: 추천 결과 조회, 추천 항목을 실제 일정 타임라인 장소로 추가.
- 초대: 초대 링크 생성, 초대 수락, 일정 참여자 추가, `viewer/editor` 권한 저장과 장소 편집 권한 enforcement.
- 알림 설정: 마이페이지에서 정책 마감 알림 전체 켜기/끄기 저장.
- 테스트 계정: `test.user@example.com / password123`, 표시명 `테스트 사용자`.

## 프론트엔드 기준

- Vite + React + TypeScript + React Router 기반 반응형 웹이다.
- `AppRoot`, `AppProviders`, `SessionProvider`, `ProtectedRoute` 구조를 사용한다.
- 화면 데이터 접근은 `AppDataApi` 경계를 통한다.
- `appDataApi`는 항상 `backendApi`를 사용한다.
- `/trips/:id`는 `trip_places` 기반 장소 추가/수정/삭제를 지원하며, `viewer` 참여자는 read-only 안내와 함께 편집 컨트롤이 숨겨진다.
- `/ai-results`는 추천 항목을 기존 장소 추가 API로 저장하고 성공 시 `/trips/{tripId}`로 이동한다.
- `/friend-invite?tripId=...`는 `viewer/editor` 권한 선택 UI를 제공하고 선택 권한을 invite에 저장한다.
- `/invites/:inviteToken/accept`는 로그인 복귀 후 초대 수락 API를 호출한다.
- `/mypage`는 `GET/PATCH /api/me/notification-settings`로 마감 알림 설정을 조회하고 저장한다.

## 백엔드 기준

- FastAPI route/schema/service/repository 계층을 사용한다.
- SQLAlchemy 2.x sync ORM + psycopg 3 + Alembic + PostgreSQL 16 기준이다.
- Schema 생성은 Alembic migration만 사용하며 `create_all()`은 사용하지 않는다.
- 개발 seed는 `python -m app.db.seed`로 주입하며 idempotent하게 동작한다.
- API DTO는 `camelCase`, DB/SQL 필드는 `snake_case`를 유지한다.
- 응답에는 `password_hash`, `refresh_token_hash`, `provider_id`를 노출하지 않는다.

## DB/API 결정

- `policies.slug`는 정책 상세 key다.
- `trips.slug`는 추가하지 않는다.
- `Trip.id`는 DB `trips.id`를 string으로 반환한다.
- `jeju-3-days`는 legacy seed alias이며 public slug가 아니다.
- `trip_invites.role`은 `viewer` 또는 `editor`이며, 초대 수락 시 신규 `trip_members.role`에 반영된다.
- `Trip.currentUserRole`은 현재 사용자의 일정 권한(`owner`, `editor`, `viewer`)을 반환한다.
- 장소 추가/수정/삭제는 `owner` 또는 `editor`만 가능하며, 접근 가능한 `viewer`의 편집 요청은 `403 {"detail": "Trip edit permission required"}`를 반환한다.
- `user_notification_settings.deadline_enabled`는 사용자별 정책 마감 알림 전체 켜기/끄기 값이다.
- `NotificationSettings.deadlineLeadDays`는 `[7, 1]` 서버 상수이며 DB에 저장하지 않는다.
- 실제 마감 알림 발송은 아직 구현 전이며, `docs/notification-delivery-plan.md`에 카카오 알림톡 + FastAPI 내부 scheduler 방향으로 설계가 확정됐다.

## 디자인/Figma 상태

- Wanted Design System `.fig`를 Figma 프로젝트에 import했다.
- Imported reference file: `https://www.figma.com/design/6X5t38FCiVoIdRdi3C2olj/Wanted-Design-System---Imported-Reference`
- Travel Hunter handoff file: `https://www.figma.com/design/6qxML42kKtZWIwLUU1YDpX`
- Button primary color, 기본 높이, radius를 Wanted 기준으로 보정했다.
- Toast는 Wanted Toast child 기준 `54px`, radius `12px`, padding `11px 16px`로 보정했다.
- MVP 8개 route의 Current/Redesign Figma frame을 생성했다.

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

- `cd backend && python -m pytest`: 90 passed.
- `cd backend && alembic upgrade head --sql`: passed.
- `cd frontend && npm run typecheck`: passed.
- `cd frontend && npm test`: DB-backed Vitest 28 passed.
- `cd frontend && npm run build`: passed.
- `git diff --check`: passed.
- 이전 release gate 기준:
  - DB-backed Playwright e2e: 5 passed.
  - Local compose config/build: passed.
  - VPS compose config: passed.
  - Tunnel compose config: passed.

## 미구현 범위

- 카카오 알림톡 실제 발송.
- 알림 발송 이력 테이블과 scheduler 구현.
- 소셜 로그인 실제 연동.
- 정책 실시간 수집 API.
- 지도, 장소 검색, 이동 시간 계산.
- 실제 AI 추천 엔진.
- 초대 이메일/SMS/카카오톡 실제 발송.
- 운영 관리자 기능.
- 실제 staging 배포와 외부 URL smoke.
- 공개 테스트 전 개인정보/약관, 로그, 백업, 모니터링, 역할 대응 기준.

## 다음 작업

다음 우선순위는 `docs/next-work-plan.md`를 따른다. 기능 구현 관점에서는 마감 알림 발송 구현 준비가 1순위다. 배포 관점의 Cloudflare Tunnel staging 실행과 Jenkinsfile은 기능 패스가 멈추거나 release staging으로 복귀할 때 재개한다.
