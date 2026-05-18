# 하드코딩 제거 및 서비스 완성도 정리

## 목적

서비스 완성도를 떨어뜨리는 demo seed, 고정 날짜, localhost fallback, 화면 표시값, 직접 색상값을 운영 코드와 분리한다.

## 이번 정리 범위

- 프론트 표시값 중앙화:
  - 홈 여행지 rail, 대표 정책 slug, 정책 아이콘, 정책 상세 hero visual, 일정 생성 지역/emoji를 `frontend/src/data/displayConfig.ts`로 모았다.
- 일정 생성 기본 날짜:
  - `/trips/new`의 고정 `2026-07-12 ~ 2026-07-14` 기본값을 KST 기준 기본 날짜 helper로 교체했다.
  - seed/test 데이터의 2026 날짜는 dev/test fixture로만 유지한다.
- 운영 설정 guard:
  - `APP_ENV=staging|production|prod`에서는 개발 기본 auth secret, localhost public base URL, localhost CORS, insecure refresh cookie를 거부한다.
  - local env에서는 기존 개발 fallback을 유지한다.
- 정책 데이터 품질:
  - 디지털관광주민증 crawler의 target/output/existing slug를 CLI option으로 받게 했다.
  - 정책 JSON shape, deadline, slug 중복, 인코딩 깨짐 의심 문자를 확인하는 검증 스크립트를 추가했다.
- 스타일 기준:
  - PWA theme color와 HTML theme color를 Prototype red theme `#ff5e5b`로 맞췄다.

## 운영 전 추가 권장 작업

- `frontend/src/styles/app.css`의 직접 색상값을 token 기반으로 더 줄인다.
- `jeju-3-days` legacy alias는 compatibility 문서와 테스트에만 남기고 신규 흐름에서는 numeric id만 사용한다.
- `backend/app/data/seed.py`와 `frontend/src/data/seedData.ts`는 dev seed 전용으로만 유지하고, 실제 정책 catalog는 별도 수집/검증 파이프라인으로 관리한다.
- 큰 파일 분리는 후순위로 둔다:
  - `frontend/src/pages/ItineraryPages.tsx`
  - `frontend/src/App.test.tsx`
  - `backend/app/services/trips.py`
  - `frontend/src/styles/app.css`

## 검증 명령

```powershell
cd frontend
npm run typecheck
npm test -- --run
npm run build

cd ..\backend
python -m pytest
python scripts\validate_policy_data.py
alembic upgrade head --sql

cd ..
git diff --check
```
