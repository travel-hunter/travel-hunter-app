# Travel Hunter MVP API 계약 v0.3

이 문서는 `files/ERD_v0.3_결정안건_상세분석.md`의 권장안을 모두 채택한 API 계약 기준이다.

DB 연결 전까지 백엔드는 Mock API로 같은 응답 shape를 제공하고, 프론트는 `AppDataApi` 경계만 바라본다. 실제 PostgreSQL/Alembic 구현은 이 계약이 안정된 뒤 진행한다.

## 전역 규칙

- API prefix는 `/api`를 사용한다.
- DB 컬럼은 `snake_case`, API DTO는 `camelCase`를 사용한다.
- 정책 상세는 `policies.slug` 기준으로 조회한다.
- 일정은 공개 slug를 만들지 않고 내부 id 기준으로 조회한다.
- 현재 mock 단계의 `jeju-3-days` trip id는 화면 호환용이며, DB 전환 시 numeric id 또는 client mapping으로 대체한다.
- `password_hash`, `provider_id`, `refresh_token_hash`는 응답에 포함하지 않는다.

## v0.3 ERD 결정

- `policies.slug` 추가
- `trip_invites` 추가
- `users` 통합 유지
- `users.gender` 추가
- 사용자 관심 지역은 `users.preferred_regions` 사용
- `trip_days`, `trip_members`, `trip_policies`, `trip_places`, `trip_invites` 단수 prefix 사용

## 인증

### `POST /api/auth/signup`

Request

```json
{
  "email": "travel@example.com",
  "password": "hunter123",
  "name": "지영"
}
```

Response `200`

```json
{
  "accessToken": "mock-token",
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
    "persona": "혜택을 꼼꼼히 챙기는 29세 직장인",
    "savedAmount": 120000,
    "onboardingCompleted": true,
    "socialAccounts": [],
    "createdAt": "2026-05-04T00:00:00Z",
    "updatedAt": "2026-05-04T00:00:00Z"
  }
}
```

### `POST /api/auth/login`

Request

```json
{
  "email": "jiyoung@travel.kr",
  "password": "password123"
}
```

Response `200`: `POST /api/auth/signup`과 동일한 `AuthResponse`.

## 사용자

### `GET /api/me`

Response `200`: `UserMeDto`.

### `PATCH /api/me/profile`

Request의 모든 필드는 optional이다.

```json
{
  "region": "부산",
  "style": "휴식",
  "budget": "1인 40만원 이하"
}
```

Response `200`

```json
{
  "region": "부산",
  "style": "휴식",
  "budget": "1인 40만원 이하"
}
```

### `GET /api/profile-options`

Response `200`

```json
{
  "regions": ["제주", "부산", "강원", "전국"],
  "travelStyles": ["휴식", "맛집", "자연", "사진"],
  "budgets": ["1인 30만원 이하", "1인 40만원 이하", "1인 60만원 이하", "상관없음"]
}
```

## 정책

### `GET /api/policies`

Query는 optional이다.

- `region`
- `type`
- `page`
- `size`

Response `200`

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

DB 매핑 핵심:

| API 필드 | DB 컬럼 |
|----------|---------|
| `slug` | `policies.slug` |
| `org` | `policies.organization` |
| `deadline` | `policies.end_date` |
| `amount` | `policies.benefit_amount` + `policies.benefit_detail` |
| `summary` | `policies.policy_comment` |
| `category` | `policies.policy_type` |
| `documents` | `policy_documents.document_name[]` |

### `GET /api/policies/{slug}`

정책 상세를 slug로 조회한다. 현재 mock에서는 `local-vacation`을 slug로 사용한다.

Response `200`: `GET /api/policies`의 항목과 같은 shape.

### `POST /api/me/saved-policies/{slug}`

Response `200`

```json
{
  "policyId": "local-vacation",
  "saved": true
}
```

## 일정

### `GET /api/trips`

Response `200`

```json
[
  {
    "id": "jeju-3-days",
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
]
```

DB 매핑 핵심:

| API 필드 | DB 컬럼 |
|----------|---------|
| `id` | `trips.id` |
| `title` | `trips.title` |
| `dates` | `trips.start_date` + `trips.end_date` |
| `people` | `trip_members` JOIN `users.nickname` |
| `days` | `trip_days` JOIN `trip_places` |

### `POST /api/trips`

Request

```json
{
  "title": "제주 3일 여행",
  "startDate": "2026-06-15",
  "endDate": "2026-06-17",
  "region": "제주",
  "description": "휴식 중심 여행"
}
```

Response `200`: 생성된 `Trip`.

### `GET /api/trips/{tripId}`

Response `200`: `Trip`.

### `POST /api/trips/{tripId}/policies/{slug}`

Response `200`

```json
{
  "tripId": "jeju-3-days",
  "policyId": "local-vacation",
  "added": true
}
```

## AI 추천

### `GET /api/trips/{tripId}/recommendations`

Response `200`

```json
[
  {
    "label": "CA",
    "title": "월정리 바다 카페",
    "meta": "Day 2 오후에 적합 · 이동 18분",
    "reason": "비 오는 날에도 머물기 좋고 사진 만족도가 높습니다."
  }
]
```

DB 매핑:

- `recommendations.user_id`
- `recommendations.trip_id`
- `recommendations.query`
- `recommendations.result`
- `recommendations.created_at`

## 친구 초대

v0.3 DB 기준은 `trip_invites`다. 실제 발송은 아직 구현하지 않고 Mock API가 초대 상태만 반환한다.

### `GET /api/trips/{tripId}/invite`

현재 프론트 호환 endpoint다.

Response `200`

```json
{
  "id": "1",
  "tripId": "jeju-3-days",
  "inviteToken": "jeju-3d",
  "inviteUrl": "travelhunter.app/i/jeju-3d",
  "expiresAt": "2026-06-30T23:59:59Z",
  "createdAt": "2026-05-04T00:00:00Z",
  "acceptedAt": null,
  "invited": false,
  "copied": false
}
```

### `POST /api/trips/{tripId}/invite`

현재 프론트 호환 endpoint다. 초대 완료 상태를 반환한다.

### `POST /api/trips/{tripId}/invites`

v0.3 신규 생성 endpoint다. 응답 shape는 `GET /api/trips/{tripId}/invite`와 같다.

### `POST /api/invites/{token}/accept`

초대 수락 endpoint다. DB 전환 시 `trip_invites.accepted_at` 갱신 후 `trip_members`에 참여자를 추가한다.

## Health

### `GET /api/health`

Response `200`

```json
{
  "status": "ok",
  "service": "travel-hunter-backend",
  "environment": "local",
  "database": "not_configured"
}
```

## 다음 단계 제외 범위

- 실제 PostgreSQL 연결
- SQLAlchemy 모델
- Alembic migration
- JWT refresh token 실제 발급/회전
- 정책 실시간 수집 API
- 실제 AI 추천 엔진
- 친구 초대 실제 발송
