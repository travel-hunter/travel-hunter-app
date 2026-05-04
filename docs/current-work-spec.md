# Travel Hunter 현재 작업 명세

## 1. 프로젝트 현재 상태 요약

Travel Hunter production 앱은 현재 prototype HTML을 기준으로 React/FastAPI 구조를 다시 잡은 상태다. 프론트엔드는 실제 서비스형 반응형 웹 화면과 route 흐름을 제공하고, 백엔드는 실제 DB 없이 FastAPI Mock API를 제공한다.

현재 기준은 다음과 같다.

- production 앱 폴더: `C:\Users\HP\Documents\프로젝트\진행중\travel-hunter-app`
- prototype 보존 폴더: `C:\Users\HP\Documents\프로젝트\진행중\travel-hunter-prototype`
- ERD/요구사항 원본 폴더: `C:\Users\HP\Documents\프로젝트\진행중\files`
- ERD 기준 SQL: `files/travel_hunter_schema_v0.3.sql`
- API 계약 기준: `travel-hunter-app/docs/mvp-api-contract.md`

이번 단계의 목표는 실제 DB 연결 전, 프론트와 백엔드가 같은 API 경계를 바라보도록 구조와 계약을 고정하는 것이다.

## 2. 작업 폴더와 산출물 위치

| 구분 | 위치 | 설명 |
|------|------|------|
| Production 앱 | `travel-hunter-app` | React frontend + FastAPI backend 기준 코드베이스 |
| Frontend | `travel-hunter-app/frontend` | Vite, React, TypeScript 앱 |
| Backend | `travel-hunter-app/backend` | FastAPI Mock API 서버 |
| 앱 문서 | `travel-hunter-app/docs` | production 앱 기준 문서 |
| ERD 원본 | `files` | ERD, 요구사항, 화면 설계, SQL 원본 |
| Prototype | `travel-hunter-prototype` | HTML/Figma prototype 산출물 보존 |

## 3. 프론트엔드 구현 범위

프론트엔드는 Vite + React + TypeScript 기반 production형 반응형 웹으로 정리됐다. 첫 진입 화면의 prototype 설명, phone mock frame, 상태바, 내부 설명성 UI는 제거됐다.

주요 구조:

- `AppRoot`: 브라우저 라우터와 provider 진입점
- `SessionProvider`: localStorage 기반 임시 session 상태
- `ProtectedRoute`: 로그인 필요 route 보호
- `AppDataApi`: 화면이 직접 mock data나 backend client를 알지 않게 하는 데이터 접근 경계
- `mockApi`: 브라우저 내부 seed data 기반 구현
- `backendApi`: FastAPI `/api/*` endpoint 호출 구현
- `VITE_DATA_SOURCE`: `mock` 또는 `backend` 데이터 소스 선택

주요 route:

- `/`, `/onboarding`
- `/login`
- `/signup`
- `/profile-setup`
- `/home`
- `/policies`
- `/policies/:policySlug`
- `/trips`
- `/trips/new`
- `/trips/:tripId`
- `/ai-results`
- `/friend-invite`
- `/mypage`

정리된 구버전 파일:

- `frontend/src/App.tsx` 삭제
- `frontend/src/data.ts` 삭제
- `frontend/src/styles.css` 삭제
- 기존 `prototypeData.ts`는 `seedData.ts` 성격으로 정리

## 4. 백엔드 구현 범위

백엔드는 FastAPI 기반으로 라우터, 스키마, 서비스, seed data 계층을 분리했다. 아직 실제 DB는 연결하지 않고, 프론트 연동 검증을 위한 Mock API를 제공한다.

주요 구조:

- `app/main.py`: FastAPI 앱 생성, CORS, router 등록
- `app/core/config.py`: 환경변수 설정
- `app/api/router.py`: `/api` router 조립
- `app/api/routes`: health, auth, profile, policies, trips, invites route
- `app/schemas`: Pydantic request/response schema
- `app/services`: Mock business logic
- `app/data/seed.py`: DB 없이 사용하는 seed data

현재 제공 endpoint:

- `GET /health`
- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/signup`
- `GET /api/me`
- `PATCH /api/me/profile`
- `GET /api/profile-options`
- `GET /api/policies`
- `GET /api/policies/{policySlug}`
- `POST /api/me/saved-policies/{policySlug}`
- `GET /api/trips`
- `POST /api/trips`
- `GET /api/trips/{tripId}`
- `POST /api/trips/{tripId}/policies/{policySlug}`
- `GET /api/trips/{tripId}/recommendations`
- `GET /api/trips/{tripId}/invite`
- `POST /api/trips/{tripId}/invite`
- `POST /api/trips/{tripId}/invites`
- `POST /api/invites/{inviteToken}/accept`

## 5. ERD/API 계약 v0.3 반영 사항

ERD v0.3 권장안은 모두 채택됐다.

반영된 DB 기준:

- `policies.slug` 추가
- `trips.slug`는 추가하지 않음
- `trip_invites` 테이블 추가
- `user_profiles`는 만들지 않고 `users` 통합 구조 유지
- `users.gender` 추가
- 사용자 관심 지역은 `users.preferred_regions` 기준
- 일정 하위 테이블은 `trip_*` 단수 prefix 사용
- API DTO와 DB 컬럼 매핑은 `docs/mvp-api-contract.md` 기준

주요 매핑 기준:

- 정책 상세 route는 `policySlug` 기준
- 현재 seed의 `local-vacation`은 정책 slug로 취급
- 일정 route의 `jeju-3-days`는 mock 단계의 화면 호환 id
- DB 전환 시 일정은 numeric id 또는 별도 client mapping 기준으로 정리 필요
- `match`, `expectedSaving`, `copied`, `invited` 같은 값은 DB 원본 필드가 아니라 API 응답 계산값 또는 화면 상태로 분리

## 6. 실행 및 검증 방법

Frontend 실행:

```bash
cd frontend
npm install
npm run dev
```

Frontend 검증:

```bash
cd frontend
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Backend 실행:

```bash
cd backend
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend 검증:

```bash
cd backend
python -m pytest
```

Compose 설정 검증:

```bash
docker compose -f compose.yaml config
```

최근 통과한 검증:

- `npm run typecheck`
- `npm test`
- `npm run test:e2e`
- `npm run build`
- `python -m pytest`
- `docker compose -f compose.yaml config`

## 7. 완료된 작업

- prototype 기반 production React 앱 구조화
- 실제 서비스형 반응형 UI 전환
- 한글 UI 문구 정리
- `/login` 빈 화면 원인 수정: `SessionProvider` 연결
- CI/package 정합성 정리
- Vitest/jsdom/Testing Library 설정
- Playwright e2e smoke test 추가
- 구버전 프론트 파일 삭제
- `AppRoot`와 provider 구조 정리
- `AppDataApi` 경계 추가
- mock/backend 데이터 소스 선택 구조 추가
- FastAPI route/schema/service/data 구조 분리
- DB 없는 Mock API endpoint 추가
- ERD v0.3 권장안 반영
- `travel_hunter_schema_v0.3.sql` 생성
- `mvp-api-contract.md` UTF-8 기준 재작성
- backend/frontend README 정리

## 8. 아직 구현하지 않은 작업

아래 항목은 아직 구현하지 않았다.

- 실제 PostgreSQL 연결
- SQLAlchemy 모델
- Alembic migration
- 실제 JWT 인증
- refresh token 발급, 저장, 회전, 폐기
- 비밀번호 hashing
- 소셜 로그인 실제 연동
- 정책 실시간 수집 API
- 정책 검색/정렬/필터링의 실제 DB query
- 일정 CRUD 영속 저장
- 장소 CRUD 영속 저장
- 지도 API 연동
- 실제 AI 추천 엔진
- 친구 초대 실제 발송
- 권한 기반 공동 편집
- 알림 기능
- 관리자/운영 기능
- Docker daemon 기반 full build 검증
- AWS/EKS/Argo CD 배포

## 9. 다음 작업 우선순위

1. 현재 변경분을 커밋 가능한 기준점으로 검수한다.
2. PostgreSQL 연결 전 Alembic/SQLAlchemy 도입 계획을 확정한다.
3. ERD v0.3 SQL을 SQLAlchemy model과 migration으로 변환한다.
4. FastAPI Mock service를 repository/service 구조로 바꾸고 DB-backed 구현을 추가한다.
5. 인증 API를 실제 JWT 기반으로 전환한다.
6. 정책 목록/상세 API를 DB query 기반으로 전환한다.
7. 일정 생성/조회/수정/삭제 API를 DB 기반으로 구현한다.
8. 프론트 `VITE_DATA_SOURCE=backend` 기준 smoke test를 CI에 포함한다.

## 10. 참고 문서

- `docs/mvp-api-contract.md`
- `docs/erd-api-backend-mock-plan.md`
- `docs/production-plan.md`
- `files/travel_hunter_schema_v0.3.sql`
- `files/ERD_v0.3_결정안건_상세분석.md`
- `files/요구사항_정의서_26.05.01_수정.md`
- `files/화면_설계서_1.md`
