# Frontend

트레블헌터 MVP React 웹 프론트엔드입니다. 모바일 우선 반응형 웹으로 S-01~S-09 핵심 화면 흐름을 구현합니다.

## 기술 스택

- React
- TypeScript
- Vite
- React Router
- Lucide React

## 구현된 화면

- `/` 스플래시 / 온보딩
- `/signup` 회원가입
- `/login` 로그인
- `/home` 홈
- `/policies` 정책 목록
- `/policies/:id` 정책 상세
- `/trips` 일정 목록
- `/trips/new` 일정 생성
- `/trips/:id` 일정 상세

## 로컬 실행 방법

```bash
npm install
npm run dev
```

기본 개발 서버는 `http://127.0.0.1:5173`에서 실행됩니다.

## 데이터 소스

프론트 화면은 `src/api`의 `AppDataApi` 경계를 통해서만 데이터를 가져옵니다.

- 기본값: `VITE_DATA_SOURCE=mock`
- 백엔드 연동 확인: `VITE_DATA_SOURCE=backend`
- 백엔드 주소: `VITE_API_BASE_URL=http://127.0.0.1:8000`

`mock`은 브라우저 내부 seed data를 사용하고, `backend`는 FastAPI Mock API의 `/api/*` endpoint를 호출합니다.

```bash
VITE_DATA_SOURCE=backend npm run dev
```

## 빌드

```bash
npm run build
```

## 검증

```bash
npm run typecheck
npm test
npm run test:e2e
```
