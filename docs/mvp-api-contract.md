# Travel Hunter MVP API 계약 v0.3

## 기준

- 기준일: 2026-05-20
- 기준 브랜치: `develop`
- Base URL: `http://localhost:8000/api` (local dev), `https://<domain>/api` (staging/production)
- 인증: Access Token을 `Authorization: Bearer <token>` 헤더로 전달한다.
- Refresh Token: HttpOnly cookie (`refresh_token`)로 관리한다.
- 모든 요청/응답의 Content-Type은 `application/json`이다.
- 이 문서는 실제 route 코드(`backend/app/api/routes/`)와 schema 코드(`backend/app/schemas/`)에서 직접 추출했다.

---

## 공통 에러 형식

```json
{ "detail": "<에러 메시지>" }
```

| 상태 코드 | 의미 |
|-----------|------|
| 400 | 요청 형식 오류 또는 비즈니스 규칙 위반 |
| 401 | 인증 필요 또는 토큰 만료/무효 |
| 403 | 권한 없음 (예: viewer가 편집 시도) |
| 404 | 리소스 없음 |
| 409 | 충돌 (이메일/닉네임 중복 등) |
| 422 | Pydantic validation 실패 |
| 500 | DB 연결 실패 등 서버 오류 |

---

## 시스템

### GET /health

DB 연결 상태 포함 서버 헬스 확인. 인증 불필요.

**Response 200**
```json
{
  "status": "ok",
  "service": "travel-hunter",
  "environment": "local",
  "database": "connected"
}
```

---

## 인증 (`/api/auth`)

## Ops

### GET /ops/external-collection

공식 외부 혜택 수집 scheduler 운영 확인용 상태를 반환한다. 기존 `/health`와 `/api/health` 응답 계약은 변경하지 않는다. 관리자 Bearer 인증이 필요하다.

**Response 200**
```json
{
  "schedulerEnabled": false,
  "runAt": "03:00",
  "pollSeconds": 60,
  "minParsedCount": 1,
  "lastAttemptedRunDate": null,
  "lastSuccessfulRunDate": null,
  "lastParsedCount": null,
  "lastOutcome": null,
  "lastError": null
}
```

`lastOutcome`은 현재 backend process의 in-memory scheduler snapshot이며, 값은 `success`, `partial_success`, `below_threshold`, `error`, 또는 `null`이다. process 재시작 후에는 마지막 실행 상태가 `null`로 돌아간다.

---

### POST /ops/external-collection/run

공식 외부 혜택 수집을 관리자 수동 실행으로 1회 수행한다. configured source는 여행가는 달 지역 혜택(`regional_benefit`), 2026 섬 방문의 해 섬 여행비 지원(`regional_benefit` 재사용), 대한민국 반값여행(`local_half_trip`), 숙박세일 페스타(`stay_discount`)를 live fetch하고, `traffic_benefit`은 제거/404 가능성이 있는 optional legacy source로 취급한다. parser 결과를 `external_source_records`에 upsert한 뒤 active/fresh 레코드를 `policies`로 승격한다. 관리자 Bearer 인증이 필요하다.

**Response 200**
```json
{
  "sourceName": "official external benefits",
  "sourceCategory": "multiple",
  "parsedCount": 58,
  "createdOrUpdatedCount": 58,
  "outcome": "success",
  "sources": [
    {
      "sourceName": "여행가는 달",
      "sourceCategory": "regional_benefit",
      "sourceUrl": "https://korean.visitkorea.or.kr/travelmonth/benefits/vacation-benefit.do",
      "parsedCount": 42,
      "createdOrUpdatedCount": 42,
      "outcome": "success",
      "error": null
    }
  ]
}
```

`outcome`은 전체 실행 결과이며 `success`, `partial_success`, `error` 중 하나다. per-source `outcome`은 여기에 `source_unavailable`을 추가로 사용할 수 있으며, source HTTP 404/410은 `source_unavailable`로 기록한다. 필수 공식 source fetch/parser가 실패해도 다른 source가 성공하면 `partial_success`와 per-source `error`를 반환한다. optional legacy `traffic_benefit`의 404/410은 전체 실행을 실패로 강등하지 않는다. `sources[]`에는 `sourceName`, `sourceCategory`, `sourceUrl`이 함께 포함되며, 서로 다른 공식 페이지가 같은 public source category(`regional_benefit`)를 공유해도 운영자가 개별 source 결과를 구분할 수 있어야 한다. 응답에는 API key, bearer token, SMTP credential 같은 secret을 포함하지 않는다.

---

### GET /ops/external-collection/quality

외부 공식 혜택 수집 품질 리포트를 반환한다. 현재 DB의 `external_source_records`를 집계하며 live network fetch는 실행하지 않는다.
관리자 Bearer 인증이 필요하다.

**Query params**

| name | type | description |
|------|------|-------------|
| style | string, optional | 추천 preview에 전달할 취향 보정 값 |
| region | string, optional | 추천 preview에 전달할 최종 tie-breaker 지역 |
| sourceCategory | string, optional | `regional_benefit`, `traffic_benefit`, `local_half_trip`, `stay_discount` 같은 외부 수집 source category 필터. 2026 섬 방문의 해 레코드는 `regional_benefit`으로 집계된다. |
| limit | number, optional | 추천 preview 개수. 기본 3, 1~10 |

**Response 200**
```json
{
  "sourceName": "여행가는 달",
  "sourceCategory": "regional_benefit",
  "totalRecords": 58,
  "freshRecords": 58,
  "activeRecords": 58,
  "regionalRecords": 42,
  "nationwideRecords": 16,
  "recordsWithAmount": 21,
  "recordsWithStyles": 37,
  "latestFetchedAt": "2026-05-21T00:00:00",
  "latestVerifiedAt": "2026-05-21T00:00:00",
  "sourceBreakdown": [
    {
      "sourceName": "여행가는 달",
      "sourceCategory": "regional_benefit",
      "sourceUrl": "https://korean.visitkorea.or.kr/travelmonth/benefits/vacation-benefit.do",
      "totalRecords": 16,
      "activeRecords": 16,
      "freshRecords": 16,
      "latestFetchedAt": "2026-05-21T00:00:00",
      "latestVerifiedAt": "2026-05-21T00:00:00"
    }
  ],
  "regions": [],
  "recommendationPreview": []
}
```

`sourceBreakdown[]`는 같은 `sourceCategory` 안에서도 서로 다른 공식 페이지를 `sourceName`/`sourceUrl` 기준으로 나눠 보여주는 운영용 breakdown이다. `regions`는 지역별 저장 품질 집계이며 `recommendationPreview`는 기존 `GET /recommendations/regions`와 같은 ranking service를 사용한다.

---

## Auth (`/api/auth`)

### POST /auth/email-check

회원가입 전 이메일 중복 확인.

**Request**
```json
{ "email": "user@example.com" }
```

**Response 200**
```json
{ "available": true }
```

---

### POST /auth/signup

이메일/비밀번호 회원가입. 성공 시 access token 반환, refresh token은 cookie에 set.

**Request**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

- `password`: 최소 8자

**Response 200** → `AuthResponse`
```json
{
  "accessToken": "<jwt>",
  "user": { ...User }
}
```

**Errors**
- 409: 이메일 이미 사용 중

---

### POST /auth/login

이메일/비밀번호 로그인.

**Request**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response 200** → `AuthResponse`

**Errors**
- 401: 이메일 없음 또는 비밀번호 불일치

---

### POST /auth/refresh

Cookie의 refresh token으로 access token 갱신.

**Request**: body 없음. Cookie `refresh_token` 필요.

**Response 200** → `AuthResponse`

**Errors**
- 401: refresh token 없음, 만료, 또는 revoke됨

---

### POST /auth/logout

현재 refresh token을 revoke하고 cookie 삭제.

**Request**: body 없음. Cookie `refresh_token` 필요.

**Response 200**
```json
{ "loggedOut": true }
```

---

### POST /auth/password-reset/request

비밀번호 재설정 이메일 발송 요청.

**Request**
```json
{ "email": "user@example.com" }
```

**Response 200**
```json
{ "requested": true }
```

> 이메일이 존재하지 않아도 동일한 응답을 반환한다 (열거 방지).

---

### POST /auth/password-reset/confirm

재설정 토큰으로 새 비밀번호 확정.

**Request**
```json
{
  "token": "<reset_token>",
  "newPassword": "newpassword123"
}
```

- `newPassword`: 최소 8자

**Response 200**
```json
{ "reset": true }
```

**Errors**
- 400: 토큰 만료 또는 무효

---

### GET /auth/oauth/{provider}/start

OAuth 인증 시작. `provider`는 `kakao` 또는 `google`.

**Query params**: `redirect` (optional) — 인증 완료 후 돌아올 프론트엔드 경로.

**Response**: 302 → provider 인증 URL로 리디렉션. State cookie set.

**Errors**
- 404: 지원하지 않는 provider
- 503: provider client id/secret/redirect URI 미설정

---

### GET /auth/oauth/{provider}/callback

OAuth provider callback 처리.

**Query params**: `code`, `state`, `error` (provider cancellation/error)

**Success response**: 302 → 프론트엔드 `/oauth/callback?redirect={safePath}`로 리디렉션. Refresh token cookie set, OAuth state cookie clear.

**Failure response**: 302 → 프론트엔드 `/oauth/callback?error={code}&redirect={safePath}`로 리디렉션. Refresh token cookie는 설정하지 않고 OAuth state cookie는 clear한다. Provider `error_description` 원문은 프론트엔드에 전달하지 않는다.

Closed failure codes:

- `access_denied`: provider 동의 취소 또는 `error=access_denied`
- `invalid_state`: state 누락/불일치, code 누락, 사용할 수 없는 state cookie
- `provider_unavailable`: provider 설정 누락, token exchange 실패, provider-side non-cancellation error
- `profile_unavailable`: userinfo/profile fetch 실패 또는 durable provider id 누락
- `email_policy`: Google verified email 누락, 기타 verified-email 자동 연결 정책 위반

Account linking policy:

- 기존 `social_accounts(provider, provider_id)` 연결이 있으면 provider email 변경 여부와 무관하게 해당 사용자를 우선 사용한다.
- 동일 이메일 자동 연결은 provider가 검증 이메일을 제공한 경우에만 허용한다.
- Google은 `email_verified=true`인 email이 필수다.
- Kakao는 `account_email` scope만 요청하고, `kakao_account.is_email_verified=true`이며 `is_email_valid`가 false가 아닌 email만 동일 이메일 연결과 서비스 이메일 표시/연락처 기준에 사용한다.
- Kakao email이 없거나 검증되지 않았으면 기존 이메일 계정에 연결하지 않고 `kakao_{providerId}@oauth.local` 내부 이메일로 새 계정을 만들 수 있다.
- 기존 Kakao social account의 email이 `kakao_{providerId}@oauth.local`인 상태에서 이후 verified Kakao email을 받으면, 같은 email을 가진 다른 user가 없을 때만 `users.email`을 실제 Kakao email로 자동 교체한다. 다른 user가 이미 소유한 email은 자동 병합하지 않는다.

---

## 사용자/프로필 (`/api/me`, `/api/profile-options`)

모든 엔드포인트는 `Authorization: Bearer <token>` 필요 (profile-options 제외).

---

### GET /me

현재 로그인 사용자 정보.

**Response 200** → `User`
```json
{
  "id": "uuid",
  "nickname": "여행자123",
  "email": "user@example.com",
  "role": "user",
  "birthDate": null,
  "gender": null,
  "region": "서울",
  "homeRegion": "서울",
  "residenceArea": null,
  "preferredRegions": null,
  "persona": "탐험가",
  "savedAmount": 0,
  "onboardingCompleted": false,
  "socialAccounts": [],
  "createdAt": "2026-05-19T00:00:00",
  "updatedAt": "2026-05-19T00:00:00"
}
```

---

### GET /me/profile

프로필 (여행 지역/스타일/예산).

**Response 200**
```json
{
  "region": "서울",
  "style": "혼자",
  "budget": "중간"
}
```

---

### PATCH /me/profile

프로필 업데이트. 모든 필드 optional.

**Request**
```json
{
  "region": "제주",
  "style": "가족",
  "budget": "저렴"
}
```

**Response 200** → `Profile`

---

### GET /me/nickname-suggestion

서버가 랜덤 닉네임 후보를 생성해 반환.

**Response 200**
```json
{ "nickname": "여행하는두더지" }
```

---

### PATCH /me/nickname

닉네임 변경.

**Request**
```json
{ "nickname": "새닉네임" }
```

- `nickname`: 2~20자, `[가-힣a-zA-Z0-9_]`만 허용

**Response 200** → `User`

**Errors**
- 409: 닉네임 이미 사용 중

---

### GET /me/contact

연락처(전화번호) 조회.

**Response 200**
```json
{
  "phoneNumber": "010-1234-5678",
  "phoneVerified": false
}
```

---

### PATCH /me/contact

전화번호 저장.

**Request**
```json
{ "phoneNumber": "010-1234-5678" }
```

- `phoneNumber`: optional, 최대 30자, `[0-9\-+() ]{7,}` 형식

**Response 200** → `ContactInfo`

---

### POST /me/contact/verification/request

알림 연락처 전화번호 인증번호를 요청한다. provider boundary는 `PHONE_VERIFICATION_PROVIDER=dev`를 기본으로 사용하며, `solapi`로 설정하면 SOLAPI SMS provider가 같은 요청 경로에서 인증번호를 발송한다.

**Request**
```json
{ "phoneNumber": "010-1234-5678" }
```

- `phoneNumber`: optional. 값이 있으면 공백 제거 후 `users.phone_number`에 저장하고 번호 변경 시 `users.phone_verified_at`을 초기화한다.
- 값이 없으면 기존 저장 연락처로 인증번호를 발급한다.

**Response 200**
```json
{
  "requested": true,
  "expiresAt": "2026-05-21T10:05:00",
  "resendAvailableAt": "2026-05-21T10:01:00"
}
```

**Errors**
- 400: 저장 또는 요청된 전화번호 없음
- 429: 기존 미인증 OTP 발급 후 60초 이내 재요청

---

### POST /me/contact/verification/confirm

알림 연락처 인증번호를 확인하고 성공 시 `users.phone_verified_at`을 갱신한다.

**Request**
```json
{ "code": "123456" }
```

- `code`: 숫자 4~8자

**Response 200** ??`ContactInfo`
```json
{
  "phoneNumber": "01012345678",
  "phoneVerified": true
}
```

**Errors**
- 400: 인증번호 없음, 만료, 불일치, 시도 횟수 초과

---

### GET /me/notification-settings

마감 알림 설정 조회.

**Response 200**
```json
{
  "deadlineEnabled": false,
  "deadlineLeadDays": [7, 1]
}
```

---

### PATCH /me/notification-settings

마감 알림 설정 변경.

**Request**
```json
{ "deadlineEnabled": true }
```

**Response 200** → `NotificationSettings`

---

### GET /me/saved-policies

저장한 정책 목록. 응답 형식은 `Policy[]` (아래 정책 섹션 참조).

---

### GET /me/applied-policies

일정에 담긴(신청 연결된) 정책 목록. 응답 형식은 `Policy[]`.

---

### GET /me/applied-policy-links

내 일정에 담긴 정책을 정책 기준으로 묶어서 반환한다. 기존 `GET /me/applied-policies`는 카운트 및 단순 정책 목록 호환용으로 유지하고, 이 엔드포인트는 "정책 -> 연결된 일정들" 화면에 사용한다.

**Response 200** - `AppliedPolicyLink[]`

```json
[
  {
    "policy": { "...": "Policy DTO" },
    "linkedTrips": [
      {
        "id": "55",
        "title": "부산 주말 여행",
        "region": "부산",
        "startDate": "2026-06-12",
        "endDate": "2026-06-13"
      }
    ]
  }
]
```

---
### POST /me/saved-policies/{policy_slug}

정책 저장.

**Response 200**
```json
{ "policyId": "uuid", "saved": true }
```

**Errors**
- 404: 정책 없음

---

### DELETE /me/saved-policies/{policy_slug}

정책 저장 해제.

**Response 200**
```json
{ "policyId": "uuid", "saved": false }
```

**Errors**
- 404: 정책 없음

---

### GET /profile-options

프로필 설정 선택지 목록. 인증 불필요.

**Response 200**
```json
{
  "regions": ["제주", "부산", "강원", "전국"],
  "travelStyles": ["휴식", "맛집", "체험", "자연", "사진"],
  "budgets": ["1인 30만원 이하", "1인 40만원 이하", "1인 60만원 이하", "상관없음"]
}
```

---

## 추천 (`/api/recommendations`)

### GET /recommendations/regions

여행가는 달 등 공식 외부 수집 레코드(`external_source_records`)를 기반으로 지역/목적지 추천 목록을 반환한다. 인증 불필요.

**Query params**

| 이름 | 타입 | 설명 |
|------|------|------|
| style | string, optional | `휴식`, `맛집`, `체험`, `자연`, `사진` 같은 장소 취향. 점수 보정에만 사용하며 정책 점수 우선순위를 뒤집지 않는다. |
| region | string, optional | 사용자 프로필 관심 지역. 정책 수, 마감 임박, 명시 금액, 취향 보정까지 모두 같은 경우에만 최종 tie-breaker로 사용한다. |
| limit | number, optional | 반환 개수. 기본 3, 1~10. |

**Ranking**

1. 신청 가능한 지역 혜택 수
2. 마감 임박 혜택 수
3. 명시 금액 혜택 가치
4. 취향 일치 수는 동점권 보조 점수로만 사용
5. 프로필 지역 일치는 마지막 tie-breaker로만 사용

전국 혜택은 지역 후보가 `limit`보다 부족할 때만 fallback으로 포함한다.

**Response 200** — `RegionRecommendation[]`
```json
[
  {
    "region": "부산",
    "title": "부산이 지금 좋아요",
    "reason": "신청 가능한 지역 혜택 4개 · 마감 임박 2개 · 명시 혜택 최대 100,000원을 기준으로 추천합니다.",
    "policyCount": 4,
    "endingSoonCount": 2,
    "estimatedValueKrw": 100000,
    "score": 86,
    "styleMatchedCount": 1
  }
]
```

---

## 정책 (`/api/policies`)

### GET /policies

전체 정책 목록. 인증 불필요. DB `policies` 레코드만 `Policy` DTO로 반환한다. TravelMonth, 2026 섬 방문의 해, 대한민국 반값여행 등 공식 외부 수집 레코드(`external_source_records`)는 수집/검증 원문 근거로 보존하고, active/fresh `regional_benefit`, `local_half_trip`, `stay_discount` 항목은 collection normalization service가 `policies`로 승격한다. `traffic_benefit`은 legacy/optional 수집 근거로 보존될 수 있지만 public 정책 승격 대상에서는 제외한다. 승격된 외부 정책은 기존 호환 slug `travelmonth-{externalSourceRecordId}`를 사용한다. 디지털관광주민증/대한민국 반값여행 계열(`local_half_trip`)은 공식 페이지의 지역별 상태가 `신청접수중`인 active/fresh 항목만 public 정책으로 노출하고, 준비중/마감/unknown 또는 stale 항목은 기존 연결 보호를 위해 `policies.status = "hidden"`으로 내려 사용자 목록에서 제외한다.

**Response 200** → `Policy[]`
```json
[
  {
    "id": "uuid",
    "slug": "dgtourcard-2026",
    "label": "🎫",
    "tag": "지역할인",
    "title": "디지털관광주민증",
    "org": "한국관광공사",
    "region": "전국",
    "deadline": "2026-12-31",
    "amount": "최대 30만원",
    "summary": "여행지 할인 혜택 제공",
    "match": 85,
    "category": "지역할인",
    "requirements": ["만 19세 이상", "국내 거주자"],
    "documents": ["신분증"],
    "officialUrl": "https://example.com/official",
    "applyUrl": "https://example.com/apply",
    "sourceType": "internal",
    "actionStatus": null
  }
]
```

`category` 허용 값: `"교통" | "숙박" | "여행상품" | "지역할인" | "이벤트" | "기타"`
`sourceType` 허용 값은 `"internal" | "external"`이며 API 호환과 내부 진단을 위해 유지한다. 사용자 화면은 `internal/external` 같은 구현 구분 문구를 노출하지 않는다. 사용자에게 노출되는 모든 정책은 정규화된 `policies` 레코드이므로 저장/일정 연결 동작을 동일하게 지원한다.
`actionStatus`는 생략 또는 `null`이면 저장/일정 연결 가능 상태로 간주한다. migration gap 동안 상세 조회만 허용되는 raw fallback 정책은 `"infoOnly"`를 반환하며, 프론트엔드는 저장/일정 연결 action을 차단하고 공식 원문 확인 안내만 제공한다.
`external_source_records.source_category` 중 정책 승격 대상은 `regional_benefit`, `local_half_trip`, `stay_discount`이다. `traffic_benefit`은 optional legacy source로 남기며 목적지/지역 추천 점수와 public 정책 승격에서 제외한다. 목적지/지역 추천 점수에는 `traffic_benefit`을 제외하고, 일정 상세 정책 추천은 정규화된 active/fresh 정책에 대해 지역/일정 날짜/카테고리/여행 스타일 태그만 사용하는 deterministic scoring을 적용한다. 2026 섬 방문의 해는 `regional_benefit`으로 승격되며 `visitisland.kr` 공식 URL boost를 통해 `지역할인`으로 분류한다.
외부 수집 정책의 `category`는 `external_source_records`의 제목, 혜택 본문, 태그, 출처 URL, source category를 점수화한 deterministic classifier 결과다. 단순 source URL/source category 매핑이 아니며, 동점이면 `교통 > 숙박 > 여행상품 > 이벤트 > 지역할인 > 기타` 우선순위를 따른다.

---

### GET /policies/{policy_slug}

정책 상세. `travelmonth-{externalSourceRecordId}` slug는 정규화된 TravelMonth 정책 상세로 해석한다. migration gap 동안 상세 조회만 기존 raw `external_source_records` fallback을 사용할 수 있지만, 목록/추천/저장/일정 연결 경로는 정규화된 `policies` 기준이다. raw fallback은 active/fresh `regional_benefit`, `local_half_trip`, `stay_discount`만 허용하며, `traffic_benefit`이나 non-active/non-fresh source는 상세 404와 동일하게 처리한다. `local_half_trip`의 지역별 상세 URL이 확인된 경우 `officialUrl`은 generic `tour50.do`보다 해당 지역 안내/신청 페이지를 우선한다.

**Response 200** → `Policy`

**Errors**
- 404: 정책 없음

---

## 일정 (`/api/trips`)

모든 엔드포인트는 인증 필요.

`trip_id` route parameter는 `trips.id`를 문자열화한 numeric string이며 `^[1-9][0-9]*$` 형식만 지원한다. non-numeric handle은 404로 처리한다.

---

### GET /trips

내 일정 목록 (owner 또는 member).

**Response 200** → `Trip[]`
```json
[
  {
    "id": "1",
    "title": "제주 3일 여행",
    "status": "draft",
    "revision": 1,
    "dates": "2026-07-12 ~ 2026-07-14",
    "people": ["나", "친구"],
    "participantCount": 2,
    "expectedSaving": "최대 15만원",
    "linkedPolicies": [
      {
        "slug": "dgtourcard-2026",
        "title": "디지털관광주민증",
        "amount": "최대 30만원",
        "region": "전국"
      }
    ],
    "recommendedPolicies": [
      {
        "slug": "travelmonth-58",
        "title": "부산 공식 캐시백",
        "amount": "카드 결제 5% 캐시백",
        "region": "부산"
      }
    ],
    "days": {
      "1": [
        { "id": "1", "time": "10:00", "label": "공항 도착", "meta": "제주 국제공항" }
      ]
    },
    "currentUserRole": "owner"
  }
]
```

`status` 허용 값: `"draft" | "confirmed"`
`revision`은 일정 상세 장소 add/update/move/delete optimistic conflict 처리용 정수 버전이다. 장소 변경 성공 시 1씩 증가하며, 클라이언트는 마지막으로 조회한 `revision`을 `expectedRevision`으로 보내야 한다. stale revision이면 409 `Trip has changed. Refresh before saving.`을 반환한다.

Frontend behavior: `/trips` does not expose trip confirmation controls or draft/confirmed status badges. `/trips/{tripId}` keeps owner/editor editing controls available regardless of persisted `draft` or `confirmed` status. Viewer users remain read-only by role.
`currentUserRole` 허용 값: `"owner" | "editor" | "viewer"`

---

### POST /trips

일정 생성. 모든 필드 optional.

**Request**
```json
{
  "title": "제주 여행",
  "region": "제주",
  "style": "자연",
  "description": "제주 자연 중심 여행",
  "policySlug": "dgtourcard-2026",
  "durationDays": 3,
  "participantCount": 3,
  "startDate": "2026-07-12",
  "endDate": "2026-07-14"
}
```

- `durationDays`: 2~5 범위
- `participantCount`: 1~6. Planned travel party size, stored separately from real member/invite list `people`.
- `startDate`/`endDate`: 함께 제공하거나 모두 생략. 기간은 2~5일.

**Response 200** → `Trip`

---

### GET /trips/{trip_id}

일정 상세. owner 또는 member만 접근 가능.

**Response 200** → `Trip`

**Errors**
- 404: 일정 없음 또는 접근 권한 없음

---

### DELETE /trips/{trip_id}

일정 삭제. owner만 가능.

**Response 200**
```json
{ "tripId": "1", "deleted": true }
```

**Errors**
- 403: owner가 아님
- 404: 일정 없음

---

### PATCH /trips/{trip_id}/status

일정 상태 변경. owner/editor만 가능.

**Request**
```json
{ "status": "confirmed" }
```

`status` 허용 값: `"draft" | "confirmed"`

**Response 200** → `Trip`

**Errors**
- 403: viewer는 변경 불가
- 404: 일정 없음

---

### POST /trips/{trip_id}/policies/{policy_slug}

일정에 정책 연결. owner/editor만 가능.

**Response 200**
```json
{
  "tripId": "1",
  "policyId": "dgtour-밀양-1",
  "added": true
}
```

**Errors**
- 403: viewer는 추가 불가
- 404: 일정 또는 정책 없음

---

### DELETE /trips/{trip_id}/policies/{policy_slug}

일정에 연결된 정책을 해제. owner/editor만 가능.

**Response 200**
```json
{
  "tripId": "1",
  "policyId": "dgtour-밀양-1",
  "added": false
}
```

**Errors**
- 403: viewer는 해제 불가
- 404: 일정 또는 정책 없음

---

### POST /trips/{trip_id}/days/{day_number}/places

Kakao place candidate metadata can be preserved when adding a recommended place.

Optional request fields:
- `address`: string | null
- `latitude`: number | null
- `longitude`: number | null
- `category`: string | null
- `categoryCode`: string | null
- `placeUrl`: string | null
- `sourceProvider`: string | null
- `externalPlaceId`: string | null

일정 특정 day에 장소 추가. owner/editor만 가능.

**Request**
```json
{
  "expectedRevision": 1,
  "time": "10:30",
  "label": "함덕해수욕장",
  "meta": "제주시 조천읍"
}
```

- `expectedRevision`: 필수, 현재 `Trip.revision` 값. 불일치 시 409.
- `label`: 필수, 1~200자
- `time`: optional, `HH:MM` 형식 또는 빈 문자열
- `meta`: optional

**Response 200** → `Trip` (전체 일정 반환)

**Errors**
- 403: viewer는 추가 불가
- 404: 일정 없음 또는 day 없음
- 409: 다른 사용자가 먼저 장소를 변경해 revision 불일치

---

### PATCH /trips/{trip_id}/places/{place_id}

장소 정보 수정. owner/editor만 가능. 모든 필드 optional.

**Request**
```json
{
  "expectedRevision": 1,
  "time": "11:00",
  "label": "함덕해수욕장",
  "meta": "제주시 조천읍"
}
```

- `expectedRevision`: 필수, 현재 `Trip.revision` 값. 불일치 시 409.

**Response 200** → `Trip`

**Errors**
- 403: viewer는 수정 불가
- 404: 장소 없음
- 409: 다른 사용자가 먼저 장소를 변경해 revision 불일치

---

### PATCH /trips/{trip_id}/places/{place_id}/move

장소를 다른 day 또는 순서로 이동. owner/editor만 가능.

**Request**
```json
{
  "expectedRevision": 1,
  "dayNumber": 2,
  "position": 1
}
```

- `expectedRevision`: 필수, 현재 `Trip.revision` 값. 불일치 시 409.
- `dayNumber`: 1 이상
- `position`: 1 이상

**Response 200** → `Trip`

**Errors**
- 403: viewer는 이동 불가
- 404: 장소 또는 대상 day 없음
- 409: 다른 사용자가 먼저 장소를 변경해 revision 불일치

---

### DELETE /trips/{trip_id}/places/{place_id}

장소 삭제. owner/editor만 가능. `expectedRevision` query parameter가 필수이며 현재 `Trip.revision` 값과 일치해야 한다.

**Query**
- `expectedRevision`: number, 1 이상. 불일치 시 409.

**Response 200** → `Trip`

**Errors**
- 403: viewer는 삭제 불가
- 404: 장소 없음
- 409: 다른 사용자가 먼저 장소를 변경해 revision 불일치

---

### GET /trips/{trip_id}/recommendations

Returns additional AI place candidates for the trip. The backend treats `(sourceProvider, externalPlaceId)` as the durable external identity, then applies a conservative same-provider `externalPlaceId` and normalized-title duplicate exclusion for existing MVP data. Kakao-backed candidates include official Kakao Local API map metadata when available; ratings/reviews are not exposed because the official API response does not provide those fields. When official Kakao data can supply enough non-duplicate places, the response targets at least 10 candidates with a useful mix of attractions, food, and stays; sparse categories are backfilled from other official candidates instead of creating synthetic places. If fresh candidates are unavailable, the endpoint returns recommendation summaries saved at trip creation with `sourceType="savedSummary"` so the UI can avoid presenting them as newly fetched places.

Additional `Recommendation` fields:
- `id`: string | null
- `categoryGroup`: `stay` | `food` | `attraction` | `other` | null
- `categoryCode`: string | null
- `categoryName`: string | null
- `phone`: string | null
- `address`: string | null
- `latitude`: number | null
- `longitude`: number | null
- `placeUrl`: string | null
- `suggestedDay`: number | null
- `aiReview`: string | null
- `sourceProvider`: string | null
- `externalPlaceId`: string | null
- `sourceType`: `freshCandidate` | `savedSummary` | null

AI 추천 장소 목록 조회.

**Response 200** → `Recommendation[]`
```json
[
  {
    "label": "🏖️",
    "title": "함덕해수욕장",
    "meta": "제주시 조천읍",
    "reason": "제주 북동부 대표 해수욕장으로 물이 맑습니다.",
    "categoryName": "관광명소 > 해수욕장",
    "phone": "064-000-0000",
    "sourceType": "freshCandidate"
  }
]
```

**Errors**
- 404: 일정 없음

---

### GET /trips/{trip_id}/invite

초대 링크 상태 조회. owner만 가능.

**Response 200** → `InviteState`
```json
{
  "id": "uuid",
  "tripId": "1",
  "inviteToken": "<token>",
  "inviteUrl": "https://<domain>/invites/<token>/accept",
  "expiresAt": "2026-05-25T00:00:00",
  "createdAt": "2026-05-19T00:00:00",
  "acceptedAt": null,
  "invited": false,
  "copied": false,
  "role": "editor",
  "alreadyMember": false
}
```

**Errors**
- 404: 일정 없음

---

### POST /trips/{trip_id}/invite

초대 링크 생성 또는 role 업데이트. owner만 가능.

**Request** (optional)
```json
{ "role": "viewer" }
```

`role` 허용 값: `"viewer" | "editor"` (기본값: `"editor"`)

**Response 200** → `InviteState`

**Errors**
- 404: 일정 없음

---

### POST /trips/{trip_id}/invite/email

초대 링크를 생성/업데이트한 뒤 email로 전송. owner만 가능. email 본문에는 일정 상세를 포함하지 않고 “트래블헌터 일정 초대입니다 / 로그인 또는 회원가입 후 수락할 수 있습니다 / 초대가 만료됐으면 다시 요청하세요” 수준의 안전 안내와 초대 링크만 포함한다.

**Request**
```json
{
  "email": "friend@example.com",
  "role": "editor"
}
```

`role` 허용 값: `"viewer" | "editor"` (기본값: `"editor"`)

**Response 200**
```json
{
  "invite": {
    "id": "uuid",
    "tripId": "1",
    "inviteToken": "<token>",
    "inviteUrl": "https://<domain>/invites/<token>/accept",
    "expiresAt": "2026-05-25T00:00:00",
    "createdAt": "2026-05-19T00:00:00",
    "acceptedAt": null,
    "invited": true,
    "copied": false,
    "role": "editor",
    "alreadyMember": false
  },
  "deliveryStatus": "sent",
  "message": "Invite email sent."
}
```

`deliveryStatus` 허용 값:
- `"sent"`: SMTP 발송 성공
- `"notConfigured"`: SMTP 설정 없음. 초대 링크는 유효하므로 프론트는 링크 복사 fallback을 안내한다.
- `"failed"`: SMTP 발송 실패. 초대 링크는 유효하므로 프론트는 링크 복사 fallback을 안내한다.

**Errors**
- 404: 일정 없음 또는 owner가 아님
- 422: email 또는 role 형식 오류

---

### POST /trips/{trip_id}/invites

`POST /trips/{trip_id}/invite`와 동일. 하위 호환용 alias.

---

## 초대 수락 (`/api/invites`)

### POST /invites/{invite_token}/accept

초대 링크로 일정에 참여. 인증 필요. 이미 참여 중인 사용자가 다시 수락하면 중복 멤버를 만들거나 기존 권한을 낮추지 않고 `alreadyMember: true`를 반환한다.

**Response 200** → `InviteState`

**Errors**
- 404: 초대 토큰 없음 또는 만료

---

## 알림 웹훅 (`/api/webhooks`)

### POST /webhooks/solapi

SOLAPI 발송 결과 webhook 수신. `X-Solapi-Secret` 헤더로 검증.

**Request**: SOLAPI webhook event 배열
```json
[
  {
    "messageId": "...",
    "statusCode": "2000",
    "statusMessage": "success"
  }
]
```

**Response 200**
```json
{
  "received": 1,
  "updated": 1,
  "ignored": 0,
  "failed": 0
}
```

**Errors**
- 401: webhook secret 불일치

---

## 타입 참조

### User

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string (UUID) | 사용자 ID |
| nickname | string | 닉네임 |
| email | string | 이메일 |
| birthDate | string \| null | 생년월일 |
| gender | string \| null | 성별 |
| region | string \| null | 주요 여행 지역 |
| homeRegion | string | 거주 지역 |
| residenceArea | string \| null | 세부 거주 지역 |
| preferredRegions | string \| null | 선호 지역 |
| persona | string | 여행 유형 |
| savedAmount | number | 예상 절약 금액 |
| onboardingCompleted | boolean | 온보딩 완료 여부 |
| socialAccounts | SocialAccount[] | 연결된 소셜 계정 |
| createdAt | string (ISO 8601) | 가입일 |
| updatedAt | string (ISO 8601) | 최종 수정일 |

### SocialAccount

| 필드 | 타입 | 설명 |
|------|------|------|
| provider | string | `"kakao"` 또는 `"google"` |
| providerNickname | string \| null | provider 닉네임 |
| connectedAt | string (ISO 8601) | 연결 일시 |

### Policy

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string (UUID) | 정책 ID |
| slug | string | URL 식별자 |
| label | string | 이모지/아이콘 |
| tag | string | 표시 태그 |
| title | string | 정책명 |
| org | string | 주관 기관 |
| region | string | 적용 지역 |
| deadline | string | 마감일 |
| amount | string | 혜택 금액 표시 |
| summary | string | 요약 |
| match | number | 매칭 점수 (0~100) |
| category | string | `"교통" \| "숙박" \| "여행상품" \| "지역할인" \| "이벤트" \| "기타"` |
| requirements | string[] | 신청 조건 목록 |
| documents | string[] | 필요 서류 목록 |
| officialUrl | string \| null | 공식 안내 URL. 사용자 화면 CTA 라벨은 `혜택 안내 보기` |
| applyUrl | string \| null | 신청 URL |
| sourceType | string | `"internal"` \| `"external"`; 생략 시 internal로 간주 |
| actionStatus | string \| null | 생략/`null` 또는 `"infoOnly"`; `"infoOnly"`는 raw fallback 상세 전용이며 저장/일정 연결 불가 |

### Trip

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 일정 ID |
| title | string | 일정 제목 |
| status | string | `"draft" \| "confirmed"` |
| revision | number | 장소 add/update/move/delete optimistic conflict 처리용 일정 버전. 변경 성공 시 1 증가 |
| dates | string | 날짜 표시 문자열 |
| people | string[] | 참여자 닉네임 목록 |
| participantCount | number | Planned travel party size, separate from real member/invite list `people`. |
| expectedSaving | string | 예상 절약 금액 표시 |
| linkedPolicies | LinkedTripPolicy[] | 연결된 정책 목록 |
| recommendedPolicies | LinkedTripPolicy[] | 일정 지역에 맞춰 추천된 정규화 정책 및 active/fresh TravelMonth/반값여행/숙박세일 혜택 목록. 이미 연결된 정규화 정책은 제외하며 각 항목은 `/policies/{slug}` 상세로 이동 가능하다. 추천 순서는 지역, 일정 날짜 겹침, 정책 카테고리, 여행 스타일 텍스트/태그만 사용하며 AI/LLM 판단을 사용하지 않는다. |
| days | object | `{ [dayNumber]: ItineraryPlace[] }` |
| currentUserRole | string | `"owner" \| "editor" \| "viewer"` |


### LinkedTripPolicy

| ?? | ?? | ?? |
|------|------|------|
| slug | string | ?? ?? URL ??? |
| title | string | ??? |
| amount | string | ?? ?? ?? |
| region | string | ?? ?? |
| status | `"active" | "hidden"` | ?? ?? ?? ??? ?? ??. ?? ??? `active`? ????, ?? ?? ??? hidden?? ??? `hidden`?? ????. |

### ItineraryPlace

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string \| null | 장소 ID |
| time | string | 시간 (`HH:MM` 또는 `""`) |
| label | string | 장소명 |
| meta | string | 부가 정보 |
| address | string \| null | 장소 주소 |
| latitude | number \| null | 위도 |
| longitude | number \| null | 경도 |
| category | string \| null | 장소 카테고리 이름 |
| categoryCode | string \| null | 장소 카테고리 코드 |
| placeUrl | string \| null | 장소 상세 URL |
| sourceProvider | string \| null | 외부 장소 제공자 식별자 |
| externalPlaceId | string \| null | 외부 장소 ID |

`externalPlaceId` is scoped by `sourceProvider`; the durable external identity is the pair `(sourceProvider, externalPlaceId)`.

---

## 2026-05-26 Travel-area itinerary contract addendum

This addendum defines the AI itinerary travel-area contract. It preserves the existing `GET /api/recommendations/regions` endpoint as the policy-backed region ranking API.

### GET /recommendations/travel-areas

Returns travel-area candidates for the AI itinerary creation wizard.

Query params:

| name | type | description |
|---|---|---|
| `sido` | string, optional | Return travel areas inside a specific province/metropolitan city, for example `강원`. |
| `query` | string, optional | Search by travel-area name, sido, included city, alias, tag, or style. |
| `mode` | `nationwide`, optional | Return nationwide recommendations. If no query params are provided, this is the default behavior. |
| `style` | string, optional | User preference used as a ranking boost. |
| `limit` | number, optional | Default 6, minimum 1, maximum 20. |

Request priority:

```text
query > sido > mode=nationwide > default nationwide
```

When `query` and `sido` are both provided, `sido` limits the search scope.

Response 200:

```json
{
  "mode": "sido",
  "sido": "강원",
  "query": null,
  "emptyReason": null,
  "items": [
    {
      "travelAreaId": "gangwon-sokcho-goseong-yangyang",
      "travelAreaName": "속초·고성·양양",
      "sido": "강원",
      "includedCities": ["속초", "고성", "양양"],
      "summary": "바다와 설악산, 감성 카페를 함께 즐기는 동해 북부 권역",
      "tags": ["바다", "산", "카페", "2박3일"],
      "reason": "강원 지역 혜택과 속초·고성·양양 여행 동선이 잘 맞아요.",
      "policyCount": 5,
      "localPolicyCount": 4,
      "nationwidePolicyCount": 1,
      "endingSoonCount": 1,
      "estimatedValueKrw": 120000,
      "score": 86
    }
  ]
}
```

`emptyReason` values:

| value | meaning |
|---|---|
| `unsupported_sido` | The requested `sido` does not exist in the v1 travel-area catalog. |
| `no_match` | The search query does not match any travel area. |
| `null` | Normal response. |

### POST /trips travel-area extension

`POST /api/trips` accepts optional `travelAreaId` in addition to legacy `region`.

Request example:

```json
{
  "title": "속초·고성·양양 3일 여행",
  "region": "속초·고성·양양",
  "travelAreaId": "gangwon-sokcho-goseong-yangyang",
  "participantCount": 3,
  "style": "바다",
  "startDate": "2026-06-15",
  "endDate": "2026-06-17"
}
```

Rules:

| input | behavior |
|---|---|
| `travelAreaId` present and valid | Resolve backend travel-area catalog, store `trips.travel_area_id`, and use the travel-area display name as `trips.region`. |
| `travelAreaId` present and invalid | Return 400 with `Travel area not found`. |
| `travelAreaId` absent and `region` present | Preserve legacy region-only trip creation behavior. |

Trip response includes:

```json
{
  "travelAreaId": "gangwon-sokcho-goseong-yangyang",
  "participantCount": 3
}
```

Existing trips can return `travelAreaId: null`.
## Admin external source summary

- `GET /api/admin/external-sources/summary`
- Auth: bearer token required, admin role required.
- Purpose: read-only dashboard summary for external policy collection health, grouped by external source instance while preserving shared `sourceCategory` values. This endpoint never starts a collection job and does not expose source-specific manual controls.
- Response:
  - `items[]`
  - `items[].sourceKey`
  - `items[].sourceCategory`
  - `items[].label`
  - `items[].sourceName`
  - `items[].sourceUrl`
  - `items[].totalRecords`
  - `items[].activeRecords`
  - `items[].scheduledRecords`
  - `items[].endedRecords`
  - `items[].unknownRecords`
  - `items[].freshRecords`
  - `items[].promotedPolicyCount`
  - `items[].activePromotedPolicyCount`
  - `items[].latestFetchedAt`
  - `items[].latestVerifiedAt`
  - `totalRecords`
  - `activeRecords`
  - `freshRecords`
  - `promotedPolicyCount`
  - `latestFetchedAt`

Admin policy list items additionally expose `sourceCategory` and `sourceLabel` for minimal source identification in `/admin/policies`. Public policy DTOs are unchanged.
