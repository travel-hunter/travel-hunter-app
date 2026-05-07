# Travel Hunter 기능 구현상태

## 기준

- 기준 브랜치: `feat/prototype-to-react`.
- 기준 범위: 현재 worktree 포함. 버튼 audit 기반 auth/OAuth/UX 수정분도 포함한다.
- 실행 모드: DB-backed-only. Runtime mock mode는 제거된 상태다.
- 제외 파일: 기존 untracked `docs/requirements.md`는 분석/수정 대상에서 제외한다.
- 분류 기준:
  - `Complete`: UI, API, DB persistence, 테스트가 연결됨.
  - `Conditional`: 구현은 됐지만 외부 secret/env/provider 설정이 있어야 실제 동작.
  - `Partial`: 일부 UI/API는 있으나 핵심 저장, 검증, 사용자 흐름이 부족.
  - `Not Implemented`: 현재 제품에 필요한 요구가 있으나 구현 없음.
  - `Needs Verification`: 코드와 테스트는 있으나 실제 외부 환경 smoke가 필요.
  - `Broken`: 재현 가능한 실패. 현재 검증 기준에서는 없음.

## 전체 요약

현재 MVP의 핵심 사용자 흐름은 대부분 `Complete`다. 회원가입/로그인, 프로필, 정책 탐색/저장, 일정 생성/삭제/편집, 정책 담기, AI 추천 결과 일정 추가, 초대 수락/권한, 마이페이지 알림 설정은 프론트 UI에서 백엔드 API와 PostgreSQL 저장까지 연결되어 있다.

외부 서비스가 필요한 기능은 `Conditional`이다. 비밀번호 재설정은 SMTP 설정이 있어야 실제 email 발송이 가능하고, Kakao/Google OAuth는 provider client id/secret/redirect URI가 있어야 실제 로그인이 가능하다. SOLAPI 알림톡도 SOLAPI/Kakao 채널/템플릿 env가 있어야 실제 발송된다.

## 기능별 상태표

| 기능군 | 기능 | 화면/Route | API/Service | DB 저장 | 테스트 | 상태 | 남은 조건/리스크 | 다음 조치 |
|---|---|---|---|---|---|---|---|---|
| 인증 | 회원가입 | `/signup` | `POST /api/auth/signup` | `users`, refresh token | backend, Vitest, e2e | Complete | 없음 | 유지 |
| 인증 | 로그인/실패 처리 | `/login` | `POST /api/auth/login` | refresh token | backend, Vitest, e2e | Complete | 없음 | 유지 |
| 인증 | 세션 refresh/logout | app session | `POST /api/auth/refresh`, `POST /api/auth/logout` | `auth_refresh_tokens` | backend, Vitest, e2e | Complete | 없음 | 유지 |
| 인증 | 비밀번호 재설정 요청 | `/forgot-password` | `POST /api/auth/password-reset/request` | `password_reset_tokens` hash | backend, Vitest | Conditional | SMTP env가 없으면 실제 계정 email 발송은 503 | staging SMTP smoke |
| 인증 | 비밀번호 재설정 확정 | `/reset-password?token=...` | `POST /api/auth/password-reset/confirm` | password hash 갱신, refresh revoke | backend, Vitest | Complete | 실제 email 링크 end-to-end는 SMTP 필요 | SMTP smoke와 함께 확인 |
| 인증 | Kakao OAuth | `/login`, `/oauth/callback` | OAuth start/callback service | `social_accounts`, `users` | backend, Vitest | Conditional | Kakao app key/secret/redirect URI 필요 | Kakao developer console 설정 후 smoke |
| 인증 | Google OAuth | `/login`, `/oauth/callback` | OAuth start/callback service | `social_accounts`, `users` | backend, Vitest | Conditional | Google client id/secret/redirect URI 필요 | Google console 설정 후 smoke |
| 사용자 | 프로필 설정 | `/profile-setup` | `PATCH /api/me/profile` | `users.region/style/budget` | backend, Vitest, e2e | Complete | 없음 | 유지 |
| 사용자 | 마이페이지 프로필 편집 | `/mypage` | `PATCH /api/me/profile` | `users` | backend, Vitest | Complete | 없음 | 유지 |
| 사용자 | 알림 연락처 저장 | `/mypage` | `GET/PATCH /api/me/contact` | `users.phone_number` | backend, Vitest | Complete | 전화번호 실인증 없음 | OTP 설계 |
| 사용자 | 마감 알림 설정 | `/mypage` | `GET/PATCH /api/me/notification-settings` | `user_notification_settings` | backend, Vitest | Complete | 실제 발송은 별도 scheduler/provider 설정 필요 | 유지 |
| 정책 | 정책 목록/상세 | `/policies`, `/policies/:slug` | `GET /api/policies`, `GET /api/policies/{slug}` | `policies`, `policy_documents` | backend, Vitest, e2e | Complete | 없음 | 유지 |
| 정책 | 검색/지역/카테고리 필터 | `/policies` | client-side filtering | 없음 | Vitest, e2e | Complete | 데이터 증가 시 서버 검색 필요 가능 | 후속 확장 |
| 정책 | 저장/삭제 | `/policies/:slug`, `/mypage` | `GET/POST/DELETE /api/me/saved-policies` | `user_saved_policies` | backend, Vitest, e2e | Complete | 없음 | 유지 |
| 정책 | 정책 링크 복사 | `/policies/:slug` | frontend clipboard | 없음 | Vitest | Complete | Web Share API는 미구현 | 필요 시 후속 |
| 정책 | 공식/신청 URL CTA | `/policies/:slug` | `officialUrl/applyUrl` DTO | `policies.official_url/apply_url` | backend, Vitest | Complete | 실제 URL 정확도는 seed 데이터 품질에 의존 | 정책 URL 유지보수 |
| 정책 | 필요 서류 표시 | `/policies/:slug` | static checklist row | `policy_documents` | Vitest | Complete | 없음 | 유지 |
| 일정 | 일정 목록/생성/상세 | `/trips`, `/trips/new`, `/trips/:id` | `GET/POST/GET /api/trips` | `trips`, `trip_days`, `trip_places` | backend, Vitest, e2e | Complete | 없음 | 유지 |
| 일정 | 일정 삭제 | `/trips` | `DELETE /api/trips/{tripId}` | cascade delete | backend, Vitest | Complete | owner 전용 삭제 | 유지 |
| 일정 | 장소 추가/수정/삭제 | `/trips/:id` | place CRUD endpoints | `trip_places` | backend, Vitest, e2e | Complete | 지도/장소 검색 없음 | 지도 연동은 후속 |
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

- Password reset email: SMTP host/account/from address가 있어야 실제 email 발송 가능.
- Kakao OAuth: Kakao developer app 설정, redirect URI, client id/secret 필요.
- Google OAuth: Google OAuth consent/client 설정, redirect URI, client id/secret 필요.
- SOLAPI AlimTalk: SOLAPI key/secret, Kakao channel `pfId`, D-7/D-1 승인 템플릿 필요.
- Cloudflare Tunnel staging: domain, tunnel token, server runtime env 필요.

## 미구현 또는 제품 범위 밖 기능

- 실제 AI 추천 엔진.
- 지도/장소 검색 API와 이동 시간 계산.
- 전화번호 실인증/OTP.
- 친구 초대 email/SMS/Kakao 외부 발송.
- 운영 관리자 화면.
- 정책 실시간 수집/동기화.
- 공개 사용자용 약관/개인정보/운영 모니터링/백업 체계.

## 검증 결과

- `cd backend && python -m pytest`: 160 passed.
- `cd backend && alembic upgrade head --sql`: passed.
- `cd frontend && npm run typecheck`: passed.
- `cd frontend && npm test`: 36 passed.
- `cd frontend && npm run build`: passed.
- `cd frontend && npm run test:e2e`: 5 passed.
- `docker compose -f compose.yaml config`: passed.
- `docker compose --env-file deploy/.env.staging.example -f compose.vps.yaml config`: passed.
- `docker compose --env-file deploy/.env.tunnel.example -f compose.tunnel.yaml config`: passed.
- `git diff --check`: passed.

## 다음 기능 우선순위

1. SMTP staging smoke: reset email 발송, 링크 진입, password confirm까지 외부 URL 기준으로 확인.
2. Kakao/Google OAuth staging smoke: provider redirect URI와 cookie/refresh callback 확인.
3. Cloudflare Tunnel staging 배포: HTTPS URL에서 핵심 사용자 흐름 smoke.
4. 전화번호 OTP 설계/구현: Kakao AlimTalk 수신 연락처 실소유 검증.
5. 실제 AI/지도 연동 기획: 현재 seed 기반 추천을 실제 추천/검색 기반으로 전환.
