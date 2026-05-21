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
- 400: 지원하지 않는 provider

---

### GET /auth/oauth/{provider}/callback

OAuth provider callback 처리.

**Query params**: `code`, `state`

**Response**: 302 → 프론트엔드로 리디렉션. Refresh token cookie set.

**Errors**
- 400: state 불일치, code 없음
- 401: provider 인증 실패

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

## 정책 (`/api/policies`)

### GET /policies

전체 정책 목록. 인증 불필요.

**Response 200** → `Policy[]`
```json
[
  {
    "id": "uuid",
    "slug": "dgtourcard-2026",
    "label": "🎫",
    "tag": "추천",
    "title": "디지털관광주민증",
    "org": "한국관광공사",
    "region": "전국",
    "deadline": "2026-12-31",
    "amount": "최대 30만원",
    "summary": "여행지 할인 혜택 제공",
    "match": 85,
    "category": "추천",
    "requirements": ["만 19세 이상", "국내 거주자"],
    "documents": ["신분증"],
    "officialUrl": "https://example.com/official",
    "applyUrl": "https://example.com/apply"
  }
]
```

`category` 허용 값: `"추천" | "환급" | "숙박" | "캐시백"`

---

### GET /policies/{policy_slug}

정책 상세.

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
    "dates": "2026-07-12 ~ 2026-07-14",
    "people": ["나", "친구"],
    "expectedSaving": "최대 15만원",
    "linkedPolicies": [
      {
        "slug": "dgtourcard-2026",
        "title": "디지털관광주민증",
        "amount": "최대 30만원",
        "region": "전국"
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
  "startDate": "2026-07-12",
  "endDate": "2026-07-14"
}
```

- `durationDays`: 2~5 범위
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
  "policyId": "local-vacation",
  "added": true
}
```

**Errors**
- 403: viewer는 추가 불가
- 404: 일정 또는 정책 없음

---

### POST /trips/{trip_id}/days/{day_number}/places

일정 특정 day에 장소 추가. owner/editor만 가능.

**Request**
```json
{
  "time": "10:30",
  "label": "함덕해수욕장",
  "meta": "제주시 조천읍"
}
```

- `label`: 필수, 1~200자
- `time`: optional, `HH:MM` 형식 또는 빈 문자열
- `meta`: optional

**Response 200** → `Trip` (전체 일정 반환)

**Errors**
- 403: viewer는 추가 불가
- 404: 일정 없음 또는 day 없음

---

### PATCH /trips/{trip_id}/places/{place_id}

장소 정보 수정. owner/editor만 가능. 모든 필드 optional.

**Request**
```json
{
  "time": "11:00",
  "label": "함덕해수욕장",
  "meta": "제주시 조천읍"
}
```

**Response 200** → `Trip`

**Errors**
- 403: viewer는 수정 불가
- 404: 장소 없음

---

### PATCH /trips/{trip_id}/places/{place_id}/move

장소를 다른 day 또는 순서로 이동. owner/editor만 가능.

**Request**
```json
{
  "dayNumber": 2,
  "position": 1
}
```

- `dayNumber`: 1 이상
- `position`: 1 이상

**Response 200** → `Trip`

**Errors**
- 403: viewer는 이동 불가
- 404: 장소 또는 대상 day 없음

---

### DELETE /trips/{trip_id}/places/{place_id}

장소 삭제. owner/editor만 가능.

**Response 200** → `Trip`

**Errors**
- 403: viewer는 삭제 불가
- 404: 장소 없음

---

### GET /trips/{trip_id}/recommendations

AI 추천 장소 목록 조회.

**Response 200** → `Recommendation[]`
```json
[
  {
    "label": "🏖️",
    "title": "함덕해수욕장",
    "meta": "제주시 조천읍",
    "reason": "제주 북동부 대표 해수욕장으로 물이 맑습니다."
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
  "role": "editor"
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

### POST /trips/{trip_id}/invites

`POST /trips/{trip_id}/invite`와 동일. 하위 호환용 alias.

---

## 초대 수락 (`/api/invites`)

### POST /invites/{invite_token}/accept

초대 링크로 일정에 참여. 인증 필요.

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
| category | string | `"추천" \| "환급" \| "숙박" \| "캐시백"` |
| requirements | string[] | 신청 조건 목록 |
| documents | string[] | 필요 서류 목록 |
| officialUrl | string \| null | 공식 안내 URL |
| applyUrl | string \| null | 신청 URL |

### Trip

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | 일정 ID |
| title | string | 일정 제목 |
| status | string | `"draft" \| "confirmed"` |
| dates | string | 날짜 표시 문자열 |
| people | string[] | 참여자 닉네임 목록 |
| expectedSaving | string | 예상 절약 금액 표시 |
| linkedPolicies | LinkedTripPolicy[] | 연결된 정책 목록 |
| days | object | `{ [dayNumber]: ItineraryPlace[] }` |
| currentUserRole | string | `"owner" \| "editor" \| "viewer"` |

### ItineraryPlace

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string \| null | 장소 ID |
| time | string | 시간 (`HH:MM` 또는 `""`) |
| label | string | 장소명 |
| meta | string | 부가 정보 |
