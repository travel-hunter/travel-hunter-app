# Travel Hunter 구현 기능명세서

## 기준

- 실행 모드: DB-backed-only.
- Runtime mock mode는 제거됐다.
- 이 문서는 현재 구현된 사용자 동작과 API/DB 연결을 기능명세 관점으로 정리한다.
- 제품 요구사항은 `docs/requirements.md`, 기능별 완료 상태표는 `docs/feature-implementation-status.md`, API wire shape는 `docs/mvp-api-contract.md`를 따른다.

## 인증과 계정

| 기능 | 사용자 동작 | 연결 |
|---|---|---|
| 회원가입 | `/signup`에서 이름, email, password로 가입한다. 성공 후 인증 세션이 생성된다. | `POST /api/auth/signup`, `users`, refresh cookie |
| 로그인 | `/login`에서 email/password로 로그인한다. 실패 시 사용자용 오류를 표시한다. | `POST /api/auth/login`, `auth_refresh_tokens` |
| 세션 유지/로그아웃 | refresh cookie로 access token을 갱신하고, 로그아웃 시 refresh token을 revoke한다. | `POST /api/auth/refresh`, `POST /api/auth/logout` |
| 비밀번호 재설정 | `/forgot-password` 요청 후 email link로 `/reset-password?token=...`에서 새 비밀번호를 설정한다. | `password_reset_tokens`, SMTP 설정 필요 |
| Kakao/Google OAuth | 로그인 버튼에서 provider authorization flow를 시작하고 callback에서 세션을 복구한다. | `social_accounts`, provider env 필요 |

## 사용자와 마이페이지

| 기능 | 사용자 동작 | 연결 |
|---|---|---|
| 프로필 설정 | `/profile-setup`에서 관심 지역, 스타일, 예산을 저장한다. | `PATCH /api/me/profile`, `users` |
| 프로필 편집 | `/mypage`의 편집 sheet에서 profile 값을 수정한다. | `PATCH /api/me/profile` |
| 저장 정책 | `/mypage`에서 저장한 정책을 확인하고 삭제한다. | `GET/DELETE /api/me/saved-policies` |
| 알림 연락처 | 카카오 알림톡 연락처를 저장하거나 삭제한다. | `GET/PATCH /api/me/contact`, `users.phone_number` |
| 마감 알림 설정 | D-7/D-1 정책 알림을 켜거나 끈다. | `GET/PATCH /api/me/notification-settings` |

## 정책

| 기능 | 사용자 동작 | 연결 |
|---|---|---|
| 정책 목록/상세 | `/policies`에서 목록을 보고 `/policies/:slug`에서 상세를 확인한다. | `GET /api/policies`, `GET /api/policies/{policySlug}` |
| 검색/필터 | 검색어, 지역, 카테고리를 client-side AND 조건으로 적용한다. | frontend filtering |
| 저장/삭제 | 정책 상세에서 저장하고 마이페이지에서 삭제한다. | `user_saved_policies` |
| 공식/신청 URL | `applyUrl` 우선, 없으면 `officialUrl`, 둘 다 없으면 준비 안내를 표시한다. | `policies.apply_url`, `policies.official_url` |
| 공유 | Web Share API, clipboard, legacy copy 순서로 현재 정책 URL을 공유한다. | frontend utility |
| 일정 담기 | 정책 상세 sheet에서 일정을 선택해 정책을 담는다. | `POST /api/trips/{tripId}/policies/{policySlug}` |

## 일정

| 기능 | 사용자 동작 | 연결 |
|---|---|---|
| 일정 목록/생성 | `/trips`에서 목록을 보고 `/trips/new`에서 지역, 스타일, 기간으로 일정을 만든다. | `GET/POST /api/trips` |
| 생성 draft autosave | `/trips/new`의 지역, 스타일, 기간, policySlug draft를 24시간 localStorage에 저장한다. 생성 성공 시 삭제한다. | `frontend/src/utils/draftStorage.ts` |
| 상세/삭제 | `/trips/:id`에서 상세를 보고 owner는 목록에서 일정을 삭제한다. | `GET/DELETE /api/trips/{tripId}` |
| 장소 추가/수정/삭제/이동 | owner/editor는 장소를 추가, 수정, 삭제하고 드래그앤드롭으로 같은 Day 순서 변경 또는 다른 Day 이동을 수행한다. viewer는 편집할 수 없다. | `trip_places` CRUD/move endpoints |
| 장소 추가 draft autosave | 장소 추가 sheet의 시간, 장소명, 메모, dayNumber draft를 24시간 localStorage에 저장한다. 저장 성공 또는 닫기 시 삭제한다. | `frontend/src/utils/draftStorage.ts` |
| 장소 수정 draft autosave | 장소 수정 sheet의 시간, 장소명, 메모 draft를 `placeId` 기준으로 24시간 localStorage에 저장한다. 저장 성공, 닫기, 장소 삭제 시 삭제한다. | `frontend/src/utils/draftStorage.ts` |
| 정책 연결 | 정책 상세에서 선택한 정책을 일정에 연결한다. | `trip_policies` |

## AI 추천

| 기능 | 사용자 동작 | 연결 |
|---|---|---|
| 추천 조회 | `/ai-results?tripId=...`에서 추천 목록을 본다. | `GET /api/trips/{tripId}/recommendations` |
| 추천 항목 추가 | 추천 항목을 일정 장소로 추가한다. | `POST /api/trips/{tripId}/days/{dayNumber}/places` |
| 추천 기준 설명 | 추천 기준 아이콘으로 설명 sheet를 연다. | frontend sheet |

## 초대와 협업

| 기능 | 사용자 동작 | 연결 |
|---|---|---|
| 초대 링크 생성 | `/friend-invite?tripId=...`에서 viewer/editor 권한을 골라 링크를 활성화한다. | `trip_invites.role` |
| 초대 수락 | `/invites/:token/accept`로 진입해 로그인 후 초대를 수락한다. | `trip_invites.accepted_at`, `trip_members` |
| 권한 적용 | owner/editor만 장소를 편집하고 viewer는 읽기 전용으로 본다. | trip service authorization |

## 알림

| 기능 | 사용자 동작/운영 동작 | 연결 |
|---|---|---|
| 알림 설정 | 사용자가 마감 알림 전체 켜기/끄기를 저장한다. | `user_notification_settings` |
| 대상 계산 | 저장 정책 중 D-7/D-1 마감 대상 후보를 만든다. | `notification_deliveries` |
| scheduler | env가 켜진 경우 FastAPI lifespan scheduler가 하루 1회 계산/발송을 시도한다. | `NOTIFICATION_SCHEDULER_ENABLED` |
| SOLAPI dispatch/retry/webhook | provider env가 있을 때 카카오 알림톡을 접수하고 실패 retry와 webhook 상태 갱신을 처리한다. | SOLAPI env 필요 |

## 플랫폼과 배포

| 기능 | 설명 |
|---|---|
| PWA manifest/meta | 앱 이름, theme color, Apple mobile meta, 192/512/maskable icon을 제공한다. Service worker는 아직 추가하지 않는다. |
| Production sourcemap | Vite production sourcemap은 명시적으로 비활성화되어 있다. |
| LAN 개발 공유 | 같은 네트워크에서 `0.0.0.0` dev server와 LAN IP로 접근하는 절차를 문서화했다. |
| VPS/Tunnel staging | public VPS direct mode와 Cloudflare Tunnel mode 산출물을 모두 제공한다. |

## 조건부 기능과 미구현 범위

- SMTP env와 public base URL이 있어야 password reset email smoke를 완료할 수 있다.
- Kakao/Google provider secret과 redirect URI가 있어야 실제 OAuth smoke를 완료할 수 있다.
- SOLAPI key, Kakao channel, 승인 템플릿이 있어야 실제 알림톡 발송을 확인할 수 있다.
- 전화번호 OTP, 실제 AI 엔진, 지도/장소 검색, 친구 초대 외부 발송, 운영 관리자 화면, 정책 실시간 수집은 후속 범위다.
