# Travel Hunter 기능 구현상태

## 기준

- 기준 브랜치: `feat/prototype-to-react`.
- 기준 범위: 최신 커밋 `7b8fec0 feat: refresh frontend UX from prototype` 이후 현재 worktree의 랜딩 제거와 프로토타입 로그인 첫 화면 클론까지 포함한다.
- 실행 모드: DB-backed-only. Runtime mock mode는 제거된 상태다.
- 공식 요구사항 문서: `docs/requirements.md`.
- 분류 기준:
  - `Complete`: UI, API, DB persistence, 테스트가 연결됨.
  - `Conditional`: 구현은 됐지만 외부 secret/env/provider 설정이 있어야 실제 동작.
  - `Partial`: 일부 UI/API는 있으나 핵심 저장, 검증, 사용자 흐름이 부족.
  - `Not Implemented`: 현재 제품에 필요한 요구가 있으나 구현 없음.
  - `Needs Verification`: 코드와 테스트는 있으나 실제 외부 환경 smoke가 필요.
  - `Broken`: 재현 가능한 실패. 현재 검증 기준에서는 없음.

## 전체 요약

현재 MVP의 핵심 사용자 흐름은 대부분 `Complete`다. 회원가입/로그인, 프로필, 정책 탐색/저장, 일정 생성/삭제/편집, 정책 담기, AI 추천 결과 일정 추가, 초대 수락/권한, 마이페이지 알림 설정은 프론트 UI에서 백엔드 API와 PostgreSQL 저장까지 연결되어 있다. 프론트는 업로드 HTML 프로토타입의 모바일 앱형 흐름을 반영해 첫 접속 로그인, 홈, 정책 상세, 일정 상세의 혜택 탐색 구조를 강화했다.

외부 서비스가 필요한 기능은 `Conditional`이다. 비밀번호 재설정은 local SMTP capture E2E까지 통과했지만 실제 staging email 발송에는 SMTP provider와 HTTPS domain이 필요하다. Kakao/Google OAuth는 local preflight를 통과했지만 provider client id/secret/redirect URI가 있어야 실제 로그인이 가능하다. SOLAPI 알림톡도 SOLAPI/Kakao 채널/템플릿 env가 있어야 실제 발송된다. Cloudflare Tunnel은 Quick Tunnel `/login` 200까지 확인했고, named tunnel full-up은 실제 token/env 값이 필요하다.

## 기능별 상태표

| 기능군 | 기능 | 화면/Route | API/Service | DB 저장 | 테스트 | 상태 | 남은 조건/리스크 | 다음 조치 |
|---|---|---|---|---|---|---|---|---|
| 인증 | 회원가입 | `/signup` | `POST /api/auth/email-check`, `POST /api/auth/signup` | `users`, refresh token | backend, Vitest, e2e | Complete | 이름 입력 없이 email/password만 받음 | 유지 |
| 인증 | 닉네임 설정 | `/nickname-setup` | `GET /api/me/nickname-suggestion`, `PATCH /api/me/nickname` | `users.nickname` | backend, Vitest | Complete | 임시 닉네임은 서버가 자동 생성 | 유지 |
| 인증 | 로그인/실패 처리 | `/`, `/login` | `POST /api/auth/login` | refresh token | backend, Vitest, e2e | Complete | `/onboarding`은 `/login`으로 redirect | 유지 |
| 인증 | 세션 refresh/logout | app session | `POST /api/auth/refresh`, `POST /api/auth/logout` | `auth_refresh_tokens` | backend, Vitest, e2e | Complete | 없음 | 유지 |
| 인증 | 비밀번호 재설정 요청 | `/forgot-password` | `POST /api/auth/password-reset/request` | `password_reset_tokens` hash | backend, Vitest, local SMTP capture smoke | Conditional | 실제 staging 발송은 SMTP provider와 HTTPS base URL 필요 | 실제 SMTP provider smoke |
| 인증 | 비밀번호 재설정 확정 | `/reset-password?token=...` | `POST /api/auth/password-reset/confirm` | password hash 갱신, refresh revoke | backend, Vitest, local SMTP capture smoke | Complete | local E2E는 통과, 외부 staging 링크는 provider env 필요 | 실제 SMTP provider smoke |
| 인증 | Kakao OAuth | `/login`, `/oauth/callback` | OAuth start/callback service | `social_accounts`, `users` | backend, Vitest, local preflight | Conditional | Kakao app key/secret/redirect URI 필요 | Kakao developer console 설정 후 smoke |
| 인증 | Google OAuth | `/login`, `/oauth/callback` | OAuth start/callback service | `social_accounts`, `users` | backend, Vitest, local preflight | Conditional | Google client id/secret/redirect URI 필요 | Google console 설정 후 smoke |
| 사용자 | 프로필 설정 | `/profile-setup` | `PATCH /api/me/profile` | `users.region/style/budget` | backend, Vitest, e2e | Complete | 없음 | 유지 |
| 사용자 | 마이페이지 프로필 편집 | `/mypage` | `PATCH /api/me/profile` | `users` | backend, Vitest | Complete | 없음 | 유지 |
| 사용자 | 알림 연락처 저장 | `/mypage` | `GET/PATCH /api/me/contact` | `users.phone_number` | backend, Vitest | Complete | 전화번호 실인증 없음 | OTP 설계 |
| 사용자 | 마감 알림 설정 | `/mypage` | `GET/PATCH /api/me/notification-settings` | `user_notification_settings` | backend, Vitest | Complete | 실제 발송은 별도 scheduler/provider 설정 필요 | 유지 |
| 정책 | 정책 목록/상세 | `/policies`, `/policies/:slug` | `GET /api/policies`, `GET /api/policies/{slug}` | `policies`, `policy_documents` | backend, Vitest, e2e | Complete | 없음 | 유지 |
| 정책 | 검색/지역/카테고리 필터 | `/policies` | client-side filtering | 없음 | Vitest, e2e | Complete | 데이터 증가 시 서버 검색 필요 가능 | 후속 확장 |
| 정책 | 정책 탐색 바로가기 | `/home`, `/policies` | frontend grouping | 없음 | Vitest | Complete | 최근 등록 정렬은 현재 API 순서 기준이며 별도 createdAt 없음 | 데이터 증가 시 서버 추천/정렬 검토 |
| 정책 | 조건 확인 요약/FAQ | `/policies/:slug` | frontend-generated display | 없음 | Vitest | Complete | 실제 자격 판정 엔진은 아님 | 유지 |
| 정책 | 혜택 패키지 요약 | `/policies/:slug`, `/trips/:id` | frontend-generated display | 없음 | typecheck/build | Complete | 교통/지역 할인은 후보 안내이며 실제 패키지 계산 엔진은 아님 | 지역사랑/교통/지역 할인 데이터 모델은 별도 계획 |
| 정책 | 저장/삭제 | `/policies/:slug`, `/mypage` | `GET/POST/DELETE /api/me/saved-policies` | `user_saved_policies` | backend, Vitest, e2e | Complete | 없음 | 유지 |
| 정책 | 정책 링크 복사 | `/policies/:slug` | Web Share API, clipboard, legacy copy | 없음 | Vitest | Complete | 외부 공유 UI는 브라우저 지원에 의존 | 유지 |
| 플랫폼 | PWA manifest/meta | HTML shell, `manifest.webmanifest` | Vite static assets | 없음 | build 산출물 확인 | Complete | service worker/offline은 없음 | offline 전략은 후속 검토 |
| 플랫폼 | Draft autosave 1차 | `/trips/new`, `/trips/:id` 장소 추가/수정 sheet | frontend localStorage utility | localStorage | Vitest | Complete | 서버 동기화가 아닌 임시 입력 보호이며 복원 안내/버리기를 제공 | 유지 |
| 플랫폼 | 공통 상태 UX | `/policies`, `/trips`, `/mypage` | frontend state components | 없음 | Vitest | Complete | loading/empty/error 상태에 다음 행동 CTA 제공 | 유지 |
| 플랫폼 | 프로토타입 기반 앱 UX | `/`, `/login`, `/home`, `/policies/:slug`, `/trips/:id`, app shell | frontend layout/styles | 없음 | typecheck/build | Complete | 390/1024/1440 수동 시각 QA는 후속 확인 필요 | smoke 환경에서 visual QA |
| 정책 | 공식/신청 URL CTA | `/policies/:slug` | `officialUrl/applyUrl` DTO | `policies.official_url/apply_url` | backend, Vitest | Complete | 실제 URL 정확도는 seed 데이터 품질에 의존 | 정책 URL 유지보수 |
| 정책 | 필요 서류 표시 | `/policies/:slug` | static checklist row | `policy_documents` | Vitest | Complete | 없음 | 유지 |
| 일정 | 일정 목록/생성/상세 | `/trips`, `/trips/new`, `/trips/:id` | `GET/POST/GET /api/trips` | `trips`, `trip_days`, `trip_places` | backend, Vitest, e2e | Complete | 없음 | 유지 |
| 일정 | 일정 삭제 | `/trips` | `DELETE /api/trips/{tripId}` | cascade delete | backend, Vitest | Complete | owner 전용 삭제 | 유지 |
| 일정 | 장소 추가/수정/삭제/이동 | `/trips/:id` | place CRUD/move endpoints | `trip_places` | backend, Vitest, e2e | Complete | 지도/장소 검색 없음. 드래그 핸들, Day drop target, 이동 중 상태 제공 | 지도 연동은 후속 |
| 일정 | 정책 담기 | `/policies/:slug` sheet | `POST /api/trips/{tripId}/policies/{slug}` | `trip_policies` | backend, Vitest, e2e | Complete | 없음 | 유지 |
| AI 추천 | 추천 조회 | `/ai-results?tripId=...` | `GET /api/trips/{tripId}/recommendations` | `recommendations` seed/result | backend, Vitest, e2e | Complete | 실제 AI 엔진 아님 | 실제 AI는 후속 |
| AI 추천 | 추천 항목 일정 추가 | `/ai-results` | `POST /api/trips/{tripId}/days/{day}/places` 재사용 | `trip_places` | Vitest, e2e | Complete | 추천 시간 구조화 없음 | 필요 시 recommendation schema 확장 |
| AI 추천 | 추천 기준 설명 | `/ai-results` | frontend sheet | 없음 | Vitest | Complete | 실제 AI 기준은 정적 설명 | 실제 AI 도입 시 갱신 |
| 초대 | 초대 링크 생성/권한 | `/friend-invite?tripId=...` | `GET/POST /api/trips/{tripId}/invite` | `trip_invites.role` | backend, Vitest, e2e | Complete | 외부 발송 없음 | 문구상 링크 공유로 유지 |
| 초대 | 초대 수락 | `/invites/:token/accept` | `POST /api/invites/{token}/accept` | `trip_invites.accepted_at`, `trip_members` | backend, Vitest | Complete | 실제 공유 URL은 배포 도메인 필요 | staging smoke |
| 초대 | viewer/editor 권한 enforcement | `/trips/:id` | trip service authorization | `trip_members.role` | backend, Vitest | Complete | 세부 권한 정책은 MVP 수준 | 유지 |
| 알림 | 대상 계산 | internal | `notification_delivery` service | `notification_deliveries` | backend | Complete | public API 없음 | 유지 |
| 알림 | FastAPI scheduler | internal lifespan | scheduler/dispatch service | `notification_deliveries` | backend | Complete | env disabled 기본값 | staging에서 enabled smoke |
| 알림 | SOLAPI 알림톡 dispatch | internal | SOLAPI adapter | delivery sent/failed/skipped | backend | Conditional | SOLAPI/Kakao env, 승인 템플릿 필요 | provider env smoke |
| 알림 | Retry 정책 | internal | dispatch retry path | failed retry metadata | backend | Complete | 실제 provider 실패 시나리오 smoke 필요 | provider 연결 후 확인 |
| 알림 | SOLAPI webhook 상태 추적 | `/api/webhooks/solapi` | webhook route/service | delivery status update | backend | Conditional | 실제 SOLAPI webhook secret/event 필요 | provider webhook smoke |

## 조건부 완료 기능

- Password reset email: local SMTP capture E2E는 통과했고, 실제 staging email 발송에는 SMTP host/account/from address와 HTTPS base URL이 필요하다.
- Kakao OAuth: Kakao developer app 설정, redirect URI, client id/secret 필요.
- Google OAuth: Google OAuth consent/client 설정, redirect URI, client id/secret 필요.
- SOLAPI AlimTalk: SOLAPI key/secret, Kakao channel `pfId`, D-7/D-1 승인 템플릿 필요.
- Cloudflare Tunnel staging: Quick Tunnel frontend `/login`은 200 확인했고, named tunnel full-up에는 domain, tunnel token, server runtime env가 필요하다.

## 미구현 또는 제품 범위 밖 기능

- 실제 AI 추천 엔진.
- 지도/장소 검색 API와 이동 시간 계산.
- 전화번호 실인증/OTP.
- 친구 초대 email/SMS/Kakao 외부 발송.
- 운영 관리자 화면.
- 정책 실시간 수집/동기화.
- 공개 사용자용 약관/개인정보/운영 모니터링/백업 체계.

## 검증 결과

- `cd backend && python -m pytest`: 184 passed.
- `cd backend && alembic upgrade head --sql`: passed.
- `cd frontend && npm run typecheck`: passed.
- `cd frontend && npm test`: 72 passed.
- `cd frontend && npm run build`: passed, sourcemap 미생성, PWA manifest/icon 산출물 확인.
- `cd frontend && npm run test:e2e`: 5 passed.
- `docker compose -f compose.yaml config`: passed.
- `docker compose --env-file deploy/.env.staging.example -f compose.vps.yaml config`: passed.
- `docker compose --env-file deploy/.env.tunnel.example -f compose.tunnel.yaml config`: passed.
- `git diff --check`: passed.
- Local SMTP capture password reset E2E: passed.
- OAuth local/preflight: passed.
- Cloudflare Quick Tunnel frontend `/login`: 200 after preview host allowlist fix.
- Landing removal/login clone(2026-05-13): frontend typecheck, DB-backed Vitest 64 passed, frontend build, `git diff --check` passed.
- Service readiness cleanup(2026-05-18): display hardcoding centralized, KST trip date defaults added, protected runtime env guard added, policy JSON validator added.
- MyPage information sheets(2026-05-18): FAQ, terms, and privacy settings rows no longer show placeholder toast and render in-app sheet content.

## 다음 기능 우선순위

1. 랜딩 제거와 프로토타입 로그인 첫 화면 변경분 커밋.
2. `deploy/.env.tunnel` 실제값 확보 + Cloudflare Tunnel full-up.
3. 외부 HTTPS URL 기준 `/api/health`, `/login`, `/policies`, `/trips` 핵심 smoke와 visual QA.
4. 실제 SMTP provider password reset staging smoke.
5. Kakao/Google OAuth provider console smoke.
6. 전화번호 OTP 설계/구현.
7. PWA service worker 1차 구현 여부 결정.
