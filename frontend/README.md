# Frontend

Travel Hunter MVP frontend built with React, TypeScript, Vite, and React Router.

## Routes

- `/`, `/onboarding`
- `/signup`
- `/login`
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

## Local Run

```bash
npm install
npm run dev
```

Default dev server:

```text
http://127.0.0.1:5173
```

## Data Source

Pages access data only through `src/api` and `AppDataApi`.

- Default: `VITE_DATA_SOURCE=mock`
- Backend mode: `VITE_DATA_SOURCE=backend`
- Backend URL: `VITE_API_BASE_URL=http://127.0.0.1:8000`

Backend mode uses:

- `POST /api/auth/login`
- `POST /api/auth/signup`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/me`
- `Authorization: Bearer <accessToken>`
- refresh cookie via `credentials: "include"`

PowerShell example:

```powershell
$env:VITE_DATA_SOURCE="backend"
$env:VITE_API_BASE_URL="http://127.0.0.1:8000"
npm run dev
```

## Validation

```bash
npm run typecheck
npm test
npm run test:e2e
npm run build
```
