# Production App Plan

## Done in This Rebuild

- 기존 `travel-hunter-app`는 archive로 보존
- 새 `travel-hunter-app` 폴더 생성
- prototype HTML route를 React route로 변환
- prototype 디자인 토큰을 CSS token으로 반영
- prototype mock data를 TypeScript data layer로 분리
- FastAPI backend skeleton 생성
- Docker Compose, Dockerfile, GitHub Actions CI 추가

## MVP Next Work

1. PostgreSQL schema와 migration 도입
2. Auth API 구현 및 localStorage mock auth 제거
3. 정책 목록/상세 API 구현
4. 일정 CRUD API 구현
5. AI 추천 mock을 backend endpoint로 이동
6. 친구 초대 링크 저장과 권한 모델 구현
