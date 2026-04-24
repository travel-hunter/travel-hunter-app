# 트레블헌터 MVP API 계약 초안

이 문서는 React MVP 목업 데이터와 맞출 FastAPI API 계약 초안입니다. 실제 PostgreSQL 연결 전까지는 이 스키마를 기준으로 프론트엔드와 백엔드가 같은 데이터 형태를 사용합니다.

## 인증

### `POST /auth/signup`

신규 사용자를 생성합니다.

Request

```json
{
  "email": "travel@example.com",
  "password": "hunter123",
  "nickname": "트래블러",
  "birthDate": "2000-01-01",
  "interestRegion": "제주",
  "termsAgreed": true
}
```

Response `201`

```json
{
  "accessToken": "mock-token",
  "user": {
    "id": "user_1",
    "email": "travel@example.com",
    "nickname": "트래블러",
    "interestRegion": "제주"
  }
}
```

### `POST /auth/login`

기존 사용자를 인증합니다.

Request

```json
{
  "email": "travel@example.com",
  "password": "hunter123"
}
```

Response `200`

```json
{
  "accessToken": "mock-token",
  "user": {
    "id": "user_1",
    "email": "travel@example.com",
    "nickname": "트래블러"
  }
}
```

## 정책

### `GET /policies`

정책 목록을 조회합니다. 필터 쿼리는 모두 선택값입니다.

Query

- `region`: `전국`, `제주`, `부산`, `강원`
- `type`: `할인`, `지원금`, `적립`
- `ageGroup`: `20대`, `30대`, `40대`, `가족`
- `cursor`: 무한 스크롤용 커서

Response `200`

```json
{
  "items": [
    {
      "id": "local-vacation",
      "title": "지역사랑 휴가지원",
      "sponsor": "한국관광공사",
      "region": "전국",
      "type": "지원금",
      "audience": "내국인, 농어촌 지역 1박 이상 숙박",
      "benefit": "여행 경비의 50% 환급, 최대 30만원",
      "period": "2026.05.01 ~ 2026.10.31",
      "condition": "숙박 영수증과 교통비 증빙을 제출해야 합니다."
    }
  ],
  "nextCursor": null
}
```

### `GET /policies/{policyId}`

정책 상세 정보를 조회합니다.

Response `200`

```json
{
  "id": "local-vacation",
  "title": "지역사랑 휴가지원",
  "sponsor": "한국관광공사",
  "region": "전국",
  "type": "지원금",
  "audience": "내국인, 농어촌 지역 1박 이상 숙박",
  "benefit": "여행 경비의 50% 환급, 최대 30만원",
  "period": "2026.05.01 ~ 2026.10.31",
  "condition": "숙박 영수증과 교통비 증빙을 제출해야 합니다.",
  "documents": ["신분증", "숙박 영수증", "교통비 증빙"],
  "officialUrl": "https://knto.or.kr"
}
```

## 일정

### `GET /trips`

내 일정 목록을 조회합니다.

Query

- `status`: `upcoming`, `past`

Response `200`

```json
{
  "items": [
    {
      "id": "jeju-3-days",
      "title": "제주 3일 여행",
      "region": "제주",
      "startDate": "2026.05.17",
      "endDate": "2026.05.19",
      "participants": 2,
      "policyIds": ["local-vacation", "jeju-youth"]
    }
  ]
}
```

### `POST /trips`

새 일정을 생성합니다.

Request

```json
{
  "title": "제주 3일 여행",
  "region": "제주",
  "startDate": "2026-05-17",
  "endDate": "2026-05-19",
  "companions": ["friend@example.com"]
}
```

Response `201`

```json
{
  "id": "jeju-3-days",
  "title": "제주 3일 여행",
  "region": "제주",
  "startDate": "2026.05.17",
  "endDate": "2026.05.19",
  "participants": 2,
  "policyIds": [],
  "days": []
}
```

### `GET /trips/{tripId}`

일정 상세와 날짜별 장소를 조회합니다.

Response `200`

```json
{
  "id": "jeju-3-days",
  "title": "제주 3일 여행",
  "region": "제주",
  "startDate": "2026.05.17",
  "endDate": "2026.05.19",
  "participants": 2,
  "policyIds": ["local-vacation", "jeju-youth"],
  "days": [
    {
      "day": 1,
      "places": [
        {
          "id": "p1",
          "time": "09:00",
          "name": "성산 일출봉",
          "category": "관광지"
        }
      ]
    }
  ]
}
```

### `POST /trips/{tripId}/places`

일정에 장소를 추가합니다.

Request

```json
{
  "day": 1,
  "time": "12:00",
  "name": "해녀의 집",
  "category": "맛집"
}
```

Response `201`

```json
{
  "id": "p2",
  "day": 1,
  "time": "12:00",
  "name": "해녀의 집",
  "category": "맛집"
}
```

### `DELETE /trips/{tripId}/places/{placeId}`

일정 장소를 삭제합니다.

Response `204`

본문 없음.

## 향후 PostgreSQL 테이블 후보

- `users`
- `policies`
- `policy_documents`
- `trips`
- `trip_members`
- `trip_places`

## MVP 제외 API

- AI 추천 결과 생성
- 친구 초대 링크와 QR 코드 생성
- 마이페이지 통계와 회원 탈퇴
