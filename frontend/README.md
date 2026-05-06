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
- `GET /api/me/profile`
- `PATCH /api/me/profile`
- policy, trip, recommendation, and invite endpoints from `docs/mvp-api-contract.md`
- `Authorization: Bearer <accessToken>`
- refresh cookie via `credentials: "include"`

PowerShell example:

```powershell
$env:VITE_DATA_SOURCE="backend"
$env:VITE_API_BASE_URL="http://127.0.0.1:8000"
npm run dev
```

## Preview And Staging Mode

For Docker Compose staging handoff, the frontend image is built with:

- `VITE_DATA_SOURCE=backend`
- `VITE_API_BASE_URL=http://127.0.0.1:8000`

The compose frontend preview is served at:

```text
http://127.0.0.1:4173
```

For a real staging domain, rebuild the frontend with `VITE_API_BASE_URL` pointing to the staging backend origin.

## Validation

```bash
npm run typecheck
npm test
npm run test:e2e
npm run test:e2e:backend
npm run build
```

`npm run test:e2e:backend` starts the backend-mode smoke path against FastAPI and compose PostgreSQL using the script under `frontend/scripts`.

## Staging Build Notes

- Set `VITE_DATA_SOURCE=backend`.
- Set `VITE_API_BASE_URL` to the staging backend origin.
- Run `npm run build` and serve the generated Vite assets from the container image or static host.
- Keep `npm run test:e2e` for mock-mode UI regression and `npm run test:e2e:backend` for backend integration smoke.
