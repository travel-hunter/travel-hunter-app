# Travel Hunter 구현 기능명세서

> Status: active implementation/status inventory.
> Use this document as the implemented-feature and conditional-scope inventory. For the current execution queue, use `docs/next-work-plan.md`; `docs/specs/spec-index.md` is only the local UX spec index.

## 기준

- 실행 모드: DB-backed-only.
- Runtime mock mode는 제거됐다.
- 이 문서는 현재 구현된 사용자 동작과 API/DB 연결을 기능명세 관점으로 정리한다.
- 제품 요구사항은 `docs/requirements.md`, 다음 작업 실행 큐는 `docs/next-work-plan.md`, API wire shape는 `docs/mvp-api-contract.md`를 따른다.

## 인증과 계정

| 기능 | 사용자 동작 | 연결 |
|---|---|---|
| 회원가입 | `/signup`에서 email만 입력해 인증 메일을 요청한다. `/signup/verify?token=...` 링크를 열면 이메일 인증 완료 상태에서 비밀번호 입력창이 나타나고, 비밀번호 제출 시 계정이 생성되어 자동 로그인 후 온보딩으로 이어진다. 미완료 인증 재요청은 기존 pending signup을 교체한다. | `POST /api/auth/email-check`, `POST /api/auth/signup`, `POST /api/auth/signup/verify`, `POST /api/auth/signup/complete`, `pending_signups`, `users`, refresh cookie |
| 닉네임 설정 | `/nickname-setup`에서 자동 생성된 임시 닉네임을 수정하거나 주사위 버튼으로 새 추천 닉네임을 받아 저장한다. | `GET /api/me/nickname-suggestion`, `PATCH /api/me/nickname`, `users.nickname` |
| 로그인 | `/`와 `/login`에서 프로토타입과 같은 모바일 앱형 로그인 화면을 보여주고 email/password로 로그인한다. 실패 시 사용자용 오류를 표시한다. | `POST /api/auth/login`, `auth_refresh_tokens` |
| 세션 유지/로그아웃 | refresh cookie로 access token을 갱신하고, 로그아웃 시 refresh token을 revoke한다. | `POST /api/auth/refresh`, `POST /api/auth/logout` |
| 비밀번호 재설정 | `/forgot-password` 요청 후 email link로 `/reset-password?token=...`에서 새 비밀번호를 설정한다. | `password_reset_tokens`, SMTP 설정 필요 |
| Kakao/Google OAuth | 로그인 버튼에서 provider authorization flow를 시작하고 callback에서 세션을 복구한다. 동일 이메일 자동 연결은 검증된 provider email만 허용하고, callback 실패는 닫힌 error code로 사용자용 메시지를 표시한다. Kakao는 `account_email`만 요청하며, 기존 `kakao_{providerId}@oauth.local` 내부 이메일 계정은 verified Kakao email을 받는 다음 로그인 때 충돌이 없으면 실제 email로 자동 교체한다. dev 도메인에서는 Google/Kakao 브라우저 로그인이 검증됐다. | `social_accounts`, provider env 필요 |

## 사용자와 마이페이지

| 기능 | 사용자 동작 | 연결 |
|---|---|---|
| 프로필 설정 | `/profile-setup`에서 관심 지역, 스타일, 예산을 저장한다. | `PATCH /api/me/profile`, `users` |
| 프로필 편집 | `/mypage`의 편집 sheet에서 profile 값을 수정한다. | `PATCH /api/me/profile` |
| 저장 정책 | `/mypage`에서 저장한 정책을 확인하고 삭제한다. | `GET/DELETE /api/me/saved-policies` |
| 신청 정책 통계 | `/mypage`에서 내 일정에 연결된 정책 수를 확인한다. | `GET /api/me/applied-policies`, `trip_policies` |
| 알림 연락처 | 카카오 알림톡 연락처를 저장하거나 삭제하고, env-gated dev/SOLAPI SMS provider boundary를 통해 OTP 인증번호 요청/확인을 수행한다. 미인증 OTP 발급 후 60초 이내 재요청은 서버에서 429로 차단한다. | `GET/PATCH /api/me/contact`, `POST /api/me/contact/verification/request`, `POST /api/me/contact/verification/confirm`, `PHONE_VERIFICATION_PROVIDER`, `users.phone_number`, `users.phone_verified_at`, `phone_verification_codes` |
| 마감 알림 설정 | D-7/D-1 정책 알림을 켜거나 끈다. | `GET/PATCH /api/me/notification-settings` |

## 정책

| 기능 | 사용자 동작 | 연결 |
|---|---|---|
| 정책 목록/상세 | `/policies`에서 DB 정책과 대한민국 반값여행 신청접수중/준비중 및 active/fresh 숙박세일 페스타 혜택을 함께 보고 `/policies/:slug`에서 상세를 확인한다. `local_half_trip` 수집 혜택은 `sourceType="external"`과 `travelmonth-{externalSourceRecordId}` slug로 노출한다. 숙박세일 페스타는 canonical 정책 1건을 내부 저장/중복 방지 기준으로 두고 목록/검색/추천에는 비수도권 인구감소지역 85개 지자체별 `stay-discount-{sidoSlug}-{citySlug}` alias로 노출하되 제목은 `[고성] ...`처럼 시/군 접두어를 붙이고 목록 메타 `region`은 광역자치단체만 표시한다. alias 상세/저장/삭제/일정 연결 응답은 요청 alias를 echo하지만 DB 저장과 연결은 canonical `policies.id`로 처리한다. 사용자 화면에는 구현 구분 라벨을 표시하지 않고 공식 혜택으로 표현한다. raw 수집 레코드는 normalization 전까지 저장/일정 연결 action을 neutral 안내와 함께 임시 제한한다. | `GET /api/policies`, `GET /api/policies/{policySlug}` |
| 검색/필터 | 검색어, 지역, 카테고리를 client-side AND 조건으로 적용한다. 카테고리는 `교통`, `숙박`, `여행상품`, `지역할인`, `이벤트`, `기타` 혜택 유형이며 `travelStyles`와 분리한다. | frontend filtering |
| 정책 탐색 바로가기 | `/policies` 상단에서 매칭 높은 정책, 마감 임박 정책, 유형별 모아보기를 먼저 보여주고 `/home`에서도 마감 임박/추천 혜택 레일을 분리해 보여준다. 홈 인기 국내 여행지와 AI 추천 맞춤 일정 카드는 `GET /api/recommendations/regions`를 `AppDataApi` 경유로 호출해 정책 수, 마감 임박, 혜택 금액, 취향 보정, 프로필 지역 최종 tie-breaker 기준으로 표시하고 실패/empty 때는 정책 지역 기반 후보로 fallback한다. AI 추천 맞춤 일정 카드는 기존 일정 목록의 첫 일정을 노출하지 않고 `/trips/new?region=...` 새 일정 생성 CTA로 연결한다. | `GET /api/recommendations/regions`, frontend grouping |
| 조건 확인 요약/FAQ | 정책 상세에서 내 관심 지역과 정책 지역, 핵심 신청 조건, 필요 서류를 요약하고 정적 FAQ accordion을 제공한다. 확정 자격 판정은 하지 않는다. | `Policy.requirements`, `Policy.documents`, `Policy.region` |
| 저장/삭제 | 내부 `policies` 레코드는 정책 상세에서 저장하고 마이페이지에서 삭제한다. raw 수집 레코드는 normalization 전까지 저장 action을 임시 제한한다. | `user_saved_policies` |
| 공식/신청 URL | `applyUrl`은 `신청하러 가기`, `officialUrl`은 `혜택 안내 보기`, 둘 다 없으면 `신청 링크 준비 중`으로 구분한다. | `policies.apply_url`, `policies.official_url` |
| 공유 | Web Share API, clipboard, legacy copy 순서로 현재 정책 URL을 공유한다. | frontend utility |
| 일정 담기 | 내부 `policies` 레코드는 정책 상세 sheet에서 일정을 선택해 정책을 담는다. raw 수집 레코드는 normalization 전까지 일정 연결 action을 임시 제한한다. | `POST /api/trips/{tripId}/policies/{policySlug}` |
| 혜택 패키지 요약 | 정책 상세에서 대표 지원, 교통 혜택 후보, 지역 할인 후보를 한 화면에 묶어 보여준다. 확정 자격 판정이 아니라 공식 확인 전 안내 UI로 제공한다. | frontend display |

## 일정

| 기능 | 사용자 동작 | 연결 |
|---|---|---|
| 일정 목록/생성 | `/trips`에서 목록을 보고 `/trips/new`에서 지역, 스타일, 기간으로 일정을 만든다. `/home`의 추천 지역 링크가 넘긴 `/trips/new?region=...` 값은 새 일정 생성 지역으로 유지된다. | `GET/POST /api/trips` |
| 일정 확정 저장 | `/trips` 카드에서 draft 일정을 확정 선택 후 저장해 DB 상태를 `confirmed`로 바꾼다. | `trips.status`, `PATCH /api/trips/{tripId}/status` |
| 생성 draft autosave | `/trips/new`의 지역, 스타일, 기간, policySlug draft를 24시간 localStorage에 저장한다. 생성 성공 시 삭제한다. | `frontend/src/utils/draftStorage.ts` |
| 상세/삭제 | `/trips/:id`에서 상세를 보고 owner는 목록에서 일정을 삭제한다. 일정 상세의 추천 정책 카드는 `recommendedPolicies`를 사용해 정규화된 정책과 TravelMonth/반값여행/숙박세일 혜택 상세 페이지로 연결하며 지역, 날짜 겹침, 카테고리, 스타일 텍스트만으로 deterministic ranking한다. 숙박세일 추천은 canonical 1건이 아니라 eligible area alias 후보만 표시하고, 이미 연결된 canonical 정책이 있으면 모든 숙박세일 alias 추천을 숨긴다. | `GET/DELETE /api/trips/{tripId}`, `Trip.recommendedPolicies` |
| 장소 추가/수정/삭제/이동 | owner/editor는 장소를 추가, 수정, 삭제하고 드래그앤드롭으로 같은 Day 순서 변경 또는 다른 Day 이동을 수행한다. 각 장소 변경은 `Trip.revision`/`expectedRevision` optimistic conflict 처리를 거치며 stale 저장은 409 후 최신 일정을 다시 불러오고 draft를 유지한다. viewer는 편집할 수 없다. | `trip_places` CRUD/move endpoints, `trips.revision` |
| 장소 추가 draft autosave | 장소 추가 sheet의 시간, 장소명, 메모, dayNumber draft를 24시간 localStorage에 저장한다. 저장 성공 또는 닫기 시 삭제한다. | `frontend/src/utils/draftStorage.ts` |
| 장소 수정 draft autosave | 장소 수정 sheet의 시간, 장소명, 메모 draft를 `placeId` 기준으로 24시간 localStorage에 저장한다. 저장 성공, 닫기, 장소 삭제 시 삭제한다. | `frontend/src/utils/draftStorage.ts` |
| Draft 복원 안내/폐기 | `/trips/new`와 장소 sheet에서 유효 draft를 불러오면 안내를 표시하고 사용자가 임시 저장 내용을 버릴 수 있다. | frontend localStorage UX |
| 정책 연결 | 정규화된 정책 상세에서 선택한 정책을 일정에 연결한다. `travelmonth-{id}` TravelMonth 혜택은 새 일정 생성 참고 컨텍스트로만 쓰고 normalization 전 `trip_policies` 연결 요청에는 보내지 않는다. | `trip_policies`, frontend policy context |

## AI 추천

| 기능 | 사용자 동작 | 연결 |
|---|---|---|
| 추천 조회 | `/ai-results?tripId=...`에서 추천 목록을 본다. 새 후보는 `sourceType="freshCandidate"`, 일정 생성 시 저장된 추천 요약 fallback은 `sourceType="savedSummary"`로 구분하고 화면 banner/badge로 출처를 표시한다. | `GET /api/trips/{tripId}/recommendations` |
| 추천 항목 추가 | 추천 항목을 일정 장소로 추가한다. 이미 현재 일정 timeline에 같은 장소명이 있으면 `/ai-results?tripId=...`에서 `이미 일정에 있음`으로 표시하고 중복 추가를 막는다. | `GET /api/trips/{tripId}`, `POST /api/trips/{tripId}/days/{dayNumber}/places` |
| 추천 기준 설명 | 추천 기준 아이콘으로 설명 sheet를 연다. | frontend sheet |

## 초대와 협업

| 기능 | 사용자 동작 | 연결 |
|---|---|---|
| 초대 링크/email 생성 | `/friend-invite?tripId=...`에서 owner가 viewer/editor 권한을 골라 링크를 활성화하거나 email 초대를 보낸다. 백엔드가 반환하는 `inviteUrl`은 `TRAVEL_HUNTER_PUBLIC_BASE_URL` 기준 `/invites/{token}/accept` 공개 수락 경로를 사용하며, email 본문에는 일정 상세를 담지 않는다. SMTP 미설정/실패 시 링크 복사 fallback을 안내한다. | `trip_invites.role`, `TRAVEL_HUNTER_PUBLIC_BASE_URL`, SMTP env |
| 초대 수락 | `/invites/:token/accept`로 진입해 로그인 후 초대를 수락한다. 비로그인 사용자는 로그인/가입 후 redirect로 원래 초대 링크에 복귀하고, 만료/오류 상태는 새 초대 링크 요청 안내를 표시한다. | `trip_invites.accepted_at`, `trip_members` |
| 권한 적용 | owner/editor만 장소를 편집하고 viewer는 읽기 전용으로 본다. | trip service authorization |
| 상세 작업흐름 | 링크 기반 초대, 로그인/가입 후 수락, 중복 수락, 상세 일정 편집 권한, 장소 저장 충돌, email 초대와 예외 흐름은 별도 workflow spec을 따른다. | `docs/specs/invite-trip-edit-workflow.md` |

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
| 공통 상태 UX | `/policies`, `/trips`, `/mypage`의 loading/empty/error 상태는 공통 상태 패널과 다음 행동 CTA를 사용한다. |
| 프로토타입 기반 앱 UX | 업로드 HTML 프로토타입의 모바일 앱형 흐름을 현재 React 화면에 반영했다. `/` 랜딩은 제거하고 프로토타입 로그인 첫 화면을 실제 auth flow와 연결했다. 홈 대표 혜택 hero, 정책 카드/태그, 정책 상세 혜택 패키지, 일정 상세 혜택 묶음, 공통 배경/카드 톤을 정리하되 실제 DB-backed 기능은 유지한다. |
| PWA manifest/meta | 앱 이름, theme color, Apple mobile meta, 192/512/maskable icon을 제공한다. Service worker는 아직 추가하지 않는다. |
| Production sourcemap | Vite production sourcemap은 명시적으로 비활성화되어 있다. |
| 로컬 개발 런타임 | Docker `db/backend`와 Vite dev server 기준 실행 절차를 문서화했다. |
| Cloudflare Tunnel 배포 | `docs/deployment-cicd/`에 GitHub, Docker, Jenkins 계획, release checklist 기준을 모았다. |
| 정책 수집 운영 상태/수동 실행 | 관리자 인증된 `/api/ops/external-collection`과 `/api/ops/external-collection/quality`가 scheduler 상태, 수집 품질 count, 추천 preview를 제공한다. public 수집 source는 대한민국 반값여행(`local_half_trip`)과 숙박세일 페스타(`stay_discount`)이며, 여행가는 달 지역/교통 혜택 source는 중복/legacy evidence로만 보존한다. `/api/ops/external-collection/run`은 관리자가 공식 source 수집을 1회 실행하고 per-source 성공/실패를 반환한다. 관리자 대시보드에서는 외부 정책 수집 상태와 수동 실행 버튼을 제공한다. RC gate는 `totalRecords >= minParsedCount`, `freshRecords > 0`, `activeRecords > 0`, 최신 수집/검증 timestamp 존재, 정규화 정책의 list/detail 노출, stale 숨김으로 검증한다. | `GET /api/ops/external-collection`, `POST /api/ops/external-collection/run`, `GET /api/ops/external-collection/quality`, `GET /api/admin/external-sources/summary` |

## 조건부 기능과 미구현 범위

- SMTP env와 public base URL이 있어야 password reset email smoke를 완료할 수 있다.
- dev 도메인 `dev.travel-hunter.co.kr`에서는 Kakao/Google provider secret과 public redirect URI 기반 브라우저 OAuth smoke가 완료됐다. 운영 도메인 `travel-hunter.co.kr`에서는 별도 provider redirect URI, runtime env, public smoke 증거가 필요하다.
- SOLAPI key, Kakao channel, 승인 템플릿이 있어야 실제 알림톡 발송을 확인할 수 있다.
- 정책 수집/정규화/노출의 local code path와 release-gate test는 존재하지만, Public v1/RC 판정에는 public domain/runtime smoke 증거가 추가로 필요하다.
- 전화번호 OTP 실제 발송 smoke, 실제 AI 엔진, SMTP readiness 이후 친구 초대 email 발송, email 외 SMS/Kakao 초대 발송, 운영 관리자 화면, 정책 수집 source 확대와 full automation은 후속 범위다.
- 지도/장소 검색의 로컬 기본 UX는 일정 상세 지도, 장소 상세 dialog, 장소 추가 sheet 후보 검색, Kakao Local 후보, catalog fallback 기준으로 구현되어 있다. Public map-domain 검증과 추천 품질 고도화는 별도 개선 범위다.
