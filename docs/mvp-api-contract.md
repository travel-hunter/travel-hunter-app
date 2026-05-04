# Travel Hunter MVP API 계약 v0.3

이 문서는 ERD v0.3 권장안을 채택한 MVP API 계약 기준이다. API prefix는 `/api`이고, DB 필드는 `snake_case`, API DTO는 `camelCase`를 사용한다.

## 공통 규칙

- 정책 상세 조회는 `policies.slug` 기준이다.
- 일정은 공개 slug를 만들지 않고 내부 id 기준으로 조회한다.
- Mock mode는 `jeju-3-days` trip id를 유지하고, DB mode는 numeric `trips.id`를 string으로 반환한다. `/api/trips/jeju-3-days`는 legacy seed alias로만 지원한다.
- `password_hash`, `provider_id`, `refresh_token_hash`는 응답에 포함하지 않는다.
- Mock mode는 deterministic 응답을 유지한다.
- DB mode는 PostgreSQL-backed service를 사용하되, public response shape는 Mock mode와 동일하게 유지한다.

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

DB mode behavior:

- email은 lowercase로 정규화한다.
- `users.password_hash`에는 Argon2 hash만 저장한다.
- refresh token은 HttpOnly cookie로만 전달하고, DB에는 SHA-256 hash를 저장한다.
- duplicate email은 `409 {"detail": "Email already registered"}`를 반환한다.

### `POST /api/auth/login`

Request:

```json
{
  "email": "jiyoung@travel.kr",
  "password": "password123"
}
```

Response `200`: `AuthResponse`.

Error:

- invalid email/password: `401 {"detail": "Invalid email or password"}`

### `POST /api/auth/refresh`

Request body 없음. DB mode에서는 `travel_hunter_refresh` HttpOnly cookie를 읽는다.

Response `200`: `AuthResponse`.

Behavior:

- 기존 refresh token row를 revoke한다.
- 새 access token과 새 refresh cookie를 발급한다.
- invalid, expired, revoked refresh token은 `401 {"detail": "Invalid refresh token"}`를 반환한다.

### `POST /api/auth/logout`

Request body 없음. refresh cookie가 있으면 해당 token row를 revoke한다.

Response `200`:

```json
{
  "loggedOut": true
}
```

Behavior:

- refresh cookie를 clear한다.
- refresh cookie가 없거나 이미 만료되어도 `200`을 반환한다.

## 사용자

### `GET /api/me`

Mock mode: 기존 mock user를 반환한다.

DB mode: `Authorization: Bearer <accessToken>`이 필요하다.

Response `200`: `User`.

Error:

- missing, invalid, expired access token: `401 {"detail": "Not authenticated"}`

DB mapping:

| API field | DB field / source |
|----------|-------------------|
| `id` | `users.id` as string |
| `name`, `nickname` | `users.nickname` |
| `email` | `users.email` |
| `birthDate` | `users.birth_date` |
| `gender` | `users.gender` |
| `region` | `users.region` |
| `homeRegion`, `residenceArea` | `users.residence_area` |
| `preferredRegions` | `users.preferred_regions` |
| `onboardingCompleted` | `users.onboarding_completed` |
| `socialAccounts` | `social_accounts` rows without `provider_id` |
| `persona` | calculated/default display value |
| `savedAmount` | calculated/default display value |

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

Note: profile style/budget persistence is not included in ERD v0.3, so this endpoint remains mock-backed in the auth DB-backed phase.

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
| `slug`, `id` | `policies.slug` |
| `org` | `policies.organization` |
| `deadline` | `policies.end_date` |
| `amount` | `policies.benefit_detail` or `benefit_amount` display |
| `summary` | `policies.policy_comment` |
| `category` | `policies.policy_type` |
| `documents` | `policy_documents.document_name[]` |

### `GET /api/policies/{slug}`

Response `200`: `GET /api/policies` item shape.

Error:

- unknown slug: `404 {"detail": "Policy not found"}`

### `POST /api/me/saved-policies/{slug}`

Response `200`:

```json
{
  "policyId": "local-vacation",
  "saved": true
}
```

## 일정

### Trip id compatibility

- `tripId`는 API/프론트에서 계속 string handle로 다룬다.
- Mock mode는 기존 `jeju-3-days` id를 그대로 반환한다.
- DB mode는 `trips.id`를 문자열로 변환해 반환한다. 예: `"1"`.
- DB mode에서 `/api/trips/jeju-3-days`는 legacy seed alias로만 지원한다. 응답의 `id`는 numeric string이다.
- `trips.slug`는 만들지 않는다. alias는 URL 입력 호환용이며 DB에 저장하지 않는다.
- DB mode trip endpoint는 Bearer access token이 필요하고, owner 또는 `trip_members`에 포함된 사용자만 조회할 수 있다.

Resolver rules:

- Canonical numeric handle은 `^[1-9][0-9]*$`만 허용한다.
- `0`, `001`, `1.0`은 numeric id로 해석하지 않고 unknown handle로 처리한다.
- Legacy alias `jeju-3-days`는 seed 전용 alias mapping으로만 해석한다.
- `jeju-3-days` mapping 기준은 owner email `jiyoung@travel.kr`, seed trip title, `2026-06-15`~`2026-06-17`이다.
- alias 후보가 0개이거나 2개 이상이면 fail closed로 `404 {"detail": "Trip not found"}`를 반환한다.
- alias 조회도 numeric id 조회와 동일하게 인증/접근 권한 검사를 통과해야 한다.
- alias로 조회하더라도 응답 `Trip.id`는 canonical numeric string이다.
- frontend는 alias route 응답의 `Trip.id`가 route param과 다르면 `/trips/{Trip.id}`로 replace 정규화한다.

DTO calculation:

- `people`은 owner nickname을 먼저 넣고, 그 뒤 `trip_members.user.nickname`을 중복 제거해 추가한다.
- `expectedSaving`은 연결된 `trip_policies.policy.benefit_amount` 합계다.
- `benefit_amount`가 null인 정책은 합계에서 제외한다.
- 합계가 0이면 `"0원"`, 10,000원 단위로 나누어 떨어지면 `"{n}만원"`, 그 외에는 `"{amount}원"` 표시 포맷을 사용한다.
- `days`는 `trip_days.day_number` 오름차순, `trip_places.order_num` 오름차순으로 정렬한다.

### `GET /api/trips`

Response `200`: `Trip[]`.

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

### `POST /api/trips`

Response `200`: created `Trip`.

### `GET /api/trips/{tripId}`

Response `200`: `Trip`.

Error:

- unknown trip id/alias or inaccessible trip: `404 {"detail": "Trip not found"}`
- missing/invalid DB mode access token: `401 {"detail": "Not authenticated"}`

### `POST /api/trips/{tripId}/policies/{slug}`

Response `200`:

```json
{
  "tripId": "1",
  "policyId": "local-vacation",
  "added": true
}
```

Error:

- unknown trip id/alias or inaccessible trip: `404 {"detail": "Trip not found"}`
- unknown policy slug: `404 {"detail": "Policy not found"}`

## AI 추천

### `GET /api/trips/{tripId}/recommendations`

Response `200`: `Recommendation[]`.

## 친구 초대

v0.3 DB 기준은 `trip_invites`다. 실제 발송은 아직 구현하지 않고 API가 초대 상태만 반환한다.

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

Invite state rules:

- `copied`는 서버 저장 상태가 아니므로 항상 `false`로 반환하고 프론트 local state에서 관리한다.
- `invited`는 유효한 invite token이 존재하거나 이번 요청에서 생성/확인된 상태를 의미한다.
- `acceptedAt`은 초대 수락 시각이며, `invited`와 별개의 의미다.

### `POST /api/trips/{tripId}/invite`

Response `200`: invite state with `invited: true`.

### `POST /api/trips/{tripId}/invites`

Response `200`: invite state.

### `POST /api/invites/{token}/accept`

Response `200`: invite state with `acceptedAt`.

## Health

### `GET /api/health`

Response `200`:

```json
{
  "status": "ok",
  "service": "travel-hunter-backend",
  "environment": "local",
  "database": "not_configured"
}
```

`database` is one of `configured`, `not_configured`, `connected`, or `unavailable`.

## 다음 단계 제외 범위

- 소셜 로그인 실제 연동
- profile style/budget DB persistence
- 정책 실시간 수집 API
- trip endpoint backend-mode frontend 통합 smoke
- 실제 AI 추천 엔진
- 친구 초대 실제 발송
