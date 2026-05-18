# Travel Hunter MVP API 怨꾩빟 v0.3

API prefix??`/api`?? API DTO??`camelCase`, DB/SQL ?꾨뱶??`snake_case`瑜??ъ슜?쒕떎. ?고???mock mode???쒓굅?먭퀬 紐⑤뱺 ?ъ슜??facing ?곗씠???먮쫫? FastAPI + PostgreSQL 湲곗??쇰줈 ?숈옉?쒕떎.

## 怨듯넻 洹쒖튃

- ?뺤콉 ?곸꽭??`policies.slug` 湲곗??대떎.
- ?쇱젙? public slug瑜?留뚮뱾吏 ?딄퀬 string `tripId` handle濡?議고쉶?쒕떎.
- ?뺤긽 DB ?묐떟??`Trip.id`??numeric `trips.id`瑜?string?쇰줈 諛섑솚?쒕떎.
- `/api/trips/jeju-3-days`??seed ?명솚 legacy alias?? DB 而щ읆?대굹 public slug媛 ?꾨땲??
- legacy alias???몄쬆怨?owner/member ?묎렐 沅뚰븳 寃?щ? ?고쉶?섏? ?딅뒗??
- 蹂댄샇 endpoint??Bearer access token???꾩슂?섎떎.
- 蹂댁븞/internal ?꾨뱶???묐떟?섏? ?딅뒗?? `password_hash`, `provider_id`, `refresh_token_hash`.

## Auth

### `POST /api/auth/signup`

Request:

```json
{
  "email": "new.user@example.com",
  "password": "password123"
}
```

Response `200`: `AuthResponse`

```json
{
  "accessToken": "jwt-access-token",
  "user": {
    "id": "1",
    "nickname": "?뚯뒪???ъ슜??,
    "email": "test.user@example.com",
    "birthDate": "1997-04-12",
    "gender": null,
    "region": "?쒖＜",
    "homeRegion": "?쒖슱 留덊룷",
    "residenceArea": "?쒖슱 留덊룷",
    "preferredRegions": "?쒖＜,遺??媛뺤썝",
    "persona": "Travel Hunter ?ъ슜??,
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

Behavior:

- Signup accepts only email and password.
- A temporary nickname is generated server-side with the pattern `{adjective}{noun}{3 digits}`.
- The frontend then routes the user to `/nickname-setup`, where the nickname can be edited or regenerated.

### `POST /api/auth/email-check`

Request:

```json
{
  "email": "new.user@example.com"
}
```

Response `200`:

```json
{
  "available": true
}
```

Behavior:

- Returns `available=false` when the email is already registered.
- The signup UI requires a successful availability check before calling `/api/auth/signup`.

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

Request body ?놁쓬. `travel_hunter_refresh` HttpOnly cookie瑜??쎈뒗??

Response `200`: `AuthResponse`

Errors:

- invalid, expired, revoked refresh token: `401 {"detail": "Invalid refresh token"}`

### `POST /api/auth/logout`

Response `200`:

```json
{ "loggedOut": true }
```

### `POST /api/auth/password-reset/request`

Request:

```json
{
  "email": "test.user@example.com"
}
```

Response `200`:

```json
{ "requested": true }
```

Behavior:

- Unknown email also returns `200 {"requested": true}` so account existence is not exposed.
- Existing user creates a `password_reset_tokens` row with SHA-256 token hash, expiry, and `used_at=null`.
- Raw reset token is never stored.
- Reset link is sent by SMTP to `${TRAVEL_HUNTER_PUBLIC_BASE_URL}/reset-password?token=...`.
- SMTP delivery misconfiguration or failure returns `503 {"detail": "Email delivery is not configured"}` or the delivery error message.

### `POST /api/auth/password-reset/confirm`

Request:

```json
{
  "token": "raw-reset-token-from-email",
  "newPassword": "new-password-123"
}
```

Response `200`:

```json
{ "reset": true }
```

Behavior:

- Token is matched by SHA-256 hash.
- Expired, used, or unknown token returns `400 {"detail": "Invalid or expired reset token"}`.
- Success updates `users.password_hash`, marks the reset token used, and revokes existing refresh tokens for the user.

### `GET /api/auth/oauth/{provider}/start`

Supported providers: `kakao`, `google`.

Query:

- `redirect`: optional internal frontend path, for example `/home` or `/invites/{token}/accept`.

Response:

- `302` redirect to provider authorization URL.
- Sets `OAUTH_STATE_COOKIE_NAME` HttpOnly cookie scoped to `/api/auth/oauth`.

Behavior:

- External redirects are not allowed. Missing, external, or `//...` redirect values fall back to `/home`.
- Kakao uses Kakao Login REST authorization code flow.
- Google uses OpenID Connect authorization code flow with `openid email profile`.

Errors:

- unsupported provider: `404 {"detail": "OAuth provider not supported"}`
- missing provider env: `503 {"detail": "OAuth provider is not configured"}`

### `GET /api/auth/oauth/{provider}/callback`

Provider callback endpoint.

Query:

- `code`
- `state`

Response:

- `302` redirect to `${TRAVEL_HUNTER_PUBLIC_BASE_URL}/oauth/callback?redirect=...`.
- Sets the normal refresh HttpOnly cookie.
- Clears the OAuth state cookie.

Behavior:

- State query must match the state cookie.
- Existing `social_accounts(provider, provider_id)` logs in that user.
- If no social account exists but provider email matches an existing user, the social account is linked.
- Otherwise a new user is created with an OAuth-only account.
- Frontend `/oauth/callback` calls `/api/auth/refresh` to obtain the access token.

Errors:

- state mismatch or missing code/state: `400`
- provider token/userinfo error: `502`

## User/Profile

### `GET /api/me`

Bearer token ?꾩슂.

Response `200`: `User`

Errors:

- missing, invalid, expired access token: `401 {"detail": "Not authenticated"}`

### `GET /api/me/nickname-suggestion`

Bearer token ?꾩슂.

Response `200`:

```json
{
  "nickname": "?뚮쑑?쒖뿬?됱옄482"
}
```

Behavior:

- Generates a random nickname suggestion with the pattern `{adjective}{noun}{3 digits}`.
- The suggestion is not persisted until `PATCH /api/me/nickname` succeeds.

### `PATCH /api/me/nickname`

Bearer token ?꾩슂.

Request:

```json
{
  "nickname": "諛섏쭩?대뒗?ы뻾??23"
}
```

Response `200`: `User`

Behavior:

- Trims whitespace.
- Requires 2 to 20 characters.
- Stores the value in `users.nickname`.

Errors:

- invalid nickname length: `422`

### `GET /api/me/profile`

Response `200`:

```json
{
  "region": "遺??,
  "style": "留쏆쭛",
  "budget": "1??30留뚯썝 ?댄븯"
}
```

### `PATCH /api/me/profile`

Request fields are optional:

```json
{
  "region": "遺??,
  "style": "留쏆쭛",
  "budget": "1??30留뚯썝 ?댄븯"
}
```

Response `200`: `Profile`

Behavior:

- `region` -> `users.region`
- `style` -> `users.travel_style`
- `budget` -> `users.travel_budget`
- save marks `users.onboarding_completed=true`

### `GET /api/me/contact`

Bearer token ?꾩슂.

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
- ?꾪솕踰덊샇媛 ?놁쑝硫?`phoneNumber=null`, `phoneVerified=false`瑜?諛섑솚?쒕떎.

### `PATCH /api/me/contact`

Bearer token ?꾩슂.

Request:

```json
{
  "phoneNumber": "010 1234 5678"
}
```

Response `200`: `ContactInfo`

Behavior:

- ?붿껌 ?꾪솕踰덊샇??怨듬갚???쒓굅??`users.phone_number`????ν븳??
- 鍮?臾몄옄???먮뒗 `null`? `users.phone_number=null`濡???ν븳??
- ?꾪솕踰덊샇媛 蹂寃쎈릺硫?`users.phone_verified_at`? 珥덇린?뷀븳??
- ?ㅼ젣 ?꾪솕踰덊샇 ?몄쬆/OTP???대쾲 endpoint媛 ?섑뻾?섏? ?딅뒗??

### `GET /api/me/notification-settings`

Bearer token ?꾩슂.

Response `200`:

```json
{
  "deadlineEnabled": true,
  "deadlineLeadDays": [7, 1]
}
```

Behavior:

- ?ㅼ젙 row媛 ?놁쑝硫?`deadlineEnabled=true`瑜?湲곕낯媛믪쑝濡?諛섑솚?쒕떎.
- `deadlineLeadDays`???뺤콉 留덇컧 ?뚮┝ 湲곗???D-7, D-1???섑??대뒗 ?쒕쾭 ?곸닔?대ŉ DB????ν븯吏 ?딅뒗??

### `PATCH /api/me/notification-settings`

Bearer token ?꾩슂.

Request:

```json
{
  "deadlineEnabled": false
}
```

Response `200`: `NotificationSettings`

Behavior:

- `deadlineEnabled` -> `user_notification_settings.deadline_enabled`
- ?ъ슜?먮떦 ?섎굹???ㅼ젙 row留??좎??쒕떎.
- ?ㅼ젣 push/email/移댁뭅???뚮┝ 諛쒖넚? ??endpoint媛 ?섑뻾?섏? ?딅뒗??

## Internal Notification Delivery

Public HTTP endpoint???녿떎. FastAPI ?대? scheduler媛 KST 湲곗? ?섎（ 1??dispatch service瑜??ㅽ뻾?쒕떎.

Internal behavior:

- D-7/D-1 ??곸? `user_saved_policies`, `policies.end_date`, `user_notification_settings.deadline_enabled`, `users.phone_number`, `users.phone_verified_at` 湲곗??쇰줈 怨꾩궛?쒕떎.
- `notification_deliveries(user_id, policy_id, channel, lead_day, target_deadline_date)` unique key濡?以묐났 ?앹꽦??諛⑹??쒕떎.
- `KAKAO_ALIMTALK_ENABLED=false`?대㈃ ?꾨낫 ?앹꽦留??섑뻾?섍퀬 SOLAPI瑜??몄텧?섏? ?딅뒗??
- `KAKAO_ALIMTALK_ENABLED=true`?대㈃ `pending` ?꾨낫留?SOLAPI `POST /messages/v4/send-many/detail`濡??묒닔?쒕떎.
- SOLAPI ?묒닔 ?깃났? `status=sent`, `provider_message_id`, `sent_at`?쇰줈 湲곕줉?쒕떎.
- SOLAPI ?ㅽ뙣 ?묐떟, HTTP error, timeout? `status=failed`, `attempt_count`, `error_message`, `failed_at`?쇰줈 湲곕줉?쒕떎.
- ?쒓뎅 ?대???踰덊샇濡??뺢퇋?붾릺吏 ?딅뒗 ?곕씫泥섎뒗 provider ?몄텧 ?놁씠 `status=skipped`濡?湲곕줉?쒕떎.
- `NOTIFICATION_RETRY_ENABLED=true`?대㈃ 媛숈? lead day ?덉쓽 `failed` row 以?`attempt_count < NOTIFICATION_RETRY_MAX_ATTEMPTS`?닿퀬 retry delay媛 吏??row瑜??ㅼ쓬 scheduler ?ㅽ뻾?먯꽌 ?ъ쟾?≫븳??
- 理쒕? ?쒕룄 ?잛닔瑜??섍릿 row????status ?놁씠 `failed` ?곹깭濡??좎??쒕떎.

### `POST /api/webhooks/solapi`

SOLAPI provider-facing webhook endpoint?? ?ъ슜??bearer token? 諛쏆? ?딅뒗??

Headers:

- `X-Solapi-Secret`: `SOLAPI_WEBHOOK_SECRET`???ㅼ젙??寃쎌슦 ?꾩닔. 媛믪? ?ㅼ젙 secret??SHA1 hash?ъ빞 ?쒕떎.

Request:

```json
[
  {
    "messageId": "M4V202605071200000001",
    "statusCode": "4000",
    "statusMessage": "Delivered",
    "dateReported": "2026-05-07T12:03:00+09:00"
  }
]
```

Response `200`:

```json
{
  "received": 1,
  "updated": 1,
  "ignored": 0,
  "failed": 0
}
```

Behavior:

- `messageId` -> `notification_deliveries.provider_message_id`濡?湲곗〈 delivery瑜?李얜뒗??
- `statusCode=4000`? 理쒖쥌 ?깃났?쇰줈 蹂닿퀬 `status=sent`, `sent_at`??媛깆떊?쒕떎.
- `statusCode=2000` ?먮뒗 `3000`? ?묒닔/泥섎━ 以??곹깭濡?蹂닿퀬 湲곗〈 delivery ?곹깭瑜?蹂寃쏀븯吏 ?딅뒗??
- ?ㅽ뙣 status code??`status=failed`, `attempt_count + 1`, `failed_at`, `error_message`濡?諛섏쁺?쒕떎.
- ?????녿뒗 `messageId` ?먮뒗 ?꾩닔 field媛 遺議깊븳 event??臾댁떆?섍퀬 `ignored` 移댁슫?몄뿉 ?ы븿?쒕떎.

Errors:

- invalid webhook secret: `401 {"detail": "Invalid SOLAPI webhook secret"}`

### `GET /api/profile-options`

Static option response:

```json
{
  "regions": ["?쒖＜", "遺??, "媛뺤썝", "?꾧뎅"],
  "travelStyles": ["?댁떇", "留쏆쭛", "?먯뿰", "?ъ쭊"],
  "budgets": ["1??30留뚯썝 ?댄븯", "1??40留뚯썝 ?댄븯", "1??60留뚯썝 ?댄븯", "?곴??놁쓬"]
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
  "tag": "理쒕? 30留뚯썝",
  "title": "吏??궗???닿?吏??,
  "org": "?쒓뎅愿愿묎났??,
  "region": "?꾧뎅",
  "deadline": "2026-10-31",
  "amount": "理쒕? 30留뚯썝 ?섍툒",
  "summary": "援?궡 1諛??댁긽 ?ы뻾 ???숇컯, 援먰넻, 泥댄뿕鍮??쇰?瑜??섍툒?댁＜??吏???뺤콉?낅땲??",
  "match": 98,
  "category": "?섍툒",
  "requirements": ["援?궡 嫄곗＜??, "?숇컯 1諛??댁긽", "?곸닔利??쒖텧"],
  "documents": ["?좊텇利??щ낯", "?숇컯 ?곸닔利?, "援먰넻鍮?利앸튃"],
  "officialUrl": "https://www.mcst.go.kr/site/s_notice/press/pressView.jsp?pMenuCD=0302000000&pSeq=22267",
  "applyUrl": null
}
```

Link semantics:

- `officialUrl`: 怨듭떇 ?덈궡/?곸꽭 ?섏씠吏.
- `applyUrl`: ?ㅼ젣 ?좎껌/?묒닔/deep link.
- ?뺥솗???좎껌 留곹겕媛 ?뺤씤?섏? ?딆쑝硫?`applyUrl=null`.
- ?꾨줎??CTA??`applyUrl` -> `officialUrl` -> 以鍮??덈궡 ?쒖꽌濡?泥섎━?쒕떎.

### `GET /api/policies/{policySlug}`

Response `200`: `Policy`

Errors:

- unknown slug: `404 {"detail": "Policy not found"}`

### `GET /api/me/saved-policies`

Bearer token ?꾩슂. Response `200`: `Policy[]`

### `POST /api/me/saved-policies/{policySlug}`

Bearer token ?꾩슂.

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

Bearer token ?꾩슂.

Response `200`:

```json
{
  "policyId": "local-vacation",
  "saved": false
}
```

## Trips

### Trip handle rules

- `tripId`??opaque string handle?대떎.
- Canonical numeric handle? `^[1-9][0-9]*$`留??덉슜?쒕떎.
- `0`, `001`, `1.0`? numeric id濡??댁꽍?섏? ?딅뒗??
- `jeju-3-days`??seed owner email `test.user@example.com`, seed title, `2026-06-15`~`2026-06-17`???뺥솗???섎굹 留ㅼ묶???뚮쭔 ?댁꽍?쒕떎.
- unknown, inaccessible, unsupported handle? `404 {"detail": "Trip not found"}`??

Trip shape:

```json
{
  "id": "1",
  "title": "?쒖＜ 3???ы뻾",
  "status": "confirmed",
  "dates": "2026.06.15 - 06.17",
  "people": ["?뚯뒪???ъ슜??],
  "expectedSaving": "30留뚯썝",
  "currentUserRole": "owner",
  "days": {
    "1": [
      { "time": "09:00", "label": "?깆궛 ?쇱텧遊?, "meta": "?먯뿰 쨌 愿愿묒?" }
    ]
  }
}
```

`status` is `draft` or `confirmed`; new trips default to `draft`, while existing migrated trips are `confirmed`.
`currentUserRole` is the requesting user's role for that trip: `owner`, `editor`, or `viewer`.

### `GET /api/trips`

Bearer token ?꾩슂. Response `200`: `Trip[]`

### `POST /api/trips`

Request body optional:

```json
{
  "title": "부산 4일 여행",
  "region": "부산",
  "style": "맛집",
  "description": "맛집",
  "policySlug": "local-vacation",
  "durationDays": 3,
  "startDate": "2026-07-12",
  "endDate": "2026-07-15"
}
```

Response `200`: created `Trip`

Rules:

- `region` -> `trips.region`
- `description` -> `trips.description`
- if `description` is absent and `style` exists, `style` is stored in `trips.description`
- if `policySlug` exists, generated trip is connected through `trip_policies`
- `durationDays` is optional, defaults to `3`, and must be between `2` and `5`
- `startDate` and `endDate` are optional but must be provided together
- when `startDate/endDate` are provided, they override `durationDays`
- date ranges must be between `2` and `5` days inclusive
- created trips have `status=draft`
- `durationDays` controls `trips.end_date` and the number of generated `trip_days`
- `startDate/endDate` controls `trips.start_date`, `trips.end_date`, and generated `trip_days.date`

Errors:

- unknown `policySlug`: `404 {"detail": "Policy not found"}`
- invalid `durationDays`, invalid date format, missing paired date, reversed date range, or out-of-range date span: `422`

### `GET /api/trips/{tripId}`

Response `200`: `Trip`

Errors:

- unknown or inaccessible trip: `404 {"detail": "Trip not found"}`

### `PATCH /api/trips/{tripId}/status`

Bearer token required. The requester must be able to access the trip as `owner` or `editor`.

Request:

```json
{ "status": "confirmed" }
```

Response `200`: updated `Trip`.

Rules:

- allowed values are `draft` and `confirmed`
- the `/trips` UI exposes only `draft -> confirmed` with an explicit save action
- accessible `viewer` members cannot update trip status

Errors:

- unauthenticated: `401 {"detail": "Not authenticated"}`
- unknown or inaccessible trip: `404 {"detail": "Trip not found"}`
- accessible `viewer` member: `403 {"detail": "Trip edit permission required"}`
- invalid status: `422`

### `DELETE /api/trips/{tripId}`

Bearer token ?꾩슂. ?꾩옱 ?ъ슜?먭? owner???쇱젙留???젣?????덈떎.

Response `200`:

```json
{
  "tripId": "1",
  "deleted": true
}
```

Rules:

- `tripId`??canonical numeric handle留???젣 ??곸쑝濡??덉슜?쒕떎.
- ?곌껐??`recommendations.trip_id`????젣 ?꾩뿉 `null`濡?遺꾨━?쒕떎.
- `trip_days`, `trip_places`, `trip_members`, `trip_policies`, `trip_invites`??DB cascade 湲곗??쇰줈 ??젣?쒕떎.

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
The frontend calls this endpoint from the itinerary detail drag-and-drop place movement UI.

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

### `PATCH /api/trips/{tripId}/places/{placeId}/move`

Bearer token required. The requester must be able to access the trip as `owner` or `editor`.

Request:

```json
{
  "dayNumber": 2,
  "position": 1
}
```

Response `200`: updated `Trip`.

Rules:

- `position` is 1-based.
- Moving inside the same day reorders `trip_places.order_num`.
- Moving to another day updates `trip_places.trip_day_id` and reorders both affected days.
- After a move, each affected day has consecutive `order_num` values starting at `1`.

Errors:

- unauthenticated: `401 {"detail": "Not authenticated"}`
- unknown, inaccessible, day-missing, or cross-trip place: `404 {"detail": "Trip not found"}`
- accessible `viewer` member: `403 {"detail": "Trip edit permission required"}`
- invalid day number or position: `422`

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

Bearer token ?꾩슂.

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
