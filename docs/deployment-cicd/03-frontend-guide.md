# Frontend 작업 설명서

## 역할

프론트엔드는 React, TypeScript, Vite, React Router 기반이다. 화면은 FastAPI backend를 직접 호출하지 않고 `frontend/src/api`와 `AppDataApi` 경계를 통해서만 데이터를 읽고 쓴다.

## 핵심 규칙

- 페이지와 컴포넌트는 seed data를 직접 import하지 않는다.
- runtime mock mode를 다시 만들지 않는다.
- 모든 API DTO 필드는 `camelCase`로 사용한다.
- 정책 상세 route key는 `policySlug`다.
- 일정 상세 route key는 `tripId`다.
- 인증이 필요한 페이지는 anonymous user를 `/login`으로 redirect해야 한다.

## 주요 route

- `/`
- `/signup`
- `/login`
- `/nickname-setup`
- `/profile-setup`
- `/home`
- `/policies`
- `/policies/:policySlug`
- `/trips`
- `/trips/new`
- `/trips/:tripId`
- `/ai-results`
- `/friend-invite`
- `/invites/:inviteToken/accept`
- `/mypage`

## Route Smoke 기준

- Public route: `/`, `/login`, `/signup`는 인증 없이 렌더링되어야 한다.
- Protected redirect: anonymous user가 `/home`에 접근하면 `/login`으로 이동해야 한다.
- Authenticated 주요 route: `/home`, `/policies`, `/policies/local-vacation`, `/trips`, `/trips/new`, `/trips/1`, `/ai-results?tripId=1`, `/friend-invite?tripId=1`, `/mypage`.
- 금지 상태: blank `#root`, horizontal overflow, prototype-only copy, runtime mock mode.
- DB-backed e2e는 `frontend/e2e-backend/backend-mode.spec.ts`와 `npm run test:e2e` 기준이다.

## 작업 순서

1. 변경할 route/page를 확인한다.
2. 필요한 데이터가 `AppDataApi`에 있는지 확인한다.
3. API shape 변경이 필요하면 백엔드와 contract 변경을 먼저 계획한다.
4. UI 변경은 기존 app shell, CSS class, responsive 기준을 따른다.
5. error/loading/empty state를 같이 확인한다.
6. 테스트와 build를 실행한다.

## 환경변수

로컬 개발:

```powershell
$env:VITE_API_BASE_URL="http://127.0.0.1:8000"
```

서버 build:

```bash
VITE_API_BASE_URL=https://<domain>
```

서버에서는 localhost 값을 사용하지 않는다.

## 검증 명령

```bash
cd frontend
npm run typecheck
npm test
npm run test:e2e
npm run build
```

UI layout 변경 시 주요 폭에서 확인한다.

```text
360px, 390px, 430px, 1024px, 1440px
```

## 배포 전 확인

- 화면 root가 blank로 남지 않는지 확인한다.
- horizontal overflow가 없는지 확인한다.
- 로그인 만료/refresh 흐름이 깨지지 않는지 확인한다.
- `VITE_API_BASE_URL`이 배포 domain을 가리키는지 확인한다.
- production build output에 sourcemap이 공개되지 않는지 확인한다.
