# Travel Hunter MVP API 계약 v0.3

API prefix는 `/api`다. API DTO는 `camelCase`, DB/SQL 필드는 `snake_case`를 사용한다.

## 공통 규칙

- 정책 상세는 `policies.slug` 기준이다.
- 일정은 public slug를 만들지 않고 string `tripId` handle로 조회한다.
- Mock mode의 seed trip id는 `jeju-3-days`다.
- DB mode의 `Trip.id`는 numeric `trips.id`를 문자열로 반환한다.
- DB mode에서 `/api/trips/jeju-3-days`는 seed 호환 alias이며, 응답 `id`는 numeric string이다.
- DB mode 보호 endpoint는 Bearer access token이 필요하다.
- 보안/internal 필드는 응답하지 않는다: `password_hash`, `provider_id`, `refresh_token_hash`.

## 인증

### `POST /api/auth/signup`

Request:

```json
{
  "email": "travel@example.com",
  "password": "hunter123",
  "name": "지영"
}
```

Response `200`:

```json
{
  "accessToken": "jwt-access-token",
  "user": {
    "id": "1",
    "name": "지영",
    "nickname": "지영",
    "email": "jiyoung@travel.kr",
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
  "email": "jiyoung@travel.kr",
  "password": "password123"
}
```

Response `200`: `AuthResponse`.

Errors:

- invalid credentials: `401 {"detail": "Invalid email or password"}`

### `POST /api/auth/refresh`

Request body 없음. DB mode에서는 `travel_hunter_refresh` HttpOnly cookie를 읽는다.

Response `200`: `AuthResponse`.

Errors:

- invalid, expired, revoked refresh token: `401 {"detail": "Invalid refresh token"}`

### `POST /api/auth/logout`

Response `200`:

```json
{
  "loggedOut": true
}
```

## 사용자

### `GET /api/me`

DB mode에서는 `Authorization: Bearer <accessToken>`이 필요하다.

Response `200`: `User`.

Errors:

- missing, invalid, expired access token: `401 {"detail": "Not authenticated"}`

### `GET /api/me/profile`

DB mode에서는 `Authorization: Bearer <accessToken>`이 필요하다.

Response `200`:

```json
{
  "region": "부산",
  "style": "맛집",
  "budget": "1인 30만원 이하"
}
```

DB mapping:

| API field | DB field / source |
|----------|-------------------|
| `region` | `users.region`, fallback `제주` |
| `style` | `users.travel_style`, fallback `휴식` |
| `budget` | `users.travel_budget`, fallback `1인 40만원 이하` |

Errors:

- missing, invalid, expired access token: `401 {"detail": "Not authenticated"}`

### `PATCH /api/me/profile`

Request fields are optional:

```json
{
  "region": "부산",
  "style": "휴식",
  "budget": "1인 40만원 이하"
}
```

Response `200`:

```json
{
  "region": "부산",
  "style": "휴식",
  "budget": "1인 40만원 이하"
}
```

DB mode behavior:

- 전달된 필드만 업데이트한다.
- `region`은 `users.region`에 저장한다.
- `style`은 `users.travel_style`에 저장한다.
- `budget`은 `users.travel_budget`에 저장한다.
- 저장 시 `users.onboarding_completed`를 `true`로 바꾸고 `users.updated_at`을 갱신한다.

### `GET /api/profile-options`

Response `200`:

```json
{
  "regions": ["제주", "부산", "강원", "전국"],
  "travelStyles": ["휴식", "맛집", "자연", "사진"],
  "budgets": ["1인 30만원 이하", "1인 40만원 이하", "1인 60만원 이하", "상관없음"]
}
```

## 정책

### `GET /api/policies`

Response `200`:

```json
[
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
    "documents": ["신분증 사본", "숙박 영수증", "교통비 증빙"]
  }
]
```

DB mapping:

| API field | DB source |
|----------|-----------|
| `id`, `slug` | `policies.slug` |
| `org` | `policies.organization` |
| `deadline` | `policies.end_date` |
| `amount` | `policies.benefit_detail` or `benefit_amount` display |
| `summary` | `policies.policy_comment` |
| `category` | `policies.policy_type` |
| `documents` | `policy_documents.document_name[]` |

### `GET /api/policies/{policySlug}`

Response `200`: `Policy`.

Errors:

- unknown slug: `404 {"detail": "Policy not found"}`

### `POST /api/me/saved-policies/{policySlug}`

DB mode에서는 `Authorization: Bearer <accessToken>`이 필요하다.

Response `200`:

```json
{
  "policyId": "local-vacation",
  "saved": true
}
```

DB mode behavior:

- `policySlug`는 `policies.slug`로 조회한다.
- 저장 상태는 `user_saved_policies`에 저장한다.
- 이미 저장된 정책이면 중복 row를 만들지 않고 같은 응답을 반환한다.

Errors:

- missing, invalid, expired access token: `401 {"detail": "Not authenticated"}`
- unknown policy slug: `404 {"detail": "Policy not found"}`

## 일정

### Trip handle rules

- `tripId`는 opaque string handle이다.
- Canonical numeric handle은 `^[1-9][0-9]*$`만 허용한다.
- `0`, `001`, `1.0`은 numeric id로 해석하지 않는다.
- Legacy alias `jeju-3-days`는 owner email `jiyoung@travel.kr`, seed title, `2026-06-15`~`2026-06-17`이 정확히 한 건 매칭될 때만 해석한다.
- unknown, inaccessible, unsupported trip handle은 `404 {"detail": "Trip not found"}`다.
- alias 조회도 인증/접근 권한 검사를 통과해야 한다.

Trip shape:

```json
{
  "id": "1",
  "title": "제주 3일 여행",
  "dates": "2026.06.15 - 06.17",
  "people": ["지영", "민서", "현우"],
  "expectedSaving": "12만원",
  "days": {
    "1": [
      {
        "time": "09:00",
        "label": "성산 일출봉",
        "meta": "자연 · 관광지"
      }
    ]
  }
}
```

DTO calculation:

- `people`은 owner nickname을 먼저 넣고 member nickname을 중복 제거해 추가한다.
- `expectedSaving`은 연결된 `trip_policies.policy.benefit_amount` 합계다.
- `benefit_amount`가 null이면 제외한다.
- 합계가 0이면 `"0원"`, 10,000원 단위로 나누어 떨어지면 `"{n}만원"`, 그 외에는 `"{amount}원"`으로 표시한다.
- `days`는 `trip_days.day_number`, `trip_places.order_num` 오름차순이다.

### `GET /api/trips`

Response `200`: `Trip[]`.

### `POST /api/trips`

Request body is optional:

```json
{
  "title": "제주 3일 여행",
  "region": "제주",
  "style": "휴식",
  "description": "휴식",
  "policySlug": "local-vacation"
}
```

Response `200`: created `Trip`.

Rules:

- `region`은 `trips.region`에 저장한다.
- `description`은 `trips.description`에 저장한다.
- `description`이 없고 `style`이 있으면 `style`을 `trips.description`에 저장한다.
- `policySlug`가 있으면 생성된 일정에 `trip_policies`로 정책을 연결한다.

Errors:

- unknown `policySlug`: `404 {"detail": "Policy not found"}`

### `GET /api/trips/{tripId}`

Response `200`: `Trip`.

Errors:

- unknown or inaccessible trip: `404 {"detail": "Trip not found"}`
- missing/invalid DB mode access token: `401 {"detail": "Not authenticated"}`

### `POST /api/trips/{tripId}/policies/{policySlug}`

Response `200`:

```json
{
  "tripId": "1",
  "policyId": "local-vacation",
  "added": true
}
```

Errors:

- unknown or inaccessible trip: `404 {"detail": "Trip not found"}`
- unknown policy slug: `404 {"detail": "Policy not found"}`

## AI 추천

### `GET /api/trips/{tripId}/recommendations`

Response `200`: `Recommendation[]`.

## 친구 초대

### `GET /api/trips/{tripId}/invite`

Response `200`:

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
  "copied": false
}
```

Rules:

- `copied`는 서버 저장 상태가 아니므로 항상 `false`를 반환한다.
- `invited`는 유효한 invite token이 존재하거나 이번 요청에서 생성/확인된 상태다.

### `POST /api/trips/{tripId}/invite`

Response `200`: `InviteState` with `invited: true`.

### `POST /api/trips/{tripId}/invites`

Response `200`: `InviteState`.

### `POST /api/invites/{inviteToken}/accept`

Response `200`: `InviteState` with `acceptedAt`.

DB mode behavior:

- Bearer access token이 필요하다.
- 유효한 invite token이면 `trip_invites.accepted_at`을 설정하고 현재 사용자를 `trip_members`에 `role="editor"`로 추가한다.
- 이미 수락된 invite이거나 이미 참여자인 사용자도 중복 row 없이 200을 반환한다.
- `acceptedAt`은 기존 또는 새 `trip_invites.accepted_at` 값이다.

Errors:

- missing, invalid, expired access token: `401 {"detail": "Not authenticated"}`
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

`database`는 `configured`, `not_configured`, `connected`, `unavailable` 중 하나다.
