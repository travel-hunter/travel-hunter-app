# Travel Hunter MVP API 계약 v0.3

API prefix는 `/api`다. API DTO는 `camelCase`, DB/SQL 필드는 `snake_case`를 사용한다. 런타임 mock mode는 제거됐고 모든 사용자-facing 데이터 흐름은 FastAPI + PostgreSQL 기준으로 동작한다.

## 공통 규칙

- 정책 상세는 `policies.slug` 기준이다.
- 일정은 public slug를 만들지 않고 string `tripId` handle로 조회한다.
- 정상 DB 응답의 `Trip.id`는 numeric `trips.id`를 string으로 반환한다.
- `/api/trips/jeju-3-days`는 seed 호환 legacy alias다. DB 컬럼이나 public slug가 아니다.
- legacy alias도 인증과 owner/member 접근 권한 검사를 우회하지 않는다.
- 보호 endpoint는 Bearer access token이 필요하다.
- 보안/internal 필드는 응답하지 않는다: `password_hash`, `provider_id`, `refresh_token_hash`.

## Auth

### `POST /api/auth/signup`

Request:

```json
{
  "email": "new.user@example.com",
  "password": "password123",
  "name": "테스트 신규 사용자"
}
```

Response `200`: `AuthResponse`

```json
{
  "accessToken": "jwt-access-token",
  "user": {
    "id": "1",
    "name": "테스트 사용자",
    "nickname": "테스트 사용자",
    "email": "test.user@example.com",
    "birthDate": "1997-04-12",
    "gender": null,
    "region": "제주",
    "homeRegion": "서울 마포",
    "residenceArea": "서울 마포",
    "preferredRegions": "제주,부산,강원",
    "persona": "Travel Hunter 사용자",
    "savedAmount": 0,
    "onboardingCompleted": true,
    "socialAccounts": [],
    "createdAt": "2026-05-04T00:00:00",
    "updatedAt": "2026-05-04T00:00:00"
  }
}
```

Errors:

- duplicate email: `409 {"detail": "Email already registered"}`

### `POST /api/auth/login`

Request:

```json
{
  "email": "test.user@example.com",
  "password": "password123"
}
```

Response `200`: `AuthResponse`

Errors:

- invalid credentials: `401 {"detail": "Invalid email or password"}`

### `POST /api/auth/refresh`

Request body 없음. `travel_hunter_refresh` HttpOnly cookie를 읽는다.

Response `200`: `AuthResponse`

Errors:

- invalid, expired, revoked refresh token: `401 {"detail": "Invalid refresh token"}`

### `POST /api/auth/logout`

Response `200`:

```json
{ "loggedOut": true }
```

## User/Profile

### `GET /api/me`

Bearer token 필요.

Response `200`: `User`

Errors:

- missing, invalid, expired access token: `401 {"detail": "Not authenticated"}`

### `GET /api/me/profile`

Response `200`:

```json
{
  "region": "부산",
  "style": "맛집",
  "budget": "1인 30만원 이하"
}
```

### `PATCH /api/me/profile`

Request fields are optional:

```json
{
  "region": "부산",
  "style": "맛집",
  "budget": "1인 30만원 이하"
}
```

Response `200`: `Profile`

Behavior:

- `region` -> `users.region`
- `style` -> `users.travel_style`
- `budget` -> `users.travel_budget`
- save marks `users.onboarding_completed=true`

### `GET /api/me/contact`

Bearer token 필요.

Response `200`:

```json
{
  "phoneNumber": "01012345678",
  "phoneVerified": false
}
```

Behavior:

- `phoneNumber` -> `users.phone_number`
- `phoneVerified` -> `users.phone_verified_at != null`
- 전화번호가 없으면 `phoneNumber=null`, `phoneVerified=false`를 반환한다.

### `PATCH /api/me/contact`

Bearer token 필요.

Request:

```json
{
  "phoneNumber": "010 1234 5678"
}
```

Response `200`: `ContactInfo`

Behavior:

- 요청 전화번호의 공백을 제거해 `users.phone_number`에 저장한다.
- 빈 문자열 또는 `null`은 `users.phone_number=null`로 저장한다.
- 전화번호가 변경되면 `users.phone_verified_at`은 초기화한다.
- 실제 전화번호 인증/OTP는 이번 endpoint가 수행하지 않는다.

### `GET /api/me/notification-settings`

Bearer token 필요.

Response `200`:

```json
{
  "deadlineEnabled": true,
  "deadlineLeadDays": [7, 1]
}
```

Behavior:

- 설정 row가 없으면 `deadlineEnabled=true`를 기본값으로 반환한다.
- `deadlineLeadDays`는 정책 마감 알림 기준인 D-7, D-1을 나타내는 서버 상수이며 DB에 저장하지 않는다.

### `PATCH /api/me/notification-settings`

Bearer token 필요.

Request:

```json
{
  "deadlineEnabled": false
}
```

Response `200`: `NotificationSettings`

Behavior:

- `deadlineEnabled` -> `user_notification_settings.deadline_enabled`
- 사용자당 하나의 설정 row만 유지한다.
- 실제 push/email/카카오 알림 발송은 이 endpoint가 수행하지 않는다.

## Internal Notification Delivery

Public HTTP endpoint는 없다. FastAPI 내부 scheduler가 KST 기준 하루 1회 dispatch service를 실행한다.

Internal behavior:

- D-7/D-1 대상은 `user_saved_policies`, `policies.end_date`, `user_notification_settings.deadline_enabled`, `users.phone_number`, `users.phone_verified_at` 기준으로 계산한다.
- `notification_deliveries(user_id, policy_id, channel, lead_day, target_deadline_date)` unique key로 중복 생성을 방지한다.
- `KAKAO_ALIMTALK_ENABLED=false`이면 후보 생성만 수행하고 SOLAPI를 호출하지 않는다.
- `KAKAO_ALIMTALK_ENABLED=true`이면 `pending` 후보만 SOLAPI `POST /messages/v4/send-many/detail`로 접수한다.
- SOLAPI 접수 성공은 `status=sent`, `provider_message_id`, `sent_at`으로 기록한다.
- SOLAPI 실패 응답, HTTP error, timeout은 `status=failed`, `attempt_count`, `error_message`, `failed_at`으로 기록한다.
- 한국 휴대폰 번호로 정규화되지 않는 연락처는 provider 호출 없이 `status=skipped`로 기록한다.
- `NOTIFICATION_RETRY_ENABLED=true`이면 같은 lead day 안의 `failed` row 중 `attempt_count < NOTIFICATION_RETRY_MAX_ATTEMPTS`이고 retry delay가 지난 row를 다음 scheduler 실행에서 재전송한다.
- 최대 시도 횟수를 넘긴 row는 새 status 없이 `failed` 상태로 유지한다.

### `GET /api/profile-options`

Static option response:

```json
{
  "regions": ["제주", "부산", "강원", "전국"],
  "travelStyles": ["휴식", "맛집", "자연", "사진"],
  "budgets": ["1인 30만원 이하", "1인 40만원 이하", "1인 60만원 이하", "상관없음"]
}
```

## Policies

### `GET /api/policies`

Response `200`: `Policy[]`

Policy shape:

```json
{
  "id": "local-vacation",
  "slug": "local-vacation",
  "label": "TH",
  "tag": "최대 30만원",
  "title": "지역사랑 휴가지원",
  "org": "한국관광공사",
  "region": "전국",
  "deadline": "2026-10-31",
  "amount": "최대 30만원 환급",
  "summary": "국내 1박 이상 여행 시 숙박, 교통, 체험비 일부를 환급해주는 지원 정책입니다.",
  "match": 98,
  "category": "환급",
  "requirements": ["국내 거주자", "숙박 1박 이상", "영수증 제출"],
  "documents": ["신분증 사본", "숙박 영수증", "교통비 증빙"],
  "officialUrl": "https://www.mcst.go.kr/site/s_notice/press/pressView.jsp?pMenuCD=0302000000&pSeq=22267",
  "applyUrl": null
}
```

Link semantics:

- `officialUrl`: 공식 안내/상세 페이지.
- `applyUrl`: 실제 신청/접수/deep link.
- 정확한 신청 링크가 확인되지 않으면 `applyUrl=null`.
- 프론트 CTA는 `applyUrl` -> `officialUrl` -> 준비 안내 순서로 처리한다.

### `GET /api/policies/{policySlug}`

Response `200`: `Policy`

Errors:

- unknown slug: `404 {"detail": "Policy not found"}`

### `GET /api/me/saved-policies`

Bearer token 필요. Response `200`: `Policy[]`

### `POST /api/me/saved-policies/{policySlug}`

Bearer token 필요.

Response `200`:

```json
{
  "policyId": "local-vacation",
  "saved": true
}
```

Errors:

- unknown policy slug: `404 {"detail": "Policy not found"}`

### `DELETE /api/me/saved-policies/{policySlug}`

Bearer token 필요.

Response `200`:

```json
{
  "policyId": "local-vacation",
  "saved": false
}
```

## Trips

### Trip handle rules

- `tripId`는 opaque string handle이다.
- Canonical numeric handle은 `^[1-9][0-9]*$`만 허용한다.
- `0`, `001`, `1.0`은 numeric id로 해석하지 않는다.
- `jeju-3-days`는 seed owner email `test.user@example.com`, seed title, `2026-06-15`~`2026-06-17`이 정확히 하나 매칭될 때만 해석한다.
- unknown, inaccessible, unsupported handle은 `404 {"detail": "Trip not found"}`다.

Trip shape:

```json
{
  "id": "1",
  "title": "제주 3일 여행",
  "dates": "2026.06.15 - 06.17",
  "people": ["테스트 사용자"],
  "expectedSaving": "30만원",
  "currentUserRole": "owner",
  "days": {
    "1": [
      { "time": "09:00", "label": "성산 일출봉", "meta": "자연 · 관광지" }
    ]
  }
}
```

`currentUserRole` is the requesting user's role for that trip: `owner`, `editor`, or `viewer`.

### `GET /api/trips`

Bearer token 필요. Response `200`: `Trip[]`

### `POST /api/trips`

Request body optional:

```json
{
  "title": "제주 3일 여행",
  "region": "제주",
  "style": "휴식",
  "description": "휴식",
  "policySlug": "local-vacation",
  "durationDays": 3
}
```

Response `200`: created `Trip`

Rules:

- `region` -> `trips.region`
- `description` -> `trips.description`
- if `description` is absent and `style` exists, `style` is stored in `trips.description`
- if `policySlug` exists, generated trip is connected through `trip_policies`
- `durationDays` is optional, defaults to `3`, and must be between `2` and `5`
- `durationDays` controls `trips.end_date` and the number of generated `trip_days`

Errors:

- unknown `policySlug`: `404 {"detail": "Policy not found"}`
- invalid `durationDays`: `422`

### `GET /api/trips/{tripId}`

Response `200`: `Trip`

Errors:

- unknown or inaccessible trip: `404 {"detail": "Trip not found"}`

### `DELETE /api/trips/{tripId}`

Bearer token 필요. 현재 사용자가 owner인 일정만 삭제할 수 있다.

Response `200`:

```json
{
  "tripId": "1",
  "deleted": true
}
```

Rules:

- `tripId`는 canonical numeric handle만 삭제 대상으로 허용한다.
- 연결된 `recommendations.trip_id`는 삭제 전에 `null`로 분리한다.
- `trip_days`, `trip_places`, `trip_members`, `trip_policies`, `trip_invites`는 DB cascade 기준으로 삭제된다.

Errors:

- unauthenticated: `401 {"detail": "Not authenticated"}`
- unknown, inaccessible, non-owner, or noncanonical trip handle: `404 {"detail": "Trip not found"}`

### `POST /api/trips/{tripId}/policies/{policySlug}`

Response `200`:

```json
{
  "tripId": "1",
  "policyId": "local-vacation",
  "added": true
}
```

### `POST /api/trips/{tripId}/days/{dayNumber}/places`

Bearer token required. The requester must be able to access the trip as `owner` or `editor`.

Request:

```json
{
  "time": "14:30",
  "label": "Cafe stop",
  "meta": "Reservation note"
}
```

Response `200`: updated `Trip`.

Rules:

- `tripId` follows the same opaque handle rules as `GET /api/trips/{tripId}`.
- `dayNumber` must belong to the resolved trip.
- `label` is required.
- `time` is optional. When present it must use `HH:MM`.
- New places are appended after the current max `order_num` for that day.

Errors:

- unauthenticated: `401 {"detail": "Not authenticated"}`
- unknown, inaccessible, or day-missing trip: `404 {"detail": "Trip not found"}`
- accessible `viewer` member: `403 {"detail": "Trip edit permission required"}`
- invalid body or invalid time: `422`

### `PATCH /api/trips/{tripId}/places/{placeId}`

Bearer token required. The requester must be able to access the trip as `owner` or `editor`.

Request body accepts partial fields:

```json
{
  "time": "10:15",
  "label": "Updated place",
  "meta": "Updated memo"
}
```

Response `200`: updated `Trip`.

Errors:

- unauthenticated: `401 {"detail": "Not authenticated"}`
- unknown, inaccessible, or cross-trip place: `404 {"detail": "Trip not found"}`
- accessible `viewer` member: `403 {"detail": "Trip edit permission required"}`
- invalid body or invalid time: `422`

### `DELETE /api/trips/{tripId}/places/{placeId}`

Bearer token required. The requester must be able to access the trip as `owner` or `editor`.

Response `200`: updated `Trip`.

Errors:

- unauthenticated: `401 {"detail": "Not authenticated"}`
- unknown, inaccessible, or cross-trip place: `404 {"detail": "Trip not found"}`
- accessible `viewer` member: `403 {"detail": "Trip edit permission required"}`

## Recommendations

### `GET /api/trips/{tripId}/recommendations`

Response `200`: `Recommendation[]`

## Invites

### `GET /api/trips/{tripId}/invite`

Response `200`: `InviteState`

```json
{
  "id": "1",
  "tripId": "1",
  "inviteToken": "jeju-3d",
  "inviteUrl": "travelhunter.app/i/jeju-3d",
  "expiresAt": "2026-06-30T23:59:59Z",
  "createdAt": "2026-05-04T00:00:00Z",
  "acceptedAt": null,
  "invited": true,
  "copied": false,
  "role": "editor"
}
```

### `POST /api/trips/{tripId}/invite`

Optional request:

```json
{ "role": "viewer" }
```

`role` accepts `viewer` or `editor`; omitted role defaults to `editor`.

Response `200`: `InviteState` with `invited=true` and selected `role`.

### `POST /api/trips/{tripId}/invites`

Same request and response semantics as `POST /api/trips/{tripId}/invite`.

### `POST /api/invites/{inviteToken}/accept`

Bearer token 필요.

Response `200`: `InviteState` with `acceptedAt`

Behavior:

- valid token sets `trip_invites.accepted_at` when empty.
- current user is added to `trip_members` with the invite `role` when missing.
- repeated accept is idempotent.

Errors:

- unknown or expired invite token: `404 {"detail": "Invite not found"}`

## Health

### `GET /api/health`

Response `200`:

```json
{
  "status": "ok",
  "service": "travel-hunter-backend",
  "environment": "local",
  "database": "connected"
}
```

`database` is one of `not_configured`, `connected`, `unavailable`.
